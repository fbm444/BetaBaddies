import { asyncHandler } from "./errorHandler.js";
import database from "../services/database.js";

/**
 * Middleware to check if user is an administrator
 * Requires the user to be authenticated first (use after isAuthenticated)
 */
export const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  // Check if user has admin role
  const result = await database.query(
    "SELECT u_id, email, role FROM users WHERE u_id = $1",
    [req.session.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      ok: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  }

  const user = result.rows[0];
  
  if (user.role !== "admin") {
    return res.status(403).json({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Administrator access required",
      },
    });
  }

  // Attach user info to request for use in controllers
  req.user = user;
  next();
});

