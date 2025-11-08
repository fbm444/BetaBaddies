import type { JobOpportunityStatistics } from "../types";

/**
 * Export job opportunity statistics to CSV
 */
export function exportStatisticsToCSV(statistics: JobOpportunityStatistics): void {
  const csvRows: string[] = [];

  // Header
  csvRows.push("Job Search Statistics");
  csvRows.push(`Generated: ${new Date().toLocaleString()}`);
  csvRows.push("");

  // Overview
  csvRows.push("Overview");
  csvRows.push(`Total Jobs,${statistics.totalJobs}`);
  csvRows.push(`Response Rate,${statistics.responseRate}%`);
  csvRows.push(`Deadline Adherence,${statistics.deadlineAdherence.percentage}%`);
  csvRows.push(
    `Average Time to Offer,${statistics.timeToOffer.averageDays > 0 ? statistics.timeToOffer.averageDays + " days" : "N/A"}`
  );
  csvRows.push("");

  // Status Distribution
  csvRows.push("Status Distribution");
  csvRows.push("Status,Count,Percentage");
  Object.entries(statistics.statusCounts).forEach(([status, count]) => {
    const percentage =
      statistics.totalJobs > 0
        ? Math.round((count / statistics.totalJobs) * 100 * 10) / 10
        : 0;
    csvRows.push(`${status},${count},${percentage}%`);
  });
  csvRows.push("");

  // Monthly Volume
  csvRows.push("Monthly Application Volume");
  csvRows.push("Month,Count");
  statistics.monthlyVolume.forEach((item) => {
    const date = new Date(item.month);
    const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    csvRows.push(`${monthName},${item.count}`);
  });
  csvRows.push("");

  // Deadline Adherence
  csvRows.push("Deadline Adherence");
  csvRows.push(`Total with Deadlines,${statistics.deadlineAdherence.totalWithDeadlines}`);
  csvRows.push(`Met Deadlines,${statistics.deadlineAdherence.metDeadlines}`);
  csvRows.push(`Overdue,${statistics.deadlineAdherence.overdueCount}`);
  csvRows.push(`Upcoming,${statistics.deadlineAdherence.upcomingCount}`);
  csvRows.push(`Adherence Rate,${statistics.deadlineAdherence.percentage}%`);
  csvRows.push("");

  // Time-to-Offer
  csvRows.push("Time-to-Offer Analytics");
  csvRows.push(`Total Offers,${statistics.timeToOffer.totalOffers}`);
  csvRows.push(
    `Average Time,${statistics.timeToOffer.averageDays > 0 ? statistics.timeToOffer.averageDays + " days" : "N/A"}`
  );
  csvRows.push("");

  // Average Time in Stage
  csvRows.push("Average Time in Each Stage");
  csvRows.push("Stage,Average Days");
  Object.entries(statistics.averageTimeInStage).forEach(([stage, avgDays]) => {
    csvRows.push(`${stage},${avgDays > 0 ? avgDays : "N/A"}`);
  });

  // Create CSV content
  const csvContent = csvRows.join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `job-statistics-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

