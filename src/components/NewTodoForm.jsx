import React, { useState } from 'react'

export default function NewTodoForm({ onAdd }) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')

  function submit(e) {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onAdd({ text: v, dueDate: dueDate || null, tags: tagList })
    setText('')
    setDueDate('')
    setTags('')
  }

  return (
    <form className="new-todo" onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task"
        aria-label="New task"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        aria-label="Due date"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
        aria-label="Tags"
      />
      <button type="submit">Add</button>
    </form>
  )
}
