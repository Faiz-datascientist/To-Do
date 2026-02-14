import React, { useState } from 'react'

const API = process.env.REACT_APP_API || 'http://localhost:4000/api'

export default function Register({ onAuth }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Register failed')
      // auto-login
      const loginRes = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const loginData = await loginRes.json()
      if (!loginRes.ok) return setError(loginData.error || 'Login after register failed')
      onAuth(loginData)
    } catch (e) {
      setError('Network error')
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
      <h3>Register</h3>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button type="submit">Create account</button>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
    </form>
  )
}
