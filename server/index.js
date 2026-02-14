const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { run, get, all, init } = require('./db')

const SECRET = 'dev_secret_change_me'
const app = express()
app.use(cors())
app.use(express.json())

async function start() {
  await init()

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
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' })
      res.json({ token, username: user.username })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  function auth(req, res, next) {
    const h = req.headers.authorization
    if (!h) return res.status(401).json({ error: 'No token' })
    const parts = h.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Bad token' })
    try {
      const payload = jwt.verify(parts[1], SECRET)
      req.user = payload
      next()
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  app.get('/api/todos', auth, async (req, res) => {
    try {
      const rows = await all('SELECT id, text, done FROM todos WHERE user_id = ?', [req.user.id])
      res.json(rows.map((r) => ({ ...r, done: !!r.done })))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post('/api/todos', auth, async (req, res) => {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'Missing text' })
    try {
      const info = await run('INSERT INTO todos (user_id, text, done) VALUES (?, ?, 0)', [req.user.id, text])
      const row = await get('SELECT id, text, done FROM todos WHERE id = ?', [info.lastID])
      res.status(201).json({ ...row, done: !!row.done })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.put('/api/todos/:id', auth, async (req, res) => {
    const id = req.params.id
    const { text, done } = req.body
    try {
      const existing = await get('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id])
      if (!existing) return res.status(404).json({ error: 'Not found' })
      await run('UPDATE todos SET text = ?, done = ? WHERE id = ? AND user_id = ?', [text ?? existing.text, done ? 1 : 0, id, req.user.id])
      const row = await get('SELECT id, text, done FROM todos WHERE id = ?', [id])
      res.json({ ...row, done: !!row.done })
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
