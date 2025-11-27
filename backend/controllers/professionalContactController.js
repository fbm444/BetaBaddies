import professionalContactService from "../services/professionalContactService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ProfessionalContactController {
  // Create a new contact
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const contactData = req.body;

    try {
      const contact = await professionalContactService.createContact(userId, contactData);

      res.status(201).json({
        ok: true,
        data: {
          contact,
          message: "Contact created successfully",
        },
      });
    } catch (error) {
      // Handle duplicate email error
      if (error.message.includes("already exists")) {
        return res.status(400).json({
          ok: false,
          error: {
            message: error.message,
            code: "DUPLICATE_EMAIL",
          },
        });
      }
      throw error;
    }
  });

  // Check if contact exists by email
  checkByEmail = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Email parameter is required",
        },
      });
    }

    const contact = await professionalContactService.getContactByEmail(userId, email);

    res.status(200).json({
      ok: true,
      data: {
        exists: !!contact,
        contact: contact || null,
      },
    });
  });

  // Get all contacts for the current user
  getAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      industry: req.query.industry,
      relationshipType: req.query.relationshipType,
      company: req.query.company,
      search: req.query.search,
    };

    const contacts = await professionalContactService.getContactsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        contacts,
      },
    });
  });

  // Get contact by ID
  getById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const contact = await professionalContactService.getContactById(id, userId);

    if (!contact) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Contact not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        contact,
      },
    });
  });

  // Update contact
  update = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const contactData = req.body;

    const contact = await professionalContactService.updateContact(id, userId, contactData);

    res.status(200).json({
      ok: true,
      data: {
        contact,
        message: "Contact updated successfully",
      },
    });
  });

  // Delete contact
  delete = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await professionalContactService.deleteContact(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Contact deleted successfully",
      },
    });
  });

  // Get contacts needing reminder
  getNeedingReminder = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const contacts = await professionalContactService.getContactsNeedingReminder(userId);

    res.status(200).json({
      ok: true,
      data: {
        contacts,
      },
    });
  });

  // Get contact interactions
  getInteractions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const interactions = await professionalContactService.getContactInteractions(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        interactions,
      },
    });
  });

  // Add interaction to contact
  addInteraction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const interactionData = req.body;

    const interaction = await professionalContactService.addInteraction(id, userId, interactionData);

    res.status(201).json({
      ok: true,
      data: {
        interaction,
        message: "Interaction added successfully",
      },
    });
  });
}

export default new ProfessionalContactController();

