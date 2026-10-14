// Shared test setup. Records the test isn't about (departments, subjects,
// classes) are inserted straight into the database. Users sign up through the
// real auth endpoint so each one gets a real session cookie.
import request from "supertest";
import { count, eq } from "drizzle-orm";

import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { classes, departments, enrollments, subjects, user } from "../src/db/schema/index.js";

type Role = "admin" | "teacher" | "student";

export type TestUser = {
  id: string;
  // A supertest agent keeps cookies between requests, like a browser does.
  agent: ReturnType<typeof request.agent>;
};

// Unique suffix so records from different tests never collide on unique columns.
let seq = 0;
const unique = () => `${Date.now()}-${seq++}`;

export const anonymous = () => request(app);

export const createUser = async (role: Role): Promise<TestUser> => {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/sign-up/email")
    .set("Origin", process.env.FRONTEND_URL!)
    .send({
      name: `Test ${role}`,
      email: `${role}-${unique()}@test.local`,
      password: "Test#123456",
      // Sign-up refuses "admin", so admins sign up as students and are promoted in the DB,
      // the same way real admins only come from the seed.
      role: role === "admin" ? "student" : role,
    });

  if (res.status !== 200) {
    throw new Error(`Sign-up failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const id: string = res.body.user.id;
  if (role === "admin") {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, id));
  }

  return { id, agent };
};

export const createClass = async (
  teacher: TestUser,
  overrides: Partial<typeof classes.$inferInsert> = {}
) => {
  const [department] = await db
    .insert(departments)
    .values({ code: `D-${unique()}`, name: "Test Department" })
    .returning();
  const [subject] = await db
    .insert(subjects)
    .values({ departmentId: department!.id, code: `S-${unique()}`, name: "Test Subject" })
    .returning();
  const [created] = await db
    .insert(classes)
    .values({
      subjectId: subject!.id,
      teacherId: teacher.id,
      name: "Test Class",
      capacity: 10,
      schedules: [],
      ...overrides,
    })
    .returning();

  return created!;
};

export const enroll = (classId: number, studentId: string) =>
  db.insert(enrollments).values({ classId, studentId });

export const enrollmentCount = async (classId: number) => {
  const [row] = await db
    .select({ n: count() })
    .from(enrollments)
    .where(eq(enrollments.classId, classId));
  return row!.n;
};
