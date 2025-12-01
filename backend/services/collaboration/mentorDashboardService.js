import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService, chatService } from "./index.js";

/**
 * Service for Mentor Dashboard and Coaching Tools (UC-109)
 */
class MentorDashboardService {
  /**
   * Normalize existing relationships to ensure they're visible
   * This helps with relationships created before the team invitation flow
   * Only updates relationships that don't have active explicitly set to false
   */
  async normalizeRelationships(mentorId) {
    try {
      // Default permissions to allow viewing all materials
      const defaultPermissions = JSON.stringify({
        can_view_resumes: true,
        can_view_cover_letters: true,
        can_view_applications: true,
        can_provide_feedback: true,
        can_assign_tasks: true,
      });

      // Update relationships where active is NULL (default should be true)
      // Don't update if active is explicitly false (those are intentionally inactive)
      // Also set accepted_at and invitation_status if they're NULL
      // Set default permissions if permissions_granted is NULL
      await database.query(
        `UPDATE mentor_relationships 
         SET active = COALESCE(active, true),
             invitation_status = COALESCE(invitation_status, 'accepted'),
             accepted_at = COALESCE(accepted_at, created_at, CURRENT_TIMESTAMP),
             permissions_granted = COALESCE(permissions_granted, $2::jsonb)
         WHERE mentor_id = $1 
           AND active IS NULL
           AND (invitation_status IS NULL OR LOWER(invitation_status) != 'declined')`,
        [mentorId, defaultPermissions]
      );
    } catch (error) {
      console.error("[MentorDashboardService] Error normalizing relationships:", error);
      // Don't throw - this is a helper function
    }
  }

  /**
   * Sync mentor-mentee relationships based on team membership
   * This ensures relationships are created even if they weren't created when someone joined
   */
  async syncTeamRelationships(mentorId) {
    try {
      console.log(`[MentorDashboardService] syncTeamRelationships called for mentorId: ${mentorId}`);
      
      // Get all teams this mentor is part of
      const teams = await database.query(
        `SELECT tm.team_id, tm.role 
         FROM team_members tm
         WHERE tm.user_id = $1 AND tm.active = true
           AND tm.role IN ('mentor', 'career_coach')`,
        [mentorId]
      );

      console.log(`[MentorDashboardService] Found ${teams.rows.length} teams for mentor ${mentorId}`);
      teams.rows.forEach((team, idx) => {
        console.log(`[MentorDashboardService] Team ${idx + 1}: team_id=${team.team_id}, role=${team.role}`);
      });

      if (teams.rows.length === 0) {
        console.log(`[MentorDashboardService] No teams found for mentor ${mentorId}. Mentor may not be part of any teams yet.`);
        return;
      }

      for (const team of teams.rows) {
        // NEW LOGIC: Get ALL team members (except the mentor themselves) - everyone is a mentee
        const teamMembers = await database.query(
          `SELECT user_id FROM team_members 
           WHERE team_id = $1 AND active = true AND user_id != $2`,
          [team.team_id, mentorId]
        );

        console.log(`[MentorDashboardService] Found ${teamMembers.rows.length} team members in team ${team.team_id} (all will be mentees)`);
        teamMembers.rows.forEach((member, idx) => {
          console.log(`[MentorDashboardService] Team member ${idx + 1}: user_id=${member.user_id}`);
        });

        // Create relationships with ALL team members
        let relationshipsCreated = 0;
        let relationshipsSkipped = 0;
        let relationshipsErrors = 0;

        for (const member of teamMembers.rows) {
          try {
            // Check if relationship already exists
            const existing = await database.query(
              `SELECT id FROM mentor_relationships 
               WHERE mentor_id = $1 AND mentee_id = $2`,
              [mentorId, member.user_id]
            );

            if (existing.rows.length === 0) {
              const relationshipId = uuidv4();
              const relationshipType = team.role === 'career_coach' ? 'career_coaching' : 'general';
              const insertResult = await database.query(
                `INSERT INTO mentor_relationships 
                 (id, mentor_id, mentee_id, relationship_type, invitation_status, active, accepted_at)
                 VALUES ($1, $2, $3, $4, 'accepted', true, CURRENT_TIMESTAMP)
                 RETURNING id`,
                [relationshipId, mentorId, member.user_id, relationshipType]
              );
              relationshipsCreated++;
              console.log(`[MentorDashboardService] ✅ Created relationship ${insertResult.rows[0].id}: mentor ${mentorId} -> mentee ${member.user_id} from team ${team.team_id}`);
            } else {
              // Reactivate if inactive
              const existingRel = existing.rows[0];
              const relCheck = await database.query(
                `SELECT active FROM mentor_relationships WHERE id = $1`,
                [existingRel.id]
              );
              if (relCheck.rows.length > 0 && !relCheck.rows[0].active) {
                await database.query(
                  `UPDATE mentor_relationships 
                   SET active = true, invitation_status = 'accepted', accepted_at = CURRENT_TIMESTAMP
                   WHERE id = $1`,
                  [existingRel.id]
                );
                console.log(`[MentorDashboardService] ✅ Reactivated relationship ${existingRel.id} for mentee ${member.user_id}`);
                relationshipsCreated++;
              } else {
                relationshipsSkipped++;
                console.log(`[MentorDashboardService] ⏭️  Relationship already exists: mentor ${mentorId} -> mentee ${member.user_id} (id: ${existing.rows[0].id})`);
              }
            }
          } catch (relError) {
            relationshipsErrors++;
            console.error(`[MentorDashboardService] ❌ Error creating relationship for team member ${member.user_id}:`, relError);
            console.error(`[MentorDashboardService] Error details:`, {
              mentorId,
              menteeId: member.user_id,
              teamId: team.team_id,
              error: relError.message
            });
            // Continue with other members even if one fails
          }
        }

        console.log(`[MentorDashboardService] Relationship sync summary for team ${team.team_id}: ${relationshipsCreated} created/reactivated, ${relationshipsSkipped} skipped, ${relationshipsErrors} errors`);
        
        if (relationshipsErrors > 0) {
          console.error(`[MentorDashboardService] ⚠️  WARNING: ${relationshipsErrors} relationship creation errors occurred during sync`);
        }
      }
    } catch (error) {
      console.error("[MentorDashboardService] Error syncing team relationships:", error);
      // Don't throw - this is a helper function
    }
  }

  /**
   * Get mentor's mentees
   * NEW LOGIC: If a member is a mentor, ALL other team members are their mentees
   */
  async getMentees(mentorId) {
    try {
      console.log(`[MentorDashboardService] getMentees called with mentorId: ${mentorId}`);
      
      // Sync relationships based on team membership first
      await this.syncTeamRelationships(mentorId);
      
      // Normalize existing relationships
      await this.normalizeRelationships(mentorId);

      // NEW APPROACH: Get all team members from teams where this user is a mentor
      // ALL team members (except the mentor themselves) are mentees
      const teamMembersResult = await database.query(
        `SELECT DISTINCT
          tm.user_id as mentee_id,
          tm.role as mentee_role,
          tm.team_id,
          tm.joined_at,
          u.email,
          u.role as user_role,
          p.first_name,
          p.last_name,
          mr.id as relationship_id,
          mr.relationship_type,
          mr.permissions_granted,
          mr.accepted_at,
          mr.active,
          mr.invitation_status,
          CASE WHEN mr.accepted_at IS NOT NULL THEN 0 ELSE 1 END as sort_priority
         FROM team_members tm
         JOIN users u ON tm.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         LEFT JOIN mentor_relationships mr ON mr.mentor_id = $1 AND mr.mentee_id = tm.user_id AND (mr.active IS NULL OR mr.active = true)
         WHERE tm.team_id IN (
           SELECT team_id FROM team_members 
           WHERE user_id = $1 AND role IN ('mentor', 'career_coach') AND active = true
         )
         AND tm.active = true
         AND tm.user_id != $1
         ORDER BY 
           sort_priority,
           mr.accepted_at DESC NULLS LAST,
           tm.joined_at DESC`,
        [mentorId]
      );

      console.log(`[MentorDashboardService] Found ${teamMembersResult.rows.length} team members that should be mentees`);

      // Create relationships for any team members that don't have one
      let relationshipsCreated = 0;
      let relationshipsReactivated = 0;
      let errorCount = 0;

      for (const member of teamMembersResult.rows) {
        try {
          if (!member.relationship_id) {
            // No relationship exists - create one
            const relationshipId = uuidv4();
            const relationshipType = 'general'; // Default type
            
            // Check if there's an inactive relationship first
            const existingInactive = await database.query(
              `SELECT id FROM mentor_relationships 
               WHERE mentor_id = $1 AND mentee_id = $2`,
              [mentorId, member.mentee_id]
            );

            if (existingInactive.rows.length > 0) {
              // Reactivate existing relationship and set default permissions if missing
              const defaultPermissions = JSON.stringify({
                can_view_resumes: true,
                can_view_cover_letters: true,
                can_view_applications: true,
                can_provide_feedback: true,
                can_assign_tasks: true,
              });
              await database.query(
                `UPDATE mentor_relationships 
                 SET active = true, 
                     invitation_status = 'accepted',
                     accepted_at = CURRENT_TIMESTAMP,
                     permissions_granted = COALESCE(permissions_granted, $2::jsonb)
                 WHERE id = $1`,
                [existingInactive.rows[0].id, defaultPermissions]
              );
              relationshipsReactivated++;
              console.log(`[MentorDashboardService] ✅ Reactivated relationship for mentee ${member.email}`);
            } else {
              // Create new relationship with default permissions
              const defaultPermissions = JSON.stringify({
                can_view_resumes: true,
                can_view_cover_letters: true,
                can_view_applications: true,
                can_provide_feedback: true,
                can_assign_tasks: true,
              });
              await database.query(
                `INSERT INTO mentor_relationships 
                 (id, mentor_id, mentee_id, relationship_type, permissions_granted, invitation_status, active, accepted_at)
                 VALUES ($1, $2, $3, $4, $5, 'accepted', true, CURRENT_TIMESTAMP)`,
                [relationshipId, mentorId, member.mentee_id, relationshipType, defaultPermissions]
              );
              relationshipsCreated++;
              console.log(`[MentorDashboardService] ✅ Created relationship for mentee ${member.email}`);
            }
          }
        } catch (err) {
          errorCount++;
          console.error(`[MentorDashboardService] ❌ Error creating relationship for ${member.email}:`, err);
        }
      }

      if (relationshipsCreated > 0 || relationshipsReactivated > 0) {
        console.log(`[MentorDashboardService] Created ${relationshipsCreated} new relationships, reactivated ${relationshipsReactivated} relationships, ${errorCount} errors`);
        
        // Re-query to get updated relationships
        const updatedResult = await database.query(
          `SELECT DISTINCT
            COALESCE(mr.id, gen_random_uuid()) as relationship_id,
            tm.user_id as mentee_id,
            tm.joined_at,
            u.email,
            u.role as user_role,
            tm.role as mentee_role,
            COALESCE(mr.relationship_type, 'general') as relationship_type,
            mr.permissions_granted,
            mr.accepted_at,
            COALESCE(mr.active, true) as active,
            COALESCE(mr.invitation_status, 'accepted') as invitation_status,
            p.first_name,
            p.last_name,
            CASE WHEN mr.accepted_at IS NOT NULL THEN 0 ELSE 1 END as sort_priority
           FROM team_members tm
           JOIN users u ON tm.user_id = u.u_id
           LEFT JOIN profiles p ON u.u_id = p.user_id
           LEFT JOIN mentor_relationships mr ON mr.mentor_id = $1 AND mr.mentee_id = tm.user_id AND (mr.active IS NULL OR mr.active = true)
           WHERE tm.team_id IN (
             SELECT team_id FROM team_members 
             WHERE user_id = $1 AND role IN ('mentor', 'career_coach') AND active = true
           )
           AND tm.active = true
           AND tm.user_id != $1
           ORDER BY 
             sort_priority,
             mr.accepted_at DESC NULLS LAST,
             tm.joined_at DESC`,
          [mentorId]
        );
        
        return updatedResult.rows.map(row => ({
          relationshipId: row.relationship_id,
          menteeId: row.mentee_id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          linkedinUrl: null,
          githubUrl: null,
          relationshipType: row.relationship_type,
          permissions: typeof row.permissions_granted === "string" 
            ? JSON.parse(row.permissions_granted) 
            : row.permissions_granted || {},
          acceptedAt: row.accepted_at
        }));
      }

      // Return team members as mentees (with or without relationships)
      return teamMembersResult.rows.map(row => ({
        relationshipId: row.relationship_id,
        menteeId: row.mentee_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        linkedinUrl: null,
        githubUrl: null,
        relationshipType: row.relationship_type || 'general',
        permissions: typeof row.permissions_granted === "string" 
          ? JSON.parse(row.permissions_granted) 
          : row.permissions_granted || {},
        acceptedAt: row.accepted_at
      }));
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentees:", error);
      throw error;
    }
  }

  /**
   * Get mentee progress summary
   */
  async getMenteeProgress(mentorId, menteeId) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id, tm1.role as mentor_role, tm2.role as mentee_role
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      // Get job search statistics
      // Handle NULL archived values (treat NULL as false for backward compatibility)
      const jobStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Interested') as interested_count,
          COUNT(*) FILTER (WHERE status = 'Applied') as applied_count,
          COUNT(*) FILTER (WHERE status = 'Phone Screen') as phone_screen_count,
          COUNT(*) FILTER (WHERE status = 'Interview') as interview_count,
          COUNT(*) FILTER (WHERE status = 'Offer') as offer_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          COUNT(*) as total_jobs,
          MAX(created_at) as last_activity,
          MAX(status_updated_at) as last_status_update
         FROM job_opportunities
         WHERE user_id = $1 AND (archived = false OR archived IS NULL)`,
        [menteeId]
      );

      // Get interview prep progress
      const interviewPrep = await database.query(
        `SELECT 
          COUNT(DISTINCT i.id) as total_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'scheduled') as scheduled_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'cancelled') as cancelled_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.outcome = 'passed') as passed_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.outcome = 'offer_extended') as offers_received
         FROM interviews i
         WHERE i.user_id = $1`,
        [menteeId]
      );

      // Get upcoming interviews and dates
      const upcomingInterviews = await database.query(
        `SELECT 
          i.id,
          i.title,
          i.type,
          i.scheduled_at,
          i.date,
          i.duration,
          i.location,
          i.video_link,
          i.interviewer_name,
          i.interviewer_email,
          i.status,
          i.job_opportunity_id,
          jo.title as job_title,
          jo.company as job_company,
          jo.status as job_status
         FROM interviews i
         LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
         WHERE i.user_id = $1 
           AND i.status = 'scheduled'
           AND (i.scheduled_at >= CURRENT_TIMESTAMP OR i.date >= CURRENT_DATE)
         ORDER BY COALESCE(i.scheduled_at, i.date) ASC
         LIMIT 10`,
        [menteeId]
      );

      // Get technical interview progress by job
      const technicalProgress = await database.query(
        `SELECT 
          tpc.job_id,
          jo.title as job_title,
          jo.company as job_company,
          COUNT(DISTINCT tpc.id) as total_challenges,
          COUNT(DISTINCT tpa.id) as completed_attempts,
          AVG(tpa.performance_score) as avg_score,
          MAX(tpa.completed_at) as last_attempt_date,
          COUNT(DISTINCT tpc.challenge_type) as challenge_types_count
         FROM technical_prep_challenges tpc
         LEFT JOIN technical_prep_attempts tpa ON tpc.id = tpa.challenge_id AND tpa.user_id = $1
         LEFT JOIN job_opportunities jo ON tpc.job_id = jo.id
         WHERE tpc.user_id = $1 AND tpc.job_id IS NOT NULL
         GROUP BY tpc.job_id, jo.title, jo.company
         ORDER BY last_attempt_date DESC NULLS LAST`,
        [menteeId]
      );

      // Get behavioral/mock interview progress by job
      const behavioralProgress = await database.query(
        `SELECT 
          mis.job_id,
          jo.title as job_title,
          jo.company as job_company,
          COUNT(DISTINCT mis.id) as total_sessions,
          COUNT(DISTINCT mis.id) FILTER (WHERE mis.status = 'completed') as completed_sessions,
          AVG(mis.confidence_score) as avg_confidence_score,
          MAX(mis.completed_at) as last_session_date,
          COUNT(DISTINCT mis.interview_format) as interview_formats_count
         FROM mock_interview_sessions mis
         LEFT JOIN job_opportunities jo ON mis.job_id = jo.id
         WHERE mis.user_id = $1 AND mis.job_id IS NOT NULL
         GROUP BY mis.job_id, jo.title, jo.company
         ORDER BY last_session_date DESC NULLS LAST`,
        [menteeId]
      );

      // Get task completion
      const tasks = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'completed' AND status != 'cancelled') as overdue_tasks
         FROM preparation_tasks
         WHERE assigned_to = $1`,
        [menteeId]
      );

      // Get recent activity (include both user-specific and team activities)
      const recentActivity = await database.query(
        `SELECT 
          al.activity_type, 
          al.activity_data, 
          al.created_at,
          al.actor_role,
          t.team_name
         FROM activity_logs al
         LEFT JOIN teams t ON al.team_id = t.id
         WHERE al.user_id = $1
         ORDER BY al.created_at DESC
         LIMIT 10`,
        [menteeId]
      );

      // Get engagement score (based on recent activity - more comprehensive)
      const engagementScore = await database.query(
        `SELECT 
          COUNT(*) as activity_count,
          COUNT(DISTINCT DATE(created_at)) as active_days
         FROM activity_logs
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [menteeId]
      );

      // Calculate engagement score: activity_count * 2 + active_days * 5 (max 100)
      const activityCount = parseInt(engagementScore.rows[0]?.activity_count || 0, 10);
      const activeDays = parseInt(engagementScore.rows[0]?.active_days || 0, 10);
      const calculatedEngagement = Math.min(100, (activityCount * 2) + (activeDays * 5));

      // Ensure all counts are integers and handle NULL values
      const jobSearchData = jobStats.rows[0] || {};
      const interviewPrepData = interviewPrep.rows[0] || {};
      const tasksData = tasks.rows[0] || {};

      const result = {
        jobSearch: {
          interested_count: parseInt(jobSearchData.interested_count || 0, 10),
          applied_count: parseInt(jobSearchData.applied_count || 0, 10),
          phone_screen_count: parseInt(jobSearchData.phone_screen_count || 0, 10),
          interview_count: parseInt(jobSearchData.interview_count || 0, 10),
          offer_count: parseInt(jobSearchData.offer_count || 0, 10),
          rejected_count: parseInt(jobSearchData.rejected_count || 0, 10),
          total_jobs: parseInt(jobSearchData.total_jobs || 0, 10),
          last_activity: jobSearchData.last_activity,
          last_status_update: jobSearchData.last_status_update
        },
        interviewPrep: {
          total_interviews: parseInt(interviewPrepData.total_interviews || 0, 10),
          scheduled_interviews: parseInt(interviewPrepData.scheduled_interviews || 0, 10),
          completed_interviews: parseInt(interviewPrepData.completed_interviews || 0, 10),
          cancelled_interviews: parseInt(interviewPrepData.cancelled_interviews || 0, 10),
          passed_interviews: parseInt(interviewPrepData.passed_interviews || 0, 10),
          offers_received: parseInt(interviewPrepData.offers_received || 0, 10)
        },
        upcomingInterviews: upcomingInterviews.rows.map(row => ({
          id: row.id,
          title: row.title,
          type: row.type,
          scheduledAt: row.scheduled_at || row.date,
          duration: row.duration,
          location: row.location,
          videoLink: row.video_link,
          interviewerName: row.interviewer_name,
          interviewerEmail: row.interviewer_email,
          status: row.status,
          jobId: row.job_opportunity_id,
          jobTitle: row.job_title,
          jobCompany: row.job_company,
          jobStatus: row.job_status
        })),
        technicalProgress: technicalProgress.rows.map(row => ({
          jobId: row.job_id,
          jobTitle: row.job_title,
          jobCompany: row.job_company,
          totalChallenges: parseInt(row.total_challenges || 0, 10),
          completedAttempts: parseInt(row.completed_attempts || 0, 10),
          avgScore: row.avg_score ? Math.round(parseFloat(row.avg_score)) : null,
          lastAttemptDate: row.last_attempt_date,
          challengeTypesCount: parseInt(row.challenge_types_count || 0, 10)
        })),
        behavioralProgress: behavioralProgress.rows.map(row => ({
          jobId: row.job_id,
          jobTitle: row.job_title,
          jobCompany: row.job_company,
          totalSessions: parseInt(row.total_sessions || 0, 10),
          completedSessions: parseInt(row.completed_sessions || 0, 10),
          avgConfidenceScore: row.avg_confidence_score ? Math.round(parseFloat(row.avg_confidence_score)) : null,
          lastSessionDate: row.last_session_date,
          interviewFormatsCount: parseInt(row.interview_formats_count || 0, 10)
        })),
        tasks: {
          pending_tasks: parseInt(tasksData.pending_tasks || 0, 10),
          in_progress_tasks: parseInt(tasksData.in_progress_tasks || 0, 10),
          completed_tasks: parseInt(tasksData.completed_tasks || 0, 10),
          cancelled_tasks: parseInt(tasksData.cancelled_tasks || 0, 10),
          total_tasks: parseInt(tasksData.total_tasks || 0, 10),
          overdue_tasks: parseInt(tasksData.overdue_tasks || 0, 10)
        },
        recentActivity: recentActivity.rows || [],
        engagementScore: calculatedEngagement
      };

      // Debug logging (can be removed in production)
      console.log(`[MentorDashboardService] Progress data for mentee ${menteeId}:`, {
        jobSearch: result.jobSearch,
        interviewPrep: result.interviewPrep,
        tasks: result.tasks,
        engagementScore: result.engagementScore,
        activityCount: recentActivity.rows.length
      });

      return result;
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee progress:", error);
      console.error("[MentorDashboardService] Error stack:", error.stack);
      console.error("[MentorDashboardService] Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });
      throw error;
    }
  }

  /**
   * Get mentee job search materials
   * Simple check: verify user is a mentor and mentee is in the same team
   */
  async getMenteeMaterials(mentorId, menteeId, materialType = "all") {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id, tm1.role as mentor_role, tm2.role as mentee_role
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      const materials = {};

      // Get resumes
      if (materialType === "all" || materialType === "resumes") {
          const resumes = await database.query(
            `SELECT 
              id, 
              name, 
              version_name,
              description,
              created_at, 
              updated_at, 
              is_master,
              version_number,
              job_id,
              file
             FROM resume
             WHERE user_id = $1
           ORDER BY is_master DESC, updated_at DESC`,
            [menteeId]
          );
          materials.resumes = resumes.rows;
      }

      // Get cover letters
      if (materialType === "all" || materialType === "cover_letters") {
          const coverLetters = await database.query(
            `SELECT 
              id, 
              job_id, 
              version_name as title, 
              description,
              created_at, 
              updated_at,
              version_number,
              is_master,
              file
             FROM coverletter
             WHERE user_id = $1
             ORDER BY updated_at DESC`,
            [menteeId]
          );
          materials.coverLetters = coverLetters.rows;
      }

      // Get job applications
      if (materialType === "all" || materialType === "jobs") {
          const jobs = await database.query(
            `SELECT 
              id, 
              title, 
              company, 
              location,
              status, 
              industry,
              job_type,
              salary_min,
              salary_max,
              job_description,
              job_posting_url,
              application_deadline,
              created_at, 
              status_updated_at
             FROM job_opportunities
             WHERE user_id = $1 AND (archived = false OR archived IS NULL)
             ORDER BY status_updated_at DESC`,
            [menteeId]
          );
          materials.jobs = jobs.rows;
      }

      return materials;
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee materials:", error);
      throw error;
    }
  }

  /**
   * Get detailed resume content for mentor review
   */
  async getMenteeResumeDetail(mentorId, menteeId, resumeId) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      // Get full resume details
      const resume = await database.query(
        `SELECT 
          id, 
          name, 
          version_name,
          description,
          created_at, 
          updated_at, 
          is_master,
          version_number,
          job_id,
          file,
          content,
          section_config,
          customizations,
          template_id
         FROM resume
         WHERE id = $1 AND user_id = $2`,
        [resumeId, menteeId]
      );

      if (resume.rows.length === 0) {
        throw new Error("Resume not found");
      }

      return resume.rows[0];
    } catch (error) {
      console.error("[MentorDashboardService] Error getting resume detail:", error);
      throw error;
    }
  }

  /**
   * Get detailed cover letter content for mentor review
   */
  async getMenteeCoverLetterDetail(mentorId, menteeId, coverLetterId) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      // Get full cover letter details
      const coverLetter = await database.query(
        `SELECT 
          id, 
          version_name as title,
          description,
          job_id,
          created_at, 
          updated_at,
          version_number,
          is_master,
          file,
          content,
          tone_settings,
          customizations,
          company_research,
          performance_metrics,
          template_id
         FROM coverletter
         WHERE id = $1 AND user_id = $2`,
        [coverLetterId, menteeId]
      );

      if (coverLetter.rows.length === 0) {
        throw new Error("Cover letter not found");
      }

      return coverLetter.rows[0];
    } catch (error) {
      console.error("[MentorDashboardService] Error getting cover letter detail:", error);
      throw error;
    }
  }

  /**
   * Get detailed job posting content for mentor review
   */
  async getMenteeJobDetail(mentorId, menteeId, jobId) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      // Get full job details
      const job = await database.query(
        `SELECT 
          id, 
          title, 
          company, 
          location,
          status, 
          industry,
          job_type,
          salary_min,
          salary_max,
          job_description,
          job_posting_url,
          application_deadline,
          notes,
          recruiter_name,
          recruiter_email,
          recruiter_phone,
          hiring_manager_name,
          hiring_manager_email,
          hiring_manager_phone,
          interview_notes,
          salary_negotiation_notes,
          application_history,
          created_at, 
          status_updated_at
         FROM job_opportunities
         WHERE id = $1 AND user_id = $2 AND (archived = false OR archived IS NULL)`,
        [jobId, menteeId]
      );

      if (job.rows.length === 0) {
        throw new Error("Job opportunity not found");
      }

      return job.rows[0];
    } catch (error) {
      console.error("[MentorDashboardService] Error getting job detail:", error);
      throw error;
    }
  }

  /**
   * Provide feedback to mentee
   */
  async provideFeedback(mentorId, menteeId, feedbackData) {
    try {
      // Verify relationship
      const relationship = await database.query(
        `SELECT id FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2 
           AND (active = true OR active IS NULL)
           AND (LOWER(invitation_status) = 'accepted' OR accepted_at IS NOT NULL)`,
        [mentorId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      const { feedbackType, feedbackContent, recommendations, relatedItemType, relatedItemId } = feedbackData;

      const feedbackId = uuidv4();

      await database.query(
        `INSERT INTO mentor_feedback 
         (id, relationship_id, feedback_type, feedback_content, recommendations)
         VALUES ($1, $2, $3, $4, $5)`,
        [feedbackId, relationship.rows[0].id, feedbackType, feedbackContent, recommendations || null]
      );

      // Log activity
      await teamService.logActivity(
        null, // team_id if available
        mentorId,
        "mentor",
        "feedback_provided",
        {
          mentee_id: menteeId,
          feedback_type: feedbackType,
          related_item_type: relatedItemType,
          related_item_id: relatedItemId
        }
      );

      // Create or get mentor-mentee chat conversation
      try {
        await chatService.getOrCreateConversation(mentorId, {
          conversationType: "mentor_mentee",
          relatedEntityType: "mentor_relationship",
          relatedEntityId: relationship.rows[0].id,
          title: `Mentor Chat`,
          participantIds: [menteeId]
        });
      } catch (chatError) {
        console.error("[MentorDashboardService] Error creating mentor chat:", chatError);
        // Don't fail feedback if chat creation fails
      }

      return { id: feedbackId, ...feedbackData };
    } catch (error) {
      console.error("[MentorDashboardService] Error providing feedback:", error);
      throw error;
    }
  }

  /**
   * Get coaching insights for mentee
   */
  async getCoachingInsights(mentorId, menteeId) {
    try {
      // Get mentee progress
      const progress = await this.getMenteeProgress(mentorId, menteeId);

      // Generate insights based on data
      const insights = [];

      // Application rate insight
      if (progress.jobSearch.total_jobs > 0) {
        const applicationRate = (progress.jobSearch.applied_count / progress.jobSearch.total_jobs) * 100;
        if (applicationRate < 30) {
          insights.push({
            type: "application_rate",
            priority: "high",
            title: "Low Application Rate",
            message: `Only ${applicationRate.toFixed(0)}% of interested jobs have been applied to. Consider increasing application activity.`,
            recommendation: "Set a goal to apply to at least 3-5 jobs per week"
          });
        }
      }

      // Interview conversion insight
      if (progress.jobSearch.applied_count > 0) {
        const interviewRate = (progress.jobSearch.interview_count / progress.jobSearch.applied_count) * 100;
        if (interviewRate < 10) {
          insights.push({
            type: "interview_conversion",
            priority: "high",
            title: "Low Interview Conversion",
            message: `Only ${interviewRate.toFixed(0)}% of applications are leading to interviews. Review application materials.`,
            recommendation: "Consider getting resume and cover letters reviewed"
          });
        }
      }

      // Task completion insight
      if (progress.tasks.total_tasks > 0) {
        const completionRate = (progress.tasks.completed_tasks / progress.tasks.total_tasks) * 100;
        if (completionRate < 50) {
          insights.push({
            type: "task_completion",
            priority: "medium",
            title: "Task Completion Rate",
            message: `${completionRate.toFixed(0)}% of assigned tasks are completed.`,
            recommendation: "Focus on completing pending tasks to stay on track"
          });
        }
      }

      // Engagement insight
      if (progress.engagementScore < 30) {
        insights.push({
          type: "engagement",
          priority: "medium",
          title: "Low Engagement",
          message: "Activity has been low recently. Check in with mentee.",
          recommendation: "Schedule a check-in meeting"
        });
      }

      return {
        insights,
        progress,
        recommendations: insights.map(i => i.recommendation)
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting coaching insights:", error);
      throw error;
    }
  }

  /**
   * Get mentee goals, milestones, and achievements
   */
  async getMenteeGoals(mentorId, menteeId) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id, tm1.role as mentor_role, tm2.role as mentee_role
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      // Get milestones
      const milestones = await database.query(
        `SELECT 
          id,
          milestone_type,
          milestone_title,
          milestone_description,
          milestone_data,
          achieved_at,
          shared_with_team
         FROM milestones
         WHERE user_id = $1
         ORDER BY achieved_at DESC
         LIMIT 20`,
        [menteeId]
      );

      // Get recent achievements (milestones from last 30 days)
      const recentAchievements = await database.query(
        `SELECT 
          id,
          milestone_type,
          milestone_title,
          milestone_description,
          achieved_at
         FROM milestones
         WHERE user_id = $1 
           AND achieved_at >= NOW() - INTERVAL '30 days'
         ORDER BY achieved_at DESC`,
        [menteeId]
      );

      // Get goal progress (based on job search and task completion)
      const progress = await this.getMenteeProgress(mentorId, menteeId);
      
      // Calculate goal completion rates
      const goals = [
        {
          id: 'job_applications',
          title: 'Weekly Job Applications',
          target: 5,
          current: progress.jobSearch?.applied_count || 0,
          period: 'week',
          type: 'application'
        },
        {
          id: 'task_completion',
          title: 'Task Completion Rate',
          target: 80,
          current: progress.tasks?.total_tasks > 0 
            ? Math.round((progress.tasks.completed_tasks / progress.tasks.total_tasks) * 100)
            : 0,
          period: 'all',
          type: 'completion'
        },
        {
          id: 'interview_prep',
          title: 'Interview Preparation',
          target: 3,
          current: progress.interviewPrep?.scheduled_interviews || 0,
          period: 'month',
          type: 'interview'
        }
      ];

      return {
        goals,
        achievements: recentAchievements.rows.map(row => ({
          id: row.id,
          type: row.milestone_type,
          title: row.milestone_title,
          description: row.milestone_description,
          achievedAt: row.achieved_at
        })),
        milestones: milestones.rows.map(row => ({
          id: row.id,
          type: row.milestone_type,
          title: row.milestone_title,
          description: row.milestone_description,
          data: typeof row.milestone_data === 'string' 
            ? JSON.parse(row.milestone_data) 
            : row.milestone_data,
          achievedAt: row.achieved_at,
          sharedWithTeam: row.shared_with_team
        }))
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee goals:", error);
      throw error;
    }
  }

  /**
   * Accept a mentor relationship (for mentee)
   */
  async acceptMentorRelationship(menteeId, relationshipId) {
    try {
      // Verify the relationship belongs to this mentee
      const relationship = await database.query(
        `SELECT * FROM mentor_relationships 
         WHERE id = $1 AND mentee_id = $2`,
        [relationshipId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      // Update relationship status
      await database.query(
        `UPDATE mentor_relationships 
         SET invitation_status = 'accepted',
             accepted_at = CURRENT_TIMESTAMP,
             active = true
         WHERE id = $1`,
        [relationshipId]
      );

      return await this.getMentor(menteeId);
    } catch (error) {
      console.error("[MentorDashboardService] Error accepting mentor relationship:", error);
      throw error;
    }
  }

  /**
   * Get pending mentor relationships for a mentee
   */
  async getPendingMentorRelationships(menteeId) {
    try {
      const result = await database.query(
        `SELECT 
          mr.id as relationship_id,
          mr.mentor_id,
          u.email,
          p.first_name,
          p.last_name,
          mr.relationship_type,
          mr.invited_at
         FROM mentor_relationships mr
         JOIN users u ON mr.mentor_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE mr.mentee_id = $1 
           AND (mr.invitation_status IS NULL OR LOWER(mr.invitation_status) = 'pending')
           AND (mr.active IS NULL OR mr.active = true)
         ORDER BY mr.invited_at DESC`,
        [menteeId]
      );

      return result.rows.map(row => ({
        relationshipId: row.relationship_id,
        mentorId: row.mentor_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        relationshipType: row.relationship_type,
        invitedAt: row.invited_at
      }));
    } catch (error) {
      console.error("[MentorDashboardService] Error getting pending relationships:", error);
      throw error;
    }
  }

  /**
   * Invite a mentor (mentee invites mentor)
   */
  async inviteMentor(menteeId, invitationData) {
    try {
      const { mentorEmail, relationshipType = "general", permissions = {} } = invitationData;

      if (!mentorEmail) {
        throw new Error("Mentor email is required");
      }

      // Check if mentor user exists
      const mentorUser = await database.query(
        `SELECT u_id, email FROM users WHERE email = $1`,
        [mentorEmail.toLowerCase()]
      );

      if (mentorUser.rows.length === 0) {
        throw new Error("User with that email does not exist");
      }

      const mentorId = mentorUser.rows[0].u_id;

      // Check if relationship already exists
      const existing = await database.query(
        `SELECT id, invitation_status, active FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2`,
        [mentorId, menteeId]
      );

      if (existing.rows.length > 0) {
        const rel = existing.rows[0];
        if (rel.active && (rel.invitation_status === 'accepted' || rel.invitation_status === 'pending')) {
          throw new Error("A mentor relationship with this user already exists");
        }
        // If inactive, reactivate it
        await database.query(
          `UPDATE mentor_relationships 
           SET active = true, 
               invitation_status = 'pending',
               invited_at = CURRENT_TIMESTAMP,
               relationship_type = $1,
               permissions_granted = $2
           WHERE id = $3`,
          [relationshipType, JSON.stringify(permissions), rel.id]
        );
        return { id: rel.id, message: "Mentor invitation resent" };
      }

      // Create new relationship
      const relationshipId = uuidv4();
      await database.query(
        `INSERT INTO mentor_relationships 
         (id, mentor_id, mentee_id, relationship_type, permissions_granted, invitation_status, active, invited_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', true, CURRENT_TIMESTAMP)`,
        [relationshipId, mentorId, menteeId, relationshipType, JSON.stringify(permissions)]
      );

      // Get mentee info for email
      const menteeInfo = await database.query(
        `SELECT u.email, p.first_name, p.last_name 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [menteeId]
      );
      const mentee = menteeInfo.rows[0];
      const menteeName = mentee 
        ? `${mentee.first_name || ""} ${mentee.last_name || ""}`.trim() || null
        : null;

      // Send invitation email (optional - could be added later)
      // For now, we'll just log it
      console.log(`[MentorDashboardService] Mentor invitation sent: ${mentorEmail} invited by ${mentee.email}`);

      return {
        id: relationshipId,
        mentorId: mentorId,
        mentorEmail: mentorEmail,
        message: "Mentor invitation sent successfully"
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error inviting mentor:", error);
      throw error;
    }
  }

  /**
   * Decline or cancel a mentor invitation
   */
  async declineMentorInvitation(menteeId, relationshipId) {
    try {
      // Verify the relationship belongs to this mentee
      const relationship = await database.query(
        `SELECT * FROM mentor_relationships 
         WHERE id = $1 AND mentee_id = $2`,
        [relationshipId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      // Mark as declined/inactive
      await database.query(
        `UPDATE mentor_relationships 
         SET invitation_status = 'declined',
             active = false
         WHERE id = $1`,
        [relationshipId]
      );

      return { success: true, message: "Invitation declined" };
    } catch (error) {
      console.error("[MentorDashboardService] Error declining invitation:", error);
      throw error;
    }
  }

  // ============================================================================
  // Mentee Dashboard Methods
  // ============================================================================

  /**
   * Get mentee's mentor information
   */
  async getMentor(menteeId) {
    try {
      // Normalize relationships for this mentee first
      // Only update relationships where active is NULL (not explicitly false)
      await database.query(
        `UPDATE mentor_relationships 
         SET active = COALESCE(active, true),
             invitation_status = COALESCE(invitation_status, 'accepted'),
             accepted_at = COALESCE(accepted_at, created_at, CURRENT_TIMESTAMP)
         WHERE mentee_id = $1 
           AND active IS NULL
           AND (invitation_status IS NULL OR LOWER(invitation_status) != 'declined')`,
        [menteeId]
      );

      // Show the most recent active relationship, regardless of invitation_status
      // This ensures existing relationships are shown even if they don't have the proper status set
      const result = await database.query(
        `SELECT 
          mr.id as relationship_id,
          mr.mentor_id,
          u.email,
          u.role as user_role,
          mr.relationship_type,
          mr.permissions_granted,
          mr.accepted_at,
          mr.active,
          mr.invitation_status,
          p.first_name,
          p.last_name,
          p.bio
         FROM mentor_relationships mr
         JOIN users u ON mr.mentor_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE mr.mentee_id = $1 
           AND (mr.active IS NULL OR mr.active = true)
         ORDER BY 
           CASE WHEN LOWER(mr.invitation_status) = 'accepted' OR mr.accepted_at IS NOT NULL THEN 0 ELSE 1 END,
           mr.accepted_at DESC NULLS LAST,
           mr.created_at DESC
         LIMIT 1`,
        [menteeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        relationshipId: row.relationship_id,
        mentorId: row.mentor_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        linkedinUrl: null,
        githubUrl: null,
        bio: row.bio,
        relationshipType: row.relationship_type,
        permissions: typeof row.permissions_granted === "string" 
          ? JSON.parse(row.permissions_granted) 
          : row.permissions_granted,
        acceptedAt: row.accepted_at
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentor:", error);
      throw error;
    }
  }

  /**
   * Get feedback received by mentee
   */
  async getMenteeFeedback(menteeId) {
    try {
      const result = await database.query(
        `SELECT 
          mf.id,
          mf.feedback_type,
          mf.feedback_content,
          mf.recommendations,
          mf.created_at,
          mr.mentor_id,
          u.email as mentor_email,
          p.first_name as mentor_first_name,
          p.last_name as mentor_last_name
         FROM mentor_feedback mf
         JOIN mentor_relationships mr ON mf.relationship_id = mr.id
         JOIN users u ON mr.mentor_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE mr.mentee_id = $1 AND mr.active = true
         ORDER BY mf.created_at DESC
         LIMIT 50`,
        [menteeId]
      );

      return result.rows.map(row => ({
        id: row.id,
        feedbackType: row.feedback_type,
        feedbackContent: row.feedback_content,
        recommendations: row.recommendations,
        createdAt: row.created_at,
        mentor: {
          id: row.mentor_id,
          email: row.mentor_email,
          firstName: row.mentor_first_name,
          lastName: row.mentor_last_name,
          fullName: `${row.mentor_first_name || ''} ${row.mentor_last_name || ''}`.trim() || row.mentor_email
        }
      }));
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee feedback:", error);
      throw error;
    }
  }

  /**
   * Get mentor activity feed for mentee
   * Combines tasks, feedback, comments, messages, and activity logs
   */
  async getMentorActivityFeed(menteeId) {
    try {
      // Get mentor relationship
      const relationship = await database.query(
        `SELECT mentor_id FROM mentor_relationships 
         WHERE mentee_id = $1 AND active = true
         ORDER BY accepted_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [menteeId]
      );

      if (relationship.rows.length === 0) {
        return [];
      }

      const mentorId = relationship.rows[0].mentor_id;

      // Get shared team ID
      const teamCheck = await database.query(
        `SELECT tm1.team_id
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      const teamId = teamCheck.rows[0]?.team_id;

      const feedItems = [];

      // 1. Get tasks assigned by mentor
      const tasks = await database.query(
        `SELECT 
          pt.id,
          pt.task_title,
          pt.task_description,
          pt.task_type,
          pt.due_date,
          pt.status,
          pt.created_at,
          u.email as mentor_email,
          p.first_name as mentor_first_name,
          p.last_name as mentor_last_name
         FROM preparation_tasks pt
         JOIN users u ON pt.assigned_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE pt.assigned_by = $1 AND pt.assigned_to = $2
         ORDER BY pt.created_at DESC
         LIMIT 20`,
        [mentorId, menteeId]
      );

      tasks.rows.forEach(task => {
        feedItems.push({
          type: "task_assigned",
          id: `task-${task.id}`,
          title: task.task_title,
          description: task.task_description,
          metadata: {
            taskType: task.task_type,
            dueDate: task.due_date,
            status: task.status,
          },
          mentorName: `${task.mentor_first_name || ''} ${task.mentor_last_name || ''}`.trim() || task.mentor_email,
          mentorEmail: task.mentor_email,
          createdAt: task.created_at,
        });
      });

      // 2. Get feedback provided by mentor
      const feedback = await database.query(
        `SELECT 
          mf.id,
          mf.feedback_type,
          mf.feedback_content,
          mf.recommendations,
          mf.created_at,
          u.email as mentor_email,
          p.first_name as mentor_first_name,
          p.last_name as mentor_last_name
         FROM mentor_feedback mf
         JOIN mentor_relationships mr ON mf.relationship_id = mr.id
         JOIN users u ON mr.mentor_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE mr.mentor_id = $1 AND mr.mentee_id = $2 AND mr.active = true
         ORDER BY mf.created_at DESC
         LIMIT 20`,
        [mentorId, menteeId]
      );

      feedback.rows.forEach(fb => {
        feedItems.push({
          type: "feedback_provided",
          id: `feedback-${fb.id}`,
          title: `${fb.feedback_type.replace(/_/g, " ")} feedback`,
          description: fb.feedback_content,
          metadata: {
            feedbackType: fb.feedback_type,
            recommendations: fb.recommendations,
          },
          mentorName: `${fb.mentor_first_name || ''} ${fb.mentor_last_name || ''}`.trim() || fb.mentor_email,
          mentorEmail: fb.mentor_email,
          createdAt: fb.created_at,
        });
      });

      // 3. Get document comments by mentor (if teamId exists)
      // Comments are stored in review_comments table (team-based comments have review_request_id = NULL)
      if (teamId) {
        try {
          const comments = await database.query(
            `SELECT 
              rc.id,
              rc.document_type,
              rc.document_id,
              rc.comment_text,
              rc.document_section,
              rc.created_at,
              u.email as mentor_email,
              p.first_name as mentor_first_name,
              p.last_name as mentor_last_name,
              CASE 
                WHEN rc.document_type = 'resume' THEN r.name
                WHEN rc.document_type = 'cover_letter' THEN cl.version_name
                ELSE NULL
              END as document_name
             FROM review_comments rc
             JOIN users u ON rc.reviewer_id = u.u_id
             LEFT JOIN profiles p ON u.u_id = p.user_id
             LEFT JOIN resume r ON rc.document_type = 'resume' AND rc.document_id = r.id
             LEFT JOIN coverletter cl ON rc.document_type = 'cover_letter' AND rc.document_id = cl.id
             WHERE rc.reviewer_id = $1 
               AND rc.team_id = $2 
               AND rc.review_request_id IS NULL
             ORDER BY rc.created_at DESC
             LIMIT 20`,
            [mentorId, teamId]
          );

          comments.rows.forEach(comment => {
            feedItems.push({
              type: "comment_added",
              id: `comment-${comment.id}`,
              title: `Commented on ${comment.document_type.replace(/_/g, " ")}`,
              description: comment.comment_text,
              metadata: {
                documentType: comment.document_type,
                documentId: comment.document_id,
                documentName: comment.document_name,
                documentSection: comment.document_section,
              },
              mentorName: `${comment.mentor_first_name || ''} ${comment.mentor_last_name || ''}`.trim() || comment.mentor_email,
              mentorEmail: comment.mentor_email,
              createdAt: comment.created_at,
            });
          });
        } catch (error) {
          // If review_comments table doesn't exist or has issues, skip document comments
          console.warn("[MentorDashboardService] Could not fetch document comments:", error.message);
        }
      }

      // 4. Get messages from mentor (if teamId exists)
      if (teamId) {
        const messages = await database.query(
          `SELECT 
            cm.id,
            cm.message_text,
            cm.created_at,
            cc.title as conversation_title,
            u.email as mentor_email,
            p.first_name as mentor_first_name,
            p.last_name as mentor_last_name
           FROM chat_messages cm
           JOIN chat_conversations cc ON cm.conversation_id = cc.id
           JOIN users u ON cm.sender_id = u.u_id
           LEFT JOIN profiles p ON u.u_id = p.user_id
           WHERE cm.sender_id = $1 
             AND cc.team_id = $2
             AND (cc.conversation_type = 'mentor' OR cc.conversation_type = 'mentor_mentee' OR cc.conversation_type = 'team')
             AND EXISTS (
               SELECT 1 FROM chat_participants cp
               WHERE cp.conversation_id = cc.id AND cp.user_id = $3 AND cp.is_active = true
             )
           ORDER BY cm.created_at DESC
           LIMIT 20`,
          [mentorId, teamId, menteeId]
        );

        messages.rows.forEach(msg => {
          feedItems.push({
            type: "message_sent",
            id: `message-${msg.id}`,
            title: `Sent a message${msg.conversation_title ? ` in ${msg.conversation_title}` : ''}`,
            description: msg.message_text,
            metadata: {
              conversationTitle: msg.conversation_title,
            },
            mentorName: `${msg.mentor_first_name || ''} ${msg.mentor_last_name || ''}`.trim() || msg.mentor_email,
            mentorEmail: msg.mentor_email,
            createdAt: msg.created_at,
          });
        });
      }

      // 5. Get activity logs where mentor is the actor
      if (teamId) {
        const activities = await database.query(
          `SELECT 
            al.activity_type,
            al.activity_data,
            al.created_at,
            u.email as mentor_email,
            p.first_name as mentor_first_name,
            p.last_name as mentor_last_name
           FROM activity_logs al
           JOIN users u ON al.user_id = u.u_id
           LEFT JOIN profiles p ON u.u_id = p.user_id
           WHERE al.user_id = $1 
             AND al.team_id = $2
             AND al.activity_type IN ('task_assigned', 'feedback_provided', 'comment_added', 'document_shared')
           ORDER BY al.created_at DESC
           LIMIT 20`,
          [mentorId, teamId]
        );

        activities.rows.forEach(activity => {
          const activityData = typeof activity.activity_data === "string" 
            ? JSON.parse(activity.activity_data) 
            : activity.activity_data;

          feedItems.push({
            type: activity.activity_type,
            id: `activity-${activity.created_at}-${Math.random()}`,
            title: activity.activity_type.replace(/_/g, " "),
            description: null,
            metadata: activityData,
            mentorName: `${activity.mentor_first_name || ''} ${activity.mentor_last_name || ''}`.trim() || activity.mentor_email,
            mentorEmail: activity.mentor_email,
            createdAt: activity.created_at,
          });
        });
      }

      // Sort all items by created_at descending and remove duplicates
      const uniqueItems = feedItems.reduce((acc, item) => {
        const key = `${item.type}-${item.createdAt}`;
        if (!acc[key]) {
          acc[key] = item;
        }
        return acc;
      }, {});

      return Object.values(uniqueItems)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentor activity feed:", error);
      throw error;
    }
  }

  /**
   * Get mentee's own progress (without mentor verification)
   */
  async getOwnProgress(menteeId) {
    try {
      // Get job search statistics
      const jobStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Interested') as interested_count,
          COUNT(*) FILTER (WHERE status = 'Applied') as applied_count,
          COUNT(*) FILTER (WHERE status = 'Phone Screen') as phone_screen_count,
          COUNT(*) FILTER (WHERE status = 'Interview') as interview_count,
          COUNT(*) FILTER (WHERE status = 'Offer') as offer_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          COUNT(*) as total_jobs,
          MAX(created_at) as last_activity
         FROM job_opportunities
         WHERE user_id = $1 AND archived = false`,
        [menteeId]
      );

      // Get interview prep progress
      const interviewPrep = await database.query(
        `SELECT 
          COUNT(DISTINCT i.id) as total_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'scheduled') as scheduled_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_interviews
         FROM interviews i
         WHERE i.user_id = $1`,
        [menteeId]
      );

      // Get upcoming interviews
      const upcomingInterviews = await database.query(
        `SELECT id, title, company, scheduled_at as interview_date, type as interview_type, status
         FROM interviews
         WHERE user_id = $1 AND (scheduled_at >= CURRENT_TIMESTAMP OR date >= CURRENT_DATE)
         ORDER BY COALESCE(scheduled_at, date) ASC
         LIMIT 5`,
        [menteeId]
      );

      // Get task completion
      const tasks = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) as total_tasks
         FROM preparation_tasks
         WHERE assigned_to = $1`,
        [menteeId]
      );

      // Get recent activity
      const recentActivity = await database.query(
        `SELECT activity_type, activity_data, created_at
         FROM activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [menteeId]
      );

      // Get engagement score (based on recent activity)
      const engagementScore = await database.query(
        `SELECT COUNT(*) as activity_count
         FROM activity_logs
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [menteeId]
      );

      // Get recent job applications
      const recentJobs = await database.query(
        `SELECT id, title, company, status, status_updated_at
         FROM job_opportunities
         WHERE user_id = $1 AND archived = false
         ORDER BY status_updated_at DESC
         LIMIT 5`,
        [menteeId]
      );

      return {
        jobSearch: jobStats.rows[0],
        interviewPrep: interviewPrep.rows[0],
        upcomingInterviews: upcomingInterviews.rows,
        tasks: tasks.rows[0],
        recentActivity: recentActivity.rows,
        recentJobs: recentJobs.rows,
        engagementScore: Math.min(100, (engagementScore.rows[0]?.activity_count || 0) * 10)
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting own progress:", error);
      throw error;
    }
  }
}

export default new MentorDashboardService();

