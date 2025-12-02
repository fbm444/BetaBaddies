import express from "express";
import userController from "../controllers/userController.js";
import { isAuthenticated, authRateLimit } from "../middleware/auth.js";
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateDeleteAccount,
  validateForgotPassword,
  validateResetPassword
} from "../middleware/validation.js";

const router = express.Router();

// Public routes (no authentication required)
router.post(
  "/register",
  authRateLimit(15 * 60 * 1000, 100), // 100 attempts per 15 minutes (increased for development)
  validateRegister,
  userController.register
);

router.post(
  "/login",
  authRateLimit(15 * 60 * 1000, 100), // 100 attempts per 15 minutes (increased for development)
  validateLogin,
  userController.login
);

// Google OAuth routes
router.get("/auth/google", userController.googleAuth);
router.get(
  "/auth/google/callback",
  userController.googleCallback,
  userController.handleGoogleCallback
);

// LinkedIn OAuth routes
router.get("/auth/linkedin", userController.linkedinAuth);
router.get(
  "/auth/linkedin/callback",
  userController.linkedinCallback,
  userController.handleLinkedInCallback
);

// LinkedIn profile import route (protected)
router.post(
  "/import-linkedin-profile",
  isAuthenticated,
  userController.importLinkedInProfile
);

router.post("/logout", userController.logout);

// Protected routes (authentication required)
router.get("/profile", isAuthenticated, userController.getProfile);

router.put(
  "/change-password",
  isAuthenticated,
  validateChangePassword,
  userController.changePassword
);

router.post(
  "/forgot-password",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes for security
  validateForgotPassword,
  userController.forgotPassword
);

router.post(
  "/reset-password",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes for security
  validateResetPassword,
  userController.resetPassword
);

router.delete(
  "/account",
  isAuthenticated,
  validateDeleteAccount,
  userController.deleteAccount
);

export default router;
