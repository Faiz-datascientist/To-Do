import React, { useState, useEffect } from 'react'
import TodoList from './components/TodoList'
import NewTodoForm from './components/NewTodoForm'
import Login from './pages/Login'
import Register from './pages/Register'

const API = import.meta.env.VITE_API || 'http://localhost:4000/api'

console.log('App component loaded, API:', API)

export default function App() {
  const [todos, setTodos] = useState([])
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState(localStorage.getItem('user'))
  const [authMode, setAuthMode] = useState('login')
  
  console.log('App render, token:', token, 'username:', username)

  useEffect(() => {
    if (token) fetchTodos()
    else loadLocal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function loadLocal() {
    try {
      const raw = localStorage.getItem('todos_v1')
      if (raw) setTodos(JSON.parse(raw))
      else setTodos([])
    } catch (e) {
      console.error('Failed to load todos', e)
    }
  }

  useEffect(() => {
    if (!token) {
      try {
        localStorage.setItem('todos_v1', JSON.stringify(todos))
      } catch (e) {
        console.error('Failed to save todos', e)
      }
    }
  }, [todos, token])

  async function fetchTodos() {
    try {
      const res = await fetch(`${API}/todos`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTodos(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function add(text) {
    if (token) {
      const res = await fetch(`${API}/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }) })
      if (res.ok) {
        const t = await res.json()
        setTodos((p) => [...p, t])
      }
    } else {
      setTodos((p) => [...p, { id: Date.now(), text, done: false }])
    }
  }

  async function toggle(id) {
    const t = todos.find((x) => x.id === id)
    if (!t) return
    if (token) {
      await fetch(`${API}/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: t.text, done: !t.done }) })
      fetchTodos()
    } else {
      setTodos((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    }
  }

  async function remove(id) {
    if (token) {
      await fetch(`${API}/todos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      fetchTodos()
    } else {
      setTodos((p) => p.filter((t) => t.id !== id))
    }
  }

  function handleAuth({ token: newToken, username: user }) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', user)
    setToken(newToken)
    setUsername(user)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUsername(null)
    loadLocal()
  }

  if (!token) {
    return (
      <div className="app">
        <main className="card">
          {authMode === 'login' ? (
            <Login onAuth={handleAuth} onSwitchMode={setAuthMode} />
          ) : (
            <Register onAuth={handleAuth} onSwitchMode={setAuthMode} />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>To‑Do</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#666' }}>👤 {username}</span>
            <button onClick={logout} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Log out</button>
          </div>
        </div>
        <NewTodoForm onAdd={add} />
        <TodoList todos={todos} onToggle={toggle} onRemove={remove} />
      </main>
    </div>
  )
}
