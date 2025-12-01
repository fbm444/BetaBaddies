import { asyncHandler } from "../middleware/errorHandler.js";
import {
  mentorDashboardService,
  documentReviewService,
  documentShareService,
  progressShareService,
  jobShareService,
  taskService,
  teamService,
  teamDashboardService,
} from "../services/collaboration/index.js";
import database from "../services/database.js";

class CollaborationController {
  // ============================================================================
  // UC-109: Mentor Dashboard
  // ============================================================================
  
  // ============================================================================
  // Mentee Dashboard
  // ============================================================================

  /**
   * GET /api/collaboration/mentee/mentor
   * Get mentee's mentor information
   */
  getMentor = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const mentor = await mentorDashboardService.getMentor(menteeId);

    res.status(200).json({
      ok: true,
      data: { mentor },
    });
  });

  /**
   * GET /api/collaboration/mentee/feedback
   * Get feedback received by mentee
   */
  getMenteeFeedback = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const feedback = await mentorDashboardService.getMenteeFeedback(menteeId);

    res.status(200).json({
      ok: true,
      data: { feedback },
    });
  });

  /**
   * GET /api/collaboration/mentee/progress
   * Get mentee's own progress
   */
  getOwnProgress = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const progress = await mentorDashboardService.getOwnProgress(menteeId);

    res.status(200).json({
      ok: true,
      data: { progress },
    });
  });

  /**
   * GET /api/collaboration/mentee/mentor-activity
   * Get mentor activity feed for mentee
   */
  getMentorActivityFeed = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const feed = await mentorDashboardService.getMentorActivityFeed(menteeId);

    res.status(200).json({
      ok: true,
      data: { feed },
    });
  });

  /**
   * GET /api/collaboration/mentee/pending-invitations
   * Get pending mentor invitations for mentee
   */
  getPendingMentorInvitations = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const invitations = await mentorDashboardService.getPendingMentorRelationships(menteeId);

    res.status(200).json({
      ok: true,
      data: { invitations },
    });
  });

  /**
   * POST /api/collaboration/mentee/accept-invitation/:relationshipId
   * Accept a mentor relationship invitation
   */
  acceptMentorInvitation = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const { relationshipId } = req.params;
    const mentor = await mentorDashboardService.acceptMentorRelationship(menteeId, relationshipId);

    res.status(200).json({
      ok: true,
      data: { mentor },
    });
  });

  /**
   * POST /api/collaboration/mentee/invite-mentor
   * Invite someone to be your mentor
   */
  inviteMentor = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const { mentorEmail, relationshipType, permissions } = req.body;

    if (!mentorEmail) {
      return res.status(400).json({
        ok: false,
        error: { message: "Mentor email is required" },
      });
    }

    const invitation = await mentorDashboardService.inviteMentor(menteeId, {
      mentorEmail,
      relationshipType,
      permissions,
    });

    res.status(201).json({
      ok: true,
      data: { invitation },
    });
  });

  /**
   * POST /api/collaboration/mentee/decline-invitation/:relationshipId
   * Decline a mentor invitation
   */
  declineMentorInvitation = asyncHandler(async (req, res) => {
    const menteeId = req.session.userId;
    const { relationshipId } = req.params;
    const result = await mentorDashboardService.declineMentorInvitation(menteeId, relationshipId);

    res.status(200).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees
   * Get mentor's mentees
   */
  getMentees = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    console.log(`[CollaborationController] getMentees called for userId: ${mentorId}`);
    
    // Get user email for debugging
    try {
      const userCheck = await database.query(
        `SELECT email FROM users WHERE u_id = $1`,
        [mentorId]
      );
      if (userCheck.rows.length > 0) {
        console.log(`[CollaborationController] User email: ${userCheck.rows[0].email}`);
      }
    } catch (err) {
      console.error("[CollaborationController] Error getting user email:", err);
    }
    
    const mentees = await mentorDashboardService.getMentees(mentorId);

    res.status(200).json({
      ok: true,
      data: { mentees },
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/progress
   * Get mentee progress
   */
  getMenteeProgress = asyncHandler(async (req, res) => {
    try {
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
      console.log(`[CollaborationController] getMenteeProgress: mentorId=${mentorId}, menteeId=${menteeId}`);
    const progress = await mentorDashboardService.getMenteeProgress(mentorId, menteeId);

    res.status(200).json({
      ok: true,
      data: { progress },
    });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeProgress:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/materials
   * Get mentee materials
   */
  getMenteeMaterials = asyncHandler(async (req, res) => {
    try {
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
    const { type } = req.query;
      console.log(`[CollaborationController] getMenteeMaterials: mentorId=${mentorId}, menteeId=${menteeId}, type=${type}`);
    const materials = await mentorDashboardService.getMenteeMaterials(mentorId, menteeId, type);

    res.status(200).json({
      ok: true,
      data: { materials },
    });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeMaterials:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/resumes/:resumeId
   * Get detailed resume content
   */
  getMenteeResumeDetail = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const { id: menteeId, resumeId } = req.params;
    const resume = await mentorDashboardService.getMenteeResumeDetail(mentorId, menteeId, resumeId);

    res.status(200).json({
      ok: true,
      data: { resume },
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/cover-letters/:coverLetterId
   * Get detailed cover letter content
   */
  getMenteeCoverLetterDetail = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const { id: menteeId, coverLetterId } = req.params;
    const coverLetter = await mentorDashboardService.getMenteeCoverLetterDetail(mentorId, menteeId, coverLetterId);

    res.status(200).json({
      ok: true,
      data: { coverLetter },
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/jobs/:jobId
   * Get detailed job posting content
   */
  getMenteeJobDetail = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const { id: menteeId, jobId } = req.params;
    const job = await mentorDashboardService.getMenteeJobDetail(mentorId, menteeId, jobId);

    res.status(200).json({
      ok: true,
      data: { job },
    });
  });

  /**
   * POST /api/collaboration/mentor/feedback
   * Provide feedback to mentee
   */
  provideFeedback = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const { menteeId, ...feedbackData } = req.body;
    const feedback = await mentorDashboardService.provideFeedback(mentorId, menteeId, feedbackData);

    res.status(201).json({
      ok: true,
      data: { feedback },
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/insights
   * Get coaching insights
   */
  getCoachingInsights = asyncHandler(async (req, res) => {
    try {
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
      console.log(`[CollaborationController] getCoachingInsights: mentorId=${mentorId}, menteeId=${menteeId}`);
    const insights = await mentorDashboardService.getCoachingInsights(mentorId, menteeId);

    res.status(200).json({
      ok: true,
      data: { insights },
    });
    } catch (error) {
      console.error(`[CollaborationController] Error in getCoachingInsights:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/goals
   * Get mentee goals, milestones, and achievements
   */
  getMenteeGoals = asyncHandler(async (req, res) => {
    try {
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
      console.log(`[CollaborationController] getMenteeGoals: mentorId=${mentorId}, menteeId=${menteeId}`);
    const goals = await mentorDashboardService.getMenteeGoals(mentorId, menteeId);

    res.status(200).json({
      ok: true,
      data: { goals },
    });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeGoals:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/jobs
   * Get mentee's job opportunities for task assignment
   */
  getMenteeJobs = asyncHandler(async (req, res) => {
    try {
      const mentorId = req.session.userId;
      const { id: menteeId } = req.params;
      const materials = await mentorDashboardService.getMenteeMaterials(mentorId, menteeId, "jobs");

      res.status(200).json({
        ok: true,
        data: { jobs: materials.jobs || [] },
      });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeJobs:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/resumes
   * Get mentee's resumes for task assignment
   */
  getMenteeResumes = asyncHandler(async (req, res) => {
    try {
      const mentorId = req.session.userId;
      const { id: menteeId } = req.params;
      const materials = await mentorDashboardService.getMenteeMaterials(mentorId, menteeId, "resumes");

      res.status(200).json({
        ok: true,
        data: { resumes: materials.resumes || [] },
      });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeResumes:`, error);
      throw error;
    }
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/cover-letters
   * Get mentee's cover letters for task assignment
   */
  getMenteeCoverLetters = asyncHandler(async (req, res) => {
    try {
      const mentorId = req.session.userId;
      const { id: menteeId } = req.params;
      const materials = await mentorDashboardService.getMenteeMaterials(mentorId, menteeId, "cover_letters");

      res.status(200).json({
        ok: true,
        data: { coverLetters: materials.coverLetters || [] },
      });
    } catch (error) {
      console.error(`[CollaborationController] Error in getMenteeCoverLetters:`, error);
      throw error;
    }
  });

  // ============================================================================
  // UC-110: Document Review
  // ============================================================================

  /**
   * POST /api/collaboration/reviews
   * Request document review
   */
  requestReview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const requests = await documentReviewService.requestReview(userId, req.body);

    res.status(201).json({
      ok: true,
      data: { requests },
    });
  });

  /**
   * GET /api/collaboration/reviews
   * Get user's reviews
   */
  getUserReviews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { role } = req.query;
    const reviews = await documentReviewService.getUserReviews(userId, role);

    res.status(200).json({
      ok: true,
      data: { reviews },
    });
  });

  /**
   * GET /api/collaboration/reviews/:id
   * Get review with comments
   */
  getReview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const review = await documentReviewService.getReview(id, userId);

    res.status(200).json({
      ok: true,
      data: { review },
    });
  });

  /**
   * POST /api/collaboration/reviews/:id/comments
   * Add comment to review
   */
  addReviewComment = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const comment = await documentReviewService.addComment(userId, id, req.body);

    res.status(201).json({
      ok: true,
      data: { comment },
    });
  });

  /**
   * POST /api/collaboration/reviews/:id/complete
   * Complete review
   */
  completeReview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    await documentReviewService.completeReview(userId, id);

    res.status(200).json({
      ok: true,
      data: { message: "Review completed successfully" },
    });
  });

  // ============================================================================
  // UC-111: Progress Sharing
  // ============================================================================

  /**
   * POST /api/collaboration/progress/share
   * Configure progress sharing
   */
  configureSharing = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const share = await progressShareService.configureSharing(userId, req.body);

    res.status(200).json({
      ok: true,
      data: { share },
    });
  });

  /**
   * GET /api/collaboration/progress/report
   * Generate progress report
   */
  generateProgressReport = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { period, generateAI } = req.query;
    const report = await progressShareService.generateProgressReport(
      userId, 
      period || "week",
      generateAI === "true"
    );

    res.status(200).json({
      ok: true,
      data: { report },
    });
  });

  /**
   * POST /api/collaboration/progress/report/save
   * Save progress report to database
   */
  saveProgressReport = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { reportData, sharedWithMentorIds = [] } = req.body;
    const saved = await progressShareService.saveProgressReport(userId, reportData, sharedWithMentorIds);

    res.status(201).json({
      ok: true,
      data: { report: saved },
    });
  });

  /**
   * POST /api/collaboration/progress/report/:reportId/share
   * Share progress report with mentor
   */
  shareReportWithMentor = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { reportId } = req.params;
    const { mentorId } = req.body;
    const result = await progressShareService.shareReportWithMentor(reportId, userId, mentorId);

    res.status(200).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/collaboration/progress/reports
   * Get user's saved progress reports
   */
  getUserProgressReports = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const reports = await progressShareService.getUserProgressReports(userId);

    res.status(200).json({
      ok: true,
      data: { reports },
    });
  });

  /**
   * GET /api/collaboration/progress/reports/mentee
   * Get progress reports from mentees (for mentors)
   */
  getMenteeProgressReports = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const reports = await progressShareService.getMenteeProgressReports(mentorId);

    res.status(200).json({
      ok: true,
      data: { reports },
    });
  });

  /**
   * POST /api/collaboration/progress/report/:reportId/comment
   * Add comment to progress report
   */
  addReportComment = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { reportId } = req.params;
    const { commentText } = req.body;
    const comment = await progressShareService.addReportComment(reportId, userId, commentText);

    res.status(201).json({
      ok: true,
      data: { comment },
    });
  });

  /**
   * GET /api/collaboration/progress/report/:reportId/comments
   * Get comments for a progress report
   */
  getReportComments = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { reportId } = req.params;
    const comments = await progressShareService.getReportComments(reportId, userId);

    res.status(200).json({
      ok: true,
      data: { comments },
    });
  });

  /**
   * GET /api/collaboration/progress/shared/:userId
   * Get shared progress
   */
  getSharedProgress = asyncHandler(async (req, res) => {
    const viewerId = req.session.userId;
    const { userId } = req.params;
    const progress = await progressShareService.getSharedProgress(viewerId, userId);

    res.status(200).json({
      ok: true,
      data: { progress },
    });
  });

  /**
   * POST /api/collaboration/milestones
   * Create milestone
   */
  createMilestone = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId, ...milestoneData } = req.body;
    const milestone = await progressShareService.createMilestone(userId, milestoneData, teamId);

    res.status(201).json({
      ok: true,
      data: { milestone },
    });
  });

  /**
   * GET /api/collaboration/milestones/predefined
   * Get predefined milestone types
   */
  getPredefinedMilestones = asyncHandler(async (req, res) => {
    const milestones = progressShareService.getPredefinedMilestones();

    res.status(200).json({
      ok: true,
      data: { milestones },
    });
  });

  /**
   * POST /api/collaboration/milestones/:milestoneId/reactions
   * Add reaction or comment to milestone
   */
  addMilestoneReaction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { milestoneId } = req.params;
    const { reactionType, commentText } = req.body;

    const result = await progressShareService.addMilestoneReaction(
      milestoneId,
      userId,
      reactionType,
      commentText
    );

    res.status(200).json({
      ok: true,
      data: result,
    });
  });

  // ============================================================================
  // Team Dashboard (UC-108)
  // ============================================================================

  /**
   * GET /api/collaboration/teams/:teamId/dashboard
   * Get team dashboard with aggregate statistics
   */
  getTeamDashboard = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId } = req.params;
    const dashboard = await teamDashboardService.getTeamDashboard(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { dashboard },
    });
  });

  /**
   * GET /api/collaboration/teams/:teamId/performance
   * Get team performance comparison (anonymized benchmarking)
   */
  getTeamPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId } = req.params;
    const performance = await teamDashboardService.getTeamPerformanceComparison(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { performance },
    });
  });

  // ============================================================================
  // Job Sharing
  // ============================================================================

  /**
   * POST /api/collaboration/jobs/:id/share
   * Share job with team
   */
  shareJob = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: jobId } = req.params;
    const { teamId } = req.body;
    const share = await jobShareService.shareJobWithTeam(userId, jobId, teamId);

    res.status(201).json({
      ok: true,
      data: { share },
    });
  });

  /**
   * GET /api/collaboration/teams/:teamId/jobs
   * Get shared jobs for team
   */
  getSharedJobs = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId } = req.params;
    const jobs = await jobShareService.getSharedJobs(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { jobs },
    });
  });

  /**
   * POST /api/collaboration/jobs/:id/comments
   * Add comment to shared job
   */
  addJobComment = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: jobId } = req.params;
    const { teamId, ...commentData } = req.body;
    const comment = await jobShareService.addJobComment(userId, jobId, teamId, commentData);

    res.status(201).json({
      ok: true,
      data: { comment },
    });
  });

  /**
   * GET /api/collaboration/jobs/:id/comments
   * Get comments for shared job
   */
  getJobComments = asyncHandler(async (req, res) => {
    const { id: jobId } = req.params;
    const { teamId } = req.query;
    const comments = await jobShareService.getJobComments(jobId, teamId);

    res.status(200).json({
      ok: true,
      data: { comments },
    });
  });

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * POST /api/collaboration/tasks
   * Assign task to user
   */
  assignTask = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { assignedTo, teamId, ...taskData } = req.body;
    const task = await taskService.assignTask(userId, assignedTo, teamId, taskData);

    res.status(201).json({
      ok: true,
      data: { task },
    });
  });

  /**
   * GET /api/collaboration/tasks
   * Get user's tasks
   */
  getUserTasks = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId, status } = req.query;
    const tasks = await taskService.getUserTasks(userId, teamId, status);

    res.status(200).json({
      ok: true,
      data: { tasks },
    });
  });

  /**
   * GET /api/collaboration/tasks/mentee/:menteeId
   * Get tasks for a specific mentee (for mentors)
   */
  getMenteeTasks = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { menteeId } = req.params;
    const { teamId } = req.query;
    const tasks = await taskService.getTasksForUser(userId, menteeId, teamId);

    res.status(200).json({
      ok: true,
      data: { tasks },
    });
  });

  /**
   * PUT /api/collaboration/tasks/:id/status
   * Update task status
   */
  updateTaskStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { status } = req.body;
    await taskService.updateTaskStatus(id, userId, status);

    res.status(200).json({
      ok: true,
      data: { message: "Task status updated" },
    });
  });

  // ============================================================================
  // Activity Feed
  // ============================================================================

  /**
   * GET /api/collaboration/teams/:teamId/activity
   * Get team activity feed
   */
  getActivityFeed = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is team member
    const member = await database.query(
      `SELECT id FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND active = true`,
      [teamId, userId]
    );

    if (member.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: { message: "You are not a member of this team" },
      });
    }

    const result = await database.query(
      `SELECT al.*, u.email as actor_email
       FROM activity_logs al
       JOIN users u ON al.user_id = u.u_id
       WHERE al.team_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [teamId, parseInt(limit), parseInt(offset)]
    );

    res.status(200).json({
      ok: true,
      data: { activities: result.rows },
    });
  });

  // ============================================================================
  // Document Sharing with Teams
  // ============================================================================

  /**
   * POST /api/collaboration/documents/share
   * Share document with team
   */
  shareDocument = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const share = await documentShareService.shareDocumentWithTeam(userId, req.body);

    res.status(201).json({
      ok: true,
      data: { share },
    });
  });

  /**
   * GET /api/collaboration/teams/:teamId/documents
   * Get shared documents for team
   */
  getSharedDocuments = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamId } = req.params;
    const documents = await documentShareService.getSharedDocuments(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { documents },
    });
  });

  /**
   * POST /api/collaboration/documents/comments
   * Add comment to shared document
   */
  addDocumentComment = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const comment = await documentShareService.addDocumentComment(userId, req.body);

    res.status(201).json({
      ok: true,
      data: { comment },
    });
  });

  /**
   * GET /api/collaboration/documents/:documentType/:documentId/comments
   * Get comments for shared document
   */
  getDocumentComments = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { documentType, documentId } = req.params;
    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({
        ok: false,
        error: { message: "teamId is required" },
      });
    }

    const comments = await documentShareService.getDocumentComments(
      documentType,
      documentId,
      teamId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: { comments },
    });
  });

  /**
   * GET /api/collaboration/documents/:documentType/:documentId
   * Get document details for viewing
   */
  getDocumentDetails = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { documentType, documentId } = req.params;
    const document = await documentShareService.getDocumentDetails(
      documentType,
      documentId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: { document },
    });
  });
}

export default new CollaborationController();

