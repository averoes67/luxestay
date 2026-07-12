import { Hono } from 'hono'
import { requireAuth } from './middleware'
import { getAvailableRooms } from './rooms'

export const reservationsApp = new Hono()

// Helper: Get reservation by ID with full details
export async function getReservationById(db, id) {
  const sql = `
    SELECT
        res.id, res.user_id, res.room_id,
        res.check_in, res.check_out, res.total_price,
        res.guests_count, res.special_requests, res.status, res.created_at,
        r.room_number, r.floor,
        rt.id AS room_type_id, rt.name AS room_type_name, rt.slug AS room_type_slug,
        rt.base_price, rt.image_url,
        u.full_name AS guest_name, u.email AS guest_email, u.phone AS guest_phone
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    JOIN users u ON res.user_id = u.id
    WHERE res.id = ?
    LIMIT 1
  `
  return await db.prepare(sql).bind(id).first()
}

// Handler: Create Reservation
export async function createReservationHandler(c) {
  const user = c.get('user')
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const roomTypeId = body.room_type_id ? parseInt(body.room_type_id) : null
  const checkIn = body.check_in
  const checkOut = body.check_out
  const guestsCount = body.guests_count ? parseInt(body.guests_count) : null
  const specialRequests = body.special_requests || null

  if (!roomTypeId || !checkIn || !checkOut || !guestsCount) {
    return c.json({ success: false, error: 'Required fields: room_type_id, check_in, check_out, guests_count.' }, 400)
  }

  // Validate date formats
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

  if (guestsCount < 1) {
    return c.json({ success: false, error: 'Guests count must be at least 1.' }, 400)
  }

  // Verify room type exists and check capacity
  const roomType = await c.env.DB.prepare('SELECT id, name, base_price, capacity FROM room_types WHERE id = ? LIMIT 1')
    .bind(roomTypeId)
    .first()

  if (!roomType) {
    return c.json({ success: false, error: 'Room type not found.' }, 404)
  }

  if (guestsCount > parseInt(roomType.capacity)) {
    return c.json({
      success: false,
      error: `This room type has a maximum capacity of ${roomType.capacity} guests.`
    }, 400)
  }

  // Check availability and pick the first available room
  const availableRooms = await getAvailableRooms(c.env.DB, roomTypeId, checkIn, checkOut)
  if (availableRooms.length === 0) {
    return c.json({ success: false, error: 'No rooms available for the selected dates.' }, 409)
  }

  const selectedRoom = availableRooms[0]

  // Calculate price
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
  const totalPrice = parseFloat(roomType.base_price) * nights

  // Insert reservation
  const insertSql = `
    INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `
  const info = await c.env.DB.prepare(insertSql)
    .bind(user.id, selectedRoom.id, checkIn, checkOut, totalPrice, guestsCount, specialRequests)
    .run()

  const reservationId = info.meta.last_row_id || 0
  const reservation = await getReservationById(c.env.DB, reservationId)

  return c.json({
    success: true,
    message: 'Reservation created successfully.',
    reservation
  }, 201)
}

// Handler: Get User's Reservations
export async function userReservationsHandler(c) {
  const user = c.get('user')

  const sql = `
    SELECT
        res.id, res.check_in, res.check_out, res.total_price,
        res.guests_count, res.special_requests, res.status, res.created_at,
        r.room_number, r.floor,
        rt.id AS room_type_id, rt.name AS room_type_name, rt.slug AS room_type_slug,
        rt.base_price, rt.image_url
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE res.user_id = ?
    ORDER BY res.check_in DESC
  `
  const { results } = await c.env.DB.prepare(sql).bind(user.id).all()

  const formatted = (results || []).map(r => ({
    ...r,
    total_price: parseFloat(r.total_price),
    base_price: parseFloat(r.base_price),
    guests_count: parseInt(r.guests_count)
  }))

  return c.json({
    success: true,
    data: formatted,
    count: formatted.length
  })
}

// Handler: Cancel Reservation
export async function cancelReservationHandler(c) {
  const user = c.get('user')
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const reservationId = body.reservation_id ? parseInt(body.reservation_id) : null

  if (!reservationId || isNaN(reservationId)) {
    return c.json({ success: false, error: 'Valid reservation_id is required.' }, 400)
  }

  // Fetch reservation and verify ownership
  const reservation = await c.env.DB.prepare('SELECT id, user_id, status FROM reservations WHERE id = ? LIMIT 1')
    .bind(reservationId)
    .first()

  if (!reservation) {
    return c.json({ success: false, error: 'Reservation not found or you do not have permission to cancel it.' }, 404)
  }

  if (parseInt(reservation.user_id) !== user.id) {
    return c.json({ success: false, error: 'Reservation not found or you do not have permission to cancel it.' }, 404)
  }

  if (!['pending', 'confirmed'].includes(reservation.status)) {
    return c.json({ success: false, error: 'Only pending or confirmed reservations can be cancelled.' }, 400)
  }

  // Perform update
  await c.env.DB.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?")
    .bind(reservationId)
    .run()

  return c.json({
    success: true,
    message: 'Reservation cancelled successfully.'
  })
}

// Handler: Pay Reservation
export async function payReservationHandler(c) {
  const user = c.get('user')
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const reservationId = body.reservation_id ? parseInt(body.reservation_id) : null

  if (!reservationId || isNaN(reservationId)) {
    return c.json({ success: false, error: 'Valid reservation_id is required.' }, 400)
  }

  const reservation = await c.env.DB.prepare('SELECT id, user_id, status FROM reservations WHERE id = ? LIMIT 1')
    .bind(reservationId)
    .first()

  if (!reservation || parseInt(reservation.user_id) !== user.id) {
    return c.json({ success: false, error: 'Reservation not found.' }, 404)
  }

  if (reservation.status !== 'pending') {
    return c.json({ success: false, error: 'Reservation is not pending.' }, 400)
  }

  await c.env.DB.prepare("UPDATE reservations SET status = 'confirmed' WHERE id = ?")
    .bind(reservationId)
    .run()

  const updatedReservation = await getReservationById(c.env.DB, reservationId)

  return c.json({
    success: true,
    message: 'Payment processed successfully.',
    reservation: updatedReservation
  })
}

// Connect handlers to Hono clean routes
reservationsApp.use('*', requireAuth)
reservationsApp.post('/create', createReservationHandler)
reservationsApp.get('/user', userReservationsHandler)
reservationsApp.post('/cancel', cancelReservationHandler)
reservationsApp.post('/pay', payReservationHandler)
