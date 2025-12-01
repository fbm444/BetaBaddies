import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService } from "./index.js";
import OpenAI from "openai";

/**
 * Service for Progress Sharing and Accountability (UC-111)
 */
class ProgressShareService {
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
   * Configure progress sharing
   */
  async configureSharing(userId, shareConfig) {
    try {
      const { sharedWithUserId, sharedWithTeamId, shareType, privacyLevel } = shareConfig;

      if (!sharedWithUserId && !sharedWithTeamId) {
        throw new Error("Must specify either sharedWithUserId or sharedWithTeamId");
      }

      // Remove existing shares for this configuration
      if (sharedWithUserId) {
        await database.query(
          `UPDATE progress_shares 
           SET is_active = false 
           WHERE user_id = $1 AND shared_with_user_id = $2`,
          [userId, sharedWithUserId]
        );
      } else {
        await database.query(
          `UPDATE progress_shares 
           SET is_active = false 
           WHERE user_id = $1 AND shared_with_team_id = $2`,
          [userId, sharedWithTeamId]
        );
      }

      // Create new share configuration
      const shareId = uuidv4();
      await database.query(
        `INSERT INTO progress_shares 
         (id, user_id, shared_with_user_id, shared_with_team_id, share_type, privacy_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [shareId, userId, sharedWithUserId || null, sharedWithTeamId || null, shareType || "all", privacyLevel || "team"]
      );

      return { id: shareId, ...shareConfig };
    } catch (error) {
      console.error("[ProgressShareService] Error configuring sharing:", error);
      throw error;
    }
  }

  /**
   * Generate AI-powered progress report with mock interview data and analytics
   */
  async generateProgressReport(userId, reportPeriod = "week", generateAI = true) {
    try {
      const periodStart = new Date();
      const periodEnd = new Date();
      if (reportPeriod === "week") {
        periodStart.setDate(periodStart.getDate() - 7);
      } else if (reportPeriod === "month") {
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Get job search progress
      const jobProgress = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Applied' AND created_at >= $1) as applications_submitted,
          COUNT(*) FILTER (WHERE status = 'Interview' AND status_updated_at >= $1) as interviews_scheduled,
          COUNT(*) FILTER (WHERE status = 'Offer' AND status_updated_at >= $1) as offers_received,
          COUNT(*) as total_jobs
         FROM job_opportunities
         WHERE user_id = $2 AND archived = false`,
        [periodStart, userId]
      );

      // Get interview prep progress
      const interviewPrep = await database.query(
        `SELECT 
          COUNT(*) as interviews_completed,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count
         FROM interviews
         WHERE user_id = $2 AND created_at >= $1`,
        [periodStart, userId]
      );

      // Get upcoming interviews
      const upcomingInterviews = await database.query(
        `SELECT id, title, company, scheduled_at as interview_date, type as interview_type, status
         FROM interviews
         WHERE user_id = $1 AND (scheduled_at >= CURRENT_TIMESTAMP OR date >= CURRENT_DATE)
         ORDER BY COALESCE(scheduled_at, date) ASC
         LIMIT 10`,
        [userId]
      );

      // Get mock interview sessions data
      const mockInterviews = await database.query(
        `SELECT 
          id, target_role, target_company, interview_format, status,
          started_at, completed_at, confidence_score, performance_summary,
          improvement_areas
         FROM mock_interview_sessions
         WHERE user_id = $1 AND started_at >= $2
         ORDER BY started_at DESC
         LIMIT 20`,
        [userId, periodStart]
      );

      // Calculate mock interview statistics
      const completedMockInterviews = mockInterviews.rows.filter(m => m.status === 'completed');
      const avgConfidenceScore = completedMockInterviews.length > 0
        ? completedMockInterviews.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / completedMockInterviews.length
        : 0;

      // Get interview success rate (interviews that led to offers or next rounds)
      const interviewSuccess = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IN ('offer', 'next_round', 'accepted')) as successful_interviews,
          COUNT(*) FILTER (WHERE status = 'completed') as total_completed_interviews
         FROM interviews
         WHERE user_id = $1 AND created_at >= $2`,
        [userId, periodStart]
      );

      const successRate = interviewSuccess.rows[0]?.total_completed_interviews > 0
        ? (interviewSuccess.rows[0].successful_interviews / interviewSuccess.rows[0].total_completed_interviews) * 100
        : 0;

      // Get task completion
      const tasks = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= $1) as tasks_completed,
          COUNT(*) FILTER (WHERE status = 'pending') as tasks_pending
         FROM preparation_tasks
         WHERE assigned_to = $2`,
        [periodStart, userId]
      );

      // Get milestones achieved
      const milestones = await database.query(
        `SELECT milestone_type, milestone_title, achieved_at
         FROM milestones
         WHERE user_id = $2 AND achieved_at >= $1
         ORDER BY achieved_at DESC`,
        [periodStart, userId]
      );

      // Get goal progress (if career_goals exist)
      let goals = { rows: [] };
      try {
        goals = await database.query(
          `SELECT id, goal_type, goal_category as goal_title, target_value, current_value, status
           FROM career_goals
           WHERE user_id = $1 AND created_at >= $2
           ORDER BY created_at DESC`,
          [userId, periodStart]
        );
      } catch (error) {
        // Goals table might not exist or have different structure, skip it
        console.log("[ProgressShareService] Goals query skipped:", error.message);
      }

      const reportData = {
        period: reportPeriod,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        jobSearch: jobProgress.rows[0],
        interviewPrep: interviewPrep.rows[0],
        upcomingInterviews: upcomingInterviews.rows,
        mockInterviews: {
          total: mockInterviews.rows.length,
          completed: completedMockInterviews.length,
          avgConfidenceScore: Math.round(avgConfidenceScore),
          recentSessions: completedMockInterviews.slice(0, 5).map(m => ({
            id: m.id,
            targetRole: m.target_role,
            targetCompany: m.target_company,
            confidenceScore: m.confidence_score,
            completedAt: m.completed_at
          }))
        },
        interviewSuccess: {
          successRate: Math.round(successRate),
          successfulInterviews: interviewSuccess.rows[0]?.successful_interviews || 0,
          totalCompleted: interviewSuccess.rows[0]?.total_completed_interviews || 0
        },
        tasks: tasks.rows[0],
        milestones: milestones.rows,
        goals: goals.rows,
        generatedAt: new Date().toISOString()
      };

      // Generate AI summary if requested
      let aiSummary = null;
      if (generateAI && this.openai) {
        try {
          aiSummary = await this.generateAISummary(reportData);
          reportData.aiSummary = aiSummary;
        } catch (aiError) {
          console.error("[ProgressShareService] Error generating AI summary:", aiError);
          // Continue without AI summary
        }
      }

      return reportData;
    } catch (error) {
      console.error("[ProgressShareService] Error generating progress report:", error);
      throw error;
    }
  }

  /**
   * Generate AI-powered summary of progress report
   */
  async generateAISummary(reportData) {
    try {
      if (!this.openai) {
        return null;
      }

      const prompt = `You are a career coach analyzing a job search progress report. Provide a comprehensive, encouraging, and actionable summary.

Key Metrics:
- Applications Submitted: ${reportData.jobSearch?.applications_submitted || 0}
- Interviews Scheduled: ${reportData.jobSearch?.interviews_scheduled || 0}
- Offers Received: ${reportData.jobSearch?.offers_received || 0}
- Mock Interviews Completed: ${reportData.mockInterviews?.completed || 0}
- Average Confidence Score: ${reportData.mockInterviews?.avgConfidenceScore || 0}/100
- Interview Success Rate: ${reportData.interviewSuccess?.successRate || 0}%
- Tasks Completed: ${reportData.tasks?.tasks_completed || 0}
- Milestones Achieved: ${reportData.milestones?.length || 0}

Upcoming Interviews: ${reportData.upcomingInterviews?.length || 0}

Provide:
1. A brief executive summary (2-3 sentences)
2. Key achievements and strengths
3. Areas for improvement
4. Actionable recommendations for the next period
5. Encouragement and motivation

Keep it professional, supportive, and specific. Format as JSON with keys: summary, achievements, improvements, recommendations, encouragement.`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a supportive career coach providing feedback on job search progress. Be encouraging, specific, and actionable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiContent = completion.choices[0]?.message?.content;
      if (aiContent) {
        try {
          return JSON.parse(aiContent);
        } catch (e) {
          // If not valid JSON, return as text
          return { summary: aiContent };
        }
      }

      return null;
    } catch (error) {
      console.error("[ProgressShareService] Error generating AI summary:", error);
      return null;
    }
  }

  /**
   * Save progress report to database
   */
  async saveProgressReport(userId, reportData, sharedWithMentorIds = []) {
    try {
      const reportId = uuidv4();
      const periodStart = new Date(reportData.periodStart);
      const periodEnd = new Date(reportData.periodEnd);

      await database.query(
        `INSERT INTO progress_reports 
         (id, user_id, report_period_start, report_period_end, report_data, shared_with, goal_progress, milestone_achievements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          reportId,
          userId,
          periodStart,
          periodEnd,
          JSON.stringify(reportData),
          JSON.stringify(sharedWithMentorIds),
          JSON.stringify(reportData.goals || []),
          JSON.stringify(reportData.milestones || [])
        ]
      );

      return {
        id: reportId,
        userId,
        periodStart,
        periodEnd,
        sharedWith: sharedWithMentorIds,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[ProgressShareService] Error saving progress report:", error);
      throw error;
    }
  }

  /**
   * Share progress report with mentor
   */
  async shareReportWithMentor(reportId, userId, mentorId) {
    try {
      // Verify report belongs to user
      const report = await database.query(
        `SELECT shared_with FROM progress_reports WHERE id = $1 AND user_id = $2`,
        [reportId, userId]
      );

      if (report.rows.length === 0) {
        throw new Error("Progress report not found");
      }

      // Verify mentor relationship exists
      const relationship = await database.query(
        `SELECT id FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2 AND (active IS NULL OR active = true)`,
        [mentorId, userId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      // Update shared_with array
      let sharedWith = report.rows[0].shared_with || [];
      if (typeof sharedWith === 'string') {
        sharedWith = JSON.parse(sharedWith);
      }
      
      if (!sharedWith.includes(mentorId)) {
        sharedWith.push(mentorId);
        await database.query(
          `UPDATE progress_reports SET shared_with = $1 WHERE id = $2`,
          [JSON.stringify(sharedWith), reportId]
        );
      }

      return { success: true, sharedWith };
    } catch (error) {
      console.error("[ProgressShareService] Error sharing report with mentor:", error);
      throw error;
    }
  }

  /**
   * Get progress reports for a mentor (from their mentees)
   */
  async getMenteeProgressReports(mentorId) {
    try {
      // Get all mentees
      const relationships = await database.query(
        `SELECT mentee_id FROM mentor_relationships 
         WHERE mentor_id = $1 AND (active IS NULL OR active = true)`,
        [mentorId]
      );

      const menteeIds = relationships.rows.map(r => r.mentee_id);
      if (menteeIds.length === 0) {
        return [];
      }

      // Get reports shared with this mentor
      const reports = await database.query(
        `SELECT pr.*, u.email as mentee_email, p.first_name, p.last_name
         FROM progress_reports pr
         JOIN users u ON pr.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE pr.user_id = ANY($1::uuid[])
           AND pr.shared_with @> $2::jsonb
         ORDER BY pr.generated_at DESC`,
        [menteeIds, JSON.stringify([mentorId])]
      );

      return reports.rows.map(row => ({
        id: row.id,
        menteeId: row.user_id,
        menteeEmail: row.mentee_email,
        menteeName: row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.mentee_email,
        periodStart: row.report_period_start,
        periodEnd: row.report_period_end,
        reportData: typeof row.report_data === 'string' ? JSON.parse(row.report_data) : row.report_data,
        generatedAt: row.generated_at
      }));
    } catch (error) {
      console.error("[ProgressShareService] Error getting mentee progress reports:", error);
      throw error;
    }
  }

  /**
   * Get user's saved progress reports
   */
  async getUserProgressReports(userId) {
    try {
      const reports = await database.query(
        `SELECT * FROM progress_reports 
         WHERE user_id = $1
         ORDER BY generated_at DESC`,
        [userId]
      );

      return reports.rows.map(row => {
        // Parse report_data
        let reportData = typeof row.report_data === 'string' ? JSON.parse(row.report_data) : row.report_data;
        
        // Ensure aiSummary is properly parsed if it exists
        if (reportData && reportData.aiSummary) {
          if (typeof reportData.aiSummary === 'string') {
            try {
              reportData.aiSummary = JSON.parse(reportData.aiSummary);
            } catch (e) {
              // If parsing fails, treat as plain text summary
              reportData.aiSummary = { summary: reportData.aiSummary };
            }
          }
          // Ensure all aiSummary fields are strings
          if (typeof reportData.aiSummary === 'object' && reportData.aiSummary !== null) {
            Object.keys(reportData.aiSummary).forEach(key => {
              if (reportData.aiSummary[key] !== null && typeof reportData.aiSummary[key] !== 'string') {
                reportData.aiSummary[key] = String(reportData.aiSummary[key]);
              }
            });
          }
        }
        
        return {
          id: row.id,
          periodStart: row.report_period_start,
          periodEnd: row.report_period_end,
          reportData: reportData,
          sharedWith: typeof row.shared_with === 'string' ? JSON.parse(row.shared_with) : row.shared_with,
          generatedAt: row.generated_at
        };
      });
    } catch (error) {
      console.error("[ProgressShareService] Error getting user progress reports:", error);
      throw error;
    }
  }

  /**
   * Add comment to progress report
   */
  async addReportComment(reportId, userId, commentText) {
    try {
      // Get report to check permissions
      const report = await database.query(
        `SELECT report_data, user_id, shared_with FROM progress_reports WHERE id = $1`,
        [reportId]
      );

      if (report.rows.length === 0) {
        throw new Error("Progress report not found");
      }

      const reportRow = report.rows[0];
      let reportData = typeof reportRow.report_data === 'string' 
        ? JSON.parse(reportRow.report_data) 
        : reportRow.report_data;
      
      let sharedWith = typeof reportRow.shared_with === 'string'
        ? JSON.parse(reportRow.shared_with)
        : reportRow.shared_with;

      // Check if user is the report owner or a shared mentor
      if (reportRow.user_id !== userId && !sharedWith.includes(userId)) {
        throw new Error("You do not have permission to comment on this report");
      }

      // Get user profile
      const userProfile = await database.query(
        `SELECT p.first_name, p.last_name, u.email 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [userId]
      );

      const userName = userProfile.rows[0]?.first_name && userProfile.rows[0]?.last_name
        ? `${userProfile.rows[0].first_name} ${userProfile.rows[0].last_name}`
        : userProfile.rows[0]?.email || "Unknown User";

      // Initialize comments array if it doesn't exist
      if (!reportData.comments) {
        reportData.comments = [];
      }

      // Add comment
      const newComment = {
        id: uuidv4(),
        userId,
        userName,
        text: commentText,
        createdAt: new Date().toISOString()
      };
      reportData.comments.push(newComment);

      // Update report
      await database.query(
        `UPDATE progress_reports SET report_data = $1 WHERE id = $2`,
        [JSON.stringify(reportData), reportId]
      );

      return newComment;
    } catch (error) {
      console.error("[ProgressShareService] Error adding report comment:", error);
      throw error;
    }
  }

  /**
   * Get comments for a progress report
   */
  async getReportComments(reportId, userId) {
    try {
      const report = await database.query(
        `SELECT report_data, user_id, shared_with FROM progress_reports WHERE id = $1`,
        [reportId]
      );

      if (report.rows.length === 0) {
        throw new Error("Progress report not found");
      }

      const reportRow = report.rows[0];
      let sharedWith = typeof reportRow.shared_with === 'string'
        ? JSON.parse(reportRow.shared_with)
        : reportRow.shared_with;

      // Check permissions
      if (reportRow.user_id !== userId && !sharedWith.includes(userId)) {
        throw new Error("You do not have permission to view this report");
      }

      let reportData = typeof reportRow.report_data === 'string'
        ? JSON.parse(reportRow.report_data)
        : reportRow.report_data;

      return reportData.comments || [];
    } catch (error) {
      console.error("[ProgressShareService] Error getting report comments:", error);
      throw error;
    }
  }

  /**
   * Get shared progress for a user (what they can see)
   */
  async getSharedProgress(viewerId, targetUserId) {
    try {
      // Check if viewer has permission to see target's progress
      const shareConfig = await database.query(
        `SELECT * FROM progress_shares
         WHERE user_id = $1 
           AND ((shared_with_user_id = $2) OR (shared_with_team_id IN (
             SELECT team_id FROM team_members WHERE user_id = $2 AND active = true
           )))
           AND is_active = true`,
        [targetUserId, viewerId]
      );

      if (shareConfig.rows.length === 0) {
        throw new Error("You do not have permission to view this user's progress");
      }

      // Get progress based on share type
      const share = shareConfig.rows[0];
      const progress = {};

      if (share.share_type === "all" || share.share_type === "applications") {
        progress.jobs = await database.query(
          `SELECT id, title, company, status, status_updated_at
           FROM job_opportunities
           WHERE user_id = $1 AND archived = false
           ORDER BY status_updated_at DESC`,
          [targetUserId]
        );
      }

      if (share.share_type === "all" || share.share_type === "interviews") {
        progress.interviews = await database.query(
          `SELECT id, title, company, scheduled_at as interview_date, status
           FROM interviews
           WHERE user_id = $1
           ORDER BY COALESCE(scheduled_at, date) DESC`,
          [targetUserId]
        );
      }

      if (share.share_type === "all" || share.share_type === "milestones") {
        progress.milestones = await database.query(
          `SELECT milestone_type, milestone_title, achieved_at
           FROM milestones
           WHERE user_id = $1
           ORDER BY achieved_at DESC`,
          [targetUserId]
        );
      }

      return progress;
    } catch (error) {
      console.error("[ProgressShareService] Error getting shared progress:", error);
      throw error;
    }
  }

  /**
   * Get predefined milestone types for job search
   */
  getPredefinedMilestones() {
    return [
      {
        type: "first_application",
        title: "First Application Submitted",
        description: "Submitted your first job application",
        category: "application"
      },
      {
        type: "five_applications",
        title: "5 Applications Submitted",
        description: "Reached 5 job applications",
        category: "application"
      },
      {
        type: "ten_applications",
        title: "10 Applications Submitted",
        description: "Reached 10 job applications",
        category: "application"
      },
      {
        type: "first_interview",
        title: "First Interview Scheduled",
        description: "Scheduled your first interview",
        category: "interview"
      },
      {
        type: "phone_screen_complete",
        title: "Phone Screen Completed",
        description: "Completed a phone screen interview",
        category: "interview"
      },
      {
        type: "technical_interview",
        title: "Technical Interview Completed",
        description: "Completed a technical interview",
        category: "interview"
      },
      {
        type: "first_offer",
        title: "First Job Offer Received",
        description: "Received your first job offer",
        category: "offer"
      },
      {
        type: "resume_optimized",
        title: "Resume Optimized",
        description: "Optimized your resume for ATS",
        category: "preparation"
      },
      {
        type: "cover_letter_created",
        title: "Cover Letter Created",
        description: "Created your first tailored cover letter",
        category: "preparation"
      },
      {
        type: "network_connection",
        title: "Network Connection Made",
        description: "Made a meaningful professional connection",
        category: "networking"
      },
      {
        type: "skill_certification",
        title: "Skill Certification Earned",
        description: "Earned a new skill certification",
        category: "preparation"
      },
      {
        type: "interview_prep_complete",
        title: "Interview Prep Completed",
        description: "Completed interview preparation session",
        category: "preparation"
      }
    ];
  }

  /**
   * Auto-detect and create milestone based on user activity
   */
  async autoDetectMilestone(userId, activityType, activityData, teamId = null) {
    try {
      const predefined = this.getPredefinedMilestones();
      let milestoneToCreate = null;

      // Check application milestones
      if (activityType === "job_application_submitted") {
        const appCount = await database.query(
          `SELECT COUNT(*) as count FROM job_opportunities 
           WHERE user_id = $1 AND status = 'Applied' AND archived = false`,
          [userId]
        );
        const count = parseInt(appCount.rows[0]?.count || 0);
        
        if (count === 1) {
          milestoneToCreate = predefined.find(m => m.type === "first_application");
        } else if (count === 5) {
          milestoneToCreate = predefined.find(m => m.type === "five_applications");
        } else if (count === 10) {
          milestoneToCreate = predefined.find(m => m.type === "ten_applications");
        }
      }

      // Check interview milestones
      if (activityType === "interview_scheduled" || activityType === "interview_completed") {
        const interviewCount = await database.query(
          `SELECT COUNT(*) as count FROM interviews WHERE user_id = $1`,
          [userId]
        );
        const count = parseInt(interviewCount.rows[0]?.count || 0);
        
        if (count === 1) {
          milestoneToCreate = predefined.find(m => m.type === "first_interview");
        }
      }

      // Check offer milestones
      if (activityType === "job_offer_received") {
        milestoneToCreate = predefined.find(m => m.type === "first_offer");
      }

      if (milestoneToCreate) {
        return await this.createMilestone(userId, {
          milestoneType: milestoneToCreate.type,
          milestoneTitle: milestoneToCreate.title,
          milestoneDescription: milestoneToCreate.description,
          sharedWithTeam: teamId ? true : false
        }, teamId);
      }

      return null;
    } catch (error) {
      console.error("[ProgressShareService] Error auto-detecting milestone:", error);
      return null;
    }
  }

  /**
   * Create milestone
   */
  async createMilestone(userId, milestoneData, teamId = null) {
    try {
      const { milestoneType, milestoneTitle, milestoneDescription, milestoneData: data, sharedWithTeam } = milestoneData;

      const milestoneId = uuidv4();
      await database.query(
        `INSERT INTO milestones 
         (id, user_id, team_id, milestone_type, milestone_title, milestone_description, milestone_data, shared_with_team)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [milestoneId, userId, teamId, milestoneType, milestoneTitle, milestoneDescription || null, JSON.stringify(data || {}), sharedWithTeam || false]
      );

      // Log activity
      if (teamId) {
        await teamService.logActivity(teamId, userId, "candidate", "milestone_achieved", {
          milestone_id: milestoneId,
          milestone_type: milestoneType,
          milestone_title: milestoneTitle
        });
      }

      return {
        id: milestoneId,
        milestoneType,
        milestoneTitle,
        achievedAt: new Date()
      };
    } catch (error) {
      console.error("[ProgressShareService] Error creating milestone:", error);
      throw error;
    }
  }

  /**
   * Add reaction or comment to milestone
   */
  async addMilestoneReaction(milestoneId, userId, reactionType, commentText = null) {
    try {
      // Get current milestone data
      const milestone = await database.query(
        `SELECT milestone_data, user_id, team_id FROM milestones WHERE id = $1`,
        [milestoneId]
      );

      if (milestone.rows.length === 0) {
        throw new Error("Milestone not found");
      }

      // Parse milestone_data if it's a string (JSONB is usually already parsed, but handle both cases)
      let currentData = milestone.rows[0].milestone_data || {};
      if (typeof currentData === 'string') {
        try {
          currentData = JSON.parse(currentData);
        } catch (e) {
          currentData = {};
        }
      }
      const reactions = currentData.reactions || [];
      const comments = currentData.comments || [];

      // Get user profile for display
      const userProfile = await database.query(
        `SELECT p.first_name, p.last_name, u.email 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [userId]
      );

      const userName = userProfile.rows[0]?.first_name && userProfile.rows[0]?.last_name
        ? `${userProfile.rows[0].first_name} ${userProfile.rows[0].last_name}`
        : userProfile.rows[0]?.email || "Unknown User";

      if (reactionType === "comment" && commentText) {
        // Add comment
        const newComment = {
          id: uuidv4(),
          userId,
          userName,
          text: commentText,
          createdAt: new Date().toISOString()
        };
        comments.push(newComment);
      } else if (reactionType && ["celebrate", "congrats", "awesome", "fire", "clap"].includes(reactionType)) {
        // Add or update reaction
        const existingReactionIndex = reactions.findIndex((r) => r.userId === userId && r.type === reactionType);
        
        if (existingReactionIndex >= 0) {
          // Remove reaction (toggle off)
          reactions.splice(existingReactionIndex, 1);
        } else {
          // Add reaction
          reactions.push({
            userId,
            userName,
            type: reactionType,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Update milestone_data
      const updatedData = {
        ...currentData,
        reactions,
        comments
      };

      await database.query(
        `UPDATE milestones SET milestone_data = $1 WHERE id = $2`,
        [JSON.stringify(updatedData), milestoneId]
      );

      return {
        reactions,
        comments
      };
    } catch (error) {
      console.error("[ProgressShareService] Error adding milestone reaction:", error);
      throw error;
    }
  }

  /**
   * Get accountability partner engagement
   */
  async getAccountabilityEngagement(userId, partnerId) {
    try {
      // Get relationship
      const relationship = await database.query(
        `SELECT * FROM accountability_relationships
         WHERE (user_id = $1 AND accountability_partner_id = $2)
            OR (user_id = $2 AND accountability_partner_id = $1)`,
        [userId, partnerId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Accountability relationship not found");
      }

      // Get engagement metrics
      const engagement = await database.query(
        `SELECT 
          COUNT(*) as interactions_count,
          MAX(created_at) as last_interaction
         FROM activity_logs
         WHERE user_id = $1 AND activity_type IN ('progress_shared', 'milestone_achieved', 'feedback_provided')
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [partnerId]
      );

      return {
        relationship: relationship.rows[0],
        engagement: engagement.rows[0],
        effectiveness: engagement.rows[0]?.interactions_count > 10 ? "high" : 
                      engagement.rows[0]?.interactions_count > 5 ? "medium" : "low"
      };
    } catch (error) {
      console.error("[ProgressShareService] Error getting accountability engagement:", error);
      throw error;
    }
  }
}

export default new ProgressShareService();

