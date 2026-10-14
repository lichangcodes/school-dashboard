import express from "express";
import { eq, getTableColumns, sql } from "drizzle-orm";

import { db, txDb } from "../db/index.js";
import { requireRole } from "../middleware/auth.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import { getPgErrorCode, PG_UNIQUE_VIOLATION } from "../lib/db-errors.js";
import { enrollmentCreateSchema, formatZodError } from "../lib/validation.js";

const router = express.Router();

const getEnrollmentDetails = async (enrollmentId: number) => {
  const [enrollment] = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
      subject: {
        ...getTableColumns(subjects),
      },
      department: {
        ...getTableColumns(departments),
      },
      teacher: {
        ...getTableColumns(user),
      },
    })
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollment;
};

// Create enrollment. The class row is locked so concurrent requests for the
// same class queue up, and the seat count is read only after the lock is held.
router.post("/", requireRole("student"), async (req, res) => {
  try {
    const parsed = enrollmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { classId } = parsed.data;
    // Always enroll the signed-in student; never trust a studentId from the client
    const studentId = req.user!.id;

    const result = await txDb.transaction(async (tx) => {
      const [classRecord] = await tx
        .select({ status: classes.status, capacity: classes.capacity })
        .from(classes)
        .where(eq(classes.id, classId))
        .for("update");

      if (!classRecord) return { status: 404, error: "Class not found" } as const;

      if (classRecord.status !== "active") {
        return { status: 409, error: "This class is not open for enrollment" } as const;
      }

      // A separate statement, so it sees enrollments committed while we waited for the lock.
      const [enrolled] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.classId, classId));

      if ((enrolled?.count ?? 0) >= classRecord.capacity) {
        return { status: 409, error: "Class is full" } as const;
      }

      // A duplicate enrollment fails here on the unique constraint (23505).
      const [created] = await tx
        .insert(enrollments)
        .values({ classId, studentId })
        .returning({ id: enrollments.id });

      return { status: 201, id: created!.id } as const;
    });

    if (result.status !== 201) {
      return res.status(result.status).json({ error: result.error });
    }

    const enrollment = await getEnrollmentDetails(result.id);

    res.status(201).json({ data: enrollment });
  } catch (error) {
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return res.status(409).json({ error: "Student already enrolled in class" });
    }
    console.error("POST /enrollments error:", error);
    res.status(500).json({ error: "Failed to create enrollment" });
  }
});

export default router;
