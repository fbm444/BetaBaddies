import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import fileUploadService from "./fileUploadService.js";

class ProfileService {
  // Get profile by user ID
  async getProfileByUserId(userId) {
    try {
      const query = `
        SELECT 
          p.first_name,
          p.middle_name,
          p.last_name,
          p.phone,
          p.city,
          p.state,
          p.job_title,
          p.bio,
          p.industry,
          p.exp_level,
          p.user_id,
          p.pfp_link,
          u.email,
          u.created_at,
          u.updated_at
        FROM profiles p
        JOIN users u ON p.user_id = u.u_id
        WHERE p.user_id = $1
      `;

      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        fullName: this.getFullName(result.rows[0]),
      };
    } catch (error) {
      console.error("❌ Error getting profile:", error);
      throw error;
    }
  }

  // Create or update profile
  async createOrUpdateProfile(userId, profileData) {
    try {
      // Check if profile exists
      const existingProfile = await this.getProfileByUserId(userId);

      if (existingProfile) {
        // Update existing profile
        const updated = await this.updateProfile(userId, profileData);
        updated._alreadyExists = true;
        return updated;
      } else {
        // Create new profile
        return await this.createProfile(userId, profileData);
      }
    } catch (error) {
      console.error("❌ Error creating or updating profile:", error);
      throw error;
    }
  }

  // Create new profile
  async createProfile(userId, profileData) {
    try {
      const {
        firstName,
        middleName,
        lastName,
        phone,
        city,
        state,
        jobTitle,
        bio,
        industry,
        expLevel,
      } = profileData;

      // Validate required fields
      if (!firstName || !lastName) {
        throw new Error("First name and last name are required");
      }

      if (!state) {
        throw new Error("State is required");
      }

      // Validate state code length
      if (state.length !== 2) {
        throw new Error("State must be a 2-character code");
      }

      // Validate exp_level if provided
      if (expLevel && !["Entry", "Mid", "Senior"].includes(expLevel)) {
        throw new Error("Experience level must be one of: Entry, Mid, Senior");
      }

      const query = `
        INSERT INTO profiles (
          user_id,
          first_name,
          middle_name,
          last_name,
          phone,
          city,
          state,
          job_title,
          bio,
          industry,
          exp_level,
          pfp_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const defaultPfpLink =
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

      const result = await database.query(query, [
        userId,
        firstName,
        middleName || null,
        lastName,
        phone || null,
        city || null,
        state.toUpperCase(),
        jobTitle || null,
        bio || null,
        industry || null,
        expLevel || null,
        defaultPfpLink,
      ]);

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating profile:", error);
      throw error;
    }
  }

  // Update existing profile
  async updateProfile(userId, profileData) {
    try {
      const {
        firstName,
        middleName,
        lastName,
        phone,
        city,
        state,
        jobTitle,
        bio,
        industry,
        expLevel,
      } = profileData;

      // Validate state code if provided
      if (state && state.length !== 2) {
        throw new Error("State must be a 2-character code");
      }

      // Validate exp_level if provided
      if (expLevel && !["Entry", "Mid", "Senior"].includes(expLevel)) {
        throw new Error("Experience level must be one of: Entry, Mid, Senior");
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }

      if (middleName !== undefined) {
        updates.push(`middle_name = $${paramIndex++}`);
        values.push(middleName || null);
      }

      if (lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }

      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone || null);
      }

      if (city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(city || null);
      }

      if (state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(state.toUpperCase());
      }

      if (jobTitle !== undefined) {
        updates.push(`job_title = $${paramIndex++}`);
        values.push(jobTitle || null);
      }

      if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio || null);
      }

      if (industry !== undefined) {
        updates.push(`industry = $${paramIndex++}`);
        values.push(industry || null);
      }

      if (expLevel !== undefined) {
        updates.push(`exp_level = $${paramIndex++}`);
        values.push(expLevel || null);
      }

      if (updates.length === 0) {
        return await this.getProfileByUserId(userId);
      }

      values.push(userId);
      const query = `
        UPDATE profiles
        SET ${updates.join(", ")}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Profile not found");
      }

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      throw error;
    }
  }

  // Update profile picture
  async updateProfilePicture(userId, filePath) {
    try {
      const query = `
        UPDATE profiles
        SET pfp_link = $1
        WHERE user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [filePath, userId]);

      if (result.rows.length === 0) {
        throw new Error("Profile not found");
      }

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating profile picture:", error);
      throw error;
    }
  }

  // Get profile picture from file upload service
  async getProfilePicturePath(userId) {
    try {
      // First check if profile picture is in uploads folder
      const files = await fileUploadService.getUserFiles(userId, "profile_pic");
      const profilePic = files[0];

      if (profilePic) {
        // Return the actual file path from uploads
        return profilePic.filePath;
      }

      // If no profile picture uploaded, get default from profile
      const profile = await this.getProfileByUserId(userId);
      return profile ? profile.pfp_link : null;
    } catch (error) {
      console.error("❌ Error getting profile picture path:", error);
      throw error;
    }
  }

  // Format profile for response
  formatProfile(profile) {
    return {
      ...profile,
      fullName: this.getFullName(profile),
    };
  }

  // Get full name from profile
  getFullName(profile) {
    const parts = [profile.first_name];
    if (profile.middle_name) {
      parts.push(profile.middle_name);
    }
    parts.push(profile.last_name);
    return parts.join(" ");
  }

  // Get profile statistics
  async getProfileStatistics(userId) {
    try {
      const profile = await this.getProfileByUserId(userId);

      if (!profile) {
        return {
          hasProfile: false,
          completeness: 0,
          fieldsCompleted: 0,
          totalFields: 11,
        };
      }

      const fields = [
        profile.first_name,
        profile.middle_name,
        profile.last_name,
        profile.phone,
        profile.city,
        profile.state,
        profile.job_title,
        profile.bio,
        profile.industry,
        profile.exp_level,
        profile.pfp_link,
      ];

      const fieldsCompleted = fields.filter((field) => field != null).length;
      const completeness = Math.round((fieldsCompleted / 11) * 100);

      return {
        hasProfile: true,
        completeness,
        fieldsCompleted,
        totalFields: 11,
        profile,
      };
    } catch (error) {
      console.error("❌ Error getting profile statistics:", error);
      throw error;
    }
  }
}

export default new ProfileService();
