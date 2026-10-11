# Classroom — University Management Dashboard

A full-stack web app for running a university's academic structure: departments, subjects, classes, faculty, and student enrollments. Admins and teachers manage courses and rosters; students join classes with an invite code.

**Stack:** TypeScript · React 19 · Refine · Tailwind CSS · shadcn/ui · Node.js · Express 5 · PostgreSQL (Neon) · Drizzle ORM · Better Auth · Cloudinary

<!-- TODO: add live demo link and a screenshot once deployed
**Live demo:** https://...  (demo login: ...)
![Dashboard screenshot](docs/screenshot.png)
-->

## Features

- **Authentication**: email/password sign-up and sign-in with cookie-based sessions (Better Auth)
- **Roles**: admin, teacher, and student accounts
- **Academic structure**: create and browse departments → subjects → classes, with detail pages showing related records
- **Classes**: teacher assignment, capacity, status (active / inactive / archived), weekly schedules, and banner images uploaded to Cloudinary
- **Enrollment**: enroll students directly or let students join with a unique class invite code; duplicate enrollments are rejected
- **Dashboard**: overview counts, recent activity, and charts (users by role, subjects per department, classes per subject)
- **Data tables**: server-side search, filtering, and pagination on every list view
- **Dark / light theme**

## API overview

| Resource | Endpoints |
| --- | --- |
| Departments | `GET /api/departments`, `POST /api/departments`, `GET /api/departments/:id`, `GET /api/departments/:id/{subjects,classes,users}` |
| Subjects | `GET /api/subjects`, `POST /api/subjects`, `GET /api/subjects/:id`, `GET /api/subjects/:id/{classes,users}` |
| Classes | `GET /api/classes`, `POST /api/classes`, `GET /api/classes/:id`, `GET /api/classes/:id/users` |
| Users | `GET /api/users`, `GET /api/users/:id`, `GET /api/users/:id/{departments,subjects}` |
| Enrollments | `POST /api/enrollments`, `POST /api/enrollments/join` |
| Stats | `GET /api/stats/{overview,latest,charts}` |

List endpoints accept `search`, `page`, and `limit` query parameters and return `{ data, pagination }`.

## Running locally

**Prerequisites:** Node.js 20+, a PostgreSQL database (a free [Neon](https://neon.tech) database works), and a Cloudinary account for image uploads.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, BETTER_AUTH_SECRET, FRONTEND_URL
npm run db:migrate        # apply schema
npm run db:seed           # optional: load sample data
npm run dev               # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # fill in VITE_BACKEND_BASE_URL and Cloudinary settings
npm run dev               # http://localhost:5173
```
