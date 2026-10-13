import { z } from "zod";

// Unknown keys are stripped, so only these fields can ever reach the database.
export const departmentCreateSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().nullish(),
});

export const departmentUpdateSchema = departmentCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export const subjectCreateSchema = z.object({
  departmentId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().nullish(),
});

export const subjectUpdateSchema = subjectCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM (24-hour)");

const scheduleSchema = z
  .object({
    day: z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    startTime: timeOfDay,
    endTime: timeOfDay,
  })
  // Zero-padded HH:MM strings compare correctly as strings.
  .refine((s) => s.startTime < s.endTime, {
    message: "endTime must be after startTime",
  });

export const classCreateSchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  teacherId: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().nullish(),
  capacity: z.coerce.number().int().positive().max(1000),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  bannerUrl: z.string().url().nullish(),
  bannerCldPubId: z.string().nullish(),
  schedules: z.array(scheduleSchema).max(14).optional(),
});

export const classUpdateSchema = classCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

// First issue only; enough for a form toast.
export const formatZodError = (error: z.ZodError) => {
  const issue = error.issues[0];
  if (!issue) return "Invalid request body";
  return issue.path.length > 0
    ? `${issue.path.join(".")}: ${issue.message}`
    : issue.message;
};
