import express from "express";
import chatController from "../controllers/chatController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Conversations
router.post("/conversations", chatController.createOrGetConversation);
router.get("/conversations", chatController.getUserConversations);
router.get("/conversations/:id", chatController.getConversation);
router.post("/conversations/:id/participants", chatController.addParticipant);
router.put("/conversations/:id/read", chatController.markAsRead);

// Messages
router.post("/conversations/:id/messages", chatController.sendMessage);
router.get("/conversations/:id/messages", chatController.getMessages);
router.put("/messages/:id", chatController.editMessage);
router.delete("/messages/:id", chatController.deleteMessage);

// Notifications
router.get("/notifications", chatController.getUnreadNotifications);

export default router;

