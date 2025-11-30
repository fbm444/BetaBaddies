import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService } from "./index.js";

/**
 * Service for Chat/Messaging System
 * Supports team chats, mentor-mentee communication, document review discussions, etc.
 */
class ChatService {
  /**
   * Create or get a conversation
   */
  async getOrCreateConversation(userId, conversationData) {
    try {
      const { conversationType, teamId, relatedEntityType, relatedEntityId, participantIds, title } = conversationData;
      console.log(`[ChatService] getOrCreateConversation called: userId=${userId}, teamId=${teamId}, conversationType=${conversationType}, title=${title}`);

      // For direct messages or specific entity conversations, check if one exists
      // For team conversations, allow multiple - only check if specific title provided
      if (relatedEntityType && relatedEntityId) {
        const existing = await database.query(
          `SELECT id FROM chat_conversations 
           WHERE conversation_type = $1 
             AND related_entity_type = $2 
             AND related_entity_id = $3`,
          [conversationType, relatedEntityType, relatedEntityId]
        );

        if (existing.rows.length > 0) {
          return await this.getConversation(existing.rows[0].id, userId);
        }
      }

      // Create new conversation
      // For team conversations, we allow multiple conversations per team
      // Only check for duplicates if a specific title is provided and we want to reuse
      // Otherwise, always create a new one
      const conversationId = uuidv4();
      console.log(`[ChatService] Creating NEW conversation: ${conversationId} for team ${teamId || 'N/A'}`);
      // Ensure title is set, especially for team chats
      let conversationTitle = title;
      if (!conversationTitle && teamId && conversationType === "team") {
        const team = await database.query(
          `SELECT team_name FROM teams WHERE id = $1`,
          [teamId]
        );
        if (team.rows.length > 0) {
          conversationTitle = `${team.rows[0].team_name} Team Chat`;
        } else {
          conversationTitle = "Team Chat";
        }
      }
      
      // Use INSERT with error handling to catch race conditions
      try {
        await database.query(
          `INSERT INTO chat_conversations 
           (id, conversation_type, team_id, related_entity_type, related_entity_id, title, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [conversationId, conversationType, teamId, relatedEntityType, relatedEntityId, conversationTitle || "Chat", userId]
        );
        console.log(`[ChatService] ✅ Created conversation ${conversationId} for team ${teamId}`);
      } catch (error) {
        // If we get a unique constraint violation, it's likely a database constraint issue
        // Log it and rethrow - we want to create new conversations
        console.error(`[ChatService] Error creating conversation:`, error);
        throw error;
      }

      // Add participants
      let allParticipants = participantIds ? [...new Set([userId, ...participantIds])] : [userId];
      
      // For team conversations, add all team members
      if (teamId && conversationType === "team") {
        const teamMembers = await database.query(
          `SELECT user_id FROM team_members 
           WHERE team_id = $1 AND active = true`,
          [teamId]
        );
        allParticipants = [...new Set([...allParticipants, ...teamMembers.rows.map(m => m.user_id)])];
      }

      console.log(`[ChatService] Adding ${allParticipants.length} participants to conversation ${conversationId}`);
      for (const participantId of allParticipants) {
        const addResult = await this.addParticipant(conversationId, participantId, null);
        console.log(`[ChatService] Added participant ${participantId}:`, addResult.success ? '✅' : '❌');
      }

      // Verify the creator is a participant before returning
      const participantCheck = await database.query(
        `SELECT * FROM chat_participants 
         WHERE conversation_id = $1 AND user_id = $2 AND is_active = true`,
        [conversationId, userId]
      );
      console.log(`[ChatService] Participant verification: user ${userId} is ${participantCheck.rows.length > 0 ? '✅' : '❌'} a participant`);

      return await this.getConversation(conversationId, userId);
    } catch (error) {
      console.error("[ChatService] Error creating conversation:", error);
      throw error;
    }
  }

  /**
   * Get conversation with participants and recent messages
   */
  async getConversation(conversationId, userId) {
    try {
      console.log(`[ChatService] getConversation called: conversationId=${conversationId}, userId=${userId}`);
      
      // Verify user is a participant (check without is_active first)
      let participantCheck = await database.query(
        `SELECT * FROM chat_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        console.log(`[ChatService] User ${userId} is not a participant in conversation ${conversationId}, attempting to add...`);
        // For team conversations, try to add user as participant
        const conversation = await database.query(
          `SELECT team_id, conversation_type FROM chat_conversations WHERE id = $1`,
          [conversationId]
        );
        
        if (conversation.rows.length > 0 && conversation.rows[0].team_id && conversation.rows[0].conversation_type === "team") {
          const teamMember = await database.query(
            `SELECT * FROM team_members 
             WHERE team_id = $1 AND user_id = $2 AND active = true`,
            [conversation.rows[0].team_id, userId]
          );
          
          if (teamMember.rows.length > 0) {
            await this.addParticipant(conversationId, userId, null);
            participantCheck = await database.query(
              `SELECT * FROM chat_participants 
               WHERE conversation_id = $1 AND user_id = $2`,
              [conversationId, userId]
            );
            console.log(`[ChatService] Added user ${userId} as participant`);
          }
        }
        
        if (participantCheck.rows.length === 0) {
          throw new Error("You are not a participant in this conversation");
        }
      } else if (!participantCheck.rows[0].is_active) {
        // Reactivate inactive participant
        await database.query(
          `UPDATE chat_participants 
           SET is_active = true 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId]
        );
        console.log(`[ChatService] Reactivated participant ${userId}`);
      }

      // Get conversation details
      const conversation = await database.query(
        `SELECT c.*, u.email as created_by_email
         FROM chat_conversations c
         LEFT JOIN users u ON c.created_by = u.u_id
         WHERE c.id = $1`,
        [conversationId]
      );

      if (conversation.rows.length === 0) {
        throw new Error("Conversation not found");
      }

      const conv = conversation.rows[0];

      // Get participants
      const participants = await database.query(
        `SELECT cp.*, u.email, u.role as user_role, p.first_name, p.last_name
         FROM chat_participants cp
         JOIN users u ON cp.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE cp.conversation_id = $1 AND cp.is_active = true
         ORDER BY cp.joined_at ASC`,
        [conversationId]
      );

      // Get recent messages (last 50)
      const messages = await database.query(
        `SELECT m.*, u.email as sender_email, p.first_name, p.last_name, p.pfp_link
         FROM chat_messages m
         JOIN users u ON m.sender_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE m.conversation_id = $1 AND (m.is_deleted = false OR m.is_deleted IS NULL)
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [conversationId]
      );
      
      console.log(`[ChatService] getConversation found ${messages.rows.length} messages`);

      // Get unread count for user
      const unreadCount = await database.query(
        `SELECT COUNT(*) as count
         FROM chat_messages m
         WHERE m.conversation_id = $1 
           AND m.sender_id != $2
           AND m.created_at > COALESCE(
             (SELECT last_read_at FROM chat_participants 
              WHERE conversation_id = $1 AND user_id = $2), 
             '1970-01-01'::timestamp
           )`,
        [conversationId, userId]
      );

      return {
        id: conv.id,
        conversationType: conv.conversation_type,
        teamId: conv.team_id,
        relatedEntityType: conv.related_entity_type,
        relatedEntityId: conv.related_entity_id,
        title: conv.title,
        createdBy: conv.created_by,
        createdAt: conv.created_at,
        lastMessageAt: conv.last_message_at,
        participants: participants.rows.map(p => ({
          userId: p.user_id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          role: p.role,
          joinedAt: p.joined_at,
          lastReadAt: p.last_read_at
        })),
        messages: messages.rows.reverse().map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderEmail: m.sender_email,
          senderName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : null,
          senderAvatar: m.pfp_link || null,
          messageText: m.message_text,
          messageType: m.message_type,
          attachmentUrl: m.attachment_url,
          attachmentType: m.attachment_type,
          parentMessageId: m.parent_message_id,
          isEdited: m.is_edited,
          editedAt: m.edited_at,
          createdAt: m.created_at
        })),
        unreadCount: parseInt(unreadCount.rows[0]?.count || 0)
      };
    } catch (error) {
      console.error("[ChatService] Error getting conversation:", error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId, conversationType = null, teamId = null) {
    try {
      console.log(`[ChatService] getUserConversations called: userId=${userId}, conversationType=${conversationType}, teamId=${teamId}`);
      
      let query = `
        SELECT c.*, 
               (SELECT COUNT(*) FROM chat_messages m 
                WHERE m.conversation_id = c.id 
                  AND m.sender_id != $1
                  AND m.created_at > COALESCE(
                    (SELECT last_read_at FROM chat_participants 
                     WHERE conversation_id = c.id AND user_id = $1), 
                    '1970-01-01'::timestamp
                  )) as unread_count,
               COALESCE(c.last_message_at, c.created_at) as sort_date
        FROM chat_conversations c
        WHERE EXISTS (
          SELECT 1 FROM chat_participants cp 
          WHERE cp.conversation_id = c.id 
            AND cp.user_id = $1 
            AND cp.is_active = true
        )
      `;
      const params = [userId];

      if (conversationType) {
        query += ` AND c.conversation_type = $${params.length + 1}`;
        params.push(conversationType);
      }

      if (teamId) {
        query += ` AND c.team_id = $${params.length + 1}`;
        params.push(teamId);
      }

      query += ` ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`;

      console.log(`[ChatService] Executing query: ${query.substring(0, 200)}...`);
      console.log(`[ChatService] Query params:`, params);

      const result = await database.query(query, params);

      console.log(`[ChatService] Found ${result.rows.length} conversations for user ${userId}`);

      const conversations = result.rows.map(row => ({
        id: row.id,
        conversationType: row.conversation_type,
        teamId: row.team_id,
        relatedEntityType: row.related_entity_type,
        relatedEntityId: row.related_entity_id,
        title: row.title,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        unreadCount: parseInt(row.unread_count || 0)
      }));

      console.log(`[ChatService] Returning conversations:`, conversations.map(c => ({ id: c.id, title: c.title, teamId: c.teamId })));

      return conversations;
    } catch (error) {
      console.error("[ChatService] Error getting user conversations:", error);
      throw error;
    }
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(conversationId, userId, role = null) {
    try {
      // Check if participant already exists
      const existing = await database.query(
        `SELECT * FROM chat_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (existing.rows.length > 0) {
        // Update existing participant to ensure they're active
        await database.query(
          `UPDATE chat_participants 
           SET is_active = true, 
               role = COALESCE($3, role),
               joined_at = CASE 
                 WHEN is_active = false THEN CURRENT_TIMESTAMP 
                 ELSE joined_at 
               END
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId, role]
        );
        return { success: true, participant: existing.rows[0] };
      } else {
        // Insert new participant using ON CONFLICT for safety
        const result = await database.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role, is_active, joined_at)
           VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
           ON CONFLICT (conversation_id, user_id) DO UPDATE SET
             is_active = true,
             role = COALESCE(EXCLUDED.role, chat_participants.role),
             joined_at = CASE 
               WHEN chat_participants.is_active = false THEN CURRENT_TIMESTAMP 
               ELSE chat_participants.joined_at 
             END
           RETURNING *`,
          [conversationId, userId, role]
        );
        return { success: true, participant: result.rows[0] };
      }
    } catch (error) {
      console.error("[ChatService] Error adding participant:", error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(userId, conversationId, messageData) {
    try {
      console.log(`[ChatService] sendMessage called: userId=${userId}, conversationId=${conversationId}`);
      
      // Verify the conversation exists and get its details
      const convCheck = await database.query(
        `SELECT id, team_id, conversation_type, title FROM chat_conversations WHERE id = $1`,
        [conversationId]
      );
      if (convCheck.rows.length === 0) {
        throw new Error(`Conversation ${conversationId} does not exist`);
      }
      console.log(`[ChatService] Conversation details:`, convCheck.rows[0]);
      
      // Verify user is a participant (check without is_active first)
      let participantCheck = await database.query(
        `SELECT * FROM chat_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        // Check if this is a team conversation and add user if they're a team member
        const conversation = await database.query(
          `SELECT team_id, conversation_type FROM chat_conversations WHERE id = $1`,
          [conversationId]
        );

        if (conversation.rows.length > 0 && conversation.rows[0].team_id && conversation.rows[0].conversation_type === "team") {
          // Check if user is a team member
          const teamMember = await database.query(
            `SELECT * FROM team_members 
             WHERE team_id = $1 AND user_id = $2 AND active = true`,
            [conversation.rows[0].team_id, userId]
          );

          if (teamMember.rows.length > 0) {
            // Add user as participant
            await this.addParticipant(conversationId, userId, null);
            // Re-fetch participant check
            participantCheck = await database.query(
              `SELECT * FROM chat_participants 
               WHERE conversation_id = $1 AND user_id = $2`,
              [conversationId, userId]
            );
          }
        }

        if (participantCheck.rows.length === 0) {
          throw new Error("You are not a participant in this conversation");
        }
      } else if (!participantCheck.rows[0].is_active) {
        // Reactivate inactive participant
        await database.query(
          `UPDATE chat_participants 
           SET is_active = true 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId]
        );
      }

      const { messageText, messageType = "text", attachmentUrl, attachmentType, parentMessageId } = messageData;

      const messageId = uuidv4();
      console.log(`[ChatService] Inserting message: conversationId=${conversationId}, userId=${userId}, messageText=${messageText.substring(0, 50)}...`);
      
      const insertResult = await database.query(
        `INSERT INTO chat_messages 
         (id, conversation_id, sender_id, message_text, message_type, attachment_url, attachment_type, parent_message_id, is_deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
         RETURNING *`,
        [messageId, conversationId, userId, messageText, messageType, attachmentUrl, attachmentType, parentMessageId]
      );
      console.log(`[ChatService] Message inserted successfully: ${messageId}`, insertResult.rows[0]);
      
      // Verify the message was actually saved
      const verifyMessage = await database.query(
        `SELECT * FROM chat_messages WHERE id = $1`,
        [messageId]
      );
      console.log(`[ChatService] Verification query found ${verifyMessage.rows.length} message(s) with id ${messageId}`);

      // Update conversation last_message_at
      await database.query(
        `UPDATE chat_conversations 
         SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
      );

      // Create notifications for other participants
      const participants = await database.query(
        `SELECT user_id FROM chat_participants 
         WHERE conversation_id = $1 AND user_id != $2 AND is_active = true`,
        [conversationId, userId]
      );

      for (const participant of participants.rows) {
        await database.query(
          `INSERT INTO chat_notifications (user_id, conversation_id, message_id, notification_type)
           VALUES ($1, $2, $3, 'new_message')`,
          [participant.user_id, conversationId, messageId]
        );
      }

      // Log activity if team conversation
      const conversation = await database.query(
        `SELECT team_id FROM chat_conversations WHERE id = $1`,
        [conversationId]
      );
      if (conversation.rows[0]?.team_id) {
        await teamService.logActivity(
          conversation.rows[0].team_id,
          userId,
          participantCheck.rows[0].role || "candidate",
          "message_sent",
          { conversation_id: conversationId, message_type: messageType }
        );
      }

      const returnedMessage = await this.getMessage(messageId);
      console.log(`[ChatService] Returning message:`, returnedMessage);
      return returnedMessage;
    } catch (error) {
      console.error("[ChatService] Error sending message:", error);
      console.error("[ChatService] Error stack:", error.stack);
      throw error;
    }
  }

  /**
   * Get a single message
   */
  async getMessage(messageId) {
    try {
      console.log(`[ChatService] getMessage called for messageId: ${messageId}`);
      const result = await database.query(
        `SELECT m.*, u.email as sender_email, p.first_name, p.last_name, p.pfp_link
         FROM chat_messages m
         JOIN users u ON m.sender_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE m.id = $1`,
        [messageId]
      );

      if (result.rows.length === 0) {
        console.error(`[ChatService] Message ${messageId} not found in database!`);
        throw new Error("Message not found");
      }

      const m = result.rows[0];
      const message = {
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderEmail: m.sender_email,
        senderName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : null,
        senderAvatar: m.pfp_link || null,
        messageText: m.message_text,
        messageType: m.message_type,
        attachmentUrl: m.attachment_url,
        attachmentType: m.attachment_type,
        parentMessageId: m.parent_message_id,
        isEdited: m.is_edited || false,
        editedAt: m.edited_at,
        createdAt: m.created_at
      };
      console.log(`[ChatService] getMessage returning:`, message);
      return message;
    } catch (error) {
      console.error("[ChatService] Error getting message:", error);
      console.error("[ChatService] Error stack:", error.stack);
      throw error;
    }
  }

  /**
   * Get messages for a conversation (with pagination)
   */
  async getMessages(conversationId, userId, limit = 50, beforeMessageId = null) {
    try {
      console.log(`[ChatService] getMessages called: conversationId=${conversationId}, userId=${userId}`);
      
      // Verify user is a participant (check without is_active first)
      let participantCheck = await database.query(
        `SELECT * FROM chat_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        console.log(`[ChatService] User ${userId} is not a participant in conversation ${conversationId}`);
        // For team conversations, try to add user as participant
        const conversation = await database.query(
          `SELECT team_id, conversation_type FROM chat_conversations WHERE id = $1`,
          [conversationId]
        );
        
        if (conversation.rows.length > 0 && conversation.rows[0].team_id && conversation.rows[0].conversation_type === "team") {
          const teamMember = await database.query(
            `SELECT * FROM team_members 
             WHERE team_id = $1 AND user_id = $2 AND active = true`,
            [conversation.rows[0].team_id, userId]
          );
          
          if (teamMember.rows.length > 0) {
            await this.addParticipant(conversationId, userId, null);
            participantCheck = await database.query(
              `SELECT * FROM chat_participants 
               WHERE conversation_id = $1 AND user_id = $2`,
              [conversationId, userId]
            );
          }
        }
        
        if (participantCheck.rows.length === 0) {
          throw new Error("You are not a participant in this conversation");
        }
      } else if (!participantCheck.rows[0].is_active) {
        // Reactivate inactive participant
        await database.query(
          `UPDATE chat_participants 
           SET is_active = true 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId]
        );
      }

      // Try query without JOIN first to see if that's the issue
      // First, let's check what's actually in the database for this conversation
      const rawMessagesCheck = await database.query(
        `SELECT id, sender_id, message_text, is_deleted, created_at 
         FROM chat_messages 
         WHERE conversation_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [conversationId]
      );
      console.log(`[ChatService] Raw messages in DB for conversation ${conversationId}:`, rawMessagesCheck.rows.length);
      if (rawMessagesCheck.rows.length > 0) {
        console.log(`[ChatService] Sample raw message:`, rawMessagesCheck.rows[0]);
        // Check if sender_id exists in users table
        for (const msg of rawMessagesCheck.rows.slice(0, 3)) {
          const userCheck = await database.query(
            `SELECT u_id, email FROM users WHERE u_id = $1`,
            [msg.sender_id]
          );
          console.log(`[ChatService] Message ${msg.id} sender_id ${msg.sender_id} exists in users: ${userCheck.rows.length > 0}`);
        }
      }
      
      let query = `
        SELECT m.*, u.email as sender_email, p.first_name, p.last_name, p.pfp_link
        FROM chat_messages m
        LEFT JOIN users u ON m.sender_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE m.conversation_id = $1 AND (m.is_deleted = false OR m.is_deleted IS NULL)
      `;
      const params = [conversationId];
      
      console.log(`[ChatService] Query will filter by conversation_id=${conversationId}`);

      if (beforeMessageId) {
        query += ` AND m.created_at < (SELECT created_at FROM chat_messages WHERE id = $2)`;
        params.push(beforeMessageId);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      console.log(`[ChatService] Executing query: ${query.substring(0, 200)}...`);
      console.log(`[ChatService] Query params:`, params);
      
      // First, check if there are ANY messages for this conversation (without filters)
      const allMessagesCheck = await database.query(
        `SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = $1`,
        [conversationId]
      );
      const totalCount = parseInt(allMessagesCheck.rows[0]?.count || 0);
      console.log(`[ChatService] Total messages in conversation ${conversationId}: ${totalCount}`);
      
      // Get sample messages to see what's in the database
      if (totalCount > 0) {
        const sampleMessages = await database.query(
          `SELECT id, sender_id, message_text, is_deleted, created_at 
           FROM chat_messages 
           WHERE conversation_id = $1 
           ORDER BY created_at DESC 
           LIMIT 5`,
          [conversationId]
        );
        console.log(`[ChatService] Sample messages from DB:`, sampleMessages.rows);
      }
      
      // Check deleted messages
      const deletedCheck = await database.query(
        `SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = $1 AND is_deleted = true`,
        [conversationId]
      );
      console.log(`[ChatService] Deleted messages: ${deletedCheck.rows[0]?.count || 0}`);
      
      // Check messages with NULL is_deleted
      const nullDeletedCheck = await database.query(
        `SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = $1 AND (is_deleted IS NULL OR is_deleted = false)`,
        [conversationId]
      );
      console.log(`[ChatService] Non-deleted messages (NULL or false): ${nullDeletedCheck.rows[0]?.count || 0}`);
      
      const result = await database.query(query, params);
      console.log(`[ChatService] Found ${result.rows.length} messages after filtering`);
      
      if (result.rows.length === 0 && totalCount > 0) {
        console.error(`[ChatService] WARNING: Messages exist but query returned 0! Check filters.`);
        console.error(`[ChatService] Query that returned 0:`, query);
        console.error(`[ChatService] Params used:`, params);
        
        // Try a simpler query to see if JOIN is the issue
        const simpleQuery = await database.query(
          `SELECT m.* FROM chat_messages m WHERE m.conversation_id = $1 AND (m.is_deleted = false OR m.is_deleted IS NULL) ORDER BY m.created_at DESC LIMIT 10`,
          [conversationId]
        );
        console.log(`[ChatService] Simple query (no JOINs) returned ${simpleQuery.rows.length} messages`);
      }

      return result.rows.reverse().map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderEmail: m.sender_email,
        senderName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : null,
        senderAvatar: m.pfp_link || null,
        messageText: m.message_text,
        messageType: m.message_type,
        attachmentUrl: m.attachment_url,
        attachmentType: m.attachment_type,
        parentMessageId: m.parent_message_id,
        isEdited: m.is_edited,
        editedAt: m.edited_at,
        createdAt: m.created_at
      }));
    } catch (error) {
      console.error("[ChatService] Error getting messages:", error);
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId, userId) {
    try {
      await database.query(
        `UPDATE chat_participants 
         SET last_read_at = CURRENT_TIMESTAMP
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      // Mark notifications as read
      await database.query(
        `UPDATE chat_notifications 
         SET is_read = true
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      return { success: true };
    } catch (error) {
      console.error("[ChatService] Error marking as read:", error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId, userId, newText) {
    try {
      // Verify user is the sender
      const message = await database.query(
        `SELECT sender_id FROM chat_messages WHERE id = $1`,
        [messageId]
      );

      if (message.rows.length === 0) {
        throw new Error("Message not found");
      }

      if (message.rows[0].sender_id !== userId) {
        throw new Error("You can only edit your own messages");
      }

      await database.query(
        `UPDATE chat_messages 
         SET message_text = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newText, messageId]
      );

      return await this.getMessage(messageId);
    } catch (error) {
      console.error("[ChatService] Error editing message:", error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    try {
      // Verify user is the sender
      const message = await database.query(
        `SELECT sender_id FROM chat_messages WHERE id = $1`,
        [messageId]
      );

      if (message.rows.length === 0) {
        throw new Error("Message not found");
      }

      if (message.rows[0].sender_id !== userId) {
        throw new Error("You can only delete your own messages");
      }

      await database.query(
        `UPDATE chat_messages 
         SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [messageId]
      );

      return { success: true };
    } catch (error) {
      console.error("[ChatService] Error deleting message:", error);
      throw error;
    }
  }

  /**
   * Get unread notifications for user
   */
  async getUnreadNotifications(userId) {
    try {
      const result = await database.query(
        `SELECT cn.*, c.title as conversation_title, c.conversation_type
         FROM chat_notifications cn
         JOIN chat_conversations c ON cn.conversation_id = c.id
         WHERE cn.user_id = $1 AND cn.is_read = false
         ORDER BY cn.created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        conversationTitle: row.conversation_title,
        conversationType: row.conversation_type,
        messageId: row.message_id,
        notificationType: row.notification_type,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error("[ChatService] Error getting unread notifications:", error);
      throw error;
    }
  }
}

export default new ChatService();

