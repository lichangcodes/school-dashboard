import { beforeAll, describe, expect, it } from "vitest";

import { createClass, createUser, enroll, enrollmentCount, type TestUser } from "./helpers.js";

let admin: TestUser;
let teacher: TestUser;
let otherTeacher: TestUser;
let student: TestUser;
let otherStudent: TestUser;

beforeAll(async () => {
  [admin, teacher, otherTeacher, student, otherStudent] = await Promise.all([
    createUser("admin"),
    createUser("teacher"),
    createUser("teacher"),
    createUser("student"),
    createUser("student"),
  ]);
});

describe("PATCH /api/classes/:id", () => {
  it("lets a teacher edit their own class", async () => {
    const cls = await createClass(teacher);

    const res = await teacher.agent.patch(`/api/classes/${cls.id}`).send({ name: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed");
  });

  it("hides another teacher's class behind a 404", async () => {
    const cls = await createClass(otherTeacher);

    const res = await teacher.agent.patch(`/api/classes/${cls.id}`).send({ name: "Hijacked" });

    // 404, not 403, so teachers can't probe which class ids exist.
    expect(res.status).toBe(404);
  });

  it("stops a teacher from reassigning their class", async () => {
    const cls = await createClass(teacher);

    const res = await teacher.agent
      .patch(`/api/classes/${cls.id}`)
      .send({ teacherId: otherTeacher.id });

    expect(res.status).toBe(403);
  });

  it("lets an admin reassign a class", async () => {
    const cls = await createClass(teacher);

    const res = await admin.agent
      .patch(`/api/classes/${cls.id}`)
      .send({ teacherId: otherTeacher.id });

    expect(res.status).toBe(200);
    expect(res.body.data.teacherId).toBe(otherTeacher.id);
  });

  it("refuses a capacity below the current enrollment", async () => {
    const cls = await createClass(teacher, { capacity: 5 });
    await enroll(cls.id, student.id);
    await enroll(cls.id, otherStudent.id);

    const res = await teacher.agent.patch(`/api/classes/${cls.id}`).send({ capacity: 1 });

    expect(res.status).toBe(409);
  });

  it("forbids students", async () => {
    const cls = await createClass(teacher);

    const res = await student.agent.patch(`/api/classes/${cls.id}`).send({ name: "Mine now" });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/classes/:id", () => {
  it("is admin-only", async () => {
    const cls = await createClass(teacher);

    const res = await teacher.agent.delete(`/api/classes/${cls.id}`);

    expect(res.status).toBe(403);
  });

  it("refuses to delete a class that has students", async () => {
    const cls = await createClass(teacher);
    await enroll(cls.id, student.id);

    const res = await admin.agent.delete(`/api/classes/${cls.id}`);

    expect(res.status).toBe(409);
    expect(await enrollmentCount(cls.id)).toBe(1);
  });

  it("deletes an empty class", async () => {
    const cls = await createClass(teacher);

    const res = await admin.agent.delete(`/api/classes/${cls.id}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/classes", () => {
  it("hides archived classes unless asked for", async () => {
    const name = `Archived ${Date.now()}`;
    await createClass(teacher, { name, status: "archived" });

    const hidden = await student.agent.get("/api/classes").query({ search: name });
    const shown = await student.agent.get("/api/classes").query({ search: name, status: "all" });

    expect(hidden.body.data).toHaveLength(0);
    expect(shown.body.data).toHaveLength(1);
  });
});

describe("DELETE /api/classes/:id/students/:studentId", () => {
  it("lets a student drop themselves", async () => {
    const cls = await createClass(teacher);
    await enroll(cls.id, student.id);

    const res = await student.agent.delete(`/api/classes/${cls.id}/students/${student.id}`);

    expect(res.status).toBe(200);
    expect(await enrollmentCount(cls.id)).toBe(0);
  });

  it("stops a student from dropping someone else", async () => {
    const cls = await createClass(teacher);
    await enroll(cls.id, otherStudent.id);

    const res = await student.agent.delete(`/api/classes/${cls.id}/students/${otherStudent.id}`);

    expect(res.status).toBe(403);
    expect(await enrollmentCount(cls.id)).toBe(1);
  });

  it("lets a teacher remove a student from their own class", async () => {
    const cls = await createClass(teacher);
    await enroll(cls.id, student.id);

    const res = await teacher.agent.delete(`/api/classes/${cls.id}/students/${student.id}`);

    expect(res.status).toBe(200);
  });

  it("stops a teacher from removing students from another teacher's class", async () => {
    const cls = await createClass(otherTeacher);
    await enroll(cls.id, student.id);

    const res = await teacher.agent.delete(`/api/classes/${cls.id}/students/${student.id}`);

    expect(res.status).toBe(404);
    expect(await enrollmentCount(cls.id)).toBe(1);
  });

  it("lets an admin remove anyone", async () => {
    const cls = await createClass(teacher);
    await enroll(cls.id, student.id);

    const res = await admin.agent.delete(`/api/classes/${cls.id}/students/${student.id}`);

    expect(res.status).toBe(200);
  });
});

describe("POST /api/departments", () => {
  it.each(["teacher", "student"] as const)("forbids a %s", async (role) => {
    const user = role === "teacher" ? teacher : student;

    const res = await user.agent
      .post("/api/departments")
      .send({ code: `X-${Date.now()}`, name: "Nope" });

    expect(res.status).toBe(403);
  });

  it("lets an admin create one", async () => {
    const res = await admin.agent
      .post("/api/departments")
      .send({ code: `CS-${Date.now()}`, name: "Computer Science" });

    expect(res.status).toBe(201);
  });
});
