import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import OpenAI from "openai";

/**
 * Service for Peer Networking and Support Groups (UC-112)
 */
class SupportGroupsService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  /**
   * Get all public support groups with optional filters
   */
  async getSupportGroups(userId, filters = {}) {
    try {
      const { category, industry, roleType, search } = filters;
      let query = `
        SELECT 
          sg.*,
          u.email as created_by_email,
          CASE WHEN sgm.user_id IS NOT NULL THEN true ELSE false END as is_member,
          sgm.role as membership_role
        FROM support_groups sg
        LEFT JOIN users u ON sg.created_by = u.u_id
        LEFT JOIN support_group_memberships sgm ON sg.id = sgm.group_id AND sgm.user_id = $1 AND sgm.is_active = true
        WHERE sg.is_public = true AND sg.is_active = true
      `;
      const params = [userId];
      let paramIndex = 2;

      if (category) {
        query += ` AND sg.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (industry) {
        query += ` AND sg.industry = $${paramIndex}`;
        params.push(industry);
        paramIndex++;
      }

      if (roleType) {
        query += ` AND sg.role_type = $${paramIndex}`;
        params.push(roleType);
        paramIndex++;
      }

      if (search) {
        query += ` AND (sg.name ILIKE $${paramIndex} OR sg.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY sg.member_count DESC, sg.created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting support groups:",
        error
      );
      throw error;
    }
  }

  /**
   * Get a single support group with details
   */
  async getSupportGroup(groupId, userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          sg.*,
          u.email as created_by_email,
          CASE WHEN sgm.user_id IS NOT NULL THEN true ELSE false END as is_member,
          sgm.role as membership_role,
          sgm.privacy_level as membership_privacy_level
        FROM support_groups sg
        LEFT JOIN users u ON sg.created_by = u.u_id
        LEFT JOIN support_group_memberships sgm ON sg.id = sgm.group_id AND sgm.user_id = $1 AND sgm.is_active = true
        WHERE sg.id = $2 AND sg.is_active = true
        `,
        [userId, groupId]
      );

      if (result.rows.length === 0) {
        throw new Error("Support group not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting support group:",
        error
      );
      throw error;
    }
  }

  /**
   * Get user's joined support groups
   */
  async getUserSupportGroups(userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          sg.*,
          sgm.role as membership_role,
          sgm.joined_at,
          sgm.last_active_at
        FROM support_groups sg
        INNER JOIN support_group_memberships sgm ON sg.id = sgm.group_id
        WHERE sgm.user_id = $1 AND sgm.is_active = true AND sg.is_active = true
        ORDER BY sgm.last_active_at DESC NULLS LAST, sgm.joined_at DESC
        `,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting user support groups:",
        error
      );
      throw error;
    }
  }

  /**
   * Join a support group
   */
  async joinSupportGroup(userId, groupId, privacyLevel = "standard") {
    try {
      // Check if already a member
      const existing = await database.query(
        `SELECT id, is_active FROM support_group_memberships WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].is_active) {
          throw new Error("Already a member of this group");
        }
        // Reactivate membership
        await database.query(
          `UPDATE support_group_memberships 
           SET is_active = true, joined_at = now(), privacy_level = $1 
           WHERE id = $2`,
          [privacyLevel, existing.rows[0].id]
        );
      } else {
        // Create new membership
        const membershipId = uuidv4();
        await database.query(
          `INSERT INTO support_group_memberships (id, group_id, user_id, privacy_level, joined_at, last_active_at)
           VALUES ($1, $2, $3, $4, now(), now())`,
          [membershipId, groupId, userId, privacyLevel]
        );
      }

      return await this.getSupportGroup(groupId, userId);
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error joining support group:",
        error
      );
      throw error;
    }
  }

  /**
   * Leave a support group
   */
  async leaveSupportGroup(userId, groupId) {
    try {
      await database.query(
        `UPDATE support_group_memberships 
         SET is_active = false 
         WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );
      return { success: true };
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error leaving support group:",
        error
      );
      throw error;
    }
  }

  /**
   * Get posts for a support group
   */
  async getGroupPosts(groupId, userId, filters = {}) {
    try {
      const { postType, limit = 50, offset = 0 } = filters;
      let query = `
        SELECT 
          p.*,
          u.email as user_email,
          prof.pfp_link as user_profile_picture,
          CASE WHEN p.is_anonymous = true THEN 'Anonymous' ELSE u.email END as display_name,
          CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as is_liked,
          COUNT(DISTINCT c.id) as comment_count,
          COUNT(DISTINCT pl2.id) as like_count
        FROM support_group_posts p
        LEFT JOIN users u ON p.user_id = u.u_id
        LEFT JOIN profiles prof ON u.u_id = prof.user_id
        LEFT JOIN support_group_post_likes pl ON p.id = pl.post_id AND pl.user_id = $1
        LEFT JOIN support_group_post_comments c ON p.id = c.post_id
        LEFT JOIN support_group_post_likes pl2 ON p.id = pl2.post_id
        WHERE p.group_id = $2
      `;
      const params = [userId, groupId];
      let paramIndex = 3;

      if (postType) {
        query += ` AND p.post_type = $${paramIndex}`;
        params.push(postType);
        paramIndex++;
      }

      query += ` 
        GROUP BY p.id, u.email, prof.pfp_link, pl.user_id
        ORDER BY p.is_pinned DESC, p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("[SupportGroupsService] Error getting group posts:", error);
      throw error;
    }
  }

  /**
   * Create a post in a support group
   */
  async createPost(userId, groupId, postData) {
    try {
      // Verify membership
      const membership = await database.query(
        `SELECT id FROM support_group_memberships 
         WHERE group_id = $1 AND user_id = $2 AND is_active = true`,
        [groupId, userId]
      );

      if (membership.rows.length === 0) {
        throw new Error("Must be a member to post");
      }

      const postId = uuidv4();
      const {
        title,
        content,
        postType = "discussion",
        isAnonymous = false,
        metadata = {},
      } = postData;

      await database.query(
        `INSERT INTO support_group_posts 
         (id, group_id, user_id, title, content, post_type, is_anonymous, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
        [
          postId,
          groupId,
          userId,
          title,
          content,
          postType,
          isAnonymous,
          JSON.stringify(metadata),
        ]
      );

      // Update view count
      await database.query(
        `UPDATE support_group_posts SET view_count = view_count + 1 WHERE id = $1`,
        [postId]
      );

      return await this.getPost(postId, userId);
    } catch (error) {
      console.error("[SupportGroupsService] Error creating post:", error);
      throw error;
    }
  }

  /**
   * Get a single post with details
   */
  async getPost(postId, userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          p.*,
          u.email as user_email,
          prof.pfp_link as user_profile_picture,
          CASE WHEN p.is_anonymous = true THEN 'Anonymous' ELSE u.email END as display_name,
          CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as is_liked,
          sg.name as group_name
        FROM support_group_posts p
        INNER JOIN support_groups sg ON p.group_id = sg.id
        LEFT JOIN users u ON p.user_id = u.u_id
        LEFT JOIN profiles prof ON u.u_id = prof.user_id
        LEFT JOIN support_group_post_likes pl ON p.id = pl.post_id AND pl.user_id = $1
        WHERE p.id = $2
        `,
        [userId, postId]
      );

      if (result.rows.length === 0) {
        throw new Error("Post not found");
      }

      // Get comments
      const comments = await this.getPostComments(postId, userId);
      result.rows[0].comments = comments;

      return result.rows[0];
    } catch (error) {
      console.error("[SupportGroupsService] Error getting post:", error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getPostComments(postId, userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          c.*,
          u.email as user_email,
          prof.pfp_link as user_profile_picture,
          CASE WHEN c.is_anonymous = true THEN 'Anonymous' ELSE u.email END as display_name,
          CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as is_liked
        FROM support_group_post_comments c
        LEFT JOIN users u ON c.user_id = u.u_id
        LEFT JOIN profiles prof ON u.u_id = prof.user_id
        LEFT JOIN support_group_post_likes pl ON c.id = pl.comment_id AND pl.user_id = $1
        WHERE c.post_id = $2
        ORDER BY c.created_at ASC
        `,
        [userId, postId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting post comments:",
        error
      );
      throw error;
    }
  }

  /**
   * Add a comment to a post
   */
  async addComment(userId, postId, commentData) {
    try {
      const { content, parentCommentId, isAnonymous = false } = commentData;
      const commentId = uuidv4();

      await database.query(
        `INSERT INTO support_group_post_comments 
         (id, post_id, user_id, parent_comment_id, content, is_anonymous, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
        [
          commentId,
          postId,
          userId,
          parentCommentId || null,
          content,
          isAnonymous,
        ]
      );

      return await this.getPostComments(postId, userId);
    } catch (error) {
      console.error("[SupportGroupsService] Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Like/unlike a post or comment
   */
  async toggleLike(userId, postId, commentId = null) {
    try {
      if (!postId && !commentId) {
        throw new Error("Must provide either postId or commentId");
      }

      // Check if already liked
      const existing = await database.query(
        `SELECT id FROM support_group_post_likes 
         WHERE user_id = $1 AND (post_id = $2 OR comment_id = $3)`,
        [userId, postId, commentId]
      );

      if (existing.rows.length > 0) {
        // Unlike
        await database.query(
          `DELETE FROM support_group_post_likes WHERE id = $1`,
          [existing.rows[0].id]
        );
        return { liked: false };
      } else {
        // Like
        const likeId = uuidv4();
        await database.query(
          `INSERT INTO support_group_post_likes (id, post_id, comment_id, user_id, created_at)
           VALUES ($1, $2, $3, $4, now())`,
          [likeId, postId, commentId, userId]
        );
        return { liked: true };
      }
    } catch (error) {
      console.error("[SupportGroupsService] Error toggling like:", error);
      throw error;
    }
  }

  /**
   * Get resources for a support group
   * Auto-generates resources if they don't exist
   */
  async getGroupResources(groupId, filters = {}) {
    try {
      const { resourceType, limit = 50, offset = 0 } = filters;

      // Check if resources exist for this group
      const existingCount = await database.query(
        `SELECT COUNT(*) as count FROM support_group_resources WHERE group_id = $1`,
        [groupId]
      );

      // Auto-generate resources in background if none exist
      if (parseInt(existingCount.rows[0].count) === 0) {
        // Fire and forget - don't block the response
        this.generateGroupResources(groupId, "general").catch((error) => {
          console.error(
            "[SupportGroupsService] Error auto-generating resources:",
            error
          );
        });
      }

      let query = `
        SELECT r.*, u.email as created_by_email
        FROM support_group_resources r
        LEFT JOIN users u ON r.created_by = u.u_id
        WHERE r.group_id = $1
      `;
      const params = [groupId];
      let paramIndex = 2;

      if (resourceType) {
        query += ` AND r.resource_type = $${paramIndex}`;
        params.push(resourceType);
        paramIndex++;
      }

      query += ` 
        ORDER BY r.is_featured DESC, r.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting group resources:",
        error
      );
      throw error;
    }
  }

  /**
   * Get active challenges for a support group
   * Auto-generates group-specific challenge if it doesn't exist for current month
   */
  async getGroupChallenges(groupId, userId) {
    try {
      // Get current month's start date (date only, no time)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Format as YYYY-MM-DD for date comparison
      const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

      // Check if group-specific challenge exists for current month
      // Compare dates by extracting year and month
      const existingChallenge = await database.query(
        `SELECT id FROM support_group_challenges 
         WHERE challenge_type = 'monthly' 
           AND group_id = $1
           AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM $2::date)
           AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM $2::date)
           AND is_active = true`,
        [groupId, startOfMonthStr]
      );

      // Auto-generate group-specific challenge if doesn't exist
      if (existingChallenge.rows.length === 0) {
        try {
          // Generate synchronously so it's available immediately
          await this.generateMonthlyChallenge(groupId);
        } catch (error) {
          console.error(
            "[SupportGroupsService] Error auto-generating group challenge:",
            error
          );
          // Continue even if generation fails
        }
      }

      // Get all active challenges for this group
      const result = await database.query(
        `
        SELECT 
          c.*,
          u.email as created_by_email,
          CASE WHEN cp.user_id IS NOT NULL THEN true ELSE false END as is_participating,
          cp.current_value as user_progress
        FROM support_group_challenges c
        LEFT JOIN users u ON c.created_by = u.u_id
        LEFT JOIN support_group_challenge_participants cp ON c.id = cp.challenge_id AND cp.user_id = $2
        WHERE c.group_id = $1 AND c.challenge_type = 'monthly' AND c.is_active = true
        ORDER BY c.start_date DESC
        `,
        [groupId, userId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting group challenges:",
        error
      );
      throw error;
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId, challengeId) {
    try {
      // Check if already participating
      const existing = await database.query(
        `SELECT id FROM support_group_challenge_participants 
         WHERE challenge_id = $1 AND user_id = $2`,
        [challengeId, userId]
      );

      if (existing.rows.length > 0) {
        throw new Error("Already participating in this challenge");
      }

      const participantId = uuidv4();
      await database.query(
        `INSERT INTO support_group_challenge_participants 
         (id, challenge_id, user_id, current_value, joined_at, last_updated_at)
         VALUES ($1, $2, $3, 0, now(), now())`,
        [participantId, challengeId, userId]
      );

      // Update participant count
      await database.query(
        `UPDATE support_group_challenges 
         SET participant_count = participant_count + 1 
         WHERE id = $1`,
        [challengeId]
      );

      return { success: true };
    } catch (error) {
      console.error("[SupportGroupsService] Error joining challenge:", error);
      throw error;
    }
  }

  /**
   * Get referrals for a support group
   */
  async getGroupReferrals(groupId, filters = {}) {
    try {
      const { limit = 50, offset = 0 } = filters;
      const result = await database.query(
        `
        SELECT 
          r.*,
          u.email as posted_by_email,
          CASE WHEN r.is_anonymous = true THEN 'Anonymous' ELSE u.email END as display_name
        FROM support_group_referrals r
        LEFT JOIN users u ON r.posted_by = u.u_id
        WHERE r.group_id = $1 AND r.is_active = true
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [groupId, limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting group referrals:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate AI content for a support group
   */
  async generateAIContent(groupId, contentType, context = {}) {
    try {
      if (!this.openai) {
        throw new Error("OpenAI API not configured");
      }

      const group = await database.query(
        `SELECT name, description, category, industry, role_type FROM support_groups WHERE id = $1`,
        [groupId]
      );

      if (group.rows.length === 0) {
        throw new Error("Support group not found");
      }

      const groupData = group.rows[0];
      let prompt = "";

      switch (contentType) {
        case "welcome_message":
          prompt = `Generate a welcoming and encouraging message for new members joining the "${
            groupData.name
          }" support group. 
                   This is a ${groupData.category} group${
            groupData.industry ? ` focused on ${groupData.industry}` : ""
          }${groupData.role_type ? ` for ${groupData.role_type}` : ""}.
                   Make it warm, supportive, and motivating. Keep it under 200 words.`;
          break;
        case "resource_description":
          prompt = `Generate a helpful resource description for the "${
            groupData.name
          }" support group.
                   Context: ${context.description || ""}
                   Make it relevant to ${groupData.category}${
            groupData.industry ? ` in ${groupData.industry}` : ""
          }.
                   Keep it concise and actionable.`;
          break;
        case "challenge_description":
          prompt = `Generate an engaging challenge description for the "${
            groupData.name
          }" support group.
                   Challenge type: ${context.challengeType || "general"}
                   Target: ${context.target || "job search progress"}
                   Make it motivating and achievable. Keep it under 150 words.`;
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates supportive and encouraging content for job search support groups.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error generating AI content:",
        error
      );
      throw error;
    }
  }

  /**
   * Track networking impact
   */
  async trackNetworkingImpact(userId, impactData) {
    try {
      const {
        groupId,
        metricName,
        metricValue,
        description,
        relatedPostId,
        relatedReferralId,
        impactDate,
      } = impactData;
      const impactId = uuidv4();

      await database.query(
        `INSERT INTO support_group_networking_impact 
         (id, user_id, group_id, metric_name, metric_value, description, related_post_id, related_referral_id, impact_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [
          impactId,
          userId,
          groupId,
          metricName,
          metricValue,
          description,
          relatedPostId,
          relatedReferralId,
          impactDate || new Date(),
        ]
      );

      return { success: true, impactId };
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error tracking networking impact:",
        error
      );
      throw error;
    }
  }

  /**
   * Get user's networking impact summary
   */
  async getUserNetworkingImpact(userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          metric_name,
          COUNT(*) as count,
          SUM(metric_value) as total_value,
          sg.name as group_name
        FROM support_group_networking_impact ni
        LEFT JOIN support_groups sg ON ni.group_id = sg.id
        WHERE ni.user_id = $1
        GROUP BY metric_name, sg.name
        ORDER BY count DESC
        `,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting networking impact:",
        error
      );
      throw error;
    }
  }

  /**
   * Create a new support group
   */
  async createSupportGroup(userId, groupData) {
    try {
      const {
        name,
        description,
        category,
        industry,
        roleType,
        interestTags = [],
        isPublic = true,
      } = groupData;

      if (!name || !category) {
        throw new Error("Name and category are required");
      }

      const groupId = uuidv4();
      await database.query(
        `INSERT INTO support_groups 
         (id, name, description, category, industry, role_type, interest_tags, is_public, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, now(), now())`,
        [
          groupId,
          name,
          description,
          category,
          industry || null,
          roleType || null,
          JSON.stringify(interestTags),
          isPublic,
          userId,
        ]
      );

      // Auto-join the creator as admin
      await this.joinSupportGroup(userId, groupId, "standard");
      await database.query(
        `UPDATE support_group_memberships SET role = 'admin' WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );

      return await this.getSupportGroup(groupId, userId);
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error creating support group:",
        error
      );
      throw error;
    }
  }

  /**
   * Get abstract user profile (no personal information)
   * Returns aggregated skills, experiences, and metrics
   */
  async getAbstractUserProfile(targetUserId) {
    try {
      // Get aggregated skills data (categories and proficiency levels only)
      const skillsQuery = await database.query(
        `
        SELECT 
          category,
          proficiency,
          COUNT(*) as count
        FROM skills
        WHERE user_id = $1
        GROUP BY category, proficiency
        ORDER BY category, proficiency
        `,
        [targetUserId]
      );

      // Get experience summary (years, industries - no company names)
      const experienceQuery = await database.query(
        `
        SELECT 
          COUNT(*) as total_positions,
          COUNT(CASE WHEN is_current = true THEN 1 END) as current_positions,
          MIN(start_date) as career_start_date,
          MAX(CASE WHEN is_current = false THEN end_date END) as latest_end_date,
          COUNT(DISTINCT company) as companies_worked
        FROM jobs
        WHERE user_id = $1
        `,
        [targetUserId]
      );

      // Get profile data separately
      const profileQuery = await database.query(
        `
        SELECT industry, exp_level
        FROM profiles
        WHERE user_id = $1
        `,
        [targetUserId]
      );

      // Get education summary (degree types only - no school names)
      const educationQuery = await database.query(
        `
        SELECT 
          degree_type,
          field,
          COUNT(*) as count
        FROM educations
        WHERE user_id = $1
        GROUP BY degree_type, field
        ORDER BY degree_type
        `,
        [targetUserId]
      );

      // Get job search metrics (aggregated rates, no specific numbers)
      const metricsQuery = await database.query(
        `
        SELECT 
          COUNT(*) as total_opportunities,
          COUNT(CASE WHEN status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected') THEN 1 END) as applications_sent,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END) as interviews_received,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers_received,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer', 'Rejected') AND first_response_at IS NOT NULL THEN 1 END) as responses_received
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL)
        `,
        [targetUserId]
      );

      // Get certifications count (no names)
      const certificationsQuery = await database.query(
        `
        SELECT COUNT(*) as total_certifications
        FROM certifications
        WHERE user_id = $1
        `,
        [targetUserId]
      );

      // Get projects count (no names)
      const projectsQuery = await database.query(
        `
        SELECT 
          COUNT(*) as total_projects,
          COUNT(DISTINCT industry) as industries_covered
        FROM projects
        WHERE user_id = $1
        `,
        [targetUserId]
      );

      const skills = skillsQuery.rows;
      const experience = experienceQuery.rows[0] || {};
      const profile = profileQuery.rows[0] || {};
      const education = educationQuery.rows;
      const metrics = metricsQuery.rows[0] || {};
      const certifications = certificationsQuery.rows[0] || {};
      const projects = projectsQuery.rows[0] || {};

      // Calculate abstract metrics
      const applicationRate = metrics.applications_sent > 0 && metrics.responses_received > 0
        ? Math.round((metrics.responses_received / metrics.applications_sent) * 100)
        : 0;
      
      const interviewRate = metrics.applications_sent > 0 && metrics.interviews_received > 0
        ? Math.round((metrics.interviews_received / metrics.applications_sent) * 100)
        : 0;

      const offerRate = metrics.interviews_received > 0 && metrics.offers_received > 0
        ? Math.round((metrics.offers_received / metrics.interviews_received) * 100)
        : 0;

      // Calculate years of experience
      let yearsOfExperience = 0;
      if (experience.career_start_date) {
        const startDate = new Date(experience.career_start_date);
        const endDate = experience.latest_end_date 
          ? new Date(experience.latest_end_date)
          : new Date();
        const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
        yearsOfExperience = Math.round(years * 10) / 10;
      }

      return {
        skills: {
          categories: [...new Set(skills.map(s => s.category).filter(Boolean))],
          proficiencyDistribution: skills.reduce((acc, s) => {
            if (!acc[s.proficiency]) acc[s.proficiency] = 0;
            acc[s.proficiency] += parseInt(s.count);
            return acc;
          }, {}),
          totalSkills: skills.reduce((sum, s) => sum + parseInt(s.count), 0)
        },
        experience: {
          yearsOfExperience,
          experienceLevel: profile.exp_level || null,
          totalPositions: parseInt(experience.total_positions) || 0,
          currentPositions: parseInt(experience.current_positions) || 0,
          companiesWorked: parseInt(experience.companies_worked) || 0,
          primaryIndustry: profile.industry || null
        },
        education: {
          degrees: education.map(e => ({
            type: e.degree_type,
            field: e.field,
            count: parseInt(e.count)
          })),
          totalDegrees: education.reduce((sum, e) => sum + parseInt(e.count), 0)
        },
        jobSearchMetrics: {
          totalOpportunities: parseInt(metrics.total_opportunities) || 0,
          applicationResponseRate: applicationRate,
          interviewConversionRate: interviewRate,
          offerConversionRate: offerRate,
          // Abstract ranges instead of exact numbers
          activityLevel: metrics.applications_sent > 50 ? 'high' : 
                        metrics.applications_sent > 20 ? 'medium' : 
                        metrics.applications_sent > 0 ? 'low' : 'none'
        },
        certifications: {
          total: parseInt(certifications.total_certifications) || 0
        },
        projects: {
          total: parseInt(projects.total_projects) || 0,
          industriesCovered: parseInt(projects.industries_covered) || 0
        }
      };
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting abstract user profile:",
        error
      );
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId, userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          sgm.user_id,
          sgm.role,
          sgm.joined_at,
          sgm.last_active_at,
          u.email,
          p.pfp_link as profile_picture,
          p.first_name,
          p.last_name,
          p.bio,
          CASE 
            WHEN p.city IS NOT NULL AND p.state IS NOT NULL 
            THEN CONCAT(p.city, ', ', p.state)
            WHEN p.city IS NOT NULL 
            THEN p.city
            WHEN p.state IS NOT NULL 
            THEN p.state
            ELSE NULL
          END as location,
          p.job_title,
          p.industry
        FROM support_group_memberships sgm
        INNER JOIN users u ON sgm.user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE sgm.group_id = $1 AND sgm.is_active = true
        ORDER BY 
          CASE WHEN sgm.role = 'admin' THEN 1
               WHEN sgm.role = 'moderator' THEN 2
               ELSE 3 END,
          sgm.joined_at ASC
        `,
        [groupId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error getting group members:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate AI monthly challenge for a support group
   */
  async generateMonthlyChallenge(groupId) {
    try {
      if (!this.openai) {
        throw new Error("OpenAI API not configured");
      }

      const group = await database.query(
        `SELECT name, description, category, industry, role_type FROM support_groups WHERE id = $1`,
        [groupId]
      );

      if (group.rows.length === 0) {
        throw new Error("Support group not found");
      }

      const groupData = group.rows[0];
      const currentMonth = new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      const prompt = `Generate an engaging monthly challenge for the "${
        groupData.name
      }" support group for ${currentMonth}.
      
Group Details:
- Category: ${groupData.category}
- Industry: ${groupData.industry || "General"}
- Role Type: ${groupData.role_type || "All levels"}
- Description: ${groupData.description || ""}

Create a challenge that:
1. Is relevant to job searching and career development
2. Is specific to this group's focus (${
        groupData.industry || groupData.category
      })
3. Has clear, measurable goals
4. Is motivating and achievable
5. Encourages community participation

Return a JSON object with:
{
  "title": "Challenge title",
  "description": "Detailed challenge description (2-3 sentences)",
  "target_metric": "applications_submitted" or "interviews_completed" or "networking_events" or "skill_development",
  "target_value": number (e.g., 5, 10, 20),
  "challenge_type": "monthly",
  "tips": ["tip1", "tip2", "tip3"]
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates engaging, achievable challenges for job search support groups. Always return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const challengeData = JSON.parse(
        completion.choices[0].message.content.trim()
      );

      // Create the challenge in the database
      const challengeId = uuidv4();
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

      // Format dates as YYYY-MM-DD for proper storage
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      await database.query(
        `INSERT INTO support_group_challenges 
         (id, group_id, created_by, title, description, challenge_type, start_date, end_date, target_metric, target_value, is_active, created_at, updated_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6::date, $7::date, $8, $9, true, now(), now())`,
        [
          challengeId,
          groupId,
          challengeData.title,
          challengeData.description,
          challengeData.challenge_type || "monthly",
          startDateStr,
          endDateStr,
          challengeData.target_metric,
          challengeData.target_value,
        ]
      );

      return await database
        .query(`SELECT * FROM support_group_challenges WHERE id = $1`, [
          challengeId,
        ])
        .then((r) => r.rows[0]);
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error generating monthly challenge:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate AI resources for a support group
   * Creates different sections: articles with URLs, AI-generated advice, and other relevant content
   */
  async generateGroupResources(groupId, resourceType = "general") {
    try {
      if (!this.openai) {
        throw new Error("OpenAI API not configured");
      }

      const group = await database.query(
        `SELECT name, description, category, industry, role_type FROM support_groups WHERE id = $1`,
        [groupId]
      );

      if (group.rows.length === 0) {
        throw new Error("Support group not found");
      }

      const groupData = group.rows[0];
      const savedResources = [];

      // Generate Articles Section (with real URLs)
      const articlesPrompt = `Generate 4-5 helpful articles and resources for the "${
        groupData.name
      }" support group.
Group Details:
- Category: ${groupData.category}
- Industry: ${groupData.industry || "General"}
- Role Type: ${groupData.role_type || "All levels"}
- Description: ${groupData.description || ""}

Generate articles that are relevant to job searching, career development, and this group's focus.
For each article, provide:
- title: A compelling title
- description: A brief description (2-3 sentences)
- url: A real, working URL to a reputable website (e.g., LinkedIn articles, Medium posts, industry blogs, career sites like Indeed, Glassdoor, etc.). Use actual URLs like "https://www.linkedin.com/pulse/..." or "https://medium.com/..." or "https://www.indeed.com/..."
- resource_type: "article"

Return a JSON object with an "articles" array containing these article objects.`;

      const articlesCompletion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that finds and recommends relevant articles for job search support groups. Always return valid JSON objects. Provide real, working URLs to reputable websites.",
          },
          { role: "user", content: articlesPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      let articlesResponse;
      try {
        articlesResponse = JSON.parse(
          articlesCompletion.choices[0].message.content.trim()
        );
      } catch (e) {
        console.error("[SupportGroupsService] Error parsing articles:", e);
        articlesResponse = { articles: [] };
      }

      const articles =
        articlesResponse.articles ||
        articlesResponse.resources ||
        articlesResponse.items ||
        [];

      // Save articles
      for (const article of articles.slice(0, 5)) {
        const resourceId = uuidv4();
        // Ensure URL is valid - if it doesn't start with http, add https://
        let articleUrl = article.url || "#";
        if (articleUrl !== "#" && !articleUrl.startsWith("http")) {
          articleUrl = `https://${articleUrl}`;
        }

        await database.query(
          `INSERT INTO support_group_resources 
           (id, group_id, created_by, title, description, resource_type, url, content, is_featured, created_at, updated_at)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, NULL, false, now(), now())`,
          [
            resourceId,
            groupId,
            article.title,
            article.description,
            "article",
            articleUrl,
          ]
        );
        savedResources.push(
          await database
            .query(`SELECT * FROM support_group_resources WHERE id = $1`, [
              resourceId,
            ])
            .then((r) => r.rows[0])
        );
      }

      // Generate AI Advice Section (using content field)
      const advicePrompt = `Generate personalized, actionable advice for members of the "${
        groupData.name
      }" support group.
Group Details:
- Category: ${groupData.category}
- Industry: ${groupData.industry || "General"}
- Role Type: ${groupData.role_type || "All levels"}
- Description: ${groupData.description || ""}

Create 3-4 pieces of specific, actionable advice that would help members in their job search journey. Each piece should:
- Be tailored to this group's focus
- Be practical and actionable
- Be encouraging and supportive
- Be 2-3 paragraphs long

Return a JSON object with an "advice" array containing objects with:
- title: A clear, actionable title (e.g., "How to Tailor Your Resume for ${
        groupData.industry || "Your Industry"
      }")
- content: The full advice text (2-3 paragraphs)
- resource_type: "guide"`;

      const adviceCompletion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert career coach providing personalized, actionable advice for job seekers. Always return valid JSON objects.",
          },
          { role: "user", content: advicePrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      let adviceResponse;
      try {
        adviceResponse = JSON.parse(
          adviceCompletion.choices[0].message.content.trim()
        );
      } catch (e) {
        console.error("[SupportGroupsService] Error parsing advice:", e);
        adviceResponse = { advice: [] };
      }

      const adviceItems =
        adviceResponse.advice ||
        adviceResponse.resources ||
        adviceResponse.items ||
        [];

      // Save AI-generated advice (using content field, no URL)
      for (const advice of adviceItems.slice(0, 4)) {
        const resourceId = uuidv4();
        await database.query(
          `INSERT INTO support_group_resources 
           (id, group_id, created_by, title, description, resource_type, url, content, is_featured, created_at, updated_at)
           VALUES ($1, $2, NULL, $3, $4, $5, NULL, $6, false, now(), now())`,
          [
            resourceId,
            groupId,
            advice.title,
            advice.content?.substring(0, 200) || advice.description || "", // Brief description
            "guide",
            advice.content || advice.description || "", // Full content
          ]
        );
        savedResources.push(
          await database
            .query(`SELECT * FROM support_group_resources WHERE id = $1`, [
              resourceId,
            ])
            .then((r) => r.rows[0])
        );
      }

      return savedResources;
    } catch (error) {
      console.error(
        "[SupportGroupsService] Error generating group resources:",
        error
      );
      throw error;
    }
  }
}

export default new SupportGroupsService();
