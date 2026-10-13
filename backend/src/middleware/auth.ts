import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../lib/auth.js";

// Resolve the Better Auth session from the request cookie and attach the user to req.user.
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role as UserRoles,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Failed to verify session" });
  }
};

// Must run after requireAuth.
export const requireRole =
  (...roles: UserRoles[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to perform this action" });
    }

    next();
  };
