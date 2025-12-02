import { useState } from "react";
import { Icon } from "@iconify/react";
import { JobSearchPerformance } from "../components/analytics/JobSearchPerformance";
import { ApplicationSuccessAnalysis } from "../components/analytics/ApplicationSuccessAnalysis";
import { InterviewPerformance } from "../components/analytics/InterviewPerformance";
import { NetworkROI } from "../components/analytics/NetworkROI";
import { SalaryProgression } from "../components/analytics/SalaryProgression";
import { GoalTracking } from "../components/analytics/GoalTracking";
import { TimeProductivityAnalysis } from "../components/analytics/TimeProductivityAnalysis";

type TabId = "performance" | "success" | "interview" | "network" | "salary" | "goals" | "productivity";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  component: React.ReactNode;
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState<TabId>("performance");
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  const tabs: Tab[] = [
    {
      id: "performance",
      label: "Job Search Performance",
      icon: "mingcute:chart-line",
      component: <JobSearchPerformance dateRange={dateRange} />,
    },
    {
      id: "success",
      label: "Application Success",
      icon: "mingcute:target-line",
      component: <ApplicationSuccessAnalysis dateRange={dateRange} />,
    },
    {
      id: "interview",
      label: "Interview Performance",
      icon: "mingcute:chat-smile-line",
      component: <InterviewPerformance dateRange={dateRange} />,
    },
    {
      id: "network",
      label: "Network ROI",
      icon: "mingcute:user-community-line",
      component: <NetworkROI dateRange={dateRange} />,
    },
    {
      id: "salary",
      label: "Salary Progression",
      icon: "mingcute:money-line",
      component: <SalaryProgression dateRange={dateRange} />,
    },
    {
      id: "goals",
      label: "Goal Setting",
      icon: "mingcute:target-2-line",
      component: <GoalTracking dateRange={dateRange} />,
    },
    {
      id: "productivity",
      label: "Time Productivity",
      icon: "mingcute:time-line",
      component: <TimeProductivityAnalysis dateRange={dateRange} />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const handleDateRangeChange = (startDate?: string, endDate?: string) => {
    setDateRange({ startDate, endDate });
  };

  return (
    <div className="min-h-screen bg-white font-poppins">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#0F1D3A] mb-2">Analytics Dashboard</h1>
          <p className="text-sm text-[#6D7A99]">
            Comprehensive insights into your job search performance
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:calendar-line" className="text-[#6D7A99]" width={20} />
            <span className="text-sm font-medium text-[#0F1D3A]">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.startDate || ""}
            onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate)}
            className="px-3 py-2 border border-[#E4E8F5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
          />
          <span className="text-[#6D7A99]">to</span>
          <input
            type="date"
            value={dateRange.endDate || ""}
            onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.value)}
            className="px-3 py-2 border border-[#E4E8F5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
          />
          {(dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={() => setDateRange({})}
              className="px-3 py-2 text-sm text-[#6D7A99] hover:text-[#0F1D3A] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 font-medium text-sm whitespace-nowrap flex items-center flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent relative ${
                  activeTab === tab.id
                    ? "text-blue-500"
                    : "text-slate-600"
                }`}
                style={{ 
                  outline: 'none', 
                  boxShadow: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderRadius: '0'
                }}
                onFocus={(e) => e.target.blur()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="flex-shrink-0">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
          {activeTabData?.component}
        </div>
      </div>
    </div>
  );
}

