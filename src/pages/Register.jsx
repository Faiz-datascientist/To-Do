import React, { useState } from 'react'

const API = import.meta.env.VITE_API || 'http://localhost:4000/api'

export default function Register({ onAuth, onSwitchMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    
    setLoading(true)
    try {
      const res = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Registration failed')
      // auto-login
      const loginRes = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const loginData = await loginRes.json()
      if (!loginRes.ok) return setError(loginData.error || 'Login after register failed')
      onAuth(loginData)
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ width: '100%' }}>
      <h3>Sign Up</h3>
      {error && <div className="error-msg">{error}</div>}
      
      <div className="form-group">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required />
      </div>
      
      <div className="form-group">
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" type="password" required />
      </div>
      
      <div className="form-group">
        <label>Confirm Password</label>
        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" type="password" required />
      </div>
      
      <button type="submit" className="auth-button" disabled={loading}>{loading ? 'Creating account...' : 'Sign Up'}</button>
      
      <div className="auth-divider"><span>Or Sign Up Using</span></div>
      
      <div className="social-icons">
        <a href="#" className="facebook" title="Facebook">f</a>
        <a href="#" className="twitter" title="Twitter">𝕏</a>
        <a href="#" className="google" title="Google">G</a>
      </div>
      
      <div className="auth-footer">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode?.('login') }}>Sign in</a></div>
    </form>
  )
}
}
