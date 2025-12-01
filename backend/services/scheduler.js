import cron from "node-cron";
import reminderService from "./reminderService.js";

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
    this.isRunning = true;
    console.log("✅ Scheduler started successfully");
    console.log("   - Reminder processing: every 5 minutes");
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

