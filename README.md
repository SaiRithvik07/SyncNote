# ✏️ SyncNote

<div align="center">

**Real-time collaborative document editing — built for teams who think out loud together.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)](https://postgresql.org)

</div>

---

## 📖 About

SyncNote is a full-stack collaborative writing platform where multiple users can edit the same document simultaneously. Powered by **Yjs CRDT** for conflict-free real-time merges and **Socket.IO** for presence and cursor broadcasting — changes appear instantly for every collaborator, no refresh needed.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔴 **Real-time Editing** | Yjs CRDT ensures conflict-free simultaneous edits across all connected clients |
| 👥 **Live Presence** | See who's in the document with colored avatars, cursor labels, and typing indicators |
| 📝 **Rich Text Editor** | TipTap-powered — bold, italic, headings, lists, code blocks, blockquotes & more |
| 🕐 **Version History** | Auto-saves on idle; manually checkpoint versions and restore any past draft |
| 🔐 **Access Control** | Invite collaborators by email with `OWNER`, `EDITOR`, or `VIEWER` roles |
| 🔑 **Auth** | Secure JWT-based signup/login with bcrypt password hashing |
| 📱 **Responsive** | Works across screen sizes with a polished warm-toned design system |

---

## 🏗️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org)** — App Router, React Server Components
- **[TipTap](https://tiptap.dev)** — Headless rich text editor
- **[Yjs](https://yjs.dev)** — CRDT-based real-time data sync
- **[TanStack Query](https://tanstack.com/query)** — Async state management
- **[Zustand](https://zustand-demo.pmnd.rs)** — Lightweight UI state
- **Vanilla CSS** — Custom design tokens, no framework overhead

### Backend
- **[Express.js](https://expressjs.com)** — REST API server
- **[Socket.IO](https://socket.io)** — WebSocket real-time events
- **[Prisma](https://prisma.io)** — Type-safe ORM
- **[PostgreSQL](https://postgresql.org)** — Relational database
- **[JWT](https://jwt.io)** + **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** — Auth
- **[Docker](https://docker.com)** — Containerisation

---

## 📁 Project Structure

```
SyncNote/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data models: User, Document, Collaborator, Version
│   │   └── migrations/
│   └── src/
│       ├── config/              # Prisma client, env loader
│       ├── controllers/         # Request handlers (auth, documents, collaborators, versions)
│       ├── middlewares/         # JWT auth guard, role authorisation, error handler
│       ├── routes/              # Express routers
│       ├── services/            # Business logic layer
│       ├── socket/              # Socket.IO room & awareness handler
│       ├── types/               # Express type augmentation
│       ├── utils/               # Custom error classes
│       └── server.ts            # App entry point
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Landing page
    │   ├── dashboard/           # Document management dashboard
    │   ├── documents/[id]/      # Real-time collaborative editor
    │   ├── login/               # Sign in
    │   ├── register/            # Sign up
    │   ├── globals.css          # Design system & CSS tokens
    │   └── layout.tsx           # Root layout with Google Fonts
    ├── components/
    │   ├── Editor.tsx           # TipTap + Yjs editor component
    │   ├── PresenceBar.tsx      # Live collaborator avatars
    │   ├── CollaboratorModal.tsx
    │   └── VersionHistoryModal.tsx
    ├── lib/
    │   ├── api.ts               # Typed API client (fetch wrapper)
    │   ├── socket.ts            # Socket.IO singleton
    │   └── env.ts               # Environment variables
    └── store/
        └── useUiStore.ts        # Zustand store for modal state
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL (local or cloud)

### 1 · Clone

```bash
git clone https://github.com/SaiRithvik07/SyncNote.git
cd SyncNote
```

### 2 · Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/syncnote"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

Run migrations and start:

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

Server runs at `http://localhost:5000`.

### 3 · Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

Start:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## 📡 REST API Reference

### Authentication

```
POST /api/auth/register    → { name, email, password }
POST /api/auth/login       → { email, password }
```

### Documents

```
GET    /api/documents            → list documents (owned + shared)
POST   /api/documents            → create document
GET    /api/documents/:id        → get document
PUT    /api/documents/:id        → update title / content
DELETE /api/documents/:id        → delete document
```

### Collaborators

```
GET    /api/documents/:id/collaborators   → list collaborators
POST   /api/documents/:id/collaborators   → invite { email, role }
PUT    /api/collaborators/:id             → update role
DELETE /api/collaborators/:id             → remove collaborator
```

### Version History

```
GET  /api/documents/:id/versions     → list versions
POST /api/documents/:id/versions     → create checkpoint
POST /api/versions/:id/restore       → restore version
```

> All protected routes require `Authorization: Bearer <token>` header.

---

## 🔌 Socket.IO Events

| Event | Who emits | Payload | Description |
|-------|-----------|---------|-------------|
| `join-document` | Client | `{ documentId, token }` | Join a document room |
| `leave-document` | Client | `{ documentId }` | Leave the room |
| `doc-update` | Client ↔ Server | Uint8Array (Yjs update) | CRDT document sync |
| `awareness-update` | Client ↔ Server | Uint8Array (Yjs awareness) | Cursor & presence sync |
| `user-joined` | Server | `{ userId, name, color }` | New user entered |
| `user-left` | Server | `{ userId }` | User left |

---

## 🧑‍💻 Author

**Sai Rithvik** — [@SaiRithvik07](https://github.com/SaiRithvik07)
