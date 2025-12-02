import userService from "../services/userService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import emailService from "../services/emailService.js";
import passport from "../config/passport.js";
import linkedinService from "../services/linkedinService.js";

class UserController {
  // Register a new user
  register = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await userService.createUser({
        email,
        password,
      });

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;

      res.status(201).json({
        ok: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
          },
          message: "User registered successfully",
        },
      });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          ok: false,
          error: {
            code: "CONFLICT",
            message: "User with this email already exists",
          },
        });
      }
      throw error;
    }
  });

  // Login user
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // Check if user has a password (not an OAuth-only user)
    if (!user.password) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message:
            "This account was created with Google. Please use Google Sign-In to log in.",
        },
      });
    }

    const isValidPassword = await userService.verifyPassword(
      password,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // Set session
    req.session.userId = user.u_id;
    req.session.userEmail = user.email;

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.u_id,
          email: user.email,
        },
        message: "Login successful",
      },
    });
  });

  // Logout user
  logout = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Error destroying session:", err);
        return res.status(500).json({
          ok: false,
          error: {
            code: "LOGOUT_ERROR",
            message: "Failed to logout",
          },
        });
      }

      // Clear the session cookie with the same options used to set it
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });

      res.status(200).json({
        ok: true,
        data: {
          message: "Logout successful",
        },
      });
    });
  });

  // Get current user info (authentication only)
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.u_id,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          authProvider: user.auth_provider || null,
        },
      },
    });
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { currentPassword, newPassword } = req.body;

    // Get user with password for verification
    const user = await userService.getUserByEmail(req.session.userEmail);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const isValidPassword = await userService.verifyPassword(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_PASSWORD",
          message: "Current password is incorrect",
        },
      });
    }

    // Update password
    await userService.updatePassword(userId, newPassword);

    res.status(200).json({
      ok: true,
      data: {
        message: "Password updated successfully",
      },
    });
  });

  // Forgot password - send reset email
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
      // Check if user exists
      const user = await userService.getUserByEmail(email);

      if (user) {
        // Generate reset token
        const resetToken = await userService.generateResetToken(user.u_id);

        // Send reset email
        await emailService.sendPasswordResetEmail(email, resetToken);
      }

      // Always return success message for security
      res.status(200).json({
        ok: true,
        data: {
          message:
            "If an account with that email exists, we've sent a password reset link.",
        },
      });
    } catch (error) {
      console.error("❌ Error in forgot password:", error);
      // Still return success for security
      res.status(200).json({
        ok: true,
        data: {
          message:
            "If an account with that email exists, we've sent a password reset link.",
        },
      });
    }
  });

  // Reset password with token
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    try {
      // Verify token and reset password
      await userService.resetPasswordWithToken(token, newPassword);

      res.status(200).json({
        ok: true,
        data: {
          message:
            "Password has been reset successfully. You can now log in with your new password.",
        },
      });
    } catch (error) {
      if (error.message.includes("Invalid or expired token")) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_TOKEN",
            message:
              "Invalid or expired reset token. Please request a new password reset.",
          },
        });
      }
      throw error;
    }
  });

  // Delete user account (UC-009)
  deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { password, confirmationText } = req.body;

    // Validate confirmation text (required for all users)
    if (confirmationText !== "DELETE MY ACCOUNT") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "CONFIRMATION_REQUIRED",
          message: 'You must type "DELETE MY ACCOUNT" to confirm deletion',
        },
      });
    }

    try {
      // Delete account (password verification is handled in userService for non-OAuth users)
      const result = await userService.deleteUser(userId, password || null);

      // Send confirmation email
      await emailService.sendAccountDeletionConfirmation(result.email);

      // Destroy session (logout user)
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Error destroying session:", err);
        }
      });

      // Clear session cookie
      res.clearCookie("connect.sid");

      // Send success response
      res.status(200).json({
        ok: true,
        data: {
          message: "Account deleted successfully",
          deletedAt: result.deletedAt,
        },
      });
    } catch (error) {
      // Handle specific error cases
      if (error.message.includes("Invalid password")) {
        return res.status(401).json({
          ok: false,
          error: {
            code: "INVALID_PASSWORD",
            message: error.message,
          },
        });
      }
      if (error.message.includes("Password is required")) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "PASSWORD_REQUIRED",
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  // Google OAuth - initiate authentication
  googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
  });

  // Google OAuth - handle callback
  googleCallback = passport.authenticate("google", { session: false });

  // Handle Google OAuth callback and create session
  handleGoogleCallback = asyncHandler(async (req, res, next) => {
    // After passport authenticates, req.user is populated
    if (!req.user) {
      return res.redirect("/login?error=oauth_failed");
    }

    // Create session
    req.session.userId = req.user.id;
    req.session.userEmail = req.user.email;

    // Redirect to frontend
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`
    );
  });

  // LinkedIn OAuth - initiate authentication
  linkedinAuth = passport.authenticate("linkedin", {
    scope: ["openid", "profile", "email"],
  });

  // LinkedIn OAuth - handle callback with error handling
  linkedinCallback = (req, res, next) => {
    passport.authenticate("linkedin", { session: false }, (err, user, info) => {
      // Check for OAuth errors from LinkedIn URL parameters
      if (req.query.error) {
        console.error("❌ LinkedIn OAuth error from URL:", req.query.error, req.query.error_description);
        return res.redirect(
          `/login?error=linkedin_oauth_failed&details=${encodeURIComponent(req.query.error_description || req.query.error)}`
        );
      }

      // Handle passport authentication errors
      if (err) {
        console.error("❌ LinkedIn OAuth passport error:", err);
        return res.redirect(
          `/login?error=linkedin_oauth_failed&details=${encodeURIComponent(err.message || "Authentication failed")}`
        );
      }

      // Handle info messages (like "failed to fetch user profile")
      if (info && info.message) {
        console.error("❌ LinkedIn OAuth info:", info.message);
        // If it's a profile fetch error, try to continue with what we have
        if (info.message.includes("failed to fetch user profile")) {
          // Pass the error to the next handler to try manual fetch
          req.passportError = info.message;
        } else {
          return res.redirect(
            `/login?error=linkedin_oauth_failed&details=${encodeURIComponent(info.message)}`
          );
        }
      }

      // Set user if available
      if (user) {
        req.user = user;
      }

      next();
    })(req, res, next);
  };

  // Handle LinkedIn OAuth callback and create session
  handleLinkedInCallback = asyncHandler(async (req, res, next) => {
    // Check for OAuth errors from LinkedIn
    if (req.query.error) {
      console.error("❌ LinkedIn OAuth error:", req.query.error, req.query.error_description);
      return res.redirect(
        `/login?error=linkedin_oauth_failed&details=${encodeURIComponent(req.query.error_description || req.query.error)}`
      );
    }

    // If passport failed but we have an access token, try manual fetch
    if (!req.user && req.passportError) {
      console.log("⚠️ Passport failed, attempting manual profile fetch...");
      try {
        // Get access token from session/state if available
        // Note: passport-linkedin-oauth2 stores tokens, but we might need to get them differently
        // For now, redirect to error page
        return res.redirect(
          `/login?error=linkedin_oauth_failed&details=${encodeURIComponent("Failed to authenticate with LinkedIn. Please try again.")}`
        );
      } catch (manualError) {
        console.error("❌ Manual fetch also failed:", manualError);
        return res.redirect(
          `/login?error=linkedin_oauth_failed&details=${encodeURIComponent("Failed to fetch LinkedIn profile")}`
        );
      }
    }

    // After passport authenticates, req.user is populated
    if (!req.user) {
      console.error("❌ LinkedIn OAuth: req.user not populated after authentication");
      return res.redirect("/login?error=oauth_failed");
    }

    // Create session
    req.session.userId = req.user.id;
    req.session.userEmail = req.user.email;

    // Save session before redirect
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Import LinkedIn profile data in the background (fire-and-forget)
    try {
      const accessToken = await linkedinService.getLinkedInAccessToken(req.user.id);
      if (accessToken) {
        const profileData = await linkedinService.fetchLinkedInProfile(accessToken);
        await linkedinService.importProfileToUser(req.user.id, profileData);
      }
    } catch (profileError) {
      // Don't block login if profile import fails
      console.error("❌ Error importing LinkedIn profile after login:", profileError);
    }

    // Redirect directly to analytics networking page to show LinkedIn network
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/analytics?linkedin=connected&tab=network`);
  });

  // Import LinkedIn profile data (manual trigger)
  importLinkedInProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to import LinkedIn profile",
        },
      });
    }

    try {
      const accessToken = await linkedinService.getLinkedInAccessToken(userId);
      if (!accessToken) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "NO_LINKEDIN_TOKEN",
            message: "LinkedIn account not connected. Please sign in with LinkedIn first.",
          },
        });
      }

      const profileData = await linkedinService.fetchLinkedInProfile(accessToken);
      await linkedinService.importProfileToUser(userId, profileData);

      res.status(200).json({
        ok: true,
        data: {
          message: "LinkedIn profile imported successfully",
          profile: profileData,
        },
      });
    } catch (error) {
      console.error("❌ Error importing LinkedIn profile:", error);
      throw error;
    }
  });
}

export default new UserController();
