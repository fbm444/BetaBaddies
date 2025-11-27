import referralRequestService from "../services/referralRequestService.js";
import professionalContactService from "../services/professionalContactService.js";
import jobOpportunityService from "../services/jobOpportunityService.js";
import profileService from "../services/profileService.js";
import emailService from "../services/emailService.js";
import database from "../services/database.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ReferralRequestController {
  // Create a new referral request
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const referralData = req.body;

    const referral = await referralRequestService.createReferralRequest(userId, referralData);

    res.status(201).json({
      ok: true,
      data: {
        referral,
        message: "Referral request created successfully",
      },
    });
  });

  // Get all referral requests for the current user
  getAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      status: req.query.status,
      contactId: req.query.contactId,
      jobId: req.query.jobId,
      followupRequired: req.query.followupRequired !== undefined ? req.query.followupRequired === "true" : undefined,
    };

    const referrals = await referralRequestService.getReferralRequestsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        referrals,
      },
    });
  });

  // Get referral request by ID
  getById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const referral = await referralRequestService.getReferralRequestById(id, userId);

    if (!referral) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Referral request not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        referral,
      },
    });
  });

  // Update referral request
  update = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const referralData = req.body;

    // Get existing referral to check if we're sending it now
    const existingReferral = await referralRequestService.getReferralRequestById(id, userId);
    const shouldSendEmail =
      Boolean(referralData.resend) || (referralData.sentAt && !existingReferral?.sentAt);

    const sanitizedData = { ...referralData };
    delete sanitizedData.resend;

    if (shouldSendEmail && existingReferral?.requestTemplateId) {
      try {
        sanitizedData.personalizedMessage =
          await referralRequestService.generatePersonalizedMessage({
            userId,
            contactId: existingReferral.contactId,
            jobId: existingReferral.jobId,
            templateId: existingReferral.requestTemplateId,
            templateBody: sanitizedData.personalizedMessage || existingReferral.personalizedMessage,
            tone: sanitizedData.tone,
          });
      } catch (personalizeError) {
        console.error("❌ Error personalizing referral message:", personalizeError);
      }
    }
    delete sanitizedData.tone;

    const referral = await referralRequestService.updateReferralRequest(id, userId, sanitizedData);

    // Send email notification if referral is being sent or explicitly resent
    if (shouldSendEmail) {
      try {
        // Get contact details
        const contact = await professionalContactService.getContactById(referral.contactId, userId);
        
        // Get job opportunity details
        const job = await jobOpportunityService.getJobOpportunityById(referral.jobId, userId);
        
        // Get user profile for requester name
        const profile = await profileService.getProfileByUserId(userId);
        const requesterName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "A colleague";

        // Send email if contact has email
        if (contact && contact.email) {
          const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";
          
          await emailService.sendReferralRequestNotification(contact.email, {
            contactName,
            requesterName: requesterName || "A colleague",
            jobTitle: job?.title || "Position",
            jobCompany: job?.company || "Company",
            jobLocation: job?.location || null,
            personalizedMessage: referral.personalizedMessage || sanitizedData.personalizedMessage || null,
          });
        }
      } catch (emailError) {
        // Log error but don't fail the update
        console.error("❌ Error sending referral request email:", emailError);
      }
    }

    res.status(200).json({
      ok: true,
      data: {
        referral,
        message: "Referral request updated successfully",
      },
    });
  });

  // Delete referral request
  delete = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await referralRequestService.deleteReferralRequest(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Referral request deleted successfully",
      },
    });
  });

  // Get referral requests where current user needs to write a referral
  getToWrite = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    
    // Get user's email from session or database
    const userResult = await database.query(
      `SELECT email FROM users WHERE u_id = $1`,
      [userId]
    );
    
    if (!userResult.rows.length || !userResult.rows[0].email) {
      return res.status(200).json({
        ok: true,
        data: {
          referrals: [],
        },
      });
    }

    const userEmail = userResult.rows[0].email;
    const referrals = await referralRequestService.getReferralRequestsToWrite(userEmail);

    res.status(200).json({
      ok: true,
      data: {
        referrals,
      },
    });
  });

  // Get referral requests needing follow-up
  getNeedingFollowup = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const referrals = await referralRequestService.getReferralRequestsNeedingFollowup(userId);

    res.status(200).json({
      ok: true,
      data: {
        referrals,
      },
    });
  });

  // Get referral request templates (for asking FOR referrals)
  getTemplates = asyncHandler(async (req, res) => {
    const templates = await referralRequestService.getReferralTemplates();

    res.status(200).json({
      ok: true,
      data: {
        templates,
      },
    });
  });

  // Get referral recommendation templates (for writing referrals FOR others)
  getRecommendationTemplates = asyncHandler(async (req, res) => {
    const templates = await referralRequestService.getReferralRecommendationTemplates();

    res.status(200).json({
      ok: true,
      data: {
        templates,
      },
    });
  });

  // Get template preview
  getTemplatePreview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const preview = await referralRequestService.getTemplatePreview(id);

    res.status(200).json({
      ok: true,
      data: {
        template: preview, // Wrap in 'template' property to match frontend expectation
      },
    });
  });

  // Create referral recommendation template with AI (for Write Referrals tab - generic, not job-specific)
  createRecommendationTemplateWithAI = asyncHandler(async (req, res) => {
    const templateData = req.body;

    const template = await referralRequestService.createReferralRecommendationTemplateWithAI(templateData);

    res.status(201).json({
      ok: true,
      data: {
        template,
        message: "Referral recommendation template created successfully with AI",
      },
    });
  });

  // Create referral request template with AI (for Ask for Referrals tab - generic, not job-specific)
  createTemplateWithAI = asyncHandler(async (req, res) => {
    const templateData = req.body;

    const template = await referralRequestService.createReferralRequestTemplateWithAI(templateData);

    res.status(201).json({
      ok: true,
      data: {
        template,
        message: "Referral request template created successfully with AI",
      },
    });
  });

  // Create referral template manually
  createTemplate = asyncHandler(async (req, res) => {
    const templateData = req.body;

    const template = await referralRequestService.createReferralTemplate(templateData);

    res.status(201).json({
      ok: true,
      data: {
        template,
        message: "Referral template created successfully",
      },
    });
  });

  // Delete referral template
  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await referralRequestService.deleteReferralTemplate(id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Referral template deleted successfully",
      },
    });
  });

  personalizeMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { contactId, jobId, templateBody, templateId, tone } = req.body;

    const message = await referralRequestService.generatePersonalizedMessage({
      userId,
      contactId,
      jobId,
      templateBody,
      templateId,
      tone,
    });

    res.status(200).json({
      ok: true,
      data: {
        message,
      },
    });
  });

  // Generate referral letter (for writing referrals) - customized from template
  generateReferralLetter = asyncHandler(async (req, res) => {
    const currentUserId = req.session.userId;
    const { templateId, referralRequestId } = req.body;

    if (!templateId || !referralRequestId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Template ID and referral request ID are required",
        },
      });
    }

    const customizedLetter = await referralRequestService.generateCustomizedReferralLetter({
      templateId,
      referralRequestId,
      currentUserId,
    });

    res.status(200).json({
      ok: true,
      data: {
        message: customizedLetter,
      },
    });
  });

  // Save draft referral letter
  saveDraftReferralLetter = asyncHandler(async (req, res) => {
    const { referralRequestId, letterContent } = req.body;

    if (!referralRequestId || !letterContent) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Referral request ID and letter content are required",
        },
      });
    }

    const result = await referralRequestService.saveDraftReferralLetter(
      referralRequestId,
      letterContent
    );

    res.status(200).json({
      ok: true,
      data: {
        referral: result,
        message: "Draft referral letter saved successfully",
      },
    });
  });

  // Submit and send referral letter
  submitReferralLetter = asyncHandler(async (req, res) => {
    const currentUserId = req.session.userId;
    const { referralRequestId, letterContent } = req.body;

    if (!referralRequestId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Referral request ID is required",
        },
      });
    }

    // Get the referral request to find requester info
    const referralRequest = await referralRequestService.getReferralRequestById(referralRequestId, null);
    if (!referralRequest) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Referral request not found",
        },
      });
    }

    // Determine the letter content (use provided content or draft)
    const finalLetterContent = letterContent || referralRequest.draftReferralLetter;
    
    if (!finalLetterContent) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "No referral letter content found. Please generate or save a draft letter first.",
        },
      });
    }

    // Submit the referral letter (updates the referral request)
    const updatedReferral = await referralRequestService.submitReferralLetter(
      referralRequestId,
      finalLetterContent,
      currentUserId
    );

    // Get current user's profile for the email
    const writerProfile = await profileService.getProfileByUserId(currentUserId);
    const writerName = writerProfile
      ? `${writerProfile.first_name || ""} ${writerProfile.last_name || ""}`.trim() || writerProfile.fullName
      : "A colleague";

    // Get requester's email from users table
    const requesterUserId = referralRequest.userId;
    let requesterEmail = referralRequest.requesterEmail;
    
    // If we don't have the email from the referral request, get it from the users table
    if (!requesterEmail) {
      try {
        const userResult = await database.query(
          `SELECT email FROM users WHERE u_id = $1`,
          [requesterUserId]
        );
        if (userResult.rows.length > 0) {
          requesterEmail = userResult.rows[0].email;
        }
      } catch (err) {
        console.error("❌ Error fetching requester email:", err);
      }
    }

    if (requesterEmail) {
      try {
        // Get job details
        const job = await jobOpportunityService.getJobOpportunityById(referralRequest.jobId, referralRequest.userId);
        
        await emailService.sendReferralLetterNotification(requesterEmail, {
          writerName,
          jobTitle: job?.title || referralRequest.jobTitle || "Position",
          jobCompany: job?.company || referralRequest.jobCompany || "Company",
          referralLetter: finalLetterContent,
        });
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("❌ Error sending referral letter email:", emailError);
      }
    }

    res.status(200).json({
      ok: true,
      data: {
        referral: updatedReferral,
        message: "Referral letter sent successfully",
      },
    });
  });
}

export default new ReferralRequestController();

