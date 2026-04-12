# Academic Resource Hub

A multi-module academic resource sharing platform for universities. Built with React (Vite) + Node.js (Express) + PostgreSQL (Supabase).

---

## 📦 Project Structure

```
Academic-Resource-Hub/
├── frontend/          # 🎓 Student Portal        → http://localhost:5173
├── faculty-portal/    # 👨‍🏫 Faculty Portal       → http://localhost:5174
├── admin-panel/       # 🛡️  Admin Panel          → http://localhost:5100
├── backend/           # 🖥️  Express API Server    → http://localhost:5000
└── package.json       # Root workspace (concurrently)
```

---

## 🚀 Quick Start

### 1. Install all dependencies
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../faculty-portal && npm install
cd ../admin-panel && npm install
```

### 2. Configure environment variables
Copy the `.env.example` files and fill in your values:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp faculty-portal/.env.example faculty-portal/.env
cp admin-panel/.env.example admin-panel/.env
```

### 3. Run all services (from root)
```bash
npm run dev
```

This starts all 4 services concurrently with labelled output.

### Or run individually:
```bash
npm run dev:backend    # Backend only   → :5000
npm run dev:student    # Student portal → :5173
npm run dev:faculty    # Faculty portal → :5174
npm run dev:admin      # Admin panel    → :5100
```

---

## 🔐 Role System

| Role | Email Pattern | Portal |
|---|---|---|
| `student` | `@student.rru.ac.in` | `localhost:5173` |
| `faculty` | `@rru.ac.in` | `localhost:5174` |
| `admin` | Seeded manually in DB | `localhost:5100` |

### Faculty Onboarding Flow
1. Faculty registers at `/register` on the Faculty Portal
2. Application is set to `status: pending`
3. Admin reviews at the Admin Panel → Approve or Reject (with reason)
4. Faculty can check status at `/pending` — auto-redirects to dashboard when approved

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| Backend | Node.js, Express 5, PostgreSQL |
| Auth & DB | Supabase (Auth + Storage + PostgreSQL) |
| Styling | Vanilla CSS with CSS custom properties |

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/faculty/register` — Faculty self-registration
- `GET  /api/auth/faculty/status` — Check approval status

### Admin
- `GET  /api/admin/faculty/pending` — List pending registrations
- `GET  /api/admin/faculty/all` — List all faculty with statuses
- `PUT  /api/admin/faculty/:id/approve` — Approve faculty
- `PUT  /api/admin/faculty/:id/reject` — Reject with reason
- `GET  /api/admin/stats` — Dashboard statistics

### Faculty
- `GET  /api/faculty/` — All faculty profiles
- `GET  /api/faculty/:id` — Faculty profile by ID
- `PUT  /api/faculty/profile` — Update own profile

### Resources
- `GET  /resources` — Browse all resources
- `POST /resources` — Upload external link resource
- `POST /resources/file` — Upload file resource
- `PUT  /resources/:id` — Update resource
- `DELETE /resources/:id` — Delete resource

---

## 🏗️ Build for Production
```bash
npm run build:all   # Builds student, faculty, admin portals
```