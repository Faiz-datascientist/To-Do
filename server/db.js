const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const file = path.join(__dirname, 'data.db')
const db = new sqlite3.Database(file)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function init() {
  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`
  )

  await run(
    `CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      text TEXT,
      done INTEGER DEFAULT 0,
      due_date TEXT,
      tags TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  )

  await run(
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token_hash TEXT UNIQUE,
      expires_at TEXT,
      revoked_at TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  )

  const columns = await all(`PRAGMA table_info(todos)`)
  const hasDue = columns.some((c) => c.name === 'due_date')
  const hasTags = columns.some((c) => c.name === 'tags')
  if (!hasDue) await run(`ALTER TABLE todos ADD COLUMN due_date TEXT`)
  if (!hasTags) await run(`ALTER TABLE todos ADD COLUMN tags TEXT`)
}

module.exports = { db, run, get, all, init }
