import cron from "node-cron";
import reminderService from "./reminderService.js";
import salaryBenchmarkService from "./salaryBenchmarkService.js";
import database from "./database.js";

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ Scheduler is already running");
      return;
    }

    console.log("🚀 Starting scheduler service...");

    // Process reminders every 5 minutes
    const reminderJob = cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("⏰ Processing due reminders...");
        const result = await reminderService.processDueReminders();
        
        if (result.processed > 0) {
          console.log(
            `✅ Processed ${result.processed} reminders: ${result.succeeded} succeeded, ${result.failed} failed`
          );
        }
      } catch (error) {
        console.error("❌ Error in reminder cron job:", error);
      }
    });

    this.jobs.push({ name: "reminders", job: reminderJob });

    // Refresh salary benchmarks weekly (every Sunday at 2 AM)
    const salaryRefreshJob = cron.schedule("0 2 * * 0", async () => {
      try {
        console.log("📊 Refreshing popular salary benchmarks...");
        await this.refreshPopularSalaryBenchmarks();
        console.log("✅ Salary benchmark refresh completed");
      } catch (error) {
        console.error("❌ Error in salary benchmark refresh job:", error);
      }
    });

    this.jobs.push({ name: "salary_benchmarks_weekly", job: salaryRefreshJob });

    // Monthly deep refresh (1st of each month at 3 AM)
    const monthlyRefreshJob = cron.schedule("0 3 1 * *", async () => {
      try {
        console.log("📊 Running monthly salary benchmark refresh...");
        await this.refreshAllSalaryBenchmarks();
        console.log("✅ Monthly salary benchmark refresh completed");
      } catch (error) {
        console.error("❌ Error in monthly salary benchmark refresh:", error);
      }
    });

    this.jobs.push({ name: "salary_benchmarks_monthly", job: monthlyRefreshJob });

    this.isRunning = true;
    console.log("✅ Scheduler started successfully");
    console.log("   - Reminder processing: every 5 minutes");
    console.log("   - Salary benchmarks refresh: weekly (Sunday 2 AM)");
    console.log("   - Salary benchmarks deep refresh: monthly (1st at 3 AM)");
  }

  /**
   * Stop the scheduler
   */
  stop() {
    console.log("🛑 Stopping scheduler service...");
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`   - Stopped ${name} job`);
    });

    this.jobs = [];
    this.isRunning = false;
    console.log("✅ Scheduler stopped");
  }

  /**
   * Refresh popular salary benchmarks (expired ones, limited to 50)
   */
  async refreshPopularSalaryBenchmarks() {
    try {
      // Get expired benchmarks, prioritizing recently expired ones
      const expiredBenchmarks = await database.query(`
        SELECT DISTINCT job_title, location
        FROM salary_benchmarks
        WHERE expires_at < NOW() OR expires_at IS NULL
        ORDER BY last_updated DESC
        LIMIT 50
      `);

      if (expiredBenchmarks.rows.length === 0) {
        console.log("No expired salary benchmarks to refresh");
        return;
      }

      const refreshPromises = expiredBenchmarks.rows.map((row) => {
        return salaryBenchmarkService.getSalaryBenchmark(row.job_title, row.location)
          .catch((err) => {
            console.error(`Failed to refresh ${row.job_title} in ${row.location}:`, err.message);
            return null;
          });
      });

      await Promise.allSettled(refreshPromises);
      console.log(`✅ Refreshed ${expiredBenchmarks.rows.length} expired salary benchmarks`);
    } catch (error) {
      console.error("Error refreshing popular salary benchmarks:", error);
      throw error;
    }
  }

  /**
   * Refresh all expired salary benchmarks
   */
  async refreshAllSalaryBenchmarks() {
    try {
      // Get all expired or soon-to-expire benchmarks
      const expiredBenchmarks = await database.query(`
        SELECT DISTINCT job_title, location
        FROM salary_benchmarks
        WHERE expires_at < NOW() OR expires_at IS NULL
        ORDER BY last_updated ASC
      `);

      console.log(`Found ${expiredBenchmarks.rows.length} expired benchmarks to refresh`);

      // Refresh in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < expiredBenchmarks.rows.length; i += batchSize) {
        const batch = expiredBenchmarks.rows.slice(i, i + batchSize);
        const batchPromises = batch.map((row) => {
          return salaryBenchmarkService.getSalaryBenchmark(row.job_title, row.location)
            .catch((err) => {
              console.error(`Failed to refresh ${row.job_title} in ${row.location}:`, err.message);
              return null;
            });
        });

        await Promise.allSettled(batchPromises);
        console.log(`Refreshed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(expiredBenchmarks.rows.length / batchSize)}`);

        // Small delay between batches to respect API rate limits
        if (i + batchSize < expiredBenchmarks.rows.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ Refreshed ${expiredBenchmarks.rows.length} salary benchmarks`);
    } catch (error) {
      console.error("Error refreshing all salary benchmarks:", error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.map((j) => j.name),
    };
  }
}

export default new SchedulerService();

