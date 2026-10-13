import type { AccessControlProvider } from "@refinedev/core";

import { User, UserRole } from "@/types";

// Mirrors the backend requireRole checks. The backend is the real enforcement;
// this only hides UI the current user can't use.
const RULES: Record<string, Partial<Record<string, UserRole[]>>> = {
  departments: {
    create: [UserRole.ADMIN],
    edit: [UserRole.ADMIN],
    delete: [UserRole.ADMIN],
  },
  subjects: {
    create: [UserRole.ADMIN],
    edit: [UserRole.ADMIN],
    delete: [UserRole.ADMIN],
  },
  classes: {
    create: [UserRole.ADMIN, UserRole.TEACHER],
    // Teachers may only edit their own classes; the show page checks ownership
    edit: [UserRole.ADMIN, UserRole.TEACHER],
    delete: [UserRole.ADMIN],
  },
  "my-classes": { list: [UserRole.TEACHER, UserRole.STUDENT] },
  enrollments: {
    list: [UserRole.STUDENT],
    create: [UserRole.STUDENT],
  },
};

const getCurrentRole = (): UserRole | undefined => {
  try {
    const user = localStorage.getItem("user");
    return user ? (JSON.parse(user) as User).role : undefined;
  } catch {
    return undefined;
  }
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const allowedRoles = resource ? RULES[resource]?.[action] : undefined;

    if (!allowedRoles) return { can: true };

    const role = getCurrentRole();
    return { can: !!role && allowedRoles.includes(role) };
  },
  options: {
    buttons: {
      hideIfUnauthorized: true,
    },
  },
};
