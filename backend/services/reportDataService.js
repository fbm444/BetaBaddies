/**
 * Report Data Service
 * Aggregates data directly from job_opportunities table
 */

import database from "./database.js";

class ReportDataService {
  /**
   * Aggregate all report data
   */
  async aggregateReportData(userId, config) {
    try {
      const reportData = {
        metadata: {
          userId,
          generatedAt: new Date().toISOString(),
        },
      };

      // Get all job opportunities with their time logs
      const jobsQuery = `
        SELECT 
          jo.*,
          COALESCE((
            SELECT SUM(hours_spent)
            FROM time_logs
            WHERE job_opportunity_id = jo.id
          ), 0) as total_prep_hours
        FROM job_opportunities jo
        WHERE jo.user_id = $1 
          AND (jo.archived = false OR jo.archived IS NULL)
        ORDER BY jo.created_at DESC
      `;

      const jobsResult = await database.query(jobsQuery, [userId]);
      const jobs = jobsResult.rows;

      // Calculate metrics directly from the jobs data
      const totalJobs = jobs.length;
      const interested = jobs.filter(j => j.status === 'Interested').length;
      const applied = jobs.filter(j => j.status === 'Applied').length;
      const phoneScreen = jobs.filter(j => j.status === 'Phone Screen').length;
      const interview = jobs.filter(j => j.status === 'Interview').length;
      const offer = jobs.filter(j => j.status === 'Offer').length;
      const rejected = jobs.filter(j => j.status === 'Rejected').length;

      // Applications sent = everything except "Interested"
      const applicationsSent = totalJobs - interested;
      const totalPrepHours = jobs.reduce((sum, j) => sum + parseFloat(j.total_prep_hours || 0), 0);
      const avgPrepTime = totalJobs > 0 ? (totalPrepHours / totalJobs).toFixed(1) : 0;

      // Success rates
      const successRate = applicationsSent > 0 ? ((offer / applicationsSent) * 100).toFixed(1) : 0;
      const interviewRate = applicationsSent > 0 ? (((phoneScreen + interview + offer) / applicationsSent) * 100).toFixed(1) : 0;

      // Success by industry
      const byIndustry = {};
      jobs.forEach(job => {
        if (!job.industry) return;
        if (!byIndustry[job.industry]) {
          byIndustry[job.industry] = { total: 0, offers: 0, interviews: 0 };
        }
        byIndustry[job.industry].total++;
        if (job.status === 'Offer') byIndustry[job.industry].offers++;
        if (job.status === 'Interview' || job.status === 'Phone Screen') byIndustry[job.industry].interviews++;
      });

      const industryArray = Object.entries(byIndustry).map(([industry, data]) => ({
        industry,
        total: data.total,
        offers: data.offers,
        offerRate: data.total > 0 ? ((data.offers / data.total) * 100).toFixed(1) : 0,
        interviews: data.interviews,
        interviewRate: data.total > 0 ? ((data.interviews / data.total) * 100).toFixed(1) : 0,
      })).sort((a, b) => parseFloat(b.offerRate) - parseFloat(a.offerRate));

      // Success by source
      const bySource = {};
      jobs.forEach(job => {
        if (!job.application_source) return;
        if (!bySource[job.application_source]) {
          bySource[job.application_source] = { total: 0, offers: 0 };
        }
        bySource[job.application_source].total++;
        if (job.status === 'Offer') bySource[job.application_source].offers++;
      });

      const sourceArray = Object.entries(bySource).map(([source, data]) => ({
        source,
        total: data.total,
        offers: data.offers,
        offerRate: data.total > 0 ? ((data.offers / data.total) * 100).toFixed(1) : 0,
      })).sort((a, b) => parseFloat(b.offerRate) - parseFloat(a.offerRate));

      // Time investment by activity
      const timeLogsQuery = `
        SELECT 
          activity_type,
          SUM(hours_spent) as totalHours,
          COUNT(*) as count
        FROM time_logs
        WHERE user_id = $1
        GROUP BY activity_type
        ORDER BY totalHours DESC
      `;
      
      const timeLogsResult = await database.query(timeLogsQuery, [userId]);

      reportData.summary = {
        totalApplications: applicationsSent,
        totalInterviews: phoneScreen + interview,
        totalOffers: offer,
        successRate,
        avgPrepTime,
      };

      reportData.performance = {
        keyMetrics: {
          total_opportunities: totalJobs,
          applications_sent: applicationsSent,
          interviews_scheduled: phoneScreen + interview,
          offers_received: offer,
          rejections: rejected,
          interested,
        },
        conversionRates: {
          application_to_interview: interviewRate,
          interview_to_offer: (phoneScreen + interview) > 0 ? ((offer / (phoneScreen + interview)) * 100).toFixed(1) : 0,
        },
      };

      reportData.successAnalysis = {
        byIndustry: industryArray,
        bySource: sourceArray,
      };

      reportData.timeInvestment = {
        byActivity: timeLogsResult.rows.map(row => ({
          activityType: row.activity_type,
          totalHours: parseFloat(row.totalhours),
          count: parseInt(row.count),
        })),
        summary: {
          avgHoursPerJob: avgPrepTime,
          totalHours: totalPrepHours,
        },
      };

      reportData.applications = jobs;

      console.log('📊 Report Summary:', reportData.summary);

      return reportData;
    } catch (error) {
      console.error("Error aggregating report data:", error);
      throw error;
    }
  }

  /**
   * Get available filter options for the user
   */
  async getFilterOptions(userId) {
    try {
      const query = `
        SELECT 
          ARRAY_AGG(DISTINCT company) FILTER (WHERE company IS NOT NULL) as companies,
          ARRAY_AGG(DISTINCT industry) FILTER (WHERE industry IS NOT NULL) as industries,
          ARRAY_AGG(DISTINCT title) FILTER (WHERE title IS NOT NULL) as roles
        FROM job_opportunities
        WHERE user_id = $1
          AND (archived = false OR archived IS NULL)
      `;

      const result = await database.query(query, [userId]);
      return result.rows[0] || { companies: [], industries: [], roles: [] };
    } catch (error) {
      console.error("Error getting filter options:", error);
      return { companies: [], industries: [], roles: [] };
    }
  }
}

export default new ReportDataService();
