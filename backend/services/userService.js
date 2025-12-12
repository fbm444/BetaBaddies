import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class UserService {
  constructor() {
    this.saltRounds = 12;
  }

  // Create a new user (authentication only)
  async createUser(userData) {
    const { email, password, accountType } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);
      const userId = uuidv4();

      // Create user in database
      const userQuery = `
        INSERT INTO users (u_id, email, password, created_at, updated_at, auth_provider, account_type)
        VALUES ($1, $2, $3, NOW(), NOW(), 'local', $4)
        RETURNING u_id, email, created_at, updated_at, account_type
      `;

      const userResult = await database.query(userQuery, [
        userId,
        email,
        hashedPassword,
        accountType || 'regular',
      ]);

      return {
        id: userResult.rows[0].u_id,
        email: userResult.rows[0].email,
        accountType: userResult.rows[0].account_type,
        createdAt: userResult.rows[0].created_at,
        updatedAt: userResult.rows[0].updated_at,
      };
    } catch (error) {
      console.error("❌ Error creating user:", error);
      throw error;
    }
  }

  // Create a new OAuth user (Google)
  async createOAuthUser(userData) {
    const { email, firstName, lastName, googleId } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const userId = uuidv4();

      // Create OAuth user in database (no password)
      const userQuery = `
        INSERT INTO users (u_id, email, password, created_at, updated_at, google_id, auth_provider)
        VALUES ($1, $2, NULL, NOW(), NOW(), $3, 'google')
        RETURNING u_id, email, created_at, updated_at, google_id, auth_provider
      `;

      const userResult = await database.query(userQuery, [
        userId,
        email,
        googleId,
      ]);

      // Create a basic profile with the name from Google OAuth
      if (firstName && lastName) {
        const profileQuery = `
          INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link)
          VALUES ($1, $2, $3, 'NY', $4)
        `;

        const defaultPfpLink =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

        await database.query(profileQuery, [
          userId,
          firstName,
          lastName,
          defaultPfpLink,
        ]);
      }

      return {
        id: userResult.rows[0].u_id,
        email: userResult.rows[0].email,
        googleId: userResult.rows[0].google_id,
        authProvider: userResult.rows[0].auth_provider,
        createdAt: userResult.rows[0].created_at,
        updatedAt: userResult.rows[0].updated_at,
      };
    } catch (error) {
      console.error("❌ Error creating OAuth user:", error);
      throw error;
    }
  }

  // Link Google account to existing user
  async linkGoogleAccount(userId, googleId, firstName, lastName) {
    try {
      const query = `
        UPDATE users 
        SET google_id = $2, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email, google_id, auth_provider
      `;

      const result = await database.query(query, [userId, googleId]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      // Update profile with name if provided and profile exists, or create profile
      if (firstName && lastName) {
        const checkProfileQuery = `
          SELECT user_id FROM profiles WHERE user_id = $1
        `;
        const profileCheck = await database.query(checkProfileQuery, [userId]);

        const defaultPfpLink =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

        if (profileCheck.rows.length === 0) {
          // Create profile if it doesn't exist
          const insertProfileQuery = `
            INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link)
            VALUES ($1, $2, $3, 'NY', $4)
          `;
          await database.query(insertProfileQuery, [
            userId,
            firstName,
            lastName,
            defaultPfpLink,
          ]);
        } else {
          // Update name if profile exists but name fields are empty
          const updateProfileQuery = `
            UPDATE profiles 
            SET first_name = $2, last_name = $3 
            WHERE user_id = $1 
              AND (first_name IS NULL OR first_name = '' OR first_name = 'User')
          `;
          await database.query(updateProfileQuery, [
            userId,
            firstName,
            lastName,
          ]);
        }
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error linking Google account:", error);
      throw error;
    }
  }

  // Get user by Google ID
  async getUserByGoogleId(googleId) {
    try {
      const query = `
        SELECT u_id, email, google_id, auth_provider, created_at, updated_at
        FROM users
        WHERE google_id = $1
      `;

      const result = await database.query(query, [googleId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting user by Google ID:", error);
      throw error;
    }
  }

  // Get user by email (authentication only)
  async getUserByEmail(email) {
    try {
      // Normalize email to lowercase for case-insensitive lookup
      const normalizedEmail = email?.toLowerCase().trim();
      
      const query = `
        SELECT u_id, email, password, created_at, updated_at, google_id, linkedin_id, auth_provider
        FROM users
        WHERE LOWER(email) = $1
      `;

      const result = await database.query(query, [normalizedEmail]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting user by email:", error);
      throw error;
    }
  }

  // Get user by LinkedIn ID
  async getUserByLinkedInId(linkedinId) {
    try {
      const query = `
        SELECT u_id, email, linkedin_id, auth_provider, created_at, updated_at
        FROM users
        WHERE linkedin_id = $1
      `;

      const result = await database.query(query, [linkedinId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting user by LinkedIn ID:", error);
      throw error;
    }
  }

  // Create a new OAuth user (LinkedIn)
  async createLinkedInOAuthUser(userData) {
    const { email, linkedinId, firstName, lastName, profilePicture, headline, accessToken, refreshToken } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const userId = uuidv4();
      const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

      // Create OAuth user in database (no password)
      const userQuery = `
        INSERT INTO users (u_id, email, password, created_at, updated_at, linkedin_id, auth_provider, linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at)
        VALUES ($1, $2, NULL, NOW(), NOW(), $3, 'linkedin', $4, $5, $6)
        RETURNING u_id, email, created_at, updated_at, linkedin_id, auth_provider
      `;

      const userResult = await database.query(userQuery, [
        userId,
        email,
        linkedinId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      ]);

      // Create a basic profile with the name from LinkedIn OAuth
      if (firstName && lastName) {
        const profileQuery = `
          INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link, job_title)
          VALUES ($1, $2, $3, 'NY', $4, $5)
        `;

        const defaultPfpLink = profilePicture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

        await database.query(profileQuery, [
          userId,
          firstName,
          lastName,
          defaultPfpLink,
          headline || null,
        ]);
      }

      return {
        id: userResult.rows[0].u_id,
        email: userResult.rows[0].email,
        linkedinId: userResult.rows[0].linkedin_id,
        authProvider: userResult.rows[0].auth_provider,
        createdAt: userResult.rows[0].created_at,
        updatedAt: userResult.rows[0].updated_at,
      };
    } catch (error) {
      console.error("❌ Error creating LinkedIn OAuth user:", error);
      throw error;
    }
  }

  // Link LinkedIn account to existing user
  async linkLinkedInAccount(userId, linkedinId, accessToken, refreshToken, firstName, lastName, profilePicture, headline) {
    try {
      const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      
      const query = `
        UPDATE users 
        SET linkedin_id = $2, linkedin_access_token = $3, linkedin_refresh_token = $4, linkedin_token_expires_at = $5, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email, linkedin_id, auth_provider
      `;

      const result = await database.query(query, [userId, linkedinId, accessToken, refreshToken, tokenExpiresAt]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      // Update profile with name if provided and profile exists, or create profile
      if (firstName && lastName) {
        const checkProfileQuery = `
          SELECT user_id FROM profiles WHERE user_id = $1
        `;
        const profileCheck = await database.query(checkProfileQuery, [userId]);

        const defaultPfpLink = profilePicture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

        if (profileCheck.rows.length === 0) {
          // Create profile if it doesn't exist
          const insertProfileQuery = `
            INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link, job_title)
            VALUES ($1, $2, $3, 'NY', $4, $5)
          `;
          await database.query(insertProfileQuery, [
            userId,
            firstName,
            lastName,
            defaultPfpLink,
            headline || null,
          ]);
        } else {
          // Update name and profile picture if profile exists but fields are empty
          const updateProfileQuery = `
            UPDATE profiles 
            SET first_name = COALESCE(NULLIF(first_name, ''), $2), 
                last_name = COALESCE(NULLIF(last_name, ''), $3),
                pfp_link = COALESCE(NULLIF(pfp_link, ''), $4),
                job_title = COALESCE(NULLIF(job_title, ''), $5)
            WHERE user_id = $1 
              AND (first_name IS NULL OR first_name = '' OR first_name = 'User' OR pfp_link LIKE '%blank-profile%')
          `;
          await database.query(updateProfileQuery, [
            userId,
            firstName,
            lastName,
            defaultPfpLink,
            headline || null,
          ]);
        }
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error linking LinkedIn account:", error);
      throw error;
    }
  }

  // Update LinkedIn tokens for existing user
  async updateLinkedInTokens(userId, accessToken, refreshToken) {
    try {
      const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      
      const query = `
        UPDATE users 
        SET linkedin_access_token = $2, linkedin_refresh_token = $3, linkedin_token_expires_at = $4, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email, linkedin_id
      `;

      const result = await database.query(query, [userId, accessToken, refreshToken, tokenExpiresAt]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating LinkedIn tokens:", error);
      throw error;
    }
  }

  // Get user by ID (authentication only)
  async getUserById(userId) {
    try {
      const query = `
        SELECT u_id, email, password, created_at, updated_at, google_id, linkedin_id, auth_provider, account_type, role
        FROM users
        WHERE u_id = $1
      `;

      const result = await database.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting user by ID:", error);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    try {
      // Safety check for invalid input
      if (!password || !hashedPassword) {
        return false;
      }
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error("❌ Error verifying password:", error);
      // Return false instead of throwing to prevent 500 errors
      return false;
    }
  }

  // Hash password
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error("❌ Error hashing password:", error);
      throw error;
    }
  }

  // Update password
  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await this.hashPassword(newPassword);

      const query = `
        UPDATE users 
        SET password = $2, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email, updated_at
      `;

      const result = await database.query(query, [userId, hashedPassword]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating password:", error);
      throw error;
    }
  }

  // Generate reset token
  async generateResetToken(userId) {
    try {
      const crypto = await import("crypto");
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const query = `
        UPDATE users 
        SET reset_token = $2, reset_token_expires = $3, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email
      `;

      const result = await database.query(query, [
        userId,
        resetToken,
        resetTokenExpires,
      ]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      return resetToken;
    } catch (error) {
      console.error("❌ Error generating reset token:", error);
      throw error;
    }
  }

  // Reset password with token
  async resetPasswordWithToken(token, newPassword) {
    try {
      // Find user with valid token
      const userQuery = `
        SELECT u_id, email, reset_token_expires
        FROM users
        WHERE reset_token = $1 AND reset_token_expires > NOW()
      `;

      const userResult = await database.query(userQuery, [token]);

      if (userResult.rows.length === 0) {
        throw new Error("Invalid or expired token");
      }

      const user = userResult.rows[0];

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and clear reset token
      const updateQuery = `
        UPDATE users 
        SET password = $2, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
        WHERE u_id = $1
        RETURNING u_id, email
      `;

      const updateResult = await database.query(updateQuery, [
        user.u_id,
        hashedPassword,
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update password");
      }

      return updateResult.rows[0];
    } catch (error) {
      console.error("❌ Error resetting password with token:", error);
      throw error;
    }
  }

  // Delete user account with password verification (skip for OAuth users)
  async deleteUser(userId, password) {
    try {
      // 1. Get user with password and auth_provider for verification
      const userQuery = `
        SELECT u_id, email, password, auth_provider
        FROM users
        WHERE u_id = $1
      `;
      const userResult = await database.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult.rows[0];

      // 2. Verify password before deletion (skip for OAuth users who don't have passwords)
      if (user.password !== null) {
        // User has a password - verify it
        if (!password) {
          throw new Error(
            "Password is required to delete account"
          );
        }

        const isPasswordValid = await this.verifyPassword(
          password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error(
            "Invalid password. Please check your password and try again."
          );
        }
      } else {
        // OAuth user (password is NULL) - no password verification needed
        console.log(`✅ OAuth user deletion (auth_provider: ${user.auth_provider || 'unknown'}) - skipping password verification`);
      }

      // 3. Delete user and all related records
      // Note: CASCADE DELETE is configured in database, so this will automatically
      // remove all related records (profiles, educations, skills, certifications, etc.)
      const deleteQuery = "DELETE FROM users WHERE u_id = $1 RETURNING email";
      const deleteResult = await database.query(deleteQuery, [userId]);

      if (deleteResult.rowCount === 0) {
        throw new Error("Failed to delete account");
      }

      // 4. Return user email for confirmation email
      return {
        email: user.email,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    }
  }
}

export default new UserService();
