import React, { useState } from 'react'

const API = import.meta.env.VITE_API || 'http://localhost:4000/api'

export default function Login({ onAuth, onSwitchMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Login failed')
      onAuth(data)
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ width: '100%' }}>
      <h3>Login</h3>
      {error && <div className="error-msg">{error}</div>}
      
      <div className="form-group">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Type your username" required />
      </div>
      
      <div className="form-group">
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Type your password" type="password" required />
      </div>
      
      <div className="forgot-link">
        <a href="#">Forgot password?</a>
      </div>
      
      <button type="submit" className="auth-button" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      
      <div className="auth-divider"><span>Or Sign Up Using</span></div>
      
      <div className="social-icons">
        <a href="#" className="facebook" title="Facebook">f</a>
        <a href="#" className="twitter" title="Twitter">𝕏</a>
        <a href="#" className="google" title="Google">G</a>
      </div>
      
      <div className="auth-footer">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode?.('register') }}>Sign up</a></div>
    </form>
  )
}

