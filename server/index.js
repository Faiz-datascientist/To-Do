const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { run, get, all, init } = require('./db')

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'dev_access_secret_change_me'
const ACCESS_TTL = process.env.ACCESS_TTL || '15m'
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30)
const app = express()
app.use(cors({ origin: '*', credentials: false }))
app.use(express.json())

function nowIso() {
  return new Date().toISOString()
}

function addDaysIso(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function issueTokens(user) {
  const accessToken = jwt.sign({ id: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_TTL })
  const refreshToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashToken(refreshToken)
  await run(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [user.id, tokenHash, addDaysIso(REFRESH_DAYS), nowIso()]
  )
  return { accessToken, refreshToken }
}

function normalizeTags(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean)
    } catch (_) {
      return raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }
  }
  return []
}

async function start() {
  await init()

  app.get('/', (req, res) => {
    res.json({ message: 'To-Do API running', version: '0.1.0' })
  })

  app.post('/api/register', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
    try {
      const existing = await get('SELECT * FROM users WHERE username = ?', [username])
      if (existing) return res.status(400).json({ error: 'User exists' })
      const hash = await bcrypt.hash(password, 10)
      const info = await run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash])
      res.status(201).json({ id: info.lastID, username })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
    try {
      const user = await get('SELECT * FROM users WHERE username = ?', [username])
      if (!user) return res.status(400).json({ error: 'Invalid credentials' })
      const ok = await bcrypt.compare(password, user.password)
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' })
      const { accessToken, refreshToken } = await issueTokens(user)
      res.json({ token: accessToken, refreshToken, username: user.username })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post('/api/refresh', async (req, res) => {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' })
    try {
      const tokenHash = hashToken(refreshToken)
      const row = await get('SELECT * FROM refresh_tokens WHERE token_hash = ?', [tokenHash])
      if (!row) return res.status(401).json({ error: 'Invalid refresh token' })
      if (row.revoked_at) return res.status(401).json({ error: 'Refresh token revoked' })
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        return res.status(401).json({ error: 'Refresh token expired' })
      }

      await run('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', [nowIso(), row.id])
      const user = await get('SELECT id, username FROM users WHERE id = ?', [row.user_id])
      if (!user) return res.status(401).json({ error: 'Invalid user' })
      const { accessToken, refreshToken: newRefresh } = await issueTokens(user)
      res.json({ token: accessToken, refreshToken: newRefresh, username: user.username })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post('/api/logout', async (req, res) => {
    const { refreshToken } = req.body
    if (refreshToken) {
      try {
        const tokenHash = hashToken(refreshToken)
        await run('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [nowIso(), tokenHash])
      } catch (e) {
        console.error(e)
      }
    }
    res.status(204).end()
  })

  function auth(req, res, next) {
    const h = req.headers.authorization
    if (!h) return res.status(401).json({ error: 'No token' })
    const parts = h.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Bad token' })
    try {
      const payload = jwt.verify(parts[1], ACCESS_SECRET)
      req.user = payload
      next()
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  app.get('/api/todos', auth, async (req, res) => {
    try {
      const rows = await all('SELECT id, text, done, due_date, tags FROM todos WHERE user_id = ?', [req.user.id])
      res.json(
        rows.map((r) => ({
          id: r.id,
          text: r.text,
          done: !!r.done,
          dueDate: r.due_date || null,
          tags: normalizeTags(r.tags),
        }))
      )
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post('/api/todos', auth, async (req, res) => {
    const { text, dueDate, tags } = req.body
    if (!text) return res.status(400).json({ error: 'Missing text' })
    try {
      const tagsValue = JSON.stringify(normalizeTags(tags))
      const info = await run('INSERT INTO todos (user_id, text, done, due_date, tags) VALUES (?, ?, 0, ?, ?)', [
        req.user.id,
        text,
        dueDate || null,
        tagsValue,
      ])
      const row = await get('SELECT id, text, done, due_date, tags FROM todos WHERE id = ?', [info.lastID])
      res.status(201).json({
        id: row.id,
        text: row.text,
        done: !!row.done,
        dueDate: row.due_date || null,
        tags: normalizeTags(row.tags),
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.put('/api/todos/:id', auth, async (req, res) => {
    const id = req.params.id
    const { text, done, dueDate, tags } = req.body
    try {
      const existing = await get('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id])
      if (!existing) return res.status(404).json({ error: 'Not found' })
      const nextText = text ?? existing.text
      const nextDone = typeof done === 'boolean' ? (done ? 1 : 0) : existing.done
      const nextDue = typeof dueDate === 'string' || dueDate === null ? dueDate : existing.due_date
      const nextTags = tags === undefined ? existing.tags : JSON.stringify(normalizeTags(tags))
      await run(
        'UPDATE todos SET text = ?, done = ?, due_date = ?, tags = ? WHERE id = ? AND user_id = ?',
        [nextText, nextDone, nextDue, nextTags, id, req.user.id]
      )
      const row = await get('SELECT id, text, done, due_date, tags FROM todos WHERE id = ?', [id])
      res.json({
        id: row.id,
        text: row.text,
        done: !!row.done,
        dueDate: row.due_date || null,
        tags: normalizeTags(row.tags),
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.delete('/api/todos/:id', auth, async (req, res) => {
    const id = req.params.id
    try {
      await run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id])
      res.status(204).end()
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  const port = process.env.PORT || 4000
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
}

start()
