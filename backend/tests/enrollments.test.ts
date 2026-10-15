import { beforeAll, describe, expect, it } from "vitest";

import {
  anonymous,
  createClass,
  createUser,
  enroll,
  enrollmentCount,
  expectStatus,
  type TestUser,
} from "./helpers.js";

describe("POST /api/enrollments", () => {
  let teacher: TestUser;
  let students: TestUser[];

  // Signing up is slow (password hashing + a DB round trip), so share users across tests.
  beforeAll(async () => {
    teacher = await createUser("teacher");
    students = await Promise.all(Array.from({ length: 5 }, () => createUser("student")));
  });

  it("enrolls the signed-in student", async () => {
    const cls = await createClass(teacher);

    const res = await students[0]!.agent.post("/api/enrollments").send({ classId: cls.id });

    expectStatus(res, 201);
    expect(res.body.data.studentId).toBe(students[0]!.id);
  });

  it("ignores a studentId in the body and enrolls the caller", async () => {
    const cls = await createClass(teacher);

    const res = await students[0]!.agent
      .post("/api/enrollments")
      .send({ classId: cls.id, studentId: students[1]!.id });

    expectStatus(res, 201);
    expect(res.body.data.studentId).toBe(students[0]!.id);
  });

  it("requires a session", async () => {
    const cls = await createClass(teacher);

    const res = await anonymous().post("/api/enrollments").send({ classId: cls.id });

    expectStatus(res, 401);
  });

  it("only lets students enroll", async () => {
    const cls = await createClass(teacher);

    const res = await teacher.agent.post("/api/enrollments").send({ classId: cls.id });

    expectStatus(res, 403);
  });

  it.each(["inactive", "archived"] as const)("rejects a %s class", async (status) => {
    const cls = await createClass(teacher, { status });

    const res = await students[0]!.agent.post("/api/enrollments").send({ classId: cls.id });

    expectStatus(res, 409);
    expect(await enrollmentCount(cls.id)).toBe(0);
  });

  it("rejects a full class", async () => {
    const cls = await createClass(teacher, { capacity: 1 });
    await enroll(cls.id, students[0]!.id);

    const res = await students[1]!.agent.post("/api/enrollments").send({ classId: cls.id });

    expectStatus(res, 409);
    expect(res.body.error).toBe("Class is full");
  });

  describe("under concurrent requests", () => {
    it("gives the last seat to exactly one of several students", async () => {
      const cls = await createClass(teacher, { capacity: 1 });

      // Promise.all sends every request before awaiting any of them.
      const responses = await Promise.all(
        students.map((s) => s.agent.post("/api/enrollments").send({ classId: cls.id }))
      );

      const statuses = responses.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409]);
      expect(await enrollmentCount(cls.id)).toBe(1);
    });

    it("creates one enrollment when a student double-submits", async () => {
      const cls = await createClass(teacher);

      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          students[0]!.agent.post("/api/enrollments").send({ classId: cls.id })
        )
      );

      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await enrollmentCount(cls.id)).toBe(1);
    });
  });
});
