import { count, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db/index.js";
import { classes, departments, enrollments, subjects, user } from "../src/db/schema/index.js";
import { createClass, createUser, expectStatus, type TestUser } from "./helpers.js";

const countRows = async (table: typeof user | typeof departments | typeof subjects | typeof classes | typeof enrollments) => {
  const [row] = await db.select({ n: count() }).from(table);
  return row!.n;
};

describe("GET /api/stats", () => {
  let teacher: TestUser;

  // More rows than a default page (10), the case the old dashboard got wrong.
  beforeAll(async () => {
    teacher = await createUser("teacher");
    for (let i = 0; i < 12; i++) await createClass(teacher);
  });

  it("counts every row, as numbers", async () => {
    const res = await teacher.agent.get("/api/stats/overview");

    expectStatus(res, 200);
    const [students] = await db.select({ n: count() }).from(user).where(eq(user.role, "student"));
    expect(res.body.data).toEqual({
      users: await countRows(user),
      teachers: expect.any(Number),
      admins: expect.any(Number),
      students: students!.n,
      subjects: await countRows(subjects),
      departments: await countRows(departments),
      classes: await countRows(classes),
      enrollments: await countRows(enrollments),
    });
    expect(res.body.data.classes).toBeGreaterThan(10);
  });

  it("returns chart totals as numbers", async () => {
    const res = await teacher.agent.get("/api/stats/charts");

    expectStatus(res, 200);
    const { usersByRole, subjectsByDepartment, classesBySubject } = res.body.data;
    for (const row of [...usersByRole, ...subjectsByDepartment, ...classesBySubject]) {
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith("total")) expect(typeof value).toBe("number");
      }
    }
  });
});
