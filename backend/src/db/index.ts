import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { neon, Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// The HTTP driver can't run interactive transactions, so writes that need
// row locks (SELECT ... FOR UPDATE) go through this WebSocket pool instead.
// Node 22+ provides a global WebSocket, so no `ws` package is needed.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const txDb = drizzleWs(pool);
