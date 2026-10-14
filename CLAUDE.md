# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

University management dashboard. Monorepo with two independent npm projects (no workspaces). Run commands from inside each folder:

- `frontend/` — React 19 + Refine SPA (Vite, Tailwind, shadcn/ui)
- `backend/` — Express 5 REST API + Drizzle ORM on Postgres (Neon) + Better Auth

## Commands

Backend (`cd backend`):
- `npm run dev` — tsx watch on `src/index.ts`, serves `http://localhost:8000`. `src/app.ts` builds the Express app; `index.ts` only adds APM and calls `listen`.
- `npm run build` / `npm start` — `tsc` to `dist/`, then `node dist/index.js`
- `npx tsc --noEmit -p .` — typecheck
- `npm run db:generate` — builds first, because `drizzle.config.ts` reads the schema from `dist/db/schema/*.js`, not `src`. Run it after editing `src/db/schema/*`, then `npm run db:migrate`.
- `npm run db:seed` — **deletes all rows** in every table, then reloads `seed/data.json`. Seed logins: `Admin#1234` / `Teach#1234` etc., see `data.json`.

Frontend (`cd frontend`):
- `npm run dev` (Refine CLI wrapper around Vite, port 5173), `npm run build` (runs `tsc` then build)
- `npx eslint .` — lint (no npm script)

Backend tests (`cd backend`): `npm test` (Vitest + Supertest, in-process against `src/app.ts`), `npm run test:watch`, `npx tsc -p tests` to typecheck them. They need `backend/.env.test` (copy `.env.test.example`) pointing at a **separate Neon branch**: `tests/global-setup.ts` runs migrations and then truncates every table. `tests/env.ts` refuses to run if `.env.test` and `.env` share a `DATABASE_URL`. Test files run one at a time because they share the database. `tests/helpers.ts` signs users up through the real auth endpoint (admins are promoted in the DB) and inserts departments, subjects and classes directly. CI (`.github/workflows/ci.yml`) runs the backend typecheck and tests with the `TEST_DATABASE_URL` repo secret, and the frontend lint and build. The frontend has no tests.

Env: copy `.env.example` → `.env` in each folder. The frontend's `VITE_BACKEND_BASE_URL` must end in `/api/` (the auth client appends `auth`, the data provider appends resource names). The backend's `FRONTEND_URL` drives both CORS and Better Auth `trustedOrigins`.

## Architecture

### Request flow and auth
- Better Auth is mounted at `/api/auth/*splat` **before** `express.json()` (it parses its own body). Session lives in a cookie. Frontend and backend run on different origins, so the frontend data provider (`frontend/src/providers/data.ts`) passes `credentials: "include"` to ky.
- Every resource router is mounted with `requireAuth` in `backend/src/index.ts`. It sets `req.user = { id, role }` (type in `src/express.d.ts`). Write routes add `requireRole(...)` from `src/middleware/auth.ts`.
- Current rules: departments and subjects are created, edited and deleted by admins only. Classes are created and edited by admins or teachers. A teacher must be the class's `teacherId`, can only edit their own classes, and cannot reassign one. `teacherId` must belong to a user with role `teacher`. "Deleting" a class normally means archiving it (`PATCH { status: "archived" }`). Archived classes are hidden from `GET /classes` unless `status=archived` or `status=all` is passed. Only `active` classes accept enrollments; inactive, archived and full classes return 409. Hard `DELETE` is admin-only and refused (409) while the class has enrollments. `capacity` cannot drop below the current enrollment count. Enrollments are created by students only, and `studentId` always comes from `req.user`, never the body. `DELETE /classes/:id/students/:studentId` removes an enrollment: students may drop only themselves, teachers may remove students only from classes they teach, admins may remove anyone. `GET /classes/mine` (teacher/student only) returns the caller's taught or enrolled classes and backs the frontend "My Classes" page. Fixed-path routes like `/mine` must be registered before `/:id`.
- `role` is a Better Auth `additionalField` with `input: true`. `databaseHooks` in `src/lib/auth.ts` enforce two things: sign-up only allows `student` or `teacher`, and any update containing `role` is rejected. Rejecting is required because Better Auth **merges** a before-hook's returned data over the original, so stripping a field there has no effect. Admins exist only via seed or direct DB writes.
- Frontend `accessControlProvider` (`providers/access-control.ts`) mirrors the backend role rules to hide buttons and sidebar items (sidebar items are wrapped in `CanAccess`). Keep it in sync with backend `requireRole` usage; the backend is the real enforcement.
- `authProvider.check` validates against `authClient.getSession()` and caches the user in `localStorage` (`getIdentity` and the access-control role come from there). A ky `afterResponse` hook converts every non-2xx response into a Refine `HttpError` whose message is the backend's `{ error }` text. This is needed because `@refinedev/rest`'s `getList`/`getOne`/`deleteOne` don't check `response.ok` (`deleteOne` would report a 409 as success), and its default create/update error message is the raw JSON body. A 401 triggers logout via `authProvider.onError`.

### Backend conventions
- Routes are hand-written Drizzle queries in `src/routes/*.ts`, one router per resource. List endpoints take `search`, `page`, `limit` (plus resource-specific filters) and return `{ data, pagination: { page, limit, total, totalPages } }`. Single items return `{ data }`. Errors return `{ error }`.
- Request bodies for writes are parsed with zod schemas in `src/lib/validation.ts` (unknown keys are stripped, so they act as a field whitelist). Invalid input returns 400.
- Postgres constraint errors map to HTTP via `src/lib/db-errors.ts`. Drizzle wraps driver errors, so the code is on `error.cause.code`. A unique violation (23505) returns 409. A foreign key violation (23503) returns 409 on delete (children still exist) and 400 on create/update (referenced row missing).
- Foreign keys in the department → subject → class chain are `ON DELETE RESTRICT`, so a delete fails while children exist. Enrollments still cascade from classes and users.
- Imports use `.js` extensions (ESM, `"type": "module"`).
- `src/db/index.ts` exports two clients. `db` uses `drizzle-orm/neon-http`, which **does not support interactive transactions**. `txDb` uses a `neon-serverless` WebSocket Pool and is for `txDb.transaction(...)` with row locks. `POST /enrollments` and `PATCH /classes/:id` both take `SELECT ... FOR UPDATE` on the class row, so seat counting and capacity changes are serialized per class. Inside the lock, count enrollments in a separate statement: a single statement's subquery uses a snapshot taken before it waited on the lock.
- Schema: `src/db/schema/auth.ts` holds the Better Auth tables (`user` with a `role` pg enum) and `app.ts` holds departments → subjects → classes → enrollments. `classes.schedules` is jsonb. `enrollments_student_class_unique` is a unique constraint, so duplicate enrollments fail with 23505.
- `src/middleware/security.ts` (Arcjet rate limiting) exists but is commented out in `index.ts`. `src/config/arcjet.ts` throws at import time without `ARCJET_KEY`.
- APM (`apminsight`) is loaded dynamically at startup and fails silently if absent. `apminsightnode.json` holds a license key and is gitignored.

### Frontend conventions
- Refine `resources` in `App.tsx` define both routes and sidebar menu. The `users` resource is shown as "Faculty" at `/faculty`.
- `providers/data.ts` maps Refine filters to backend query params per resource. Add a mapping there when adding a new filter.
- `components/ui/*` is generated shadcn/ui and `components/refine-ui/*` is Refine's shadcn templates. Pages live in `src/pages/<resource>/{list,create,show,edit}.tsx`, with form validation via zod schemas in `src/lib/schema.ts`. Create and edit share a `form.tsx` component. An edit page uses `queryOptions.select` to unwrap the nested `GET /:id` payload (e.g. `{ department, totals }`) into form values.
- `ShowViewHeader` shows Edit only when the resource has an `edit` route, and Delete only when it has `meta.canDelete`. Both are still gated by `accessControlProvider`. A successful delete navigates to the list. `accessControlProvider` only sees the resource and id, never the record, so record-level rules (a teacher editing only their own class) are checked on the page and passed in via `ShowViewHeader`'s `canEdit` prop. Extra buttons, such as Archive, go in `actionsSlot`.
- Nested deletes reuse `DeleteButton`: `resource="classes/:id/students"` plus `recordItemId=<studentId>` hits `DELETE /classes/:id/students/:studentId` through `deleteOne`. Pass `accessControl={{ enabled: false }}` when the page decides visibility, and set `successNotification`, `confirmTitle` and `confirmOkText`. Refine only invalidates the delete's own resource, so `onSuccess` must call `useInvalidate()` for the table's resource (e.g. `classes/mine` or `classes/:id/users`).
- Radix `Select` fires `onValueChange("")` when its value goes from `undefined` to a real value, which wipes a form field as an edit page loads. Guard select handlers against `""` (see `ignoreEmpty` in `pages/classes/form.tsx`), or give the field a defined default value.
- Images upload directly from the browser to Cloudinary (`components/upload-widget.tsx`). The backend stores only the URL and public id.
