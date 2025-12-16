import certificationService from "../services/certificationService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import multer from "multer";
import fileUploadService from "../services/fileUploadService.js";

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for badge images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
});

class CertificationController {
  // Create a new certification
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const certificationData = req.body;

    const certification = await certificationService.createCertification(userId, certificationData);

    res.status(201).json({
      ok: true,
      data: {
        certification,
        message: "Certification created successfully",
      },
    });
  });

  // Get all certifications for the current user
  getAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const certifications = await certificationService.getCertifications(userId);

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
      },
    });
  });

  // Get a specific certification by ID
  getById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    try {
      const certification = await certificationService.getCertificationById(id, userId);

      res.status(200).json({
        ok: true,
        data: {
          certification,
        },
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "CERTIFICATION_NOT_FOUND",
            message: "Certification not found",
          },
        });
      }
      throw error;
    }
  });

  // Update a certification
  update = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updateData = req.body;

    const certification = await certificationService.updateCertification(id, userId, updateData);

    res.status(200).json({
      ok: true,
      data: {
        certification,
        message: "Certification updated successfully",
      },
    });
  });

  // Delete a certification
  delete = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await certificationService.deleteCertification(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Certification deleted successfully",
      },
    });
  });

  // Get certifications by organization
  getByOrganization = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { organization } = req.query;

    if (!organization) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_ORGANIZATION",
          message: "Organization name is required",
        },
      });
    }

    const certifications = await certificationService.getCertificationsByOrganization(userId, organization);

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
        organization,
      },
    });
  });

  // Get expiring certifications
  getExpiring = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { days = 30 } = req.query;

    const certifications = await certificationService.getExpiringCertifications(userId, parseInt(days));

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
        daysAhead: parseInt(days),
      },
    });
  });

  // Get certification statistics
  getStatistics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const statistics = await certificationService.getCertificationStatistics(userId);

    res.status(200).json({
      ok: true,
      data: {
        statistics,
      },
    });
  });

  // Search certifications
  search = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_SEARCH_TERM",
          message: "Search term is required",
        },
      });
    }

    const certifications = await certificationService.searchCertifications(userId, q);

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
        searchTerm: q,
      },
    });
  });

  // Get current certifications (non-expired)
  getCurrent = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const allCertifications = await certificationService.getCertifications(userId);
    
    // Filter for current (non-expired) certifications
    const currentCertifications = allCertifications.filter(cert => 
      cert.status === 'active' || cert.status === 'no_expiration'
    );

    res.status(200).json({
      ok: true,
      data: {
        certifications: currentCertifications,
        count: currentCertifications.length,
      },
    });
  });

  // Get certification history (all certifications including expired)
  getHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const certifications = await certificationService.getCertifications(userId);

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
      },
    });
  });

  // Upload certification badge image
  uploadBadgeImage = [
    upload.single("badgeImage"),
    asyncHandler(async (req, res) => {
      const userId = req.session.userId;

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "NO_FILE",
            message: "No file provided",
          },
        });
      }

      try {
        const result = await fileUploadService.uploadCertificationBadge(
          userId,
          req.file
        );

        res.status(201).json({
          ok: true,
          data: {
            ...result,
            message: "Badge image uploaded successfully",
          },
        });
      } catch (error) {
        console.error("❌ Error uploading badge image:", error);
        if (
          error.message.includes("File size exceeds") ||
          error.message.includes("Invalid file type") ||
          error.message.includes("not allowed")
        ) {
          return res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: error.message,
            },
          });
        }
        throw error;
      }
    }),
  ];

  // Get certifications by category
  getByCategory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_CATEGORY",
          message: "Category is required",
        },
      });
    }

    const certifications = await certificationService.getCertificationsByCategory(userId, category);

    res.status(200).json({
      ok: true,
      data: {
        certifications,
        count: certifications.length,
        category,
      },
    });
  });
}

export default new CertificationController();
