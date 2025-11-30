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

  /**
   * GET /api/collaboration/mentor/mentees
   * Get mentor's mentees
   */
  getMentees = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
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
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
    const progress = await mentorDashboardService.getMenteeProgress(mentorId, menteeId);

    res.status(200).json({
      ok: true,
      data: { progress },
    });
  });

  /**
   * GET /api/collaboration/mentor/mentees/:id/materials
   * Get mentee materials
   */
  getMenteeMaterials = asyncHandler(async (req, res) => {
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
    const { type } = req.query;
    const materials = await mentorDashboardService.getMenteeMaterials(mentorId, menteeId, type);

    res.status(200).json({
      ok: true,
      data: { materials },
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
    const mentorId = req.session.userId;
    const { id: menteeId } = req.params;
    const insights = await mentorDashboardService.getCoachingInsights(mentorId, menteeId);

    res.status(200).json({
      ok: true,
      data: { insights },
    });
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
    const { period } = req.query;
    const report = await progressShareService.generateProgressReport(userId, period || "week");

    res.status(200).json({
      ok: true,
      data: { report },
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

