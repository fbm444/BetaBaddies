import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { JobOpportunityData } from "../types";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";
import { ROUTES } from "../config/routes";

interface UpcomingDeadlinesWidgetProps {
  variant?: "default" | "analytics";
  className?: string;
}

export function UpcomingDeadlinesWidget({
  variant = "default",
  className = "",
}: UpcomingDeadlinesWidgetProps) {
  const navigate = useNavigate();
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingDeadlines = async () => {
      try {
        setIsLoading(true);
        // Fetch all opportunities with deadlines, sorted by deadline
        const response = await api.getJobOpportunities({
          sort: "application_deadline",
          limit: 10,
        });

        if (response.ok && response.data) {
          // Filter to only opportunities with deadlines and get next 5
          const withDeadlines = response.data.jobOpportunities
            .filter((opp: JobOpportunityData) => opp.applicationDeadline)
            .filter((opp: JobOpportunityData) => {
              const days = getDaysRemaining(opp.applicationDeadline);
              return days !== null && days <= 30; // Show deadlines within 30 days
            })
            .slice(0, 5);

          setUpcomingDeadlines(withDeadlines);
        }
      } catch (err) {
        console.error("Failed to fetch upcoming deadlines:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingDeadlines();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const baseCardClasses =
    variant === "analytics"
      ? "bg-white rounded-3xl p-5 md:p-6 shadow-sm font-poppins h-full flex flex-col"
      : "bg-white rounded-xl p-6 shadow-sm border border-slate-200 font-poppins";

  if (isLoading) {
    return (
      <div className={`${baseCardClasses} ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-slate-900 ${
              variant === "analytics" ? "text-[25px]" : "text-lg"
            } font-normal`}
            style={variant === "analytics" ? { fontFamily: "Poppins" } : undefined}
          >
            Upcoming Deadlines
          </h3>
        </div>
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (upcomingDeadlines.length === 0) {
    return (
      <div className={`${baseCardClasses} ${className}`}>
        <div className="flex items-center mb-4">
          <h3
            className={`text-slate-900 ${
              variant === "analytics" ? "text-[25px]" : "text-lg"
            } font-normal`}
            style={variant === "analytics" ? { fontFamily: "Poppins" } : undefined}
          >
            Upcoming Deadlines
          </h3>
        </div>
        <div className="text-sm text-slate-500">
          No upcoming deadlines in the next 30 days.
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseCardClasses} ${className}`}>
      <div className="flex items-center mb-4">
        <h3
          className={`text-slate-900 ${
            variant === "analytics" ? "text-[25px]" : "text-lg"
          } font-normal`}
          style={variant === "analytics" ? { fontFamily: "Poppins" } : undefined}
        >
          Upcoming Deadlines
        </h3>
      </div>
      <div className="space-y-2 flex-1">
        {upcomingDeadlines.map((opportunity) => {
          const daysRemaining = getDaysRemaining(opportunity.applicationDeadline!);
          const urgency = getDeadlineUrgency(daysRemaining);
          const deadlineColor = getDeadlineColor(urgency);
          const deadlineBgColor = getDeadlineBgColor(urgency);

          return (
            <div
              key={opportunity.id}
              className={`flex items-center justify-between gap-4 rounded-2xl border transition-colors ${
                variant === "analytics"
                  ? "border-transparent bg-[#F8FAFF] px-5 py-4 hover:bg-[#F1F4FF]"
                  : "border-slate-200 p-3 hover:bg-slate-50"
              } cursor-pointer`}
              onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate font-medium text-slate-900 ${
                    variant === "analytics" ? "text-sm md:text-base" : "text-sm"
                  }`}
                >
                  {opportunity.title}
                </p>
                <p
                  className={`truncate text-slate-500 ${
                    variant === "analytics" ? "text-xs md:text-sm" : "text-xs"
                  }`}
                >
                  {opportunity.company}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDate(opportunity.applicationDeadline!)}
                </p>
              </div>
              <div
                className={`rounded-full text-xs font-semibold whitespace-nowrap px-3 py-1 ${
                  variant === "analytics" ? "shadow-sm" : ""
                }`}
                style={{
                  backgroundColor: deadlineBgColor,
                  color: deadlineColor,
                }}
              >
                {formatDeadlineText(daysRemaining)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

