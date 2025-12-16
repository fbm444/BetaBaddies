import profileService from "../services/profileService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { sanitizeInput } from "../utils/helpers.js";

class ProfileController {
  // Get current user's profile
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.session?.userId;
    
    console.log(`[ProfileController.getProfile] Request received, session userId: ${userId}`);
    console.log(`[ProfileController.getProfile] Session data:`, {
      userId: req.session?.userId,
      userEmail: req.session?.userEmail,
      cookie: req.headers.cookie ? 'present' : 'missing',
    });

    if (!userId) {
      console.log(`[ProfileController.getProfile] No userId in session, returning 401`);
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const profile = await profileService.getProfileByUserId(userId);

    if (!profile) {
      console.log(`[ProfileController.getProfile] Profile not found for user: ${userId}`);
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      });
    }

    console.log(`[ProfileController.getProfile] Successfully returning profile for user: ${userId}`);

    res.status(200).json({
      ok: true,
      data: {
        profile,
      },
    });
  });

  // Create or update profile
  createOrUpdateProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
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
    } = req.body;

    const profile = await profileService.createOrUpdateProfile(userId, {
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
    });

    const isNewProfile = !profile._alreadyExists;

    res.status(isNewProfile ? 201 : 200).json({
      ok: true,
      data: {
        profile,
        message: isNewProfile
          ? "Profile created successfully"
          : "Profile updated successfully",
      },
    });
  });

  // Update profile
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
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
    } = req.body;

    const profile = await profileService.updateProfile(userId, {
      firstName: firstName ? sanitizeInput(firstName) : firstName,
      middleName: middleName ? sanitizeInput(middleName) : middleName,
      lastName: lastName ? sanitizeInput(lastName) : lastName,
      phone: phone ? sanitizeInput(phone) : phone,
      city: city ? sanitizeInput(city) : city,
      state,
      jobTitle: jobTitle ? sanitizeInput(jobTitle) : jobTitle,
      bio: bio ? sanitizeInput(bio) : bio,
      industry: industry ? sanitizeInput(industry) : industry,
      expLevel,
    });

    res.status(200).json({
      ok: true,
      data: {
        profile,
        message: "Profile updated successfully",
      },
    });
  });

  // Update profile picture
  updateProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // This would typically be called by the file upload service
    // after the file is successfully uploaded
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "File path is required",
        },
      });
    }

    const profile = await profileService.updateProfilePicture(userId, filePath);

    res.status(200).json({
      ok: true,
      data: {
        profile,
        message: "Profile picture updated successfully",
      },
    });
  });

  // Get profile picture path
  getProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const picturePath = await profileService.getProfilePicturePath(userId);

    if (!picturePath) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Profile picture not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        picturePath,
      },
    });
  });

  // Get profile statistics
  getProfileStatistics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const statistics = await profileService.getProfileStatistics(userId);

    res.status(200).json({
      ok: true,
      data: {
        statistics,
      },
    });
  });
}

export default new ProfileController();
