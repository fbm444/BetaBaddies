import express from "express";
import networkingController from "../controllers/networkingController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.get("/recruiters", isAuthenticated, networkingController.getRecruiters);
router.get("/companies/search", isAuthenticated, networkingController.searchCompanies);
router.get("/contacts/search", isAuthenticated, networkingController.searchContactsByCompany);
router.get("/linkedin/network", isAuthenticated, networkingController.getLinkedInNetwork);
router.post("/messages/generate", isAuthenticated, networkingController.generateMessage);
router.post("/coffee-chats", isAuthenticated, networkingController.createCoffeeChat);
router.get("/coffee-chats", isAuthenticated, networkingController.getCoffeeChats);
router.put("/coffee-chats/:id", isAuthenticated, networkingController.updateCoffeeChat);
router.post("/messages", isAuthenticated, networkingController.saveMessage);
router.get("/analytics", isAuthenticated, networkingController.getAnalytics);

export default router;

