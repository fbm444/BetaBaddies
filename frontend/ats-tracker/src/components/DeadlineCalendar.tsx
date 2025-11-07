import { useMemo } from "react";
import { Icon } from "@iconify/react";
import type { JobOpportunityData } from "../types";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";

interface DeadlineCalendarProps {
  opportunities: JobOpportunityData[];
  onOpportunityClick?: (opportunity: JobOpportunityData) => void;
}

export function DeadlineCalendar({
  opportunities,
  onOpportunityClick,
}: DeadlineCalendarProps) {
  // Filter opportunities with deadlines and sort by deadline
  const opportunitiesWithDeadlines = useMemo(() => {
    return opportunities
      .filter((opp) => opp.applicationDeadline)
      .sort((a, b) => {
        const dateA = new Date(a.applicationDeadline!);
        const dateB = new Date(b.applicationDeadline!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [opportunities]);

  // Group opportunities by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<
      string,
      { month: string; year: number; opportunities: JobOpportunityData[] }
    > = {};

    opportunitiesWithDeadlines.forEach((opp) => {
      const date = new Date(opp.applicationDeadline!);
      const monthKey = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const monthName = date.toLocaleDateString("en-US", { month: "long" });
      const year = date.getFullYear();

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthName,
          year,
          opportunities: [],
        };
      }

      groups[monthKey].opportunities.push(opp);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (
        new Date(`${a.month} 1, ${a.year}`).getTime() -
        new Date(`${b.month} 1, ${b.year}`).getTime()
      );
    });
  }, [opportunitiesWithDeadlines]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (opportunitiesWithDeadlines.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
        <Icon
          icon="mingcute:calendar-line"
          width={64}
          className="mx-auto text-slate-300 mb-4"
        />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          No Upcoming Deadlines
        </h3>
        <p className="text-slate-600">
          Add application deadlines to your job opportunities to track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Upcoming Deadlines</h2>
      <div className="space-y-8">
        {groupedByMonth.map((group) => (
          <div key={`${group.month}-${group.year}`}>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              {group.month} {group.year}
            </h3>
            <div className="space-y-3">
              {group.opportunities.map((opp) => {
                const daysRemaining = getDaysRemaining(opp.applicationDeadline);
                const urgency = getDeadlineUrgency(daysRemaining);
                const deadlineColor = getDeadlineColor(urgency);
                const deadlineBgColor = getDeadlineBgColor(urgency);

                return (
                  <div
                    key={opp.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      onOpportunityClick ? "cursor-pointer hover:shadow-md" : ""
                    } ${
                      urgency === "overdue"
                        ? "border-red-300 bg-red-50"
                        : urgency === "urgent"
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                    onClick={() => onOpportunityClick && onOpportunityClick(opp)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {opp.title}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">{opp.company}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Icon icon="mingcute:calendar-line" width={16} />
                          <span>{formatDate(opp.applicationDeadline!)}</span>
                        </div>
                      </div>
                      <div
                        className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ml-4"
                        style={{
                          backgroundColor: deadlineBgColor,
                          color: deadlineColor,
                        }}
                      >
                        {formatDeadlineText(daysRemaining)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

