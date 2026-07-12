import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

const JWT_SECRET = 'luxestay_jwt_secret_key_2026'

export const authApp = new Hono()

// Helper to get JWT secret
export function getJwtSecret(c) {
  return c.env.JWT_SECRET || JWT_SECRET
}

// Handler: Check Auth Status
export async function checkHandler(c) {
  const token = getCookie(c, 'auth_token')
  if (!token) {
    return c.json({ success: true, loggedIn: false, authenticated: false, user: null })
  }

  try {
    const payload = await verify(token, getJwtSecret(c), 'HS256')
    return c.json({
      success: true,
      loggedIn: true,
      authenticated: true,
      user: payload.user
    })
  } catch (err) {
    console.error("Verify Error:", err);
    return c.json({ success: true, loggedIn: false, authenticated: false, user: null, error: err.message })
  }
}

// Handler: Login
export async function loginHandler(c) {
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const { email, password } = body

  if (!email || !password) {
    return c.json({ success: false, error: 'Email and password are required.' }, 400)
  }

  // Fetch user from DB
  const user = await c.env.DB.prepare(
    'SELECT id, full_name, email, password_hash, phone, role, created_at FROM users WHERE email = ? LIMIT 1'
  )
  .bind(email)
  .first()

  if (!user) {
    return c.json({ success: false, error: 'Invalid email or password.' }, 401)
  }

  // Compare passwords
  const validPassword = bcrypt.compareSync(password, user.password_hash)
  if (!validPassword) {
    return c.json({ success: false, error: 'Invalid email or password.' }, 401)
  }

  const userData = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role
  }

  // Generate JWT token
  const token = await sign(
    {
      user: userData,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    },
    getJwtSecret(c)
  )

  // Set HTTP-only Cookie
  setCookie(c, 'auth_token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return c.json({
    success: true,
    message: 'Login successful.',
    user: userData
  })
}

// Handler: Register
export async function registerHandler(c) {
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    body = await c.req.parseBody()
  }

  const { full_name, email, password, phone } = body

  if (!full_name || !email || !password) {
    return c.json({ success: false, error: 'Missing required fields: full_name, email, password' }, 400)
  }

  if (password.length < 6) {
    return c.json({ success: false, error: 'Password must be at least 6 characters.' }, 400)
  }

  // Check duplicate email
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first()

  if (existingUser) {
    return c.json({ success: false, error: 'An account with this email address already exists.' }, 409)
  }

  // Hash password
  const salt = bcrypt.genSaltSync(10)
  const passwordHash = bcrypt.hashSync(password, salt)

  // Insert user
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

  // Generate JWT token
  const token = await sign(
    {
      user: userData,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    },
    getJwtSecret(c)
  )

  // Set HTTP-only Cookie
  setCookie(c, 'auth_token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return c.json({
    success: true,
    message: 'Registration successful.',
    user: userData
  }, 201)
}

// Handler: Logout
export async function logoutHandler(c) {
  deleteCookie(c, 'auth_token', {
    path: '/',
    sameSite: 'Lax'
  })
  return c.json({
    success: true,
    message: 'Logged out successfully.'
  })
}

// Connect handlers to Hono clean routes
authApp.get('/check', checkHandler)
authApp.post('/login', loginHandler)
authApp.post('/register', registerHandler)
authApp.post('/logout', logoutHandler)
