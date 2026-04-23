# 🎓 Academic Resource Hub

A high-fidelity, multi-module academic resource sharing ecosystem designed for **Rashtriya Raksha University (RRU)**. This platform empowers students and faculty to seamlessly share, verify, and interact with academic materials using cutting-edge AI and real-time synchronization.

---

## ✨ Key Features

### 🤖 Intelligent Academic Assistant
- **AI-Powered Summarization**: Instantly generate "Quick Snapshots" of lengthy PDF resources using **Gemini 2.0 Flash** or **Llama 3.1**.
- **OCR Integration**: Robust text extraction from scanned documents using Tesseract.js and PDF.js.
- **Contextual Chat**: Interactive chatbot that understands the specific resource you are viewing and provides professional, concise answers.
- **Navigation Shortcuts**: AI-driven navigation suggestions (e.g., `[NAVIGATE:/upload]`) to streamline user workflow.

### 📡 Real-Time Ecosystem
- **Instant Notifications**: Powered by **Socket.IO**. Users receive live alerts when new resources are uploaded to their enrolled courses.
- **Dynamic Updates**: Real-time verification status tracking for contributors.

### 🛡️ Enterprise-Grade Admin Control
- **Verification Queue**: Dedicated panel for administrators to vet and approve resources before they go public.
- **User Management**: Ability to suspend users, manage roles, and monitor system-wide activity.
- **Analytics Dashboard**: Visual overview of platform growth, popular subjects, and contributor engagement.

### 🎨 Premium UI/UX
- **"Forest Cream" Design Language**: A curated, harmonious color palette inspired by nature and academic excellence.
- **Liquid Motion Suite**: Smooth, staggered entrance animations and tactile micro-interactions for a premium feel.
- **Zero-Scroll Dashboards**: Optimized layouts that fit perfectly within the viewport.

---

## 🏗️ Project Architecture

The project is structured as a **monorepo** utilizing npm workspaces for efficient dependency management and orchestrated service launches.

```text
Academic-Resource-Hub/
├── frontend/          # 🎓 Student & Faculty Portal (Vite + React)
├── admin-panel/       # 🛡️ Administrator HUD (Vite + React)
├── backend/           # 🖥️  Express API Gateway (Node.js + PostgreSQL)
└── package.json       # Root orchestrator with concurrently
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** (via Supabase)
- **Supabase Account** for Auth and Storage

### 2. Installation
Install all dependencies for all modules with a single command from the root directory:
```bash
npm install
```

### 3. Environment Configuration
Create `.env` files in each module based on their respective `.env.example` templates.

#### Backend (`backend/.env`):
```ini
DATABASE_URL=your_postgres_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEYS=key1,key2  # Supports rotation
PORT=5000
```

#### Frontend & Admin (`frontend/.env` & `admin-panel/.env`):
```ini
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000
```

### 4. Running the Development Suite
Launch all services simultaneously with labelled logs:
```bash
npm run dev
```
- **Student Portal**: `http://localhost:5173`
- **Admin HUD**: `http://localhost:5100`
- **API Server**: `http://localhost:5000`

---

## 🚀 One-Click Deployment (Render Blueprint)

This project is pre-configured for automated deployment on **Render** using the `render.yaml` Blueprint.

### Steps to Deploy:
1.  **Push your code** to GitHub.
2.  Go to the [Render Dashboard](https://dashboard.render.com/).
3.  Click **"New +"** and select **"Blueprint"**.
4.  Connect your repository.
5.  Render will automatically detect the `render.yaml` file and create all three services:
    *   `academic-hub-backend` (Web Service)
    *   `academic-hub-portal` (Static Site)
    *   `academic-hub-admin` (Static Site)
6.  **Configuration**: During the Blueprint setup, you will be prompted to enter your secret environment variables (Database URL, Supabase keys, Gemini keys).

---

## 🔐 Role-Based Access Control (RBAC)

| Role | Responsibility | Capability |
|:---:|---|---|
| **Student** | Resource Consumption | Browse, Download, AI Chat, Course Notifications |
| **Faculty** | Content Contribution | Upload Materials, Manage own resources, AI Summaries |
| **Admin** | System Governance | Verify Content, Manage Users, Platform Analytics |

> [!TIP]
> **Faculty Auto-Verification**: Users registering with an institutional email (e.g., `@rru.ac.in`) are automatically granted Faculty permissions.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, React Router v7, Socket.IO Client.
- **Backend**: Node.js, Express, PostgreSQL (via `pg-pool`), Socket.IO Server.
- **AI/ML**: Google Gemini 2.0 Flash, Groq (Llama 3.1), Tesseract.js (OCR).
- **Cloud Infrastructure**: Supabase (Auth, DB, Storage), Cloudinary (Image optimization).
- **Styling**: Modern Vanilla CSS, Liquid Motion Orchestration.

---

## 📜 License
This project is for academic purposes at **Rashtriya Raksha University**. All rights reserved.