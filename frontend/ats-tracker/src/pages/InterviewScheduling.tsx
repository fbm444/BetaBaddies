import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type {
  InterviewData,
  InterviewInput,
  InterviewType,
  InterviewStatus,
  InterviewOutcome,
  JobOpportunityData,
} from "../types";
import {
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_OUTCOME_COLORS,
} from "../types/interview.types";
import { BackButton } from "../components/common/BackButton";

export function InterviewScheduling() {
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [selectedInterview, setSelectedInterview] = useState<InterviewData | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<InterviewStatus | "all">("all");

  useEffect(() => {
    fetchInterviews();
    fetchJobOpportunities();
  }, [filterStatus]);

  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: any = {};
      if (filterStatus !== "all") {
        filters.status = filterStatus;
      }
      const response = await api.getInterviews(filters);
      if (response.ok && response.data) {
        setInterviews(response.data.interviews);
      }
    } catch (err: any) {
      console.error("Failed to fetch interviews:", err);
      setError(err.message || "Failed to load interviews");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobOpportunities = async () => {
    try {
      const response = await api.getJobOpportunities({ status: "Interview" });
      if (response.ok && response.data) {
        setJobOpportunities(response.data.jobOpportunities);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunities:", err);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMessage(text);
      setError(null);
    } else {
      setError(text);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      if (type === "success") {
        setSuccessMessage(null);
      } else {
        setError(null);
      }
    }, 5000);
  };

  const handleScheduleInterview = async (data: InterviewInput) => {
    try {
      const response = await api.createInterview(data);
      if (response.ok) {
        setShowScheduleModal(false);
        await fetchInterviews();
        showMessage("Interview scheduled successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to schedule interview", "error");
      throw err;
    }
  };

  const handleUpdateInterview = async (id: string, data: Partial<InterviewInput>) => {
    try {
      const response = await api.updateInterview(id, data);
      if (response.ok) {
        await fetchInterviews();
        showMessage("Interview updated successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update interview", "error");
    }
  };

  const handleCancelInterview = async (id: string, reason?: string) => {
    try {
      const response = await api.cancelInterview(id, reason);
      if (response.ok) {
        await fetchInterviews();
        showMessage("Interview cancelled successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to cancel interview", "error");
    }
  };

  const handleRescheduleInterview = async (
    id: string,
    scheduledAt: string,
    duration?: number
  ) => {
    try {
      const response = await api.rescheduleInterview(id, scheduledAt, duration);
      if (response.ok) {
        await fetchInterviews();
        showMessage("Interview rescheduled successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to reschedule interview", "error");
    }
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      const response = await api.deleteInterview(id);
      if (response.ok) {
        await fetchInterviews();
        showMessage("Interview deleted successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to delete interview", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-poppins min-h-full flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="animate-spin text-blue-500 mx-auto mb-4"
            width={48}
          />
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading interviews...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Interview Scheduling
            </h1>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Icon
              icon="mingcute:check-circle-line"
              width={20}
              height={20}
              className="text-green-600"
            />
            <p className="text-green-800 text-sm m-0">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon
              icon="mingcute:alert-line"
              width={20}
              height={20}
              className="text-red-600"
            />
            <p className="text-red-800 text-sm m-0">{error}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 rounded-full bg-[#5490FF] text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:bg-[#4478D9]"
            >
              <Icon icon="mingcute:add-line" width={16} />
              Schedule Interview
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon icon="mingcute:list-line" width={16} className="inline mr-2" />
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon icon="mingcute:calendar-line" width={16} className="inline mr-2" />
                Calendar
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as InterviewStatus | "all")}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium"
            >
              <option value="all">All Statuses</option>
              {INTERVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {INTERVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {viewMode === "calendar" ? (
          <InterviewCalendar
            interviews={interviews}
            onInterviewClick={(interview) => {
              setSelectedInterview(interview);
              setShowDetailModal(true);
            }}
            onScheduleClick={() => setShowScheduleModal(true)}
          />
        ) : (
        <InterviewList
          interviews={interviews}
          onInterviewClick={(interview) => {
            setSelectedInterview(interview);
            setShowDetailModal(true);
          }}
          onUpdate={handleUpdateInterview}
          onCancel={handleCancelInterview}
          onReschedule={handleRescheduleInterview}
          onDelete={handleDeleteInterview}
          onRefresh={fetchInterviews}
        />
        )}

        {/* Schedule Interview Modal */}
        {showScheduleModal && (
          <InterviewScheduleModal
            jobOpportunities={jobOpportunities}
            onSchedule={handleScheduleInterview}
            onClose={() => setShowScheduleModal(false)}
          />
        )}

        {/* Interview Detail Modal */}
        {showDetailModal && selectedInterview && (
          <InterviewDetailModal
            interview={selectedInterview}
            onUpdate={handleUpdateInterview}
            onCancel={handleCancelInterview}
            onReschedule={handleRescheduleInterview}
            onDelete={handleDeleteInterview}
            onRefresh={async () => {
              await fetchInterviews();
              // Refresh selected interview
              const response = await api.getInterview(selectedInterview.id);
              if (response.ok && response.data) {
                setSelectedInterview(response.data.interview);
              }
            }}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedInterview(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

// Interview Calendar Component
function InterviewCalendar({
  interviews,
  onInterviewClick,
  onScheduleClick,
}: {
  interviews: InterviewData[];
  onInterviewClick: (interview: InterviewData) => void;
  onScheduleClick: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getInterviewsForDate = (date: Date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return interviews.filter((interview) => {
      if (!interview.scheduledAt) return false;
      const interviewDate = new Date(interview.scheduledAt);
      return interviewDate.toISOString().split("T")[0] === dateStr;
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const exportToCalendar = () => {
    const icsContent = interviews
      .filter((i) => i.status === "scheduled" && i.scheduledAt)
      .map((interview) => {
        const start = new Date(interview.scheduledAt);
        const end = new Date(start.getTime() + (interview.duration || 60) * 60000);
        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        };
        return `BEGIN:VEVENT
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${interview.title || "Interview"} - ${interview.company}
DESCRIPTION:${interview.notes || ""}
LOCATION:${interview.location || interview.videoLink || interview.phoneNumber || ""}
STATUS:CONFIRMED
END:VEVENT`;
      })
      .join("\n");

    const fullIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ATS Tracker//Interview Scheduling//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsContent}
END:VCALENDAR`;

    const blob = new Blob([fullIcs], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interviews-${new Date().toISOString().split("T")[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon icon="mingcute:arrow-left-line" width={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon icon="mingcute:arrow-right-line" width={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCalendar}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold inline-flex items-center gap-2 shadow-sm hover:bg-slate-100"
          >
            <Icon icon="mingcute:download-line" width={16} />
            Export to Calendar
          </button>
          <button
            onClick={onScheduleClick}
            className="px-4 py-2 rounded-full bg-[#5490FF] text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:bg-[#4478D9]"
          >
            <Icon icon="mingcute:add-line" width={16} />
            Schedule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-slate-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          const dayInterviews = date ? getInterviewsForDate(date) : [];
          return (
            <div
              key={index}
              className={`min-h-[100px] border border-slate-200 rounded-lg p-2 ${
                isToday(date)
                  ? "bg-blue-50 border-blue-300"
                  : isSelected(date)
                  ? "bg-blue-100 border-blue-400"
                  : "bg-white hover:bg-slate-50"
              } ${date ? "cursor-pointer" : ""}`}
              onClick={() => date && setSelectedDate(date)}
            >
              {date && (
                <>
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday(date) ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayInterviews.slice(0, 2).map((interview) => (
                      <div
                        key={interview.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInterviewClick(interview);
                        }}
                        className="text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: INTERVIEW_TYPE_COLORS[interview.interviewType],
                        }}
                        title={`${interview.title} - ${interview.company}`}
                      >
                        {new Date(interview.scheduledAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {interview.title}
                      </div>
                    ))}
                    {dayInterviews.length > 2 && (
                      <div className="text-xs text-slate-500">
                        +{dayInterviews.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-900 mb-3">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
          <div className="space-y-2">
            {getInterviewsForDate(selectedDate).map((interview) => (
              <div
                key={interview.id}
                onClick={() => onInterviewClick(interview)}
                className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {interview.title}
                    </div>
                    <div className="text-sm text-slate-600">{interview.company}</div>
                    <div className="text-sm text-slate-500">
                      {new Date(interview.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(
                        new Date(interview.scheduledAt).getTime() +
                          (interview.duration || 60) * 60000
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{
                      backgroundColor: INTERVIEW_TYPE_COLORS[interview.interviewType],
                    }}
                  >
                    {INTERVIEW_TYPE_LABELS[interview.interviewType]}
                  </span>
                </div>
              </div>
            ))}
            {getInterviewsForDate(selectedDate).length === 0 && (
              <p className="text-slate-500 text-sm">No interviews scheduled</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Interview List Component
function InterviewList({
  interviews,
  onInterviewClick,
  onUpdate,
  onCancel,
  onReschedule,
  onDelete,
  onRefresh,
}: {
  interviews: InterviewData[];
  onInterviewClick: (interview: InterviewData) => void;
  onUpdate: (id: string, data: Partial<InterviewInput>) => Promise<void>;
  onCancel: (id: string, reason?: string) => Promise<void>;
  onReschedule: (id: string, scheduledAt: string, duration?: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const sortedInterviews = [...interviews].sort((a, b) => {
    if (!a.scheduledAt || !b.scheduledAt) return 0;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedInterviews.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <Icon
            icon="mingcute:calendar-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No Interviews Scheduled
          </h3>
          <p className="text-slate-600 mb-6">
            Schedule your first interview to get started with interview management.
          </p>
        </div>
      ) : (
        sortedInterviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              onClick={() => onInterviewClick(interview)}
              onUpdate={onUpdate}
              onCancel={onCancel}
              onReschedule={onReschedule}
              onDelete={onDelete}
              onRefresh={onRefresh}
            />
        ))
      )}
    </div>
  );
}

// Interview Card Component
function InterviewCard({
  interview,
  onClick,
  onUpdate,
  onCancel,
  onReschedule,
  onDelete,
  onRefresh,
}: {
  interview: InterviewData;
  onClick: () => void;
  onUpdate: (id: string, data: Partial<InterviewInput>) => Promise<void>;
  onCancel: (id: string, reason?: string) => Promise<void>;
  onReschedule: (id: string, scheduledAt: string, duration?: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const scheduledAt = interview.scheduledAt
    ? formatDateTime(interview.scheduledAt)
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {interview.title}
          </h3>
          <p className="text-base font-medium text-slate-700 mb-2">
            {interview.company}
          </p>
          {scheduledAt && (
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:calendar-line" width={16} />
                <span>{scheduledAt.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:time-line" width={16} />
                <span>
                  {scheduledAt.time} (
                  {interview.duration || 60} min)
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{
              backgroundColor: INTERVIEW_TYPE_COLORS[interview.interviewType],
            }}
          >
            {INTERVIEW_TYPE_LABELS[interview.interviewType]}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${INTERVIEW_STATUS_COLORS[interview.status]}20`,
              color: INTERVIEW_STATUS_COLORS[interview.status],
            }}
          >
            {INTERVIEW_STATUS_LABELS[interview.status]}
          </span>
        </div>
      </div>

      {interview.conflictDetected && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <Icon icon="mingcute:alert-line" width={16} />
            <span>Schedule conflict detected</span>
          </div>
        </div>
      )}

      {interview.googleCalendarEventId && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <Icon icon="mingcute:check-circle-line" width={16} />
            <span>Synced to Google Calendar</span>
          </div>
        </div>
      )}

      {interview.location && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <Icon icon="mingcute:location-line" width={16} />
          <span>{interview.location}</span>
        </div>
      )}

      {interview.videoLink && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <Icon icon="mingcute:video-line" width={16} />
          <a
            href={interview.videoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            Join Video Call
          </a>
        </div>
      )}

      {interview.phoneNumber && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <Icon icon="mingcute:phone-line" width={16} />
          <span>{interview.phoneNumber}</span>
        </div>
      )}

      {interview.interviewerName && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <Icon icon="mingcute:user-line" width={16} />
          <span>
            {interview.interviewerName}
            {interview.interviewerTitle && ` - ${interview.interviewerTitle}`}
          </span>
        </div>
      )}

      {interview.preparationTasks && interview.preparationTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm font-medium text-slate-700 mb-2">
            Preparation Tasks
          </div>
          <div className="space-y-1">
            {interview.preparationTasks.slice(0, 3).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.updatePreparationTask(
                        interview.id,
                        task.id,
                        { completed: e.target.checked }
                      );
                      // Refresh the interview list
                      await onRefresh();
                    } catch (err) {
                      console.error("Failed to update task:", err);
                    }
                  }}
                  className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                />
                <span
                  className={task.completed ? "line-through text-slate-400" : ""}
                >
                  {task.task}
                </span>
              </div>
            ))}
            {interview.preparationTasks.length > 3 && (
              <div className="text-xs text-slate-500">
                +{interview.preparationTasks.length - 3} more tasks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Interview Schedule Modal Component
function InterviewScheduleModal({
  jobOpportunities,
  onSchedule,
  onClose,
}: {
  jobOpportunities: JobOpportunityData[];
  onSchedule: (data: InterviewInput) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<InterviewInput>({
    jobOpportunityId: "",
    interviewType: "phone",
    scheduledAt: "",
    duration: 60,
    location: "",
    videoLink: "",
    phoneNumber: "",
    interviewerName: "",
    interviewerEmail: "",
    interviewerTitle: "",
    notes: "",
    preparationNotes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const handleChange = (field: keyof InterviewInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const checkForConflicts = async () => {
    if (!formData.scheduledAt || !formData.duration) return;

    try {
      setCheckingConflicts(true);
      const response = await api.checkConflicts(
        formData.scheduledAt,
        formData.duration
      );
      if (response.ok && response.data) {
        setConflicts(response.data.conflicts || []);
      }
    } catch (err) {
      console.error("Failed to check conflicts:", err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  useEffect(() => {
    if (formData.scheduledAt && formData.duration) {
      const timeout = setTimeout(() => {
        checkForConflicts();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData.scheduledAt, formData.duration]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.jobOpportunityId) {
      newErrors.jobOpportunityId = "Please select a job opportunity";
    }

    if (!formData.scheduledAt) {
      newErrors.scheduledAt = "Scheduled time is required";
    } else {
      const scheduledDate = new Date(formData.scheduledAt);
      if (scheduledDate < new Date()) {
        newErrors.scheduledAt = "Scheduled time must be in the future";
      }
    }

    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = "Duration must be at least 15 minutes";
    }

    if (formData.interviewType === "in-person" && !formData.location) {
      newErrors.location = "Location is required for in-person interviews";
    }

    if (formData.interviewType === "video" && !formData.videoLink) {
      newErrors.videoLink = "Video link is required for video interviews";
    }

    if (formData.interviewType === "phone" && !formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required for phone interviews";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSchedule(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-poppins">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={isSubmitting}
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Opportunity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Opportunity <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.jobOpportunityId}
              onChange={(e) => handleChange("jobOpportunityId", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.jobOpportunityId ? "border-red-500" : "border-slate-300"
              }`}
              disabled={isSubmitting}
            >
              <option value="">Select a job opportunity</option>
              {jobOpportunities.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} at {job.company}
                </option>
              ))}
            </select>
            {errors.jobOpportunityId && (
              <p className="text-red-500 text-sm mt-1">{errors.jobOpportunityId}</p>
            )}
          </div>

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Interview Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {INTERVIEW_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange("interviewType", type)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    formData.interviewType === type
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  disabled={isSubmitting}
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: INTERVIEW_TYPE_COLORS[type] }}
                  />
                  <div className="text-sm font-medium text-slate-700">
                    {INTERVIEW_TYPE_LABELS[type]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.scheduledAt ? formData.scheduledAt.split("T")[0] : ""}
                onChange={(e) => {
                  const date = e.target.value;
                  const time = formData.scheduledAt
                    ? formData.scheduledAt.split("T")[1] || "09:00"
                    : "09:00";
                  handleChange("scheduledAt", `${date}T${time}`);
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.scheduledAt ? "border-red-500" : "border-slate-300"
                }`}
                disabled={isSubmitting}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.scheduledAt && (
                <p className="text-red-500 text-sm mt-1">{errors.scheduledAt}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={
                  formData.scheduledAt
                    ? formData.scheduledAt.split("T")[1]?.substring(0, 5) || ""
                    : ""
                }
                onChange={(e) => {
                  const time = e.target.value;
                  const date = formData.scheduledAt
                    ? formData.scheduledAt.split("T")[0]
                    : new Date().toISOString().split("T")[0];
                  handleChange("scheduledAt", `${date}T${time}`);
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.scheduledAt ? "border-red-500" : "border-slate-300"
                }`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleChange("duration", parseInt(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.duration ? "border-red-500" : "border-slate-300"
              }`}
              disabled={isSubmitting}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
            )}
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <Icon icon="mingcute:alert-line" width={20} />
                <span>Schedule Conflict Detected</span>
              </div>
              <div className="text-sm text-red-600">
                This interview conflicts with:
                <ul className="list-disc list-inside mt-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id}>
                      {conflict.title} at {conflict.company} on{" "}
                      {new Date(conflict.scheduled_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Location/Video Link/Phone Number based on type */}
          {formData.interviewType === "in-person" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.location ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="e.g., 123 Main St, San Francisco, CA"
                disabled={isSubmitting}
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>
          )}

          {formData.interviewType === "video" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Video Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.videoLink || ""}
                onChange={(e) => handleChange("videoLink", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.videoLink ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="e.g., https://zoom.us/j/123456789"
                disabled={isSubmitting}
              />
              {errors.videoLink && (
                <p className="text-red-500 text-sm mt-1">{errors.videoLink}</p>
              )}
            </div>
          )}

          {formData.interviewType === "phone" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber || ""}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phoneNumber ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="e.g., +1 (555) 123-4567"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>
          )}

          {/* Interviewer Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interviewer Name
              </label>
              <input
                type="text"
                value={formData.interviewerName || ""}
                onChange={(e) => handleChange("interviewerName", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Doe"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interviewer Title
              </label>
              <input
                type="text"
                value={formData.interviewerTitle || ""}
                onChange={(e) => handleChange("interviewerTitle", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Senior Engineer"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Interviewer Email
            </label>
            <input
              type="email"
              value={formData.interviewerEmail || ""}
              onChange={(e) => handleChange("interviewerEmail", e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., john.doe@company.com"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Additional notes about the interview..."
              disabled={isSubmitting}
            />
          </div>

          {/* Preparation Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Preparation Notes
            </label>
            <textarea
              value={formData.preparationNotes || ""}
              onChange={(e) => handleChange("preparationNotes", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Notes to help you prepare for this interview..."
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || checkingConflicts}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    className="animate-spin"
                    width={20}
                  />
                  Scheduling...
                </>
              ) : (
                "Schedule Interview"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Interview Detail Modal Component
function InterviewDetailModal({
  interview,
  onUpdate,
  onCancel,
  onReschedule,
  onDelete,
  onRefresh,
  onClose,
}: {
  interview: InterviewData;
  onUpdate: (id: string, data: Partial<InterviewInput>) => Promise<void>;
  onCancel: (id: string, reason?: string) => Promise<void>;
  onReschedule: (id: string, scheduledAt: string, duration?: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [outcome, setOutcome] = useState<InterviewOutcome | "">(
    interview.outcome || ""
  );
  const [outcomeNotes, setOutcomeNotes] = useState(interview.outcomeNotes || "");

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const handleUpdateOutcome = async () => {
    await onUpdate(interview.id, {
      outcome: outcome as InterviewOutcome,
      outcomeNotes,
    });
    setIsEditing(false);
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      await api.updatePreparationTask(interview.id, taskId, { completed });
      // Refresh interview data
      await onRefresh();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-poppins">
        <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Interview Details
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="mingcute:close-line" width={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Header Info */}
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-1">
                {interview.title}
              </h3>
              <p className="text-lg font-medium text-slate-700 mb-4">
                {interview.company}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{
                    backgroundColor: INTERVIEW_TYPE_COLORS[interview.interviewType],
                  }}
                >
                  {INTERVIEW_TYPE_LABELS[interview.interviewType]}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${INTERVIEW_STATUS_COLORS[interview.status]}20`,
                    color: INTERVIEW_STATUS_COLORS[interview.status],
                  }}
                >
                  {INTERVIEW_STATUS_LABELS[interview.status]}
                </span>
              </div>
            </div>

            {/* Schedule Info */}
            {interview.scheduledAt && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Date & Time</div>
                    <div className="font-semibold text-slate-900">
                      {formatDateTime(interview.scheduledAt).date}
                    </div>
                    <div className="text-slate-700">
                      {formatDateTime(interview.scheduledAt).time}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Duration</div>
                    <div className="font-semibold text-slate-900">
                      {interview.duration || 60} minutes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conflict Warning */}
            {interview.conflictDetected && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-medium">
                  <Icon icon="mingcute:alert-line" width={20} />
                  <span>Schedule Conflict Detected</span>
                </div>
              </div>
            )}

            {/* Location/Contact Info */}
            <div className="space-y-3">
              {interview.location && (
                <div className="flex items-center gap-3">
                  <Icon icon="mingcute:location-line" width={20} className="text-slate-500" />
                  <div>
                    <div className="text-sm text-slate-600">Location</div>
                    <div className="font-medium text-slate-900">{interview.location}</div>
                  </div>
                </div>
              )}

              {interview.videoLink && (
                <div className="flex items-center gap-3">
                  <Icon icon="mingcute:video-line" width={20} className="text-slate-500" />
                  <div>
                    <div className="text-sm text-slate-600">Video Link</div>
                    <a
                      href={interview.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      Join Video Call
                    </a>
                  </div>
                </div>
              )}

              {interview.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Icon icon="mingcute:phone-line" width={20} className="text-slate-500" />
                  <div>
                    <div className="text-sm text-slate-600">Phone Number</div>
                    <div className="font-medium text-slate-900">{interview.phoneNumber}</div>
                  </div>
                </div>
              )}

              {interview.interviewerName && (
                <div className="flex items-center gap-3">
                  <Icon icon="mingcute:user-line" width={20} className="text-slate-500" />
                  <div>
                    <div className="text-sm text-slate-600">Interviewer</div>
                    <div className="font-medium text-slate-900">
                      {interview.interviewerName}
                      {interview.interviewerTitle && ` - ${interview.interviewerTitle}`}
                    </div>
                    {interview.interviewerEmail && (
                      <div className="text-sm text-slate-600">
                        {interview.interviewerEmail}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {interview.notes && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">Notes</div>
                <div className="text-slate-600 whitespace-pre-wrap">{interview.notes}</div>
              </div>
            )}

            {/* Preparation Notes */}
            {interview.preparationNotes && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">
                  Preparation Notes
                </div>
                <div className="text-slate-600 whitespace-pre-wrap">
                  {interview.preparationNotes}
                </div>
              </div>
            )}

            {/* Preparation Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-700">
                  Preparation Tasks
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.generatePreparationTasks(interview.id);
                      await onRefresh();
                    } catch (err) {
                      console.error("Failed to generate preparation tasks:", err);
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {interview.preparationTasks && interview.preparationTasks.length > 0
                    ? "Regenerate checklist"
                    : "Generate checklist"}
                </button>
              </div>

              {interview.preparationTasks && interview.preparationTasks.length > 0 ? (
                <div className="space-y-2">
                  {interview.preparationTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => handleTaskToggle(task.id, e.target.checked)}
                        className="w-5 h-5 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span
                        className={`flex-1 ${
                          task.completed ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {task.task}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No preparation checklist yet. Click{" "}
                  <span className="font-medium text-blue-600">Generate checklist</span> to
                  create a tailored list of tasks for this role and company.
                </p>
              )}
            </div>

            {/* Outcome */}
            {interview.status === "completed" && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">Outcome</div>
                {!isEditing ? (
                  <div className="space-y-2">
                    {interview.outcome && (
                      <span
                        className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${INTERVIEW_OUTCOME_COLORS[interview.outcome]}20`,
                          color: INTERVIEW_OUTCOME_COLORS[interview.outcome],
                        }}
                      >
                        {INTERVIEW_OUTCOME_LABELS[interview.outcome]}
                      </span>
                    )}
                    {interview.outcomeNotes && (
                      <div className="text-slate-600 whitespace-pre-wrap">
                        {interview.outcomeNotes}
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit Outcome
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value as InterviewOutcome)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select outcome</option>
                      {INTERVIEW_OUTCOMES.map((outcomeOption) => (
                        <option key={outcomeOption} value={outcomeOption}>
                          {INTERVIEW_OUTCOME_LABELS[outcomeOption]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={outcomeNotes}
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Outcome notes..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateOutcome}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setOutcome(interview.outcome || "");
                          setOutcomeNotes(interview.outcomeNotes || "");
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              {interview.status === "scheduled" && (
                <>
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm inline-flex items-center gap-2"
                  >
                    <Icon icon="mingcute:refresh-line" width={16} />
                    Reschedule
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm inline-flex items-center gap-2"
                  >
                    <Icon icon="mingcute:close-line" width={16} />
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm inline-flex items-center gap-2"
              >
                <Icon icon="mingcute:delete-line" width={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelInterviewModal
          interview={interview}
          onCancel={async (reason) => {
            await onCancel(interview.id, reason);
            setShowCancelModal(false);
            onClose();
          }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <RescheduleInterviewModal
          interview={interview}
          onReschedule={async (scheduledAt, duration) => {
            await onReschedule(interview.id, scheduledAt, duration);
            setShowRescheduleModal(false);
            onClose();
          }}
          onClose={() => setShowRescheduleModal(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteInterviewModal
          interview={interview}
          onDelete={async () => {
            await onDelete(interview.id);
            setShowDeleteModal(false);
            onClose();
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

// Cancel Interview Modal
function CancelInterviewModal({
  interview,
  onCancel,
  onClose,
}: {
  interview: InterviewData;
  onCancel: (reason?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);
    try {
      await onCancel(reason || undefined);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 font-poppins">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Cancel Interview</h2>
        <p className="text-slate-600 mb-4">
          Are you sure you want to cancel this interview?
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cancellation Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="e.g., Rescheduled to a different time"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCancelling}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              Keep Interview
            </button>
            <button
              type="submit"
              disabled={isCancelling}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCancelling ? (
                <>
                  <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                  Cancelling...
                </>
              ) : (
                "Cancel Interview"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reschedule Interview Modal
function RescheduleInterviewModal({
  interview,
  onReschedule,
  onClose,
}: {
  interview: InterviewData;
  onReschedule: (scheduledAt: string, duration?: number) => Promise<void>;
  onClose: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(
    interview.scheduledAt ? interview.scheduledAt.split("T")[0] : ""
  );
  const [scheduledTime, setScheduledTime] = useState(
    interview.scheduledAt
      ? interview.scheduledAt.split("T")[1]?.substring(0, 5) || "09:00"
      : "09:00"
  );
  const [duration, setDuration] = useState(interview.duration || 60);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

  const checkForConflicts = async () => {
    if (!scheduledAt || !scheduledTime) return;

    try {
      const fullDateTime = `${scheduledAt}T${scheduledTime}`;
      const response = await api.checkConflicts(fullDateTime, duration, interview.id);
      if (response.ok && response.data) {
        setConflicts(response.data.conflicts || []);
      }
    } catch (err) {
      console.error("Failed to check conflicts:", err);
    }
  };

  useEffect(() => {
    if (scheduledAt && scheduledTime) {
      const timeout = setTimeout(() => {
        checkForConflicts();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [scheduledAt, scheduledTime, duration]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!scheduledAt) {
      newErrors.scheduledAt = "Date is required";
    }

    if (!scheduledTime) {
      newErrors.scheduledTime = "Time is required";
    } else {
      const fullDateTime = `${scheduledAt}T${scheduledTime}`;
      const scheduledDate = new Date(fullDateTime);
      if (scheduledDate < new Date()) {
        newErrors.scheduledAt = "Scheduled time must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsRescheduling(true);
    try {
      const fullDateTime = `${scheduledAt}T${scheduledTime}`;
      await onReschedule(fullDateTime, duration);
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 font-poppins">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Reschedule Interview</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.scheduledAt ? "border-red-500" : "border-slate-300"
                }`}
                min={new Date().toISOString().split("T")[0]}
                disabled={isRescheduling}
              />
              {errors.scheduledAt && (
                <p className="text-red-500 text-sm mt-1">{errors.scheduledAt}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.scheduledTime ? "border-red-500" : "border-slate-300"
                }`}
                disabled={isRescheduling}
              />
              {errors.scheduledTime && (
                <p className="text-red-500 text-sm mt-1">{errors.scheduledTime}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isRescheduling}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {conflicts.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <Icon icon="mingcute:alert-line" width={20} />
                <span>Schedule Conflict Detected</span>
              </div>
              <div className="text-sm text-red-600">
                This time conflicts with:
                <ul className="list-disc list-inside mt-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id}>
                      {conflict.title} at {conflict.company}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isRescheduling}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRescheduling}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRescheduling ? (
                <>
                  <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                  Rescheduling...
                </>
              ) : (
                "Reschedule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Interview Modal
function DeleteInterviewModal({
  interview,
  onDelete,
  onClose,
}: {
  interview: InterviewData;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 font-poppins">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon="mingcute:alert-fill" className="text-red-500" width={32} />
          <h2 className="text-2xl font-bold text-slate-900">Delete Interview?</h2>
        </div>
        <p className="text-slate-600 mb-4">
          Are you sure you want to delete this interview? This action cannot be undone.
        </p>
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-slate-900">{interview.title}</p>
          <p className="text-sm text-slate-600">{interview.company}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

