/**
 * Calculate days remaining until deadline
 * @param deadline - Deadline date string (ISO format)
 * @returns Number of days remaining (negative if overdue)
 */
export function getDaysRemaining(deadline: string | undefined): number | null {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  
  // Reset time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get urgency level based on days remaining
 */
export type DeadlineUrgency = "overdue" | "urgent" | "warning" | "normal" | "upcoming";

export function getDeadlineUrgency(daysRemaining: number | null): DeadlineUrgency | null {
  if (daysRemaining === null) return null;
  
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "warning";
  return "normal";
}

/**
 * Get color for deadline urgency
 */
export function getDeadlineColor(urgency: DeadlineUrgency | null): string {
  if (!urgency) return "#6B7280"; // Gray for no deadline
  
  switch (urgency) {
    case "overdue":
      return "#93694B"; // Muted orange-brown
    case "urgent":
      return "#B91C1C"; // Red
    case "warning":
      return "#B7791F"; // Amber
    case "normal":
      return "#15803D"; // Green
    case "upcoming":
      return "#15803D"; // Treat upcoming as green
    default:
      return "#6B7280"; // Gray
  }
}

/**
 * Get background color for deadline urgency
 */
export function getDeadlineBgColor(urgency: DeadlineUrgency | null): string {
  if (!urgency) return "#F3F4F6"; // Gray 100
  
  switch (urgency) {
    case "overdue":
      return "#FFE4BD"; // Soft orange
    case "urgent":
      return "#FFE4E2"; // Light red
    case "warning":
      return "#FFF4CC"; // Light yellow
    case "normal":
      return "#DEF7E3"; // Light green
    case "upcoming":
      return "#DEF7E3"; // Light green
    default:
      return "#F3F4F6"; // Gray 100
  }
}

/**
 * Format deadline text for display
 */
export function formatDeadlineText(daysRemaining: number | null): string {
  if (daysRemaining === null) return "No deadline";
  
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""} overdue`;
  }
  if (daysRemaining === 0) {
    return "Due today";
  }
  if (daysRemaining === 1) {
    return "Due tomorrow";
  }
  if (daysRemaining <= 7) {
    return `${daysRemaining} days remaining`;
  }
  if (daysRemaining <= 30) {
    return `${daysRemaining} days remaining`;
  }
  return `${daysRemaining} days remaining`;
}

/**
 * Check if deadline is overdue
 */
export function isDeadlineOverdue(deadline: string | undefined): boolean {
  const daysRemaining = getDaysRemaining(deadline);
  return daysRemaining !== null && daysRemaining < 0;
}

