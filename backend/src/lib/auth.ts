import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

// Roles a user may pick for themselves at sign-up. Admins are created out of band (seed / DB).
const SELF_ASSIGNABLE_ROLES = ["student", "teacher"];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  // The app has no UI for these, and on the public demo anyone could use them
  // to change a shared demo account's password or name.
  disabledPaths: [
    "/change-password",
    "/update-user",
    "/revoke-sessions",
    "/revoke-other-sessions",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: true, // Allow role to be set during registration
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true, // Allow imageCldPubId to be set during registration
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!SELF_ASSIGNABLE_ROLES.includes(user.role as string)) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid role. Choose student or teacher.",
            });
          }
        },
      },
      update: {
        // `role` is an input field, so without this a user could promote themselves via /update-user.
        // Reject rather than strip it: Better Auth merges the hook's returned data over the original.
        before: async (data) => {
          if ("role" in data) {
            throw new APIError("FORBIDDEN", {
              message: "Role cannot be changed",
            });
          }
        },
      },
    },
  },
});
