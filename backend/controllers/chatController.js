import { asyncHandler } from "../middleware/errorHandler.js";
import { chatService } from "../services/collaboration/index.js";

class ChatController {
  /**
   * POST /api/chat/conversations
   * Create or get a conversation
   */
  createOrGetConversation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const conversation = await chatService.getOrCreateConversation(userId, req.body);

    res.status(200).json({
      ok: true,
      data: { conversation },
    });
  });

  /**
   * GET /api/chat/conversations
   * Get all conversations for user
   */
  getUserConversations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { type, teamId } = req.query;
    const conversations = await chatService.getUserConversations(userId, type, teamId);

    res.status(200).json({
      ok: true,
      data: { conversations },
    });
  });

  /**
   * GET /api/chat/conversations/:id
   * Get conversation with messages
   */
  getConversation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const conversation = await chatService.getConversation(id, userId);

    res.status(200).json({
      ok: true,
      data: { conversation },
    });
  });

  /**
   * POST /api/chat/conversations/:id/participants
   * Add participant to conversation
   */
  addParticipant = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: conversationId } = req.params;
    const { participantId, role } = req.body;

    await chatService.addParticipant(conversationId, participantId, role);

    res.status(200).json({
      ok: true,
      data: { message: "Participant added successfully" },
    });
  });

  /**
   * POST /api/chat/conversations/:id/messages
   * Send a message
   */
  sendMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: conversationId } = req.params;
    const message = await chatService.sendMessage(userId, conversationId, req.body);

    res.status(201).json({
      ok: true,
      data: { message },
    });
  });

  /**
   * GET /api/chat/conversations/:id/messages
   * Get messages for conversation
   */
  getMessages = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: conversationId } = req.params;
    const { limit = 50, before } = req.query;
    
    console.log(`[ChatController] getMessages called: conversationId=${conversationId}, userId=${userId}`);
    
    try {
      const messages = await chatService.getMessages(conversationId, userId, parseInt(limit), before);
      
      console.log(`[ChatController] Returning ${messages.length} messages`);
      
      res.status(200).json({
        ok: true,
        data: { messages },
      });
    } catch (error) {
      console.error(`[ChatController] Error in getMessages:`, error);
      throw error;
    }
  });

  /**
   * PUT /api/chat/conversations/:id/read
   * Mark conversation as read
   */
  markAsRead = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: conversationId } = req.params;
    await chatService.markAsRead(conversationId, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Conversation marked as read" },
    });
  });

  /**
   * PUT /api/chat/messages/:id
   * Edit a message
   */
  editMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: messageId } = req.params;
    const { messageText } = req.body;
    const message = await chatService.editMessage(messageId, userId, messageText);

    res.status(200).json({
      ok: true,
      data: { message },
    });
  });

  /**
   * DELETE /api/chat/messages/:id
   * Delete a message
   */
  deleteMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: messageId } = req.params;
    await chatService.deleteMessage(messageId, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Message deleted successfully" },
    });
  });

  /**
   * GET /api/chat/notifications
   * Get unread notifications
   */
  getUnreadNotifications = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const notifications = await chatService.getUnreadNotifications(userId);

    res.status(200).json({
      ok: true,
      data: { notifications },
    });
  });
}

export default new ChatController();

