import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
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

export function UpcomingDeadlinesWidget() {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 font-poppins">
        <div className="flex items-center gap-3 mb-4">
          <Icon
            icon="mingcute:calendar-line"
            className="text-blue-600"
            width={24}
          />
          <h3 className="text-lg font-semibold text-slate-900">
            Upcoming Deadlines
          </h3>
        </div>
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (upcomingDeadlines.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 font-poppins">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon
              icon="mingcute:calendar-line"
              className="text-blue-600"
              width={24}
            />
            <h3 className="text-lg font-semibold text-slate-900">
              Upcoming Deadlines
            </h3>
          </div>
          <button
            onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        </div>
        <div className="text-sm text-slate-500">
          No upcoming deadlines in the next 30 days.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 font-poppins">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon
            icon="mingcute:calendar-line"
            className="text-blue-600"
            width={24}
          />
          <h3 className="text-lg font-semibold text-slate-900">
            Upcoming Deadlines
          </h3>
        </div>
        <button
          onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </button>
      </div>
      <div className="space-y-3">
        {upcomingDeadlines.map((opportunity) => {
          const daysRemaining = getDaysRemaining(opportunity.applicationDeadline!);
          const urgency = getDeadlineUrgency(daysRemaining);
          const deadlineColor = getDeadlineColor(urgency);
          const deadlineBgColor = getDeadlineBgColor(urgency);

          return (
            <div
              key={opportunity.id}
              className="flex items-start justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 truncate text-sm">
                  {opportunity.title}
                </h4>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  {opportunity.company}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDate(opportunity.applicationDeadline!)}
                </p>
              </div>
              <div
                className="ml-3 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
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

