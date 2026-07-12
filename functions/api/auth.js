import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'

const JWT_SECRET = 'luxestay_jwt_secret_key_2026'

export const authApp = new Hono()

// ── Password Hashing using SHA-256 (Cloudflare Workers compatible) ──
// SHA-256 with random salt is instant and works within Workers CPU limits.

async function hashPassword(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256:${salt}:${hashHex}`
}

async function verifyPassword(password, stored) {
  const parts = stored.split(':')
  if (parts[0] !== 'sha256' || parts.length !== 3) return false
  const salt = parts[1]
  const expectedHash = parts[2]
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === expectedHash
}

// ── Helper: Build JSON Response with optional Set-Cookie ──
function jsonResponse(data, status = 200, cookieStr = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookieStr) {
    headers['Set-Cookie'] = cookieStr
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function makeCookie(token) {
  return `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
}

// Helper to get JWT secret
export function getJwtSecret(c) {
  return c.env.JWT_SECRET || JWT_SECRET
}

// Handler: Check Auth Status
export async function checkHandler(c) {
  const token = getCookie(c, 'auth_token')
  if (!token) {
    return jsonResponse({ success: true, loggedIn: false, authenticated: false, user: null })
  }

  try {
    const payload = await verify(token, getJwtSecret(c), 'HS256')
    return jsonResponse({
      success: true,
      loggedIn: true,
      authenticated: true,
      user: payload.user
    })
  } catch (err) {
    return jsonResponse({ success: true, loggedIn: false, authenticated: false, user: null })
  }
}

// Handler: Login
export async function loginHandler(c) {
  try {
    let body
    try {
      body = await c.req.json()
    } catch (e) {
      body = await c.req.parseBody()
    }

    const { email, password } = body

    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Email and password are required.' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, full_name, email, password_hash, phone, role FROM users WHERE email = ? LIMIT 1'
    )
    .bind(email)
    .first()

    if (!user) {
      return jsonResponse({ success: false, error: 'Invalid email or password.' }, 401)
    }

    const validPassword = await verifyPassword(password, user.password_hash)
    if (!validPassword) {
      return jsonResponse({ success: false, error: 'Invalid email or password.' }, 401)
    }

    const userData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }

    const token = await sign(
      { user: userData, exp: Math.floor(Date.now() / 1000) + 86400 },
      getJwtSecret(c)
    )

    return jsonResponse(
      { success: true, message: 'Login successful.', user: userData },
      200,
      makeCookie(token)
    )
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500)
  }
}

// Handler: Register
export async function registerHandler(c) {
  try {
    let body
    try {
      body = await c.req.json()
    } catch (e) {
      body = await c.req.parseBody()
    }

    const { full_name, email, password, phone } = body

    if (!full_name || !email || !password) {
      return jsonResponse({ success: false, error: 'Missing required fields: full_name, email, password' }, 400)
    }

    if (password.length < 6) {
      return jsonResponse({ success: false, error: 'Password must be at least 6 characters.' }, 400)
    }

    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .bind(email)
      .first()

    if (existingUser) {
      return jsonResponse({ success: false, error: 'An account with this email address already exists.' }, 409)
    }

    const passwordHash = await hashPassword(password)

    const info = await c.env.DB.prepare(
      'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(full_name, email, passwordHash, phone || '', 'guest')
    .run()

    const userId = info.meta.last_row_id || 0

    const userData = {
      id: userId,
      full_name,
      email,
      phone: phone || '',
      role: 'guest'
    }

    const token = await sign(
      { user: userData, exp: Math.floor(Date.now() / 1000) + 86400 },
      getJwtSecret(c)
    )

    return jsonResponse(
      { success: true, message: 'Registration successful.', user: userData },
      201,
      makeCookie(token)
    )
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500)
  }
}

// Handler: Logout
export async function logoutHandler(c) {
  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully.' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
      }
    }
  )
}

// Connect handlers to Hono clean routes
authApp.get('/check', checkHandler)
authApp.post('/login', loginHandler)
authApp.post('/register', registerHandler)
authApp.post('/logout', logoutHandler)
