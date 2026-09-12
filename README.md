# રામાધણી ડેરી ફાર્મ — Premium Dairy Management App

Folder-wise React + Vite + Node.js + SQLite project.

## Structure
- `Frontend/Js/main.jsx` — React entry point
- `Frontend/Js/App.jsx` — complete dashboard/app UI
- `Frontend/Css/styles.css` — premium responsive styling
- `Frontend/index.html` — Vite HTML entry
- `Backend/index.js` — Express API
- `Backend/auth.js` — JWT authentication
- `Database/db.js` — SQLite database
- `Database/backup.js` — automatic database backups
- `Config/.env.example` — environment variables
- `package.json` — project dependencies/scripts

## Run
1. Install Node.js 20+.
2. From the project root run `npm install`.
3. Copy `Config/.env.example` to `.env` and change the admin password/JWT secret.
4. Run `npm run dev`.
5. Frontend: `http://localhost:5173`
6. API: `http://localhost:4000`

First run creates an admin user using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env` (development default: `admin` / `ChangeMe@123`).

## Features
- Secure JWT login
- Customer add/edit/delete
- Morning/evening milk entries
- Monthly totals and customer ledgers
- Payment tracking
- WhatsApp pre-filled ledger sharing
- Built-in dairy billing assistant
- Automatic daily SQLite backup + manual backup

WhatsApp sharing opens a pre-filled message; it does not silently send messages.
