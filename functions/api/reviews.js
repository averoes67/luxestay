import { Hono } from 'hono'
import { requireAuth } from './middleware.js'

export const reviewsApp = new Hono()

// Handler: List reviews
export async function listReviewsHandler(c) {
  const url = new URL(c.req.url)
  const roomTypeId = url.searchParams.get('room_type_id')
  
  try {
    let query = `
      SELECT r.id, r.rating, r.comment, r.created_at, u.full_name as guest_name, rt.name as room_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY r.created_at DESC
    `
    
    let result
    if (roomTypeId) {
      query = `
        SELECT r.id, r.rating, r.comment, r.created_at, u.full_name as guest_name, rt.name as room_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.room_type_id = ?
        ORDER BY r.created_at DESC
      `
      const { results } = await c.env.DB.prepare(query).bind(parseInt(roomTypeId)).all()
      result = results
    } else {
      const { results } = await c.env.DB.prepare(query).all()
      result = results
    }
    
    return c.json({
      success: true,
      data: result
    })
  } catch (err) {
    console.error('Database error in reviews/list:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
}

// Handler: Create a review
export async function createReviewHandler(c) {
  const user = c.get('user')
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }
  
  const roomTypeId = parseInt(body.room_type_id)
  const rating = parseInt(body.rating)
  const comment = body.comment || ''
  
  if (!roomTypeId || isNaN(roomTypeId)) {
    return c.json({ success: false, error: 'Valid room_type_id is required' }, 400)
  }
  
  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    return c.json({ success: false, error: 'Rating must be between 1 and 5' }, 400)
  }
  
  // Verify that the user has a confirmed, checked_in, or checked_out reservation for this room type
  const hasStayed = await c.env.DB.prepare(`
    SELECT res.id 
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    WHERE res.user_id = ? AND r.room_type_id = ? AND res.status IN ('confirmed', 'checked_in', 'checked_out')
    LIMIT 1
  `).bind(user.id, roomTypeId).first()
  
  if (!hasStayed) {
    return c.json({ success: false, error: 'You can only review rooms you have booked.' }, 403)
  }
  
  try {
    const { success } = await c.env.DB.prepare(
      'INSERT INTO reviews (user_id, room_type_id, rating, comment) VALUES (?, ?, ?, ?)'
    ).bind(user.id, roomTypeId, rating, comment).run()
    
    if (success) {
      return c.json({ success: true, message: 'Review added successfully' })
    } else {
      return c.json({ success: false, error: 'Failed to add review' }, 500)
    }
  } catch (err) {
    console.error('Error adding review:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
}

// Connect handlers to Hono clean routes
reviewsApp.get('/list', listReviewsHandler)
reviewsApp.post('/create', requireAuth, createReviewHandler)

export default reviewsApp
