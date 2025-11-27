import referralRequestService from "../services/referralRequestService.js";
import professionalContactService from "../services/professionalContactService.js";
import jobOpportunityService from "../services/jobOpportunityService.js";
import profileService from "../services/profileService.js";
import emailService from "../services/emailService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ReferralRequestController {
  // Create a new referral request
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const referralData = req.body;

    const referral = await referralRequestService.createReferralRequest(userId, referralData);

    // Send email notification to contact
    try {
      // Get contact details
      const contact = await professionalContactService.getContactById(referralData.contactId, userId);
      
      // Get job opportunity details
      const job = await jobOpportunityService.getJobOpportunityById(referralData.jobId, userId);
      
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
          personalizedMessage: referralData.personalizedMessage || null,
        });
      }
    } catch (emailError) {
      // Log error but don't fail the request creation
      console.error("❌ Error sending referral request email:", emailError);
    }

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
    const isBeingSent = referralData.sentAt && !existingReferral?.sentAt;

    const referral = await referralRequestService.updateReferralRequest(id, userId, referralData);

    // Send email notification if referral is being sent
    if (isBeingSent) {
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
            personalizedMessage: referral.personalizedMessage || referralData.personalizedMessage || null,
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

  // Get referral templates
  getTemplates = asyncHandler(async (req, res) => {
    const templates = await referralRequestService.getReferralTemplates();

    res.status(200).json({
      ok: true,
      data: {
        templates,
      },
    });
  });

  // Create referral template with AI
  createTemplateWithAI = asyncHandler(async (req, res) => {
    const templateData = req.body;

    const template = await referralRequestService.createReferralTemplateWithAI(templateData);

    res.status(201).json({
      ok: true,
      data: {
        template,
        message: "Referral template created successfully with AI",
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
}

export default new ReferralRequestController();

