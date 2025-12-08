/**
 * Cloud Provider Interface
 * This interface allows for easy integration with various cloud storage providers
 * Currently supports local storage, but can be extended to support AWS S3, Google Cloud Storage, etc.
 */

class CloudProviderInterface {
  constructor() {
    // Use cloud provider if explicitly set and not "local"
    // In production, default to cloud if CLOUD_PROVIDER is set
    // In development, default to local unless explicitly set
    const envProvider = process.env.CLOUD_PROVIDER;
    if (envProvider && envProvider !== "local") {
      this.provider = envProvider;
    } else {
      this.provider = "local";
    }
  }

  /**
   * Upload file to cloud storage
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} fileName - Name for the file
   * @param {string} folder - Folder path in storage
   * @param {Object} options - Additional options (metadata, etc.)
   * @returns {Promise<Object>} Upload result with file URL and metadata
   */
  async uploadFile(fileBuffer, fileName, folder, options = {}) {
    switch (this.provider) {
      case "aws-s3":
        return await this.uploadToS3(fileBuffer, fileName, folder, options);
      case "google-cloud":
        return await this.uploadToGoogleCloud(
          fileBuffer,
          fileName,
          folder,
          options
        );
      case "azure":
        return await this.uploadToAzure(fileBuffer, fileName, folder, options);
      default:
        return await this.uploadToLocal(fileBuffer, fileName, folder, options);
    }
  }

  /**
   * Delete file from cloud storage
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    switch (this.provider) {
      case "aws-s3":
        return await this.deleteFromS3(filePath);
      case "google-cloud":
        return await this.deleteFromGoogleCloud(filePath);
      case "azure":
        return await this.deleteFromAzure(filePath);
      default:
        return await this.deleteFromLocal(filePath);
    }
  }

  /**
   * Get file URL for access
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File URL
   */
  async getFileUrl(filePath) {
    switch (this.provider) {
      case "aws-s3":
        return await this.getS3Url(filePath);
      case "google-cloud":
        return await this.getGoogleCloudUrl(filePath);
      case "azure":
        return await this.getAzureUrl(filePath);
      default:
        return await this.getLocalUrl(filePath);
    }
  }

  /**
   * Get file content as Buffer (for caching/downloading)
   * @param {string} filePath - Path to the file (S3 key for cloud storage)
   * @returns {Promise<Buffer>} File content as Buffer
   */
  async getFileContent(filePath) {
    switch (this.provider) {
      case "aws-s3":
        return await this.getS3FileContent(filePath);
      case "google-cloud":
        throw new Error("Google Cloud Storage file content fetch not yet implemented");
      case "azure":
        throw new Error("Azure Blob Storage file content fetch not yet implemented");
      default:
        // For local storage, return null - caller should use fs.readFile directly
        throw new Error("Use fs.readFile for local storage files");
    }
  }

  /**
   * Local storage implementation
   */
  async uploadToLocal(fileBuffer, fileName, folder, options) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const uploadDir = path.join(process.cwd(), "uploads", folder);
    const filePath = path.join(uploadDir, fileName);

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, fileBuffer);

    return {
      url: `/uploads/${folder}/${fileName}`,
      path: filePath,
      size: fileBuffer.length,
      provider: "local",
    };
  }

  async deleteFromLocal(filePath) {
    const fs = await import("fs/promises");
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.warn(`⚠️ Could not delete local file: ${error.message}`);
      return false;
    }
  }

  async getLocalUrl(filePath) {
    return filePath;
  }

  /**
   * AWS S3 implementation
   * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
   */
  async uploadToS3(fileBuffer, fileName, folder, options = {}) {
    try {
      // Dynamically import AWS SDK (v3)
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) {
        throw new Error("AWS_S3_BUCKET environment variable is required");
      }

      const key = folder ? `${folder}/${fileName}` : fileName;
      const contentType = options.contentType || this.getContentType(fileName);

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ...(options.metadata && { Metadata: options.metadata }),
        ...(options.acl && { ACL: options.acl }),
      });

      await s3Client.send(command);

      // Generate URL
      const url = options.public
        ? `https://${bucket}.s3.${
            process.env.AWS_REGION || "us-east-1"
          }.amazonaws.com/${key}`
        : await this.getS3SignedUrl(key, options.expiresIn);

      return {
        url: url,
        path: key,
        size: fileBuffer.length,
        provider: "aws-s3",
        bucket: bucket,
      };
    } catch (error) {
      if (error.message.includes("AWS_S3_BUCKET")) {
        throw error;
      }
      // If AWS SDK not installed, provide helpful error
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "AWS SDK not installed. Run: npm install @aws-sdk/client-s3"
        );
      }
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async deleteFromS3(filePath) {
    try {
      const { S3Client, DeleteObjectCommand } = await import(
        "@aws-sdk/client-s3"
      );

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const bucket = process.env.AWS_S3_BUCKET;
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: filePath,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "AWS SDK not installed. Run: npm install @aws-sdk/client-s3"
        );
      }
      console.warn(`⚠️ Could not delete S3 file: ${error.message}`);
      return false;
    }
  }

  async getS3Url(filePath, options = {}) {
    try {
      const bucket = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_REGION || "us-east-1";

      // If public bucket, return public URL
      if (options.public) {
        return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
      }

      // Otherwise, return signed URL
      return await this.getS3SignedUrl(filePath, options.expiresIn || 3600);
    } catch (error) {
      throw new Error(`Failed to get S3 URL: ${error.message}`);
    }
  }

  async getS3SignedUrl(key, expiresIn = 3600) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const bucket = process.env.AWS_S3_BUCKET;
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "AWS SDK not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner"
        );
      }
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get file content from S3 as a Buffer
   * @param {string} key - S3 key (path) of the file
   * @returns {Promise<Buffer>} File content as Buffer
   */
  async getS3FileContent(key) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const bucket = process.env.AWS_S3_BUCKET;
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "AWS SDK not installed. Run: npm install @aws-sdk/client-s3"
        );
      }
      if (error.name === "NoSuchKey") {
        throw new Error(`File not found in S3: ${key}`);
      }
      throw new Error(`Failed to fetch file from S3: ${error.message}`);
    }
  }

  getContentType(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const types = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return types[ext] || "application/octet-stream";
  }

  /**
   * Google Cloud Storage implementation (placeholder)
   * To implement: npm install @google-cloud/storage
   */
  async uploadToGoogleCloud(fileBuffer, fileName, folder, options) {
    throw new Error("Google Cloud Storage integration not yet implemented");
  }

  async deleteFromGoogleCloud(filePath) {
    throw new Error("Google Cloud Storage integration not yet implemented");
  }

  async getGoogleCloudUrl(filePath) {
    throw new Error("Google Cloud Storage integration not yet implemented");
  }

  /**
   * Azure Blob Storage implementation (placeholder)
   * To implement: npm install @azure/storage-blob
   */
  async uploadToAzure(fileBuffer, fileName, folder, options) {
    throw new Error("Azure Blob Storage integration not yet implemented");
  }

  async deleteFromAzure(filePath) {
    throw new Error("Azure Blob Storage integration not yet implemented");
  }

  async getAzureUrl(filePath) {
    throw new Error("Azure Blob Storage integration not yet implemented");
  }
}

export default CloudProviderInterface;
