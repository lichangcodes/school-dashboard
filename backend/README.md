# Classroom: Backend API

Express 5 REST API with Drizzle ORM, Better Auth and Postgres (Neon). The [root README](../README.md) has the project overview, permissions, API reference and setup.

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed   # optional; deletes all rows, then loads sample data
npm run dev       # http://localhost:8000

# tests: need .env.test pointing at a separate, disposable database
cp .env.test.example .env.test
npm test
```
