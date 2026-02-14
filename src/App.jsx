import React, { useState, useEffect, useMemo } from 'react'
import TodoList from './components/TodoList'
import NewTodoForm from './components/NewTodoForm'
import Login from './pages/Login'
import Register from './pages/Register'

const API = import.meta.env.VITE_API || 'http://localhost:4000/api'

function readStoredAuth() {
  const localToken = localStorage.getItem('token')
  const localRefresh = localStorage.getItem('refreshToken')
  const localUser = localStorage.getItem('user')
  if (localToken) {
    return { token: localToken, refreshToken: localRefresh, username: localUser, storage: 'local' }
  }
  const sessionToken = sessionStorage.getItem('token')
  const sessionRefresh = sessionStorage.getItem('refreshToken')
  const sessionUser = sessionStorage.getItem('user')
  if (sessionToken) {
    return { token: sessionToken, refreshToken: sessionRefresh, username: sessionUser, storage: 'session' }
  }
  return { token: null, refreshToken: null, username: null, storage: null }
}

function saveAuth(storageType, { token, refreshToken, username }) {
  const storage = storageType === 'local' ? localStorage : sessionStorage
  const other = storageType === 'local' ? sessionStorage : localStorage
  other.removeItem('token')
  other.removeItem('refreshToken')
  other.removeItem('user')
  storage.setItem('token', token)
  storage.setItem('refreshToken', refreshToken || '')
  storage.setItem('user', username || '')
}

function clearAuthStorage() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('user')
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default function App() {
  const initialAuth = readStoredAuth()
  const [todos, setTodos] = useState([])
  const [token, setToken] = useState(initialAuth.token)
  const [refreshToken, setRefreshToken] = useState(initialAuth.refreshToken)
  const [username, setUsername] = useState(initialAuth.username)
  const [authStorage, setAuthStorage] = useState(initialAuth.storage)
  const [authMode, setAuthMode] = useState('login')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [dueFilter, setDueFilter] = useState('any')

  useEffect(() => {
    if (token) fetchTodos()
    else loadLocal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function loadLocal() {
    try {
      const raw = localStorage.getItem('todos_v2')
      if (raw) return setTodos(JSON.parse(raw))
      const legacy = localStorage.getItem('todos_v1')
      if (legacy) return setTodos(JSON.parse(legacy))
      setTodos([])
    } catch (e) {
      console.error('Failed to load todos', e)
    }
  }

  useEffect(() => {
    if (!token) {
      try {
        localStorage.setItem('todos_v2', JSON.stringify(todos))
      } catch (e) {
        console.error('Failed to save todos', e)
      }
    }
  }, [todos, token])

  function applyAuth({ token: nextToken, refreshToken: nextRefresh, username: user, remember }) {
    const storageType = remember ? 'local' : 'session'
    saveAuth(storageType, { token: nextToken, refreshToken: nextRefresh, username: user })
    setToken(nextToken)
    setRefreshToken(nextRefresh)
    setUsername(user)
    setAuthStorage(storageType)
  }

  async function refreshAccessToken() {
    if (!refreshToken) return false
    try {
      const res = await fetch(`${API}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false
      const data = await res.json()
      if (!authStorage) return false
      saveAuth(authStorage, { token: data.token, refreshToken: data.refreshToken, username: data.username })
      setToken(data.token)
      setRefreshToken(data.refreshToken)
      setUsername(data.username)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async function apiFetch(path, options = {}, allowRefresh = true) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` }
    const res = await fetch(`${API}${path}`, { ...options, headers })
    if (res.status === 401 && allowRefresh && refreshToken) {
      const ok = await refreshAccessToken()
      if (ok) return apiFetch(path, options, false)
      await logout()
    }
    return res
  }

  async function fetchTodos() {
    try {
      const res = await apiFetch('/todos')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTodos(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function add(payload) {
    if (token) {
      const res = await apiFetch('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const t = await res.json()
        setTodos((p) => [...p, t])
      }
    } else {
      setTodos((p) => [
        ...p,
        { id: Date.now(), text: payload.text, done: false, dueDate: payload.dueDate || null, tags: payload.tags || [] },
      ])
    }
  }

  async function toggle(id) {
    const t = todos.find((x) => x.id === id)
    if (!t) return
    if (token) {
      await apiFetch(`/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !t.done }),
      })
      fetchTodos()
    } else {
      setTodos((p) => p.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
    }
  }

  async function updateTodo(next) {
    if (token) {
      await apiFetch(`/todos/${next.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          done: next.done,
          dueDate: next.dueDate || null,
          tags: next.tags || [],
        }),
      })
      fetchTodos()
    } else {
      setTodos((p) => p.map((t) => (t.id === next.id ? { ...t, ...next } : t)))
    }
  }

  async function remove(id) {
    if (token) {
      await apiFetch(`/todos/${id}`, { method: 'DELETE' })
      fetchTodos()
    } else {
      setTodos((p) => p.filter((t) => t.id !== id))
    }
  }

  async function logout() {
    if (refreshToken) {
      try {
        await fetch(`${API}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      } catch (e) {
        console.error(e)
      }
    }
    clearAuthStorage()
    setToken(null)
    setRefreshToken(null)
    setUsername(null)
    setAuthStorage(null)
    setAuthMode('login')
    loadLocal()
  }

  const filteredTodos = useMemo(() => {
    const q = query.trim().toLowerCase()
    const tags = tagFilter
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const today = startOfDay(new Date())
    const todayStr = todayIso()
    const weekEnd = startOfDay(addDays(today, 7))

    return todos.filter((t) => {
      if (q && !t.text.toLowerCase().includes(q)) return false
      if (statusFilter === 'open' && t.done) return false
      if (statusFilter === 'done' && !t.done) return false
      if (tags.length) {
        const todoTags = (t.tags || []).map((tag) => tag.toLowerCase())
        const hasAll = tags.every((tag) => todoTags.includes(tag))
        if (!hasAll) return false
      }
      if (dueFilter !== 'any') {
        if (!t.dueDate) {
          if (dueFilter === 'none') return true
          return false
        }
        const due = startOfDay(new Date(t.dueDate))
        if (dueFilter === 'overdue' && due >= today) return false
        if (dueFilter === 'today' && t.dueDate !== todayStr) return false
        if (dueFilter === 'week' && (due < today || due > weekEnd)) return false
        if (dueFilter === 'none') return false
      }
      return true
    })
  }, [todos, query, statusFilter, tagFilter, dueFilter])

  if (!token) {
    return (
      <div className="app">
        <main className="card">
          {authMode === 'login' ? (
            <Login onAuth={applyAuth} onSwitchMode={setAuthMode} />
          ) : (
            <Register onAuth={applyAuth} onSwitchMode={setAuthMode} />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="card">
        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>To-Do</h1>
            <p className="subtle">Signed in as {username}</p>
          </div>
          <button onClick={logout} className="logout">Log out</button>
        </div>
        <NewTodoForm onAdd={add} />
        <div className="filters">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search todos" />
          <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter tags" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
            <option value="any">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="week">Due this week</option>
            <option value="none">No due date</option>
          </select>
        </div>
        <div className="summary">{filteredTodos.length} of {todos.length} todos</div>
        <TodoList todos={filteredTodos} onToggle={toggle} onRemove={remove} onUpdate={updateTodo} />
      </main>
    </div>
  )
}
