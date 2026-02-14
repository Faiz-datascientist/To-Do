import React from 'react'

export default function TodoItem({ todo, onToggle, onRemove }) {
  return (
    <li className={`todo-item ${todo.done ? 'done' : ''}`}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={onToggle} />
        <span className="text">{todo.text}</span>
      </label>
      <button className="delete" onClick={onRemove} aria-label="Delete">
        ✕
      </button>
    </li>
  )
}
