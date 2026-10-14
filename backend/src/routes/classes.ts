import express from "express";
import { and, desc, eq, getTableColumns, ilike, ne, sql } from "drizzle-orm";

import { db, txDb } from "../db/index.js";
import { requireRole } from "../middleware/auth.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import { getPgErrorCode, PG_FOREIGN_KEY_VIOLATION } from "../lib/db-errors.js";
import {
  classCreateSchema,
  classUpdateSchema,
  formatZodError,
} from "../lib/validation.js";

const router = express.Router();

// Get all classes with optional search, subject, teacher, status filters, and pagination.
// Archived classes are hidden unless status=archived or status=all.
router.get("/", async (req, res) => {
  try {
    const { search, subject, teacher, status, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(ilike(classes.name, `%${search}%`));
    }

    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }

    if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    if (status === "active" || status === "inactive" || status === "archived") {
      filterConditions.push(eq(classes.status, status));
    } else if (status !== "all") {
      filterConditions.push(ne(classes.status, "archived"));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Classes for the signed-in user: ones they're enrolled in (student) or teach (teacher).
// Registered before "/:id" so "mine" isn't parsed as an id.
router.get("/mine", requireRole("teacher", "student"), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const { id: userId, role } = req.user!;

    const whereClause =
      role === "teacher"
        ? eq(classes.teacherId, userId)
        : eq(enrollments.studentId, userId);

    // Students reach their classes through enrollments; teachers own them directly
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .$dynamic();
    const listQuery = db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .$dynamic();

    if (role === "student") {
      countQuery.innerJoin(enrollments, eq(enrollments.classId, classes.id));
      listQuery.innerJoin(enrollments, eq(enrollments.classId, classes.id));
    }

    const countResult = await countQuery.where(whereClause);
    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await listQuery
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes/mine error:", error);
    res.status(500).json({ error: "Failed to fetch your classes" });
  }
});

// The FK only guarantees the user exists; a class must be taught by a teacher.
const isTeacher = async (userId: string) => {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId));
  return row?.role === "teacher";
};

router.post("/", requireRole("admin", "teacher"), async (req, res) => {
  try {
    const parsed = classCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { schedules = [], ...values } = parsed.data;

    // Teachers can only create classes they teach; admins can assign any teacher
    if (req.user!.role === "teacher" && values.teacherId !== req.user!.id) {
      return res
        .status(403)
        .json({ error: "Teachers can only create classes for themselves" });
    }

    if (!(await isTeacher(values.teacherId))) {
      return res.status(400).json({ error: "teacherId must belong to a teacher" });
    }

    const [createdClass] = await db
      .insert(classes)
      .values({ ...values, schedules })
      .returning({ id: classes.id });

    if (!createdClass) throw Error;

    res.status(201).json({ data: createdClass });
  } catch (error) {
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      return res.status(400).json({ error: "Subject does not exist" });
    }
    console.error("POST /classes error:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Get class details with counts
router.get("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const [classDetails] = await db
      .select({
        ...getTableColumns(classes),
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
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.id, classId));

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(200).json({ data: classDetails });
  } catch (error) {
    console.error("GET /classes/:id error:", error);
    res.status(500).json({ error: "Failed to fetch class details" });
  }
});

// Admins can edit any class; teachers only their own and cannot reassign it.
// Archiving is a PATCH with { status: "archived" }.
router.patch("/:id", requireRole("admin", "teacher"), async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const parsed = classUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const changes = parsed.data;
    const { id: userId, role } = req.user!;

    if (changes.teacherId !== undefined) {
      if (role === "teacher" && changes.teacherId !== userId) {
        return res
          .status(403)
          .json({ error: "Only admins can reassign a class to another teacher" });
      }
      if (!(await isTeacher(changes.teacherId))) {
        return res
          .status(400)
          .json({ error: "teacherId must belong to a teacher" });
      }
    }

    // Ownership and capacity rules live in the WHERE clause, so the check and
    // the write happen in one statement.
    const conditions = [eq(classes.id, classId)];
    if (role === "teacher") {
      conditions.push(eq(classes.teacherId, userId));
    }
    if (changes.capacity !== undefined) {
      conditions.push(
        sql`${changes.capacity} >= (select count(*) from ${enrollments} where ${enrollments.classId} = ${classes.id})`
      );
    }

    // Lock the row first, the same lock POST /enrollments takes. A single
    // statement would count enrollments from a snapshot taken before it waited
    // on that lock, so it could miss a student who just enrolled.
    const updatedClass = await txDb.transaction(async (tx) => {
      await tx
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.id, classId))
        .for("update");

      const [row] = await tx
        .update(classes)
        .set(changes)
        .where(and(...conditions))
        .returning();

      return row;
    });

    if (updatedClass) {
      return res.status(200).json({ data: updatedClass });
    }

    // Nothing matched. Work out why; this only runs on the failure path.
    const [existing] = await db
      .select({ teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, classId));

    // Same 404 for "missing" and "not yours", so teachers can't probe other classes.
    if (!existing || (role === "teacher" && existing.teacherId !== userId)) {
      return res.status(404).json({ error: "Class not found" });
    }

    const [enrolled] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.classId, classId));

    res.status(409).json({
      error: `Capacity cannot be lower than the ${enrolled?.count ?? 0} student(s) already enrolled`,
    });
  } catch (error) {
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      return res.status(400).json({ error: "Subject does not exist" });
    }
    console.error("PATCH /classes/:id error:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// Hard delete is admin-only and only for classes nobody has enrolled in
// (e.g. created by mistake). Classes with students should be archived instead.
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const [deletedClass] = await db
      .delete(classes)
      .where(
        and(
          eq(classes.id, classId),
          sql`not exists (select 1 from ${enrollments} where ${enrollments.classId} = ${classes.id})`
        )
      )
      .returning({ id: classes.id });

    if (deletedClass) {
      return res.status(200).json({ data: deletedClass });
    }

    const [enrolled] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.classId, classId));

    if (!enrolled?.count) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(409).json({
      error: `This class has ${enrolled.count} enrolled student(s). Archive it instead.`,
    });
  } catch (error) {
    console.error("DELETE /classes/:id error:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// List users in a class by role with pagination
router.get("/:id/users", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const groupByFields = [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.imageCldPubId,
      user.createdAt,
      user.updatedAt,
    ];

    const countResult =
      role === "teacher"
        ? await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes/:id/users error:", error);
    res.status(500).json({ error: "Failed to fetch class users" });
  }
});

// Remove a student from a class. Students can drop themselves, teachers can
// remove students from classes they teach, admins can remove anyone.
router.delete("/:id/students/:studentId", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { studentId } = req.params;
    const { id: userId, role } = req.user!;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    if (role === "student" && studentId !== userId) {
      return res
        .status(403)
        .json({ error: "Students can only drop their own enrollments" });
    }

    const conditions = [
      eq(enrollments.classId, classId),
      eq(enrollments.studentId, studentId),
    ];
    // Ownership is checked in the same statement as the delete.
    if (role === "teacher") {
      conditions.push(
        sql`exists (select 1 from ${classes} where ${classes.id} = ${classId} and ${classes.teacherId} = ${userId})`
      );
    }

    const [removed] = await db
      .delete(enrollments)
      .where(and(...conditions))
      .returning({ id: enrollments.id });

    // Same 404 for "not enrolled" and "not your class".
    if (!removed) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    res.status(200).json({ data: removed });
  } catch (error) {
    console.error("DELETE /classes/:id/students/:studentId error:", error);
    res.status(500).json({ error: "Failed to remove student from class" });
  }
});

export default router;
