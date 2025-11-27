import express from "express";
import googleContactsController from "../controllers/googleContactsController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validateGoogleContactsImport } from "../middleware/validation.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/auth/url", googleContactsController.getAuthorizationUrl);
router.get("/auth/callback", googleContactsController.handleCallback);
router.get("/status", googleContactsController.getStatus);
router.post("/import", validateGoogleContactsImport, googleContactsController.importContacts);
router.post("/disconnect", googleContactsController.disconnect);

export default router;


