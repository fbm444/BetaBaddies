import Joi from "joi";

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      }),
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      }),
  }),

  deleteAccount: Joi.object({
    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required to delete account",
      "string.min": "Password must be at least 8 characters",
      "any.required": "Password is required to delete account",
    }),
    confirmationText: Joi.string()
      .valid("DELETE MY ACCOUNT")
      .required()
      .messages({
        "any.only": 'You must type "DELETE MY ACCOUNT" to confirm deletion',
        "any.required": "Confirmation text is required",
      }),
  }),

  createEducation: Joi.object({
    school: Joi.string().max(255).required(),
    degreeType: Joi.string()
      .valid(
        "High School",
        "Associate",
        "Bachelor's",
        "Master's",
        "PhD",
        "Certificate",
        "Diploma"
      )
      .required(),
    field: Joi.string().max(255).allow(null, "").optional(),
    gpa: Joi.number().min(0).max(4.0).allow(null).optional(),
    isEnrolled: Joi.boolean().required(),
    honors: Joi.string().max(1000).allow(null, "").optional(),
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().required().messages({
      "any.required": "Graduation date is required",
      "date.base": "Graduation date must be a valid date",
    }),
  })
    .custom((value, helpers) => {
      // If both dates exist, endDate should be after startDate
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        return helpers.error("date.endBeforeStart");
      }
      return value;
    })
    .messages({
      "date.endBeforeStart": "Graduation date must be after start date",
    }),

  updateEducation: Joi.object({
    school: Joi.string().max(255).optional(),
    degreeType: Joi.string()
      .valid(
        "High School",
        "Associate",
        "Bachelor's",
        "Master's",
        "PhD",
        "Certificate",
        "Diploma"
      )
      .optional(),
    field: Joi.string().max(255).allow(null, "").optional(),
    gpa: Joi.number().min(0).max(4.0).allow(null).optional(),
    isEnrolled: Joi.boolean().optional(),
    honors: Joi.string().max(1000).allow(null, "").optional(),
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().optional(),
  })
    .custom((value, helpers) => {
      // If both dates exist, endDate should be after startDate
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        return helpers.error("date.endBeforeStart");
      }
      return value;
    })
    .messages({
      "date.endBeforeStart": "Graduation date must be after start date",
    }),

  createSkill: Joi.object({
    skillName: Joi.string().max(100).required(),
    proficiency: Joi.string()
      .valid("Beginner", "Intermediate", "Advanced", "Expert")
      .required(),
    category: Joi.string()
      .valid("Technical", "Soft Skills", "Languages", "Industry-Specific")
      .allow(null, "")
      .optional(),
    skillBadge: Joi.string().uri().max(500).allow(null, "").optional(),
  }),

  updateSkill: Joi.object({
    proficiency: Joi.string()
      .valid("Beginner", "Intermediate", "Advanced", "Expert")
      .optional(),
    category: Joi.string()
      .valid("Technical", "Soft Skills", "Languages", "Industry-Specific")
      .allow(null, "")
      .optional(),
    skillBadge: Joi.string().uri().max(500).allow(null, "").optional(),
  }),

  createJob: Joi.object({
    title: Joi.string().max(255).required(),
    company: Joi.string().max(255).required(),
    location: Joi.string().max(255).allow(null, "").optional(),
    salary: Joi.number().min(0).allow(null).optional(),
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().allow(null).optional(),
    description: Joi.string().max(2000).allow(null, "").optional(),
    isCurrent: Joi.boolean().optional(),
  })
    .custom((value, helpers) => {
      // Custom validation for date logic
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        return helpers.error("date.endBeforeStart");
      }
      if (value.isCurrent && value.endDate) {
        return helpers.error("date.currentWithEndDate");
      }
      return value;
    })
    .messages({
      "date.endBeforeStart": "End date must be after start date",
      "date.currentWithEndDate": "Current job cannot have an end date",
    }),

  updateJob: Joi.object({
    title: Joi.string().max(255).optional(),
    company: Joi.string().max(255).optional(),
    location: Joi.string().max(255).allow(null, "").optional(),
    salary: Joi.number().min(0).allow(null).optional(),
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().allow(null).optional(),
    description: Joi.string().max(2000).allow(null, "").optional(),
    isCurrent: Joi.boolean().optional(),
  }),

  jobId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  createCertification: Joi.object({
    name: Joi.string().max(255).required(),
    orgName: Joi.string().max(255).required(),
    dateEarned: Joi.date().required(),
    expirationDate: Joi.date().allow(null).optional(),
    neverExpires: Joi.boolean().default(false),
  })
    .custom((value, helpers) => {
      // Custom validation for certification date logic
      const earnedDate = new Date(value.dateEarned);
      const today = new Date();

      // Check if date earned is in the future
      if (earnedDate > today) {
        return helpers.error("certification.futureDate");
      }

      if (value.neverExpires && value.expirationDate) {
        return helpers.error("certification.permanentWithExpiration");
      }
      if (!value.neverExpires && !value.expirationDate) {
        return helpers.error("certification.expiringWithoutDate");
      }
      if (
        value.expirationDate &&
        value.dateEarned &&
        value.expirationDate <= value.dateEarned
      ) {
        return helpers.error("certification.expirationBeforeEarned");
      }
      return value;
    })
    .messages({
      "certification.futureDate": "Date earned cannot be in the future",
      "certification.permanentWithExpiration":
        "Permanent certifications cannot have an expiration date",
      "certification.expiringWithoutDate":
        "Non-permanent certifications must have an expiration date",
      "certification.expirationBeforeEarned":
        "Expiration date must be after date earned",
    }),

  updateCertification: Joi.object({
    name: Joi.string().max(255).optional(),
    orgName: Joi.string().max(255).optional(),
    dateEarned: Joi.date().optional(),
    expirationDate: Joi.date().allow(null).optional(),
    neverExpires: Joi.boolean().optional(),
  })
    .custom((value, helpers) => {
      // Custom validation for certification date logic
      if (value.neverExpires && value.expirationDate) {
        return helpers.error("certification.permanentWithExpiration");
      }
      if (
        value.expirationDate &&
        value.dateEarned &&
        value.expirationDate <= value.dateEarned
      ) {
        return helpers.error("certification.expirationBeforeEarned");
      }
      return value;
    })
    .messages({
      "certification.permanentWithExpiration":
        "Permanent certifications cannot have an expiration date",
      "certification.expirationBeforeEarned":
        "Expiration date must be after date earned",
    }),

  certificationId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  fileId: Joi.object({
    fileId: Joi.string().uuid().required(),
  }),

  createProject: Joi.object({
    name: Joi.string().max(255).required(),
    link: Joi.string().uri().max(500).allow(null, "").optional(),
    description: Joi.string().max(500).allow(null, "").optional(),
    startDate: Joi.date().required(),
    endDate: Joi.date().allow(null).optional(),
    technologies: Joi.string().max(500).allow(null, "").optional(),
    collaborators: Joi.string().max(255).allow(null, "").optional(),
    status: Joi.string().valid("Completed", "Ongoing", "Planned").required(),
    industry: Joi.string().max(255).allow(null, "").optional(),
  })
    .custom((value, helpers) => {
      // Custom validation for date logic
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        return helpers.error("date.endBeforeStart");
      }
      if (value.status === "Completed" && !value.endDate) {
        return helpers.error("project.completedWithoutEndDate");
      }
      return value;
    })
    .messages({
      "date.endBeforeStart": "End date must be after start date",
      "project.completedWithoutEndDate":
        "Completed projects should have an end date",
    }),

  updateProject: Joi.object({
    name: Joi.string().max(255).optional(),
    link: Joi.string().uri().max(500).allow(null, "").optional(),
    description: Joi.string().max(500).allow(null, "").optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().allow(null).optional(),
    technologies: Joi.string().max(500).allow(null, "").optional(),
    collaborators: Joi.string().max(255).allow(null, "").optional(),
    status: Joi.string().valid("Completed", "Ongoing", "Planned").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
  })
    .custom((value, helpers) => {
      // Custom validation for date logic
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        return helpers.error("date.endBeforeStart");
      }
      return value;
    })
    .messages({
      "date.endBeforeStart": "End date must be after start date",
    }),

  projectId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  createProfile: Joi.object({
    firstName: Joi.string().max(255).required(),
    middleName: Joi.string().max(255).allow(null, "").optional(),
    lastName: Joi.string().max(255).required(),
    phone: Joi.string().max(15).allow(null, "").optional(),
    city: Joi.string().max(255).allow(null, "").optional(),
    state: Joi.string().length(2).uppercase().required(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    bio: Joi.string().max(500).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    expLevel: Joi.string()
      .valid("Entry", "Mid", "Senior")
      .allow(null, "")
      .optional(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().max(255).optional(),
    middleName: Joi.string().max(255).allow(null, "").optional(),
    lastName: Joi.string().max(255).optional(),
    phone: Joi.string().max(15).allow(null, "").optional(),
    city: Joi.string().max(255).allow(null, "").optional(),
    state: Joi.string().length(2).uppercase().optional(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    bio: Joi.string().max(500).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    expLevel: Joi.string()
      .valid("Entry", "Mid", "Senior")
      .allow(null, "")
      .optional(),
  }),

  // Network Contact Validation
  createContact: Joi.object({
    firstName: Joi.string().max(255).allow(null, "").optional(),
    lastName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string()
      .email()
      .max(255)
      .required()
      .min(1)
      .messages({
        "any.required": "Email is required",
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "string.min": "Email is required",
      }),
    phone: Joi.string()
      .custom((value, helpers) => {
        if (!value || value.trim() === "") {
          return value; // Allow empty/optional
        }
        // Remove all non-digit characters
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly.length !== 10) {
          return helpers.error("phone.invalidLength");
        }
        return value;
      })
      .max(50)
      .allow(null, "")
      .optional()
      .messages({
        "phone.invalidLength": "Phone number must be exactly 10 digits",
      }),
    company: Joi.string().max(255).allow(null, "").optional(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    location: Joi.string().max(255).allow(null, "").optional(),
    relationshipType: Joi.string().max(50).allow(null, "").optional(),
    relationshipStrength: Joi.string()
      .valid("Weak", "Medium", "Strong")
      .allow(null, "")
      .optional(),
    relationshipContext: Joi.string().allow(null, "").optional(),
    personalInterests: Joi.string().allow(null, "").optional(),
    professionalInterests: Joi.string().allow(null, "").optional(),
    linkedinUrl: Joi.string()
      .uri()
      .max(1000)
      .allow(null, "")
      .optional()
      .messages({
        "string.uri": "Please enter a valid URL",
      }),
    notes: Joi.string().allow(null, "").optional(),
    importedFrom: Joi.string().max(50).allow(null, "").optional(),
    lastInteractionDate: Joi.date().allow(null).optional(),
    nextReminderDate: Joi.date().allow(null).optional(),
  }),

  updateContact: Joi.object({
    firstName: Joi.string().max(255).allow(null, "").optional(),
    lastName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string()
      .email()
      .max(255)
      .required()
      .min(1)
      .messages({
        "any.required": "Email is required",
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
        "string.min": "Email is required",
      }),
    phone: Joi.string()
      .custom((value, helpers) => {
        if (!value || value.trim() === "") {
          return value; // Allow empty/optional
        }
        // Remove all non-digit characters
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly.length !== 10) {
          return helpers.error("phone.invalidLength");
        }
        return value;
      })
      .max(50)
      .allow(null, "")
      .optional()
      .messages({
        "phone.invalidLength": "Phone number must be exactly 10 digits",
      }),
    company: Joi.string().max(255).allow(null, "").optional(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    location: Joi.string().max(255).allow(null, "").optional(),
    relationshipType: Joi.string().max(50).allow(null, "").optional(),
    relationshipStrength: Joi.string()
      .valid("Weak", "Medium", "Strong")
      .allow(null, "")
      .optional(),
    relationshipContext: Joi.string().allow(null, "").optional(),
    personalInterests: Joi.string().allow(null, "").optional(),
    professionalInterests: Joi.string().allow(null, "").optional(),
    linkedinUrl: Joi.string()
      .uri()
      .max(1000)
      .allow(null, "")
      .optional()
      .messages({
        "string.uri": "Please enter a valid URL",
      }),
    notes: Joi.string().allow(null, "").optional(),
    importedFrom: Joi.string().max(50).allow(null, "").optional(),
    lastInteractionDate: Joi.date().allow(null).optional(),
    nextReminderDate: Joi.date().allow(null).optional(),
  }),

  contactId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  addContactInteraction: Joi.object({
    interactionType: Joi.string().max(50).allow(null, "").optional(),
    interactionDate: Joi.date().allow(null).optional(),
    summary: Joi.string().allow(null, "").optional(),
    notes: Joi.string().allow(null, "").optional(),
  }),

  // Networking Event Validation
  createEvent: Joi.object({
    eventName: Joi.string().max(255).required().messages({
      "any.required": "Event name is required",
      "string.empty": "Event name cannot be empty",
    }),
    eventType: Joi.string().max(50).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    location: Joi.string().max(255).allow(null, "").optional(),
    eventDate: Joi.date().required().messages({
      "any.required": "Event date is required",
      "date.base": "Event date must be a valid date",
    }),
    eventTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null, "")
      .optional()
      .messages({
        "string.pattern.base": "Please enter a valid time (HH:MM format)",
      }),
    eventUrl: Joi.string()
      .uri()
      .max(1000)
      .allow(null, "")
      .optional()
      .messages({
        "string.uri": "Please enter a valid URL",
      }),
    description: Joi.string().allow(null, "").optional(),
    networkingGoals: Joi.string().allow(null, "").optional(),
    preparationNotes: Joi.string().allow(null, "").optional(),
    attended: Joi.boolean().optional(),
    attendanceDate: Joi.date().allow(null).optional(),
    postEventNotes: Joi.string().allow(null, "").optional(),
    roiScore: Joi.number().integer().min(0).max(100).allow(null).optional(),
    connectionsMadeCount: Joi.number().integer().min(0).allow(null).optional(),
  }),

  updateEvent: Joi.object({
    eventName: Joi.string().max(255).optional(),
    eventType: Joi.string().max(50).allow(null, "").optional(),
    industry: Joi.string().max(255).allow(null, "").optional(),
    location: Joi.string().max(255).allow(null, "").optional(),
    eventDate: Joi.date().optional(),
    eventTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .allow(null, "")
      .optional()
      .messages({
        "string.pattern.base": "Please enter a valid time (HH:MM format)",
      }),
    eventUrl: Joi.string()
      .uri()
      .max(1000)
      .allow(null, "")
      .optional()
      .messages({
        "string.uri": "Please enter a valid URL",
      }),
    description: Joi.string().allow(null, "").optional(),
    networkingGoals: Joi.string().allow(null, "").optional(),
    preparationNotes: Joi.string().allow(null, "").optional(),
    attended: Joi.boolean().optional(),
    attendanceDate: Joi.date().allow(null).optional(),
    postEventNotes: Joi.string().allow(null, "").optional(),
    roiScore: Joi.number().integer().min(0).max(100).allow(null).optional(),
    connectionsMadeCount: Joi.number().integer().min(0).allow(null).optional(),
  }),

  eventId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  addEventConnection: Joi.object({
    contactId: Joi.string().uuid().required().messages({
      "any.required": "Contact ID is required",
    }),
    connectionQuality: Joi.string().max(50).allow(null, "").optional(),
    followupRequired: Joi.boolean().optional(),
    notes: Joi.string().allow(null, "").optional(),
  }),

  // Referral Request Validation
  createReferralRequest: Joi.object({
    contactId: Joi.string().uuid().required().messages({
      "any.required": "Contact ID is required",
    }),
    jobId: Joi.string().uuid().required().messages({
      "any.required": "Job ID is required",
    }),
    requestTemplateId: Joi.string().uuid().allow(null).optional(),
    personalizedMessage: Joi.string().allow(null, "").optional(),
    requestStatus: Joi.string()
      .valid("pending", "sent", "accepted", "declined", "completed")
      .optional(),
    sentAt: Joi.date().allow(null).optional(),
    responseReceivedAt: Joi.date().allow(null).optional(),
    responseContent: Joi.string().allow(null, "").optional(),
    referralSuccessful: Joi.boolean().allow(null).optional(),
    followupRequired: Joi.boolean().optional(),
    followupSentAt: Joi.date().allow(null).optional(),
    gratitudeExpressed: Joi.boolean().optional(),
    relationshipImpact: Joi.string().max(50).allow(null, "").optional(),
  }),

  updateReferralRequest: Joi.object({
    contactId: Joi.string().uuid().optional(),
    jobId: Joi.string().uuid().optional(),
    requestTemplateId: Joi.string().uuid().allow(null).optional(),
    personalizedMessage: Joi.string().allow(null, "").optional(),
    requestStatus: Joi.string()
      .valid("pending", "sent", "accepted", "declined", "completed")
      .optional(),
    sentAt: Joi.date().allow(null).optional(),
    responseReceivedAt: Joi.date().allow(null).optional(),
    responseContent: Joi.string().allow(null, "").optional(),
    referralSuccessful: Joi.boolean().allow(null).optional(),
    followupRequired: Joi.boolean().optional(),
    followupSentAt: Joi.date().allow(null).optional(),
    gratitudeExpressed: Joi.boolean().optional(),
    relationshipImpact: Joi.string().max(50).allow(null, "").optional(),
  }),

  referralRequestId: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(422).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: errorDetails.reduce((acc, detail) => {
            acc[detail.field] = detail.message;
            return acc;
          }, {}),
        },
      });
    }

    next();
  };
};

// Validation middleware for path parameters
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(422).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: errorDetails.reduce((acc, detail) => {
            acc[detail.field] = detail.message;
            return acc;
          }, {}),
        },
      });
    }

    next();
  };
};

// Export individual validation middleware
export const validateRegister = validate(schemas.register);
export const validateLogin = validate(schemas.login);
export const validateChangePassword = validate(schemas.changePassword);
export const validateDeleteAccount = validate(schemas.deleteAccount);
export const validateCreateEducation = validate(schemas.createEducation);
export const validateUpdateEducation = validate(schemas.updateEducation);
export const validateCreateSkill = validate(schemas.createSkill);
export const validateUpdateSkill = validate(schemas.updateSkill);
export const validateCreateJob = validate(schemas.createJob);
export const validateUpdateJob = validate(schemas.updateJob);
export const validateJobId = validateParams(schemas.jobId);
export const validateCreateCertification = validate(
  schemas.createCertification
);
export const validateUpdateCertification = validate(
  schemas.updateCertification
);
export const validateCertificationId = validateParams(schemas.certificationId);
export const validateFileId = validateParams(schemas.fileId);
export const validateCreateProject = validate(schemas.createProject);
export const validateUpdateProject = validate(schemas.updateProject);
export const validateProjectId = validateParams(schemas.projectId);
export const validateCreateProfile = validate(schemas.createProfile);
export const validateUpdateProfile = validate(schemas.updateProfile);
export const validateForgotPassword = validate(schemas.forgotPassword);
export const validateResetPassword = validate(schemas.resetPassword);
export const validateCreateContact = validate(schemas.createContact);
export const validateUpdateContact = validate(schemas.updateContact);
export const validateContactId = validateParams(schemas.contactId);
export const validateAddContactInteraction = validate(schemas.addContactInteraction);
export const validateCreateEvent = validate(schemas.createEvent);
export const validateUpdateEvent = validate(schemas.updateEvent);
export const validateEventId = validateParams(schemas.eventId);
export const validateAddEventConnection = validate(schemas.addEventConnection);
export const validateCreateReferralRequest = validate(schemas.createReferralRequest);
export const validateUpdateReferralRequest = validate(schemas.updateReferralRequest);
export const validateReferralRequestId = validateParams(schemas.referralRequestId);