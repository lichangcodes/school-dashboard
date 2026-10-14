// Runs once before the whole test run: bring the schema up to date, then
// start from empty tables so results don't depend on leftover data.
import "./env.js";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

export default async function setup() {
  const sql = neon(process.env.DATABASE_URL!);
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  await sql`truncate enrollments, classes, subjects, departments, session, account, verification, "user" restart identity cascade`;
}
