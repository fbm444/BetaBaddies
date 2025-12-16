import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import database from "./database.js";
import CloudProvider from "./cloud/cloudProvider.js";
import logger from "../utils/logger.js";

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
    this.uploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    this.cloudProvider = new CloudProvider();
    // Use cloud storage if CLOUD_PROVIDER is set and not "local"
    // In development: CLOUD_PROVIDER=local or unset → local filesystem
    // In production: CLOUD_PROVIDER=aws-s3 → AWS S3
    this.useCloudStorage =
      process.env.CLOUD_PROVIDER && process.env.CLOUD_PROVIDER !== "local";
    this.maxFileSizes = {
      profilePic: 5 * 1024 * 1024, // 5MB
      document: 10 * 1024 * 1024, // 10MB
      resume: 5 * 1024 * 1024, // 5MB
      certBadge: 5 * 1024 * 1024, // 5MB
    };
    this.allowedTypes = {
      profilePic: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
      certBadge: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
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
      logger.info("Starting profile picture upload", {
        userId,
        originalName: file.originalname,
      });

      // Validate file
      this.validateFile(file, "profilePic");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `profile_${fileId}${fileExtension}`;
      const folder = "profile-pics";

      // Process and resize image
      let processedBuffer;
      if (sharp) {
        logger.debug("Processing image with Sharp");
        processedBuffer = await this.processImageBuffer(
          file.buffer,
          this.imageDimensions.profilePic
        );
      } else {
        logger.warn("Sharp not available - using original image");
        processedBuffer = file.buffer;
      }

      // Upload profile picture using cloud provider
      // For cloud storage: upload to S3 and store S3 key
      // For local storage: save to local filesystem
      let filePath;
      const profilePicDir = path.join(this.uploadDir, folder);
      await fs.mkdir(profilePicDir, { recursive: true });
      const localFilePath = path.join(profilePicDir, fileName);

      if (this.useCloudStorage) {
        // Upload to S3
        const uploadResult = await this.cloudProvider.uploadFile(
          processedBuffer,
          fileName,
          folder,
          { contentType: file.mimetype, public: false }
        );
        filePath = uploadResult.path; // Store S3 key (e.g., "profile-pics/profile_xxx.jpg")
        logger.debug("Profile picture uploaded to S3", {
          s3Key: filePath,
        });
      } else {
        // Local storage - save directly
        await fs.writeFile(localFilePath, processedBuffer);
        filePath = `/uploads/${folder}/${fileName}`;
        logger.debug("Profile picture saved locally", {
          localPath: filePath,
        });
      }

      // Create thumbnail (only if Sharp is available)
      let thumbnailPath = null;
      if (sharp) {
        logger.debug("Creating thumbnail");
        const thumbnailBuffer = await this.processImageBuffer(
          file.buffer,
          this.imageDimensions.thumbnail
        );
        const thumbnailFileName = `thumb_${fileName}`;
        const thumbnailLocalPath = path.join(profilePicDir, thumbnailFileName);

        if (this.useCloudStorage) {
          // Upload thumbnail to S3
          const thumbnailUploadResult = await this.cloudProvider.uploadFile(
            thumbnailBuffer,
            thumbnailFileName,
            folder,
            { contentType: file.mimetype, public: false }
          );
          thumbnailPath = thumbnailUploadResult.path; // Store S3 key
          logger.debug("Thumbnail uploaded to S3", {
            s3Key: thumbnailPath,
          });
        } else {
          // Local storage only
          await fs.writeFile(thumbnailLocalPath, thumbnailBuffer);
          thumbnailPath = `/uploads/${folder}/${thumbnailFileName}`;
          logger.debug("Thumbnail saved locally", { thumbnailPath });
        }
      }

      const storedThumbnailPath = thumbnailPath;

      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: filePath,
        thumbnailPath: storedThumbnailPath,
        fileType: "profile_pic",
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      logger.info("File record saved", { fileId });

      // Update user profile with new picture link
      // Store S3 key if cloud storage, or local path if local storage
      await this.updateProfilePicture(userId, filePath);
      logger.info("Profile picture updated", { userId });

      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        thumbnailPath: fileRecord.thumbnailPath,
        fileSize: fileRecord.fileSize,
        message: "Profile picture uploaded successfully",
      };
    } catch (error) {
      logger.error("Error uploading profile picture", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Upload a certification badge image
   */
  async uploadCertificationBadge(userId, file) {
    try {
      logger.info("Starting certification badge upload", {
        userId,
        originalName: file.originalname,
      });

      // Validate file
      this.validateFile(file, "certBadge");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `cert_badge_${fileId}${fileExtension}`;
      const folder = "certification-badges";

      // Upload certification badge using cloud provider
      // For cloud storage: upload to S3 and store S3 key
      // For local storage: save to local filesystem
      let filePath;
      const badgeDir = path.join(this.uploadDir, folder);
      await fs.mkdir(badgeDir, { recursive: true });
      const localFilePath = path.join(badgeDir, fileName);

      if (this.useCloudStorage) {
        // Upload to S3
        const uploadResult = await this.cloudProvider.uploadFile(
          file.buffer,
          fileName,
          folder,
          { contentType: file.mimetype, public: false }
        );
        filePath = uploadResult.path; // Store S3 key (e.g., "certification-badges/cert_badge_xxx.jpg")
        logger.debug("Certification badge uploaded to S3", {
          s3Key: filePath,
        });
      } else {
        // Local storage - save directly
        await fs.writeFile(localFilePath, file.buffer);
        filePath = `/uploads/${folder}/${fileName}`;
        logger.debug("Certification badge saved locally", {
          localPath: filePath,
        });
      }

      // Save file record to database
      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: filePath,
        fileType: "cert_badge",
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      logger.info("File record saved", { fileId });

      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        message: "Certification badge uploaded successfully",
      };
    } catch (error) {
      logger.error("Error uploading certification badge", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Upload a professional document
   */
  async uploadDocument(userId, file, documentType = "general") {
    try {
      logger.info("Starting document upload", {
        userId,
        originalName: file.originalname,
        documentType,
      });

      // Validate file
      this.validateFile(file, "document");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `doc_${fileId}${fileExtension}`;
      const folder = "documents";

      // Upload file using cloud provider
      // Use signed URLs (public: false) for security - files are private but accessible via signed URLs
      const uploadResult = await this.cloudProvider.uploadFile(
        file.buffer,
        fileName,
        folder,
        { contentType: file.mimetype, public: false }
      );

      logger.debug("Document uploaded", {
        url: uploadResult.url,
        path: uploadResult.path,
      });

      // Save file record to database
      // Store S3 key (not full URL) for cloud storage, or local path for local storage
      // This avoids VARCHAR(255) limit issues with long signed URLs
      const filePath = this.useCloudStorage
        ? uploadResult.path // Store the S3 key, not the full URL
        : uploadResult.path;

      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: filePath,
        fileType: documentType,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      logger.info("Document uploaded and record saved", {
        fileId,
        fileUrl: uploadResult.url,
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
      logger.error("Error uploading document", {
        error: error.message,
        userId,
        documentType,
      });
      throw error;
    }
  }

  /**
   * Upload a resume
   */
  async uploadResume(userId, file) {
    try {
      logger.info("Starting resume upload", {
        userId,
        originalName: file.originalname,
      });

      // Validate file
      this.validateFile(file, "resume");

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `resume_${fileId}${fileExtension}`;
      const folder = "resumes";

      // Upload file using cloud provider
      // Use signed URLs (public: false) for security - files are private but accessible via signed URLs
      const uploadResult = await this.cloudProvider.uploadFile(
        file.buffer,
        fileName,
        folder,
        { contentType: file.mimetype, public: false }
      );

      logger.debug("Resume uploaded", {
        url: uploadResult.url,
        path: uploadResult.path,
      });

      // Save file record to database
      // Store S3 key (not full URL) for cloud storage, or local path for local storage
      // This avoids VARCHAR(255) limit issues with long signed URLs
      const filePath = this.useCloudStorage
        ? uploadResult.path // Store the S3 key, not the full URL
        : uploadResult.path;

      const fileRecord = await this.saveFileRecord({
        fileId,
        userId,
        fileName,
        originalName: file.originalname,
        filePath: filePath,
        fileType: "resume",
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      logger.info("Resume uploaded and record saved", {
        fileId,
        fileUrl: uploadResult.url,
      });

      return {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        message: "Resume uploaded successfully",
      };
    } catch (error) {
      logger.error("Error uploading resume", { error: error.message, userId });
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
      const files = result.rows.map(this.mapFileFields);

      // For cloud storage, convert S3 keys to presigned URLs
      if (this.useCloudStorage) {
        for (const file of files) {
          // For profile pictures and certification badges, use longer expiration (7 days = 604800 seconds)
          if (
            file.fileType === "profile_pic" ||
            file.fileType === "cert_badge"
          ) {
            if (file.filePath && !file.filePath.startsWith("http")) {
              try {
                // Generate presigned URL with 7 day expiration
                file.filePath = await this.getFileUrl(file.filePath, {
                  expiresIn: 7 * 24 * 60 * 60, // 7 days
                });
              } catch (error) {
                logger.warn(
                  `Could not generate presigned URL for ${file.fileType}`,
                  {
                    filePath: file.filePath,
                    error: error.message,
                  }
                );
              }
            }
            // Handle thumbnail similarly (only for profile pics)
            if (
              file.fileType === "profile_pic" &&
              file.thumbnailPath &&
              !file.thumbnailPath.startsWith("http")
            ) {
              try {
                file.thumbnailPath = await this.getFileUrl(file.thumbnailPath, {
                  expiresIn: 7 * 24 * 60 * 60, // 7 days
                });
              } catch (error) {
                logger.warn("Could not generate presigned URL for thumbnail", {
                  thumbnailPath: file.thumbnailPath,
                  error: error.message,
                });
              }
            }
            continue;
          }

          // For non-profile-pic files, convert S3 keys to signed URLs
          if (file.filePath && !file.filePath.startsWith("http")) {
            try {
              // 1 hour expiration for non-profile-pic files
              file.filePath = await this.getFileUrl(file.filePath, {
                expiresIn: 3600,
              });
            } catch (error) {
              logger.warn("Could not convert file path to URL", {
                filePath: file.filePath,
                error: error.message,
              });
            }
          }
          if (file.thumbnailPath && !file.thumbnailPath.startsWith("http")) {
            try {
              file.thumbnailPath = await this.getFileUrl(file.thumbnailPath, {
                expiresIn: 3600,
              });
            } catch (error) {
              logger.warn("Could not convert thumbnail path to URL", {
                thumbnailPath: file.thumbnailPath,
                error: error.message,
              });
            }
          }
        }
      }

      return files;
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
      logger.info("Attempting to delete file", { fileId, userId });

      // Get file info first
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        logger.warn("File not found for deletion", { fileId, userId });
        throw new Error("File not found");
      }

      // Determine file path/key for deletion
      let filePathToDelete = file.filePath;

      // Extract S3 key from URL if it's a cloud URL
      if (this.useCloudStorage && file.filePath.startsWith("http")) {
        const urlMatch = file.filePath.match(/\.s3\.[^/]+\/(.+)$/);
        if (urlMatch) {
          filePathToDelete = urlMatch[1];
        } else {
          filePathToDelete = file.filePath;
        }
      } else if (!this.useCloudStorage) {
        filePathToDelete = this.resolveFilePath(file.filePath);
      }

      // Delete main file
      if (filePathToDelete) {
        await this.cloudProvider.deleteFile(filePathToDelete);
        logger.debug("File deleted from storage", {
          filePath: filePathToDelete,
        });
      }

      // Delete thumbnail if exists
      if (file.thumbnailPath) {
        let thumbnailPathToDelete = file.thumbnailPath;

        if (this.useCloudStorage && file.thumbnailPath.startsWith("http")) {
          const urlMatch = file.thumbnailPath.match(/\.s3\.[^/]+\/(.+)$/);
          if (urlMatch) {
            thumbnailPathToDelete = urlMatch[1];
          }
        } else if (!this.useCloudStorage) {
          thumbnailPathToDelete = this.resolveFilePath(file.thumbnailPath);
        }

        if (thumbnailPathToDelete) {
          await this.cloudProvider.deleteFile(thumbnailPathToDelete);
          logger.debug("Thumbnail deleted from storage", {
            thumbnailPath: thumbnailPathToDelete,
          });
        }
      }

      // For profile pictures, also handle S3 keys that aren't URLs
      if (file.fileType === "profile_pic" && this.useCloudStorage) {
        // If filePath is an S3 key (not a URL), delete it directly
        if (
          !file.filePath.startsWith("http") &&
          file.filePath.startsWith("profile-pics/")
        ) {
          try {
            await this.cloudProvider.deleteFile(file.filePath);
            logger.debug("Profile picture deleted from S3", {
              s3Key: file.filePath,
            });
          } catch (error) {
            logger.warn("Failed to delete profile picture from S3", {
              s3Key: file.filePath,
              error: error.message,
            });
          }
        }
        // Handle thumbnail similarly
        if (
          file.thumbnailPath &&
          !file.thumbnailPath.startsWith("http") &&
          file.thumbnailPath.startsWith("profile-pics/")
        ) {
          try {
            await this.cloudProvider.deleteFile(file.thumbnailPath);
            logger.debug("Thumbnail deleted from S3", {
              s3Key: file.thumbnailPath,
            });
          } catch (error) {
            logger.warn("Failed to delete thumbnail from S3", {
              s3Key: file.thumbnailPath,
              error: error.message,
            });
          }
        }
      } else {
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

      logger.info("File record deleted from database", { fileId });

      // If this was a profile picture, reset to default
      if (file.fileType === "profile_pic") {
        await this.resetProfilePicture(userId);
      }

      return { message: "File deleted successfully" };
    } catch (error) {
      logger.error("Error deleting file", {
        error: error.message,
        fileId,
        userId,
      });
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
   * Process and resize image using Sharp (if available) - returns buffer
   * Used for cloud storage where we process in memory
   */
  async processImageBuffer(buffer, dimensions) {
    try {
      if (!sharp) {
        logger.warn("Sharp not available - returning original buffer");
        return buffer;
      }

      logger.debug(
        `Processing image buffer to ${dimensions.width}x${dimensions.height}`
      );
      const processedBuffer = await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      logger.debug("Image buffer processed", {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
      });
      return processedBuffer;
    } catch (error) {
      logger.error("Error processing image buffer", { error: error.message });
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Process and resize image using Sharp (if available) - saves to file
   * Used for local storage
   */
  async processImage(buffer, outputPath, dimensions) {
    try {
      logger.debug(
        `Processing image to ${dimensions.width}x${dimensions.height}`,
        { outputPath }
      );
      if (sharp) {
        await sharp(buffer)
          .resize(dimensions.width, dimensions.height, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 90 })
          .toFile(outputPath);
        logger.debug("Image saved", { outputPath });
      } else {
        // Fallback: just save the original image without processing
        logger.warn(
          "Sharp not available - saving original image without processing"
        );
        await fs.writeFile(outputPath, buffer);
      }
    } catch (error) {
      logger.error("Error processing image", {
        error: error.message,
        outputPath,
        dimensions,
      });
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
    const fileName = row.file_path ? row.file_path.split("/").pop() : "unknown";

    // Reconstruct thumbnail path if flag is set
    const thumbnailPath = metadata.th
      ? row.file_path.replace(/([^/]+)$/, "thumb_$1")
      : null;

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
      if (this.useCloudStorage) {
        // For cloud storage, return a signed URL or fetch the file
        if (filePath.startsWith("http")) {
          throw new Error(
            "Fetching file content directly from cloud URL not implemented. Use getFileUrl() instead."
          );
        }

        // If it's an S3 key, get signed URL
        const url = await this.cloudProvider.getFileUrl(filePath, {
          expiresIn: 3600,
        });
        throw new Error("Use getFileUrl() for cloud storage files");
      } else {
        // Local storage - read from filesystem
        const fullPath = this.resolveFilePath(filePath);
        if (!fullPath) {
          throw new Error("File not found");
        }
        logger.debug("Reading file from local storage", { fullPath });
        return await fs.readFile(fullPath);
      }
    } catch (error) {
      logger.error("Error reading file content", {
        filePath,
        error: error.message,
      });
      throw new Error("File not found");
    }
  }

  /**
   * Get file URL for serving (works for both local and cloud)
   * For profile pictures: returns presigned URL with 7 day expiration
   */
  async getFileUrl(filePath, options = {}) {
    try {
      if (this.useCloudStorage) {
        // Extract S3 key from URL if needed
        let key = filePath;
        if (filePath.startsWith("http")) {
          const urlMatch = filePath.match(/\.s3\.[^/]+\/(.+)$/);
          if (urlMatch) {
            key = urlMatch[1];
          }
        }

        // For profile pictures and certification badges, use longer expiration (7 days = 604800 seconds)
        // Other files use 1 hour (3600 seconds) by default
        const isProfilePic = key.startsWith("profile-pics/");
        const isCertBadge = key.startsWith("certification-badges/");
        const expiresIn =
          options.expiresIn ||
          (isProfilePic || isCertBadge ? 7 * 24 * 60 * 60 : 3600);

        return await this.cloudProvider.getFileUrl(key, { expiresIn });
      } else {
        // For local storage, return the path (will be served via static middleware)
        return filePath;
      }
    } catch (error) {
      logger.error("Error getting file URL", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      if (this.useCloudStorage) {
        // For cloud storage, we assume file exists if path is provided
        // In a production system, you might want to do a HEAD request to S3
        return !!filePath;
      } else {
        // Local storage - check filesystem
        const fullPath = this.resolveFilePath(filePath);
        if (!fullPath) {
          return false;
        }
        await fs.access(fullPath);
        return true;
      }
    } catch (error) {
      logger.debug("File existence check failed", {
        filePath,
        error: error.message,
      });
      return false;
    }
  }
}

export default new FileUploadService();
