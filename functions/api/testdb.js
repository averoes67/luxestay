export async function testDbHandler(c) {
  try {
    const res = await c.env.DB.prepare('SELECT * FROM users LIMIT 1').all()
    return c.json({ success: true, data: res.results })
  } catch (err) {
    return c.json({ success: false, error: err.message, stack: err.stack })
  }
}
