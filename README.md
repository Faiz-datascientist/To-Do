# To-Do App (Vite + React + Express)

Minimal to-do app with authentication, due dates, tags, search, and refresh tokens.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Backend server

Start the backend server (Express + SQLite):

```bash
cd server
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default.

## Environment

Set `VITE_API` to your deployed API base URL when hosting the frontend.

Example `.env`:

```bash
VITE_API=https://your-api.example.com/api
```

## Deploy (Netlify / Vercel)

The frontend is static and can be deployed on Netlify or Vercel. The API should be deployed separately (any Node host).

### Netlify

Build settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API` (your backend URL)

### Vercel

Create a new project from this repo:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API` (your backend URL)

## Files

- `src/App.jsx`
- `src/components/NewTodoForm.jsx`
- `src/components/TodoList.jsx`
- `src/components/TodoItem.jsx`
