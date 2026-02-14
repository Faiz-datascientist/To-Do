import React, { useState } from 'react'

export default function TodoItem({ todo, onToggle, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(todo.text)
  const [dueDate, setDueDate] = useState(todo.dueDate || '')
  const [tags, setTags] = useState((todo.tags || []).join(', '))

  function startEdit() {
    setText(todo.text)
    setDueDate(todo.dueDate || '')
    setTags((todo.tags || []).join(', '))
    setEditing(true)
  }

  function saveEdit() {
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onUpdate({ ...todo, text: text.trim() || todo.text, dueDate: dueDate || null, tags: tagList })
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  return (
    <li className={`todo-item ${todo.done ? 'done' : ''}`}>
      <div className="todo-main">
        <label>
          <input type="checkbox" checked={todo.done} onChange={onToggle} />
          {!editing ? (
            <span className="text">{todo.text}</span>
          ) : (
            <input className="edit-text" value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </label>
        <div className="meta">
          {!editing ? (
            <>
              {todo.dueDate ? <span className="due">Due {todo.dueDate}</span> : <span className="due none">No due date</span>}
              {todo.tags && todo.tags.length > 0 ? (
                <div className="tags">
                  {todo.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              ) : (
                <span className="tags empty">No tags</span>
              )}
            </>
          ) : (
            <div className="edit-fields">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags" />
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        {!editing ? (
          <>
            <button className="secondary" onClick={startEdit}>Edit</button>
            <button className="delete" onClick={onRemove} aria-label="Delete">Delete</button>
          </>
        ) : (
          <>
            <button className="primary" onClick={saveEdit}>Save</button>
            <button className="secondary" onClick={cancelEdit}>Cancel</button>
          </>
        )}
      </div>
    </li>
  )
}
