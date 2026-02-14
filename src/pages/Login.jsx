import React, { useState } from 'react'

const API = process.env.REACT_APP_API || 'http://localhost:4000/api'

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Login failed')
      onAuth(data)
    } catch (e) {
      setError('Network error')
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
      <h3>Sign in</h3>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button type="submit">Sign in</button>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
    </form>
  )
}
