import { Hono } from 'hono'
import { requireAdmin } from './middleware'
import { getReservationById } from './reservations'

export const adminApp = new Hono()

// Apply admin protection to all clean admin routes
adminApp.use('*', requireAdmin)

// Handler: Dashboard Stats
export async function adminDashboardHandler(c) {
  const db = c.env.DB

  // Total rooms
  const totalRoomsRow = await db.prepare("SELECT COUNT(*) as count FROM rooms").first()
  const totalRooms = totalRoomsRow ? parseInt(totalRoomsRow.count) : 0

  // Occupied rooms (status = checked_in overlap with today)
  const occupiedRoomsRow = await db.prepare(`
    SELECT COUNT(DISTINCT r.id) as count
    FROM rooms r
    JOIN reservations res ON r.id = res.room_id
    WHERE res.status = 'checked_in'
      AND res.check_in <= date('now')
      AND res.check_out > date('now')
  `).first()
  const occupiedRooms = occupiedRoomsRow ? parseInt(occupiedRoomsRow.count) : 0

  // Occupancy rate
  const occupancyRate = totalRooms > 0 ? parseFloat(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0

  // Today's revenue (check_in = today)
  const todayRevenueRow = await db.prepare(`
    SELECT SUM(total_price) as sum
    FROM reservations
    WHERE status != 'cancelled'
      AND check_in = date('now')
  `).first()
  const todayRevenue = todayRevenueRow && todayRevenueRow.sum ? parseFloat(todayRevenueRow.sum) : 0

  // This month's revenue
  const monthRevenueRow = await db.prepare(`
    SELECT SUM(total_price) as sum
    FROM reservations
    WHERE status != 'cancelled'
      AND strftime('%Y', check_in) = strftime('%Y', 'now')
      AND strftime('%m', check_in) = strftime('%m', 'now')
  `).first()
  const monthRevenue = monthRevenueRow && monthRevenueRow.sum ? parseFloat(monthRevenueRow.sum) : 0

  // Total guests (role = 'guest')
  const totalGuestsRow = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'guest'").first()
  const totalGuests = totalGuestsRow ? parseInt(totalGuestsRow.count) : 0

  // Active reservations (confirmed + checked_in)
  const activeRow = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status IN ('confirmed', 'checked_in')").first()
  const activeReservations = activeRow ? parseInt(activeRow.count) : 0

  // Pending reservations
  const pendingRow = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'").first()
  const pendingReservations = pendingRow ? parseInt(pendingRow.count) : 0

  return c.json({
    success: true,
    data: {
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      occupancy_rate: occupancyRate,
      today_revenue: todayRevenue,
      month_revenue: monthRevenue,
      total_guests: totalGuests,
      active_reservations: activeReservations,
      pending_reservations: pendingReservations
    }
  })
}

// Handler: Daily Revenue
export async function adminRevenueHandler(c) {
  const db = c.env.DB
  const days = Math.max(1, Math.min(365, parseInt(c.req.query('days') || '30')))

  const { results } = await db.prepare(`
    SELECT check_in as date, SUM(total_price) as revenue
    FROM reservations
    WHERE status != 'cancelled'
      AND check_in >= date('now', '-' || ? || ' days')
      AND check_in <= date('now')
    GROUP BY check_in
    ORDER BY date ASC
  `).bind(days).all()

  // Build a date map to fill in missing days with zero
  const revenueMap = {}
  if (results) {
    results.forEach(row => {
      revenueMap[row.date] = parseFloat(row.revenue || 0)
    })
  }

  const output = []
  const current = new Date()
  current.setDate(current.getDate() - days)
  const today = new Date()

  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0]
    output.push({
      date: dateStr,
      revenue: revenueMap[dateStr] || 0.0
    })
    current.setDate(current.getDate() + 1)
  }

  return c.json({
    success: true,
    data: output,
    days
  })
}

// Handler: Revenue by Room Type
export async function adminRevenueByTypeHandler(c) {
  const db = c.env.DB

  const { results } = await db.prepare(`
    SELECT
        rt.name AS room_type,
        SUM(res.total_price) AS revenue
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE res.status != 'cancelled'
    GROUP BY rt.id, rt.name
    ORDER BY revenue DESC
  `).all()

  const formatted = (results || []).map(r => ({
    room_type: r.room_type,
    revenue: parseFloat(r.revenue || 0)
  }))

  return c.json({
    success: true,
    data: formatted
  })
}

// Handler: Recent Reservations (with status and search filter)
export async function adminRecentReservationsHandler(c) {
  const db = c.env.DB
  const limit = Math.max(1, Math.min(50, parseInt(c.req.query('limit') || '10')))
  const status = c.req.query('status')
  const search = c.req.query('search')

  let sql = `
    SELECT
        res.id, res.check_in, res.check_out, res.total_price,
        res.guests_count, res.status, res.created_at,
        r.room_number,
        rt.name AS room_type_name,
        u.full_name AS guest_name, u.email AS guest_email
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    JOIN users u ON res.user_id = u.id
  `
  const params = []
  const conditions = []

  if (status) {
    conditions.push('res.status = ?')
    params.push(status)
  }
  if (search) {
    conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR r.room_number LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY res.created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await db.prepare(sql).bind(...params).all()

  const formatted = (results || []).map(r => ({
    ...r,
    total_price: parseFloat(r.total_price),
    guests_count: parseInt(r.guests_count)
  }))

  return c.json({
    success: true,
    data: formatted,
    count: formatted.length
  })
}

// Handler: Guests
export async function adminGuestsHandler(c) {
  const db = c.env.DB
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const perPage = Math.max(1, Math.min(100, parseInt(c.req.query('per_page') || '10')))
  const offset = (page - 1) * perPage
  const search = c.req.query('search') || ''

  let countSql = "SELECT COUNT(*) as count FROM users WHERE role = 'guest'"
  let sql = `
    SELECT
        u.id, u.full_name, u.email, u.phone, u.created_at,
        COUNT(res.id) AS total_bookings,
        SUM(CASE WHEN res.status != 'cancelled' THEN res.total_price ELSE 0 END) AS total_spent
    FROM users u
    LEFT JOIN reservations res ON u.id = res.user_id
    WHERE u.role = 'guest'
  `
  const params = []

  if (search) {
    countSql += " AND (full_name LIKE ? OR email LIKE ?)"
    sql += " AND (u.full_name LIKE ? OR u.email LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }

  sql += `
    GROUP BY u.id, u.full_name, u.email, u.phone, u.created_at
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `

  // Get total count
  const countRow = await db.prepare(countSql).bind(...params).first()
  const total = countRow ? parseInt(countRow.count) : 0

  // Get paginated data
  const dataParams = [...params, perPage, offset]
  const { results } = await db.prepare(sql).bind(...dataParams).all()

  const formatted = (results || []).map(g => ({
    ...g,
    total_bookings: parseInt(g.total_bookings || 0),
    total_spent: parseFloat(g.total_spent || 0)
  }))

  return c.json({
    success: true,
    data: formatted,
    meta: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    }
  })
}

// Handler: Rooms list
export async function adminRoomsHandler(c) {
  const db = c.env.DB

  const sql = `
    SELECT r.id, r.room_number, r.floor, r.status,
           rt.id AS type_id, rt.name AS room_type_name, rt.slug AS type_slug,
           rt.base_price, rt.capacity
    FROM rooms r
    JOIN room_types rt ON r.room_type_id = rt.id
    ORDER BY r.room_number ASC
  `
  const { results } = await db.prepare(sql).all()

  const formatted = (results || []).map(r => ({
    ...r,
    base_price: parseFloat(r.base_price),
    capacity: parseInt(r.capacity)
  }))

  return c.json({
    success: true,
    data: formatted,
    count: formatted.length
  })
}

// Handler: Update Room Type Price
export async function adminUpdatePriceHandler(c) {
  const db = c.env.DB
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const roomTypeId = body.room_type_id ? parseInt(body.room_type_id) : null
  const price = body.price !== undefined ? parseFloat(body.price) : null

  if (!roomTypeId || price === null || isNaN(price)) {
    return c.json({ success: false, error: 'Valid room_type_id and price are required.' }, 400)
  }

  if (price < 0) {
    return c.json({ success: false, error: 'Price must be a positive value.' }, 400)
  }

  const info = await db.prepare('UPDATE room_types SET base_price = ? WHERE id = ?')
    .bind(price, roomTypeId)
    .run()

  if (info.meta.changes === 0) {
    return c.json({ success: false, error: 'Room type not found or price unchanged.' }, 404)
  }

  const updatedType = await db.prepare('SELECT id, name, base_price FROM room_types WHERE id = ? LIMIT 1')
    .bind(roomTypeId)
    .first()

  return c.json({
    success: true,
    message: 'Room type price updated.',
    room_type: updatedType
  })
}

// Handler: Update Room Status
export async function adminUpdateRoomStatusHandler(c) {
  const db = c.env.DB
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const roomId = body.room_id ? parseInt(body.room_id) : null
  const status = body.status

  if (!roomId || !status) {
    return c.json({ success: false, error: 'Valid room_id and status are required.' }, 400)
  }

  const validStatuses = ['available', 'occupied', 'maintenance']
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Invalid room status.' }, 400)
  }

  const info = await db.prepare('UPDATE rooms SET status = ? WHERE id = ?')
    .bind(status, roomId)
    .run()

  if (info.meta.changes === 0) {
    return c.json({ success: false, error: 'Room not found or status unchanged.' }, 404)
  }

  return c.json({
    success: true,
    message: 'Room status updated.'
  })
}

// Handler: Update Reservation Status
export async function adminUpdateReservationHandler(c) {
  const db = c.env.DB
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const reservationId = body.reservation_id ? parseInt(body.reservation_id) : null
  const status = body.status

  if (!reservationId || !status) {
    return c.json({ success: false, error: 'Valid reservation_id and status are required.' }, 400)
  }

  const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Invalid reservation status.' }, 400)
  }

  const info = await db.prepare('UPDATE reservations SET status = ? WHERE id = ?')
    .bind(status, reservationId)
    .run()

  if (info.meta.changes === 0) {
    return c.json({ success: false, error: 'Reservation not found.' }, 404)
  }

  const updated = await getReservationById(db, reservationId)

  return c.json({
    success: true,
    message: 'Reservation status updated.',
    reservation: updated
  })
}

// Connect handlers to clean API routes
adminApp.get('/dashboard', adminDashboardHandler)
adminApp.get('/revenue', adminRevenueHandler)
adminApp.get('/revenue-by-type', adminRevenueByTypeHandler)
adminApp.get('/recent', adminRecentReservationsHandler)
adminApp.get('/guests', adminGuestsHandler)
adminApp.get('/rooms', adminRoomsHandler)
adminApp.post('/update-price', adminUpdatePriceHandler)
adminApp.post('/update-room-status', adminUpdateRoomStatusHandler)
adminApp.post('/update-reservation', adminUpdateReservationHandler)
