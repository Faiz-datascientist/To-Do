# To‑Do App (Vite + React)

Minimal to-do app built with Vite and React.

Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

Files

- [index.html](index.html)
- [src/App.jsx](src/App.jsx)
- [src/components/NewTodoForm.jsx](src/components/NewTodoForm.jsx)
- [src/components/TodoList.jsx](src/components/TodoList.jsx)
- [src/components/TodoItem.jsx](src/components/TodoItem.jsx)

Server

Start the backend server (Express + SQLite) from the `server` folder:

```bash
cd server
npm install
npm run dev
```

The API listens on http://localhost:4000 by default. The frontend will use it for authentication and todo storage when signed in.
