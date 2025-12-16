import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { SuccessMetricsCard } from "../components/optimization/SuccessMetricsCard";
import { DocumentPerformanceCard } from "../components/optimization/DocumentPerformanceCard";
import { StrategyTrackingCard } from "../components/optimization/StrategyTrackingCard";
import { TimingAnalysisCard } from "../components/optimization/TimingAnalysisCard";
import { RoleTypeAnalysisCard } from "../components/optimization/RoleTypeAnalysisCard";
import { OptimizationRecommendationsCard } from "../components/optimization/OptimizationRecommendationsCard";
import { ABTestingCard } from "../components/optimization/ABTestingCard";
import { TrendVisualizationCard } from "../components/optimization/TrendVisualizationCard";

export function ApplicationSuccessOptimization() {
  const [activeTab, setActiveTab] = useState<string>("metrics");
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  const tabs = [
    { id: "metrics", label: "Success Metrics", icon: "mingcute:chart-line" },
    { id: "documents", label: "Document Performance", icon: "mingcute:file-line" },
    { id: "strategies", label: "Application Strategies", icon: "mingcute:target-line" },
    { id: "timing", label: "Timing Analysis", icon: "mingcute:time-line" },
    { id: "roles", label: "Role Type Analysis", icon: "mingcute:briefcase-line" },
    { id: "recommendations", label: "Recommendations", icon: "mingcute:lightbulb-line" },
    { id: "ab-tests", label: "A/B Tests", icon: "mingcute:experiment-line" },
    { id: "trends", label: "Trends", icon: "mingcute:trending-up-line" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-poppins">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Application Success Optimization
              </h1>
              <p className="text-slate-600">
                Optimize your application strategy with data-driven insights
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-4 items-center mt-4">
            <div className="flex items-center gap-2">
              <Icon icon="mingcute:calendar-line" className="text-slate-600" width={20} />
              <span className="text-sm font-medium text-slate-700">Date Range:</span>
            </div>
            <input
              type="date"
              value={dateRange.startDate || ""}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.endDate || ""}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={() => setDateRange({})}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-white border-t border-l border-r border-slate-200 text-blue-600 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon icon={tab.icon} width={18} height={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === "metrics" && <SuccessMetricsCard dateRange={dateRange} />}
          {activeTab === "documents" && <DocumentPerformanceCard dateRange={dateRange} />}
          {activeTab === "strategies" && <StrategyTrackingCard dateRange={dateRange} />}
          {activeTab === "timing" && <TimingAnalysisCard dateRange={dateRange} />}
          {activeTab === "roles" && <RoleTypeAnalysisCard dateRange={dateRange} />}
          {activeTab === "recommendations" && <OptimizationRecommendationsCard dateRange={dateRange} />}
          {activeTab === "ab-tests" && <ABTestingCard dateRange={dateRange} />}
          {activeTab === "trends" && <TrendVisualizationCard dateRange={dateRange} />}
        </div>
      </div>
    </div>
  );
}

