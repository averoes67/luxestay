import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { getJwtSecret } from './auth'

export async function getUser(c) {
  const token = getCookie(c, 'auth_token')
  if (!token) return null

  try {
    const payload = await verify(token, getJwtSecret(c), 'HS256')
    return payload.user
  } catch (err) {
    return null
  }
}

export async function requireAuth(c, next) {
  const user = await getUser(c)
  if (!user) {
    return c.json({ success: false, error: 'Authentication required.' }, 401)
  }
  c.set('user', user)
  await next()
}

export async function requireAdmin(c, next) {
  const user = await getUser(c)
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: 'Admin access required.' }, 403)
  }
  c.set('user', user)
  await next()
}
