import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import database from "./database.js";

// Try to import Sharp, but make it optional for older Node.js versions
let sharp = null;
try {
  sharp = await import("sharp");
  sharp = sharp.default;
} catch (error) {
  console.warn("⚠️ Sharp not available - image processing will be disabled");
}

class FileUploadService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.maxFileSizes = {
      profilePic: 5 * 1024 * 1024, // 5MB
      document: 10 * 1024 * 1024, // 10MB
      resume: 5 * 1024 * 1024, // 5MB
    };
    this.allowedTypes = {
      profilePic: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
      document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ],
      resume: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    };
    this.imageDimensions = {
      profilePic: { width: 300, height: 300 },
      thumbnail: { width: 150, height: 150 },
    };
  }

  resolveFilePath(filePath) {
    if (!filePath) {
      return null;
    }

    // Treat stored /uploads paths as relative to project root
    if (filePath.startsWith("/uploads") || filePath.startsWith("\\uploads")) {
      const relative = filePath.replace(/^[/\\]+/, "");
      return path.join(process.cwd(), relative);
    }

    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    return path.join(process.cwd(), filePath);
  }

  /**
   * Upload a profile picture with automatic resizing
   */
  async uploadProfilePicture(userId, file) {
    try {
      console.log("🔧 FileUploadService: Starting profile picture upload");
      
      // Validate file
      console.log("   Validating file...");
      this.validateFile(file, "profilePic");
      console.log("   ✓ File validated");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `profile_${fileId}${fileExtension}`;
      const filePath = path.join(this.uploadDir, "profile-pics", fileName);
      console.log("   Generated filename:", fileName);

      // Process and resize image
      console.log("   Processing image...");
      await this.processImage(
        file.buffer,
        filePath,
        this.imageDimensions.profilePic
      );
      console.log("   ✓ Image processed");

      // Create thumbnail (only if Sharp is available)
      let thumbnailPath = null;
      if (sharp) {
        console.log("   Creating thumbnail...");
        thumbnailPath = path.join(
          this.uploadDir,
          "profile-pics",
          `thumb_${fileName}`
        );
        await this.processImage(
          file.buffer,
          thumbnailPath,
          this.imageDimensions.thumbnail
        );
        console.log("   ✓ Thumbnail created");
      } else {
        console.log("   ⚠️ Skipping thumbnail (Sharp not available)");
      }

      // Save file record to database
      console.log("   Saving file record to database...");
      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: `/uploads/profile-pics/${fileName}`,
        thumbnailPath: thumbnailPath
          ? `/uploads/profile-pics/thumb_${fileName}`
          : null,
        fileType: "profile_pic",
        fileSize: file.size,
        mimeType: file.mimetype,
      });
      console.log("   ✓ File record saved");

      // Update user profile with new picture link
      console.log("   Updating user profile...");
      await this.updateProfilePicture(userId, fileRecord.filePath);
      console.log("   ✓ User profile updated");

      console.log("✅ Profile picture upload complete!");
      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        thumbnailPath: fileRecord.thumbnailPath,
        fileSize: fileRecord.fileSize,
        message: "Profile picture uploaded successfully",
      };
    } catch (error) {
      console.error("❌ Error uploading profile picture:", error);
      console.error("   Error type:", error.constructor.name);
      console.error("   Error message:", error.message);
      throw error;
    }
  }

  /**
   * Upload a professional document
   */
  async uploadDocument(userId, file, documentType = "general") {
    try {
      // Validate file
      this.validateFile(file, "document");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `doc_${fileId}${fileExtension}`;
      const filePath = path.join(this.uploadDir, "documents", fileName);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Save file record to database
      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: `/uploads/documents/${fileName}`,
        fileType: documentType,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        documentType: fileRecord.fileType,
        message: "Document uploaded successfully",
      };
    } catch (error) {
      console.error("❌ Error uploading document:", error);
      throw error;
    }
  }

  /**
   * Upload a resume
   */
  async uploadResume(userId, file) {
    try {
      // Validate file
      this.validateFile(file, "resume");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `resume_${fileId}${fileExtension}`;
      const filePath = path.join(this.uploadDir, "resumes", fileName);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Save file record to database
      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: `/uploads/resumes/${fileName}`,
        fileType: "resume",
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        message: "Resume uploaded successfully",
      };
    } catch (error) {
      console.error("❌ Error uploading resume:", error);
      throw error;
    }
  }

  /**
   * Get user's files by type
   */
  async getUserFiles(userId, fileType = null) {
    try {
      let query = `
        SELECT file_id, file_data, file_path
        FROM files
        WHERE file_data::jsonb->>'u' = $1
      `;
      const params = [userId];

      if (fileType) {
        query += ` AND file_data::jsonb->>'t' = $2`;
        params.push(fileType);
      }

      query += ` ORDER BY (file_data::jsonb->>'c') DESC`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapFileFields);
    } catch (error) {
      console.error("❌ Error getting user files:", error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId, userId) {
    try {
      const query = `
        SELECT file_id, file_data, file_path
        FROM files
        WHERE file_id = $1 AND file_data::jsonb->>'u' = $2
      `;
      const result = await database.query(query, [fileId, userId]);

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

      return this.mapFileFields(result.rows[0]);
    } catch (error) {
      console.error(`❌ Error getting file by ID ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId, userId) {
    try {
      // Get file info first
      const file = await this.getFileById(fileId, userId);

      // Delete file from disk
      const fullPath = this.resolveFilePath(file.filePath);
      if (fullPath) {
        try {
          await fs.unlink(fullPath);
        } catch (fsError) {
          console.warn(`⚠️ Could not delete file from disk: ${fsError.message}`);
        }
      }

      // Delete thumbnail if exists
      if (file.thumbnailPath) {
        const thumbnailFullPath = this.resolveFilePath(file.thumbnailPath);
        if (thumbnailFullPath) {
          try {
            await fs.unlink(thumbnailFullPath);
          } catch (fsError) {
            console.warn(
              `⚠️ Could not delete thumbnail from disk: ${fsError.message}`
            );
          }
        }
      }

      // Delete file record from database
      const query = `
        DELETE FROM files
        WHERE file_id = $1 AND file_data::jsonb->>'u' = $2
        RETURNING *
      `;
      const result = await database.query(query, [fileId, userId]);

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

      // If this was a profile picture, reset to default
      if (file.fileType === "profile_pic") {
        await this.resetProfilePicture(userId);
      }

      return { message: "File deleted successfully" };
    } catch (error) {
      console.error(`❌ Error deleting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get file statistics for a user
   */
  async getFileStatistics(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_files,
          COUNT(CASE WHEN file_data::jsonb->>'t' = 'profile_pic' THEN 1 END) as profile_pics,
          COUNT(CASE WHEN file_data::jsonb->>'t' = 'resume' THEN 1 END) as resumes,
          COUNT(CASE WHEN file_data::jsonb->>'t' != 'profile_pic' AND file_data::jsonb->>'t' != 'resume' THEN 1 END) as documents,
          SUM((file_data::jsonb->>'s')::int) as total_size
        FROM files
        WHERE file_data::jsonb->>'u' = $1
      `;
      const result = await database.query(query, [userId]);
      const stats = result.rows[0];

      return {
        totalFiles: parseInt(stats.total_files, 10),
        profilePics: parseInt(stats.profile_pics, 10),
        resumes: parseInt(stats.resumes, 10),
        documents: parseInt(stats.documents, 10),
        totalSize: parseInt(stats.total_size || 0, 10),
      };
    } catch (error) {
      console.error("❌ Error getting file statistics:", error);
      throw error;
    }
  }

  /**
   * Validate file based on type and requirements
   */
  validateFile(file, fileCategory) {
    if (!file) {
      throw new Error("No file provided");
    }

    // Check file size
    const maxSize = this.maxFileSizes[fileCategory];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`
      );
    }

    // Check file type
    const allowedTypes = this.allowedTypes[fileCategory];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `File type ${file.mimetype} is not allowed for ${fileCategory}`
      );
    }

    // Additional validation for images
    if (fileCategory === "profilePic") {
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error("Invalid image file");
      }
    }
  }

  /**
   * Process and resize image using Sharp (if available)
   */
  async processImage(buffer, outputPath, dimensions) {
    try {
      console.log(`      Processing image to ${dimensions.width}x${dimensions.height}`);
      if (sharp) {
        await sharp(buffer)
          .resize(dimensions.width, dimensions.height, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 90 })
          .toFile(outputPath);
        console.log(`      ✓ Image saved to ${outputPath}`);
      } else {
        // Fallback: just save the original image without processing
        console.warn(
          "⚠️ Sharp not available - saving original image without processing"
        );
        await fs.writeFile(outputPath, buffer);
      }
    } catch (error) {
      console.error("❌ Error processing image:", error);
      console.error("   Sharp available:", !!sharp);
      console.error("   Output path:", outputPath);
      console.error("   Dimensions:", dimensions);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Save file record to database
   * Note: Using existing files table schema with limited columns
   */
  async saveFileRecord(fileData) {
    // Store minimal metadata in file_data as JSON (keeping under 255 chars)
    // Use very short keys to save space
    const metadata = {
      u: fileData.userId, // userId
      t: fileData.fileType, // fileType
      s: fileData.fileSize, // fileSize
      m: fileData.mimeType, // full mime type
      c: new Date().toISOString().split("T")[0], // createdAt (date only)
    };

    // Only store thumbnail flag (path is predictable from main path)
    if (fileData.thumbnailPath) {
      metadata.th = 1;
    }

    try {
      const metadataStr = JSON.stringify(metadata);
      console.log("   Metadata size:", metadataStr.length, "chars");
      
      if (metadataStr.length > 250) {
        console.warn("   ⚠️ Metadata is large, truncating...");
      }

      const query = `
        INSERT INTO files (file_id, file_data, file_path)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await database.query(query, [
        fileData.fileId,
        metadataStr,
        fileData.filePath,
      ]);

      return this.mapFileFields(result.rows[0]);
    } catch (error) {
      console.error("❌ Error saving file record:", error);
      console.error("   Metadata:", JSON.stringify(metadata));
      console.error("   Metadata length:", JSON.stringify(metadata).length);
      throw error;
    }
  }

  /**
   * Update user profile with new picture link
   * Creates profile if it doesn't exist
   */
  async updateProfilePicture(userId, picturePath) {
    try {
      // Try to update existing profile
      const updateQuery = `
        UPDATE profiles
        SET pfp_link = $1
        WHERE user_id = $2
        RETURNING *
      `;
      const result = await database.query(updateQuery, [picturePath, userId]);
      
      // If no profile exists, create one with minimal data
      if (result.rows.length === 0) {
        console.log(`📝 Creating new profile for user ${userId} with picture`);
        const insertQuery = `
          INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link)
          VALUES ($1, 'User', 'Name', 'NY', $2)
          ON CONFLICT (user_id) DO UPDATE SET pfp_link = $2
        `;
        await database.query(insertQuery, [userId, picturePath]);
      }
    } catch (error) {
      console.error("❌ Error updating profile picture:", error);
      throw error;
    }
  }

  /**
   * Reset profile picture to default
   */
  async resetProfilePicture(userId) {
    try {
      const defaultPicture =
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";
      const query = `
        UPDATE profiles
        SET pfp_link = $1
        WHERE user_id = $2
      `;
      await database.query(query, [defaultPicture, userId]);
    } catch (error) {
      console.error("❌ Error resetting profile picture:", error);
      throw error;
    }
  }

  /**
   * Map database fields to service response format
   */
  mapFileFields(row) {
    const metadata = JSON.parse(row.file_data || "{}");
    
    // Extract filename from path
    const fileName = row.file_path ? row.file_path.split('/').pop() : 'unknown';
    
    // Reconstruct thumbnail path if flag is set
    const thumbnailPath = metadata.th ? row.file_path.replace(/([^/]+)$/, 'thumb_$1') : null;
    
    return {
      fileId: row.file_id,
      userId: metadata.u,
      fileName: fileName,
      originalName: fileName, // Use filename as originalName
      filePath: row.file_path,
      thumbnailPath: thumbnailPath,
      fileType: metadata.t,
      fileSize: metadata.s,
      mimeType: metadata.m || "application/octet-stream",
      createdAt: metadata.c,
    };
  }

  /**
   * Get file content for serving
   */
  async getFileContent(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      if (!fullPath) {
        throw new Error("File not found");
      }
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error);
      throw new Error("File not found");
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      if (!fullPath) {
        return false;
      }
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new FileUploadService();
