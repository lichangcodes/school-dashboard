// Points the tests at the test database and refuses to run against the dev one.
// Imported by both global-setup.ts and setup.ts, before anything touches the DB.
import fs from "node:fs";
import dotenv from "dotenv";

// Locally the test settings live in .env.test; in CI they come from the
// workflow's environment and this file simply doesn't exist.
dotenv.config({ path: ".env.test", override: true, quiet: true });

const devUrl = fs.existsSync(".env")
  ? dotenv.parse(fs.readFileSync(".env")).DATABASE_URL
  : undefined;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Create backend/.env.test (see .env.test.example).");
}

// The tests wipe every table, so never let them near the database in .env.
if (devUrl && process.env.DATABASE_URL === devUrl) {
  throw new Error("Refusing to run: .env.test points at the same database as .env.");
}
