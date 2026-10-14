// Fires concurrent requests at a running backend to check that enrollment
// rules hold under races. Creates its own TMP users and classes, then deletes
// them. Usage: start the backend, then `npx tsx scripts/enrollment-race.ts`.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const API = process.env.API_URL ?? "http://localhost:8000/api";
const ORIGIN = process.env.FRONTEND_URL!;
const sql = neon(process.env.DATABASE_URL!);
const tag = `tmp-race-${Date.now()}`;

type Session = { id: string; cookie: string };

const request = async (
  session: Session,
  method: string,
  path: string,
  body?: unknown
) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      cookie: session.cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const signUp = async (name: string, role: "student" | "teacher"): Promise<Session> => {
  const res = await fetch(`${API}/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({
      name: `TMP ${name}`,
      email: `${tag}-${name}@example.com`,
      password: "Tmp#123456",
      role,
    }),
  });
  if (!res.ok) throw new Error(`sign-up ${name} failed: ${res.status} ${await res.text()}`);
  const { user } = await res.json();
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { id: user.id, cookie };
};

const enrolledCount = async (classId: number) => {
  const [row] = await sql`select count(*)::int as n from enrollments where class_id = ${classId}`;
  return row!.n as number;
};

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${detail})`);
  if (!ok) failures++;
};

const main = async () => {
  const [subject] = await sql`select id from subjects limit 1`;
  if (!subject) throw new Error("Need at least one subject in the database");

  const teacher = await signUp("teacher", "teacher");
  const students = await Promise.all(
    Array.from({ length: 5 }, (_, i) => signUp(`student${i}`, "student"))
  );

  const createClass = async (capacity: number, status = "active") => {
    const res = await request(teacher, "POST", "/classes", {
      subjectId: subject.id,
      teacherId: teacher.id,
      name: `TMP ${tag}`,
      capacity,
      status,
    });
    if (res.status !== 201) throw new Error(`create class failed: ${JSON.stringify(res)}`);
    return res.body.data.id as number;
  };

  // 1. Five students race for the last seat.
  const full = await createClass(1);
  const raced = await Promise.all(
    students.map((s) => request(s, "POST", "/enrollments", { classId: full }))
  );
  const created = raced.filter((r) => r.status === 201).length;
  check(
    "capacity 1, 5 concurrent students",
    created === 1 && (await enrolledCount(full)) === 1,
    `${created} created, ${await enrolledCount(full)} rows, statuses ${raced.map((r) => r.status)}`
  );

  // 2. One student double-submits.
  const roomy = await createClass(10);
  const doubled = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(students[0]!, "POST", "/enrollments", { classId: roomy })
    )
  );
  check(
    "same student, 5 concurrent requests",
    (await enrolledCount(roomy)) === 1,
    `${await enrolledCount(roomy)} rows, statuses ${doubled.map((r) => r.status)}`
  );

  // 3. Inactive classes are closed to enrollment.
  const inactive = await createClass(10, "inactive");
  const closed = await request(students[0]!, "POST", "/enrollments", { classId: inactive });
  check("inactive class rejects enrollment", closed.status === 409, `status ${closed.status}`);

  // 4. Shrinking capacity races a new enrollment; enrolled must never exceed capacity.
  let violations = 0;
  for (let round = 0; round < 5; round++) {
    const cls = await createClass(3);
    await request(students[0]!, "POST", "/enrollments", { classId: cls });
    await request(students[1]!, "POST", "/enrollments", { classId: cls });
    await Promise.all([
      request(teacher, "PATCH", `/classes/${cls}`, { capacity: 2 }),
      request(students[2]!, "POST", "/enrollments", { classId: cls }),
    ]);
    const [row] = await sql`select capacity from classes where id = ${cls}`;
    if ((await enrolledCount(cls)) > row!.capacity) violations++;
  }
  check("capacity shrink vs enrollment, 5 rounds", violations === 0, `${violations} over capacity`);
};

const cleanup = async () => {
  await sql`delete from enrollments where class_id in (select id from classes where name = ${`TMP ${tag}`})`;
  await sql`delete from classes where name = ${`TMP ${tag}`}`;
  const users = sql`select id from "user" where email like ${`${tag}-%`}`;
  await sql`delete from enrollments where student_id in (${users})`;
  await sql`delete from session where user_id in (${users})`;
  await sql`delete from account where user_id in (${users})`;
  await sql`delete from "user" where email like ${`${tag}-%`}`;
};

try {
  await main();
} finally {
  await cleanup();
  console.log("cleaned up TMP records");
}
process.exit(failures ? 1 : 0);
