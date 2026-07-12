import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { authApp, checkHandler, loginHandler, registerHandler, logoutHandler } from './auth'
import { roomsApp, listRoomsHandler, detailRoomHandler, availabilityRoomHandler } from './rooms'
import { reservationsApp, createReservationHandler, userReservationsHandler, cancelReservationHandler, payReservationHandler } from './reservations'
import { reviewsApp, listReviewsHandler, createReviewHandler } from './reviews'
import setupApp from './setup.js'
import {
  adminApp,
  adminDashboardHandler,
  adminRevenueHandler,
  adminRevenueByTypeHandler,
  adminRecentReservationsHandler,
  adminGuestsHandler,
  adminRoomsHandler,
  adminUpdatePriceHandler,
  adminUpdateRoomStatusHandler,
  adminUpdateReservationHandler
} from './admin'
import { requireAuth, requireAdmin } from './middleware'

const app = new Hono().basePath('/api')

// Enable CORS
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}))

// Mount Hono clean routes
app.route('/auth', authApp)
app.route('/rooms', roomsApp)
app.route('/reservations', reservationsApp)
app.route('/admin', adminApp)
app.route('/reviews', reviewsApp)
app.route('/setup', setupApp)

// Helper to get action from body or query
async function getAction(c) {
  const queryAction = c.req.query('action')
  if (queryAction) return queryAction

  if (c.req.method === 'POST') {
    try {
      const body = await c.req.json()
      return body.action || null
    } catch (e) {
      try {
        const body = await c.req.parseBody()
        return body.action || null
      } catch (e2) {
        return null
      }
    }
  }
  return null
}

// Legacy PHP Routes Adapters

// 1. auth.php
app.all('/auth.php', async (c) => {
  const action = await getAction(c)
  switch (action) {
    case 'check':
      return checkHandler(c)
    case 'login':
      return loginHandler(c)
    case 'register':
      return registerHandler(c)
    case 'logout':
      return logoutHandler(c)
    default:
      return c.json({ success: false, error: 'Invalid action. Supported: login, register, logout, check.' }, 400)
  }
})

// 2. rooms.php
app.all('/rooms.php', async (c) => {
  const action = await getAction(c)
  switch (action) {
    case 'list':
      return listRoomsHandler(c)
    case 'detail':
      return detailRoomHandler(c)
    case 'availability':
      return availabilityRoomHandler(c)
    default:
      return c.json({ success: false, error: 'Invalid action. Supported: list, detail, availability.' }, 400)
  }
})

// 3. reservations.php
app.all('/reservations.php', async (c) => {
  const action = await getAction(c)

  // Auth check for reservations.php actions
  const isAuthRequired = ['create', 'user', 'cancel', 'all', 'update_status'].includes(action)
  if (isAuthRequired) {
    const res = await requireAuth(c, async () => {})
    if (res instanceof Response) {
      return res
    }
  }

  switch (action) {
    case 'create':
      return createReservationHandler(c)
    case 'user':
      return userReservationsHandler(c)
    case 'cancel':
      return cancelReservationHandler(c)
    case 'all': {
      const adminRes = await requireAdmin(c, async () => {})
      if (adminRes instanceof Response) return adminRes
      return adminRecentReservationsHandler(c)
    }
    case 'update_status': {
      const adminRes = await requireAdmin(c, async () => {})
      if (adminRes instanceof Response) return adminRes
      return adminUpdateReservationHandler(c)
    }
    default:
      return c.json({ success: false, error: 'Invalid action.' }, 400)
  }
})

// 4. reviews.php
app.all('/reviews.php', async (c) => {
  const action = await getAction(c)
  
  if (action === 'create') {
    const res = await requireAuth(c, async () => {})
    if (res instanceof Response) return res
    return createReviewHandler(c)
  } else if (action === 'list') {
    return listReviewsHandler(c)
  }

  return c.json({ success: false, error: 'Invalid action.' }, 400)
})

// 4. admin.php
app.all('/admin.php', async (c) => {
  const action = await getAction(c)

  // Apply admin checks
  const adminRes = await requireAdmin(c, async () => {})
  if (adminRes instanceof Response) {
    return adminRes
  }

  switch (action) {
    case 'dashboard':
      return adminDashboardHandler(c)
    case 'revenue':
      return adminRevenueHandler(c)
    case 'revenue_by_type':
      return adminRevenueByTypeHandler(c)
    case 'recent':
      return adminRecentReservationsHandler(c)
    case 'guests':
      return adminGuestsHandler(c)
    case 'rooms':
      return adminRoomsHandler(c)
    case 'update_price':
      return adminUpdatePriceHandler(c)
    case 'update_room_status':
      return adminUpdateRoomStatusHandler(c)
    case 'update_reservation':
      return adminUpdateReservationHandler(c)
    default:
      return c.json({ success: false, error: 'Invalid action.' }, 400)
  }
})

export const onRequest = handle(app)
