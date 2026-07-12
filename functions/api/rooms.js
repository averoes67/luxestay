import { Hono } from 'hono'

export const roomsApp = new Hono()

// Helper: Get available rooms
export async function getAvailableRooms(db, typeId, checkIn, checkOut) {
  const sql = `
    SELECT r.id, r.room_number, r.floor, r.status
    FROM rooms r
    WHERE r.room_type_id = ?
      AND r.status != 'maintenance'
      AND r.id NOT IN (
          SELECT res.room_id
          FROM reservations res
          WHERE res.status NOT IN ('cancelled', 'checked_out')
            AND res.check_in < ?
            AND res.check_out > ?
      )
    ORDER BY r.room_number ASC
  `
  const { results } = await db.prepare(sql).bind(typeId, checkOut, checkIn).all()
  return results || []
}

// Handler: List room types
export async function listRoomsHandler(c) {
  const query = c.req.query()
  const minPrice = query.min_price ? parseFloat(query.min_price) : null
  const maxPrice = query.max_price ? parseFloat(query.max_price) : null
  const capacity = query.capacity ? parseInt(query.capacity) : null

  let sql = 'SELECT id, name, slug, description, base_price, capacity, size_sqm, amenities, image_url, is_active FROM room_types WHERE is_active = 1'
  const params = []

  if (minPrice !== null && !isNaN(minPrice)) {
    sql += ' AND base_price >= ?'
    params.push(minPrice)
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    sql += ' AND base_price <= ?'
    params.push(maxPrice)
  }
  if (capacity !== null && !isNaN(capacity)) {
    sql += ' AND capacity >= ?'
    params.push(capacity)
  }

  sql += ' ORDER BY base_price ASC'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  // Format response (decode amenities JSON string to array)
  const roomTypes = (results || []).map(r => ({
    ...r,
    amenities: JSON.parse(r.amenities),
    base_price: parseFloat(r.base_price),
    capacity: parseInt(r.capacity),
    size_sqm: parseInt(r.size_sqm),
    is_active: !!r.is_active
  }))

  return c.json({
    success: true,
    data: roomTypes,
    count: roomTypes.length
  })
}

// Handler: Detail
export async function detailRoomHandler(c) {
  const slug = c.req.param('slug') || c.req.query('slug')

  if (!slug) {
    return c.json({ success: false, error: 'Slug parameter is required.' }, 400)
  }

  const roomType = await c.env.DB.prepare(
    'SELECT id, name, slug, description, base_price, capacity, size_sqm, amenities, image_url, is_active FROM room_types WHERE slug = ? LIMIT 1'
  )
  .bind(slug)
  .first()

  if (!roomType) {
    return c.json({ success: false, error: 'Room type not found.' }, 404)
  }

  return c.json({
    success: true,
    data: {
      ...roomType,
      amenities: JSON.parse(roomType.amenities),
      base_price: parseFloat(roomType.base_price),
      capacity: parseInt(roomType.capacity),
      size_sqm: parseInt(roomType.size_sqm),
      is_active: !!roomType.is_active
    }
  })
}

// Handler: Availability
export async function availabilityRoomHandler(c) {
  const query = c.req.query()
  const typeId = query.type_id ? parseInt(query.type_id) : null
  const checkIn = query.check_in
  const checkOut = query.check_out

  if (!typeId || !checkIn || !checkOut) {
    return c.json({ success: false, error: 'Parameters required: type_id, check_in, check_out.' }, 400)
  }

  // Simple date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
    return c.json({ success: false, error: 'Dates must be in Y-m-d format.' }, 400)
  }

  if (checkIn >= checkOut) {
    return c.json({ success: false, error: 'Check-out date must be after check-in date.' }, 400)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  if (checkIn < todayStr) {
    return c.json({ success: false, error: 'Check-in date cannot be in the past.' }, 400)
  }

  const roomType = await c.env.DB.prepare('SELECT id, name, base_price FROM room_types WHERE id = ? LIMIT 1')
    .bind(typeId)
    .first()

  if (!roomType) {
    return c.json({ success: false, error: 'Room type not found.' }, 404)
  }

  const availableRooms = await getAvailableRooms(c.env.DB, typeId, checkIn, checkOut)
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))

  return c.json({
    success: true,
    available_count: availableRooms.length,
    room_type: roomType.name,
    price_per_night: parseFloat(roomType.base_price),
    nights,
    total_price: parseFloat(roomType.base_price) * nights
  })
}

// Connect handlers to Hono clean routes
roomsApp.get('/', listRoomsHandler)
roomsApp.get('/detail/:slug', detailRoomHandler)
roomsApp.get('/detail', detailRoomHandler) // Fallback for query param slug
roomsApp.get('/availability', availabilityRoomHandler)
