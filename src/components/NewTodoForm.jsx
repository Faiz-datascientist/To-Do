import React, { useState } from 'react'

export default function NewTodoForm({ onAdd }) {
  const [text, setText] = useState('')

  function submit(e) {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    onAdd(v)
    setText('')
  }

  return (
    <form className="new-todo" onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task"
        aria-label="New task"
      />
      <button type="submit">Add</button>
    </form>
  )
}
