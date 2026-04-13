# Academic Resource Hub

A multi-module academic resource sharing platform for universities. Built with React (Vite) + Node.js (Express) + PostgreSQL (Supabase).

---

## 📦 Project Structure

```
Academic-Resource-Hub/
├── frontend/          # 🎓 Student & Faculty Portal  → http://localhost:5173
├── admin-panel/       # 🛡️  Admin Panel              → http://localhost:5100
├── backend/           # 🖥️  Express API Server        → http://localhost:5000
└── package.json       # Root workspace (concurrently)
```

---

## 🚀 Quick Start

### 1. Install all dependencies
```bash
npm install
```
*(This will install dependencies for all workspaces: frontend, admin-panel, and backend)*

### 2. Configure environment variables
Copy the `.env.example` files in each directory (`backend`, `frontend`, `admin-panel`) and fill in your Supabase and Cloudinary credentials.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin-panel/.env.example admin-panel/.env
```

### 3. Run all services (from root)
```bash
npm run dev
```

This starts all 3 services concurrently with labelled output.

### Or run individually:
```bash
npm run dev:backend    # Backend only   → :5000
npm run dev:frontend   # Frontend only  → :5173
npm run dev:admin      # Admin panel    → :5100
```

---

## 🔐 Role System

| Role | Email Pattern | Access Level |
|---|---|---|
| `student` | `@student.rru.ac.in` | Browse and download resources |
| `faculty` | `@rru.ac.in` | Upload and manage own resources |
| `admin` | Internal | System management & resource verification |

### Faculty Verification
- Users with `@rru.ac.in` are automatically assigned the `faculty` role.
- Faculty can upload resources which are visible to students once verified by an administrator.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| Backend | Node.js, Express, PostgreSQL (via Pool) |
| Auth & DB | Supabase (Auth + Storage + PostgreSQL) |
| Styling | Vanilla CSS with modern aesthetics |

---

## 📡 Key API Endpoints

### Auth
- `POST /api/auth/login` — User authentication
- `POST /api/auth/register` — New user registration

### Resources
- `GET  /resources` — Fetch public resources
- `POST /resources/file` — Upload file-based resource
- `POST /resources` — Add external link resource
- `GET  /resources/my` — Fetch resources uploaded by current user

### Admin
- `GET  /api/admin/stats` — Dashboard overview
- `GET  /api/admin/resources/pending` — List resources awaiting verification
- `PUT  /api/admin/resources/:id/verify` — Approve a resource

---

## 🏗️ Build for Production
```bash
npm run build:all   # Builds frontend and admin-panel
```