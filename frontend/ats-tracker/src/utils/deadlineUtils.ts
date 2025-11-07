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
  if (daysRemaining === 0) return "urgent";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "warning";
  if (daysRemaining <= 14) return "normal";
  return "upcoming";
}

/**
 * Get color for deadline urgency
 */
export function getDeadlineColor(urgency: DeadlineUrgency | null): string {
  if (!urgency) return "#6B7280"; // Gray for no deadline
  
  switch (urgency) {
    case "overdue":
      return "#EF4444"; // Red
    case "urgent":
      return "#F59E0B"; // Amber/Orange
    case "warning":
      return "#FBBF24"; // Yellow
    case "normal":
      return "#10B981"; // Green
    case "upcoming":
      return "#3B82F6"; // Blue
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
      return "#FEE2E2"; // Red 100
    case "urgent":
      return "#FEF3C7"; // Amber 100
    case "warning":
      return "#FEF3C7"; // Amber 100
    case "normal":
      return "#D1FAE5"; // Green 100
    case "upcoming":
      return "#DBEAFE"; // Blue 100
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

