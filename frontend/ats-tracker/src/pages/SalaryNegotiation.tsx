import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import type {
  SalaryNegotiation,
  SalaryNegotiationInput,
  CompensationPackage,
  MarketSalaryData,
  TalkingPoint,
  NegotiationScript,
  TimingStrategy,
  SalaryProgressionEntry,
} from "../types";

type TabType = "overview" | "active" | "market-research" | "progression";

export function SalaryNegotiation() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [negotiations, setNegotiations] = useState<SalaryNegotiation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected negotiation for detail view
  const [selectedNegotiation, setSelectedNegotiation] = useState<SalaryNegotiation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchNegotiations();
  }, []);

  const fetchNegotiations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getSalaryNegotiations();
      if (response.ok && response.data?.negotiations) {
        setNegotiations(response.data.negotiations);
      }
    } catch (err: any) {
      console.error("Failed to fetch negotiations:", err);
      setError(err.message || "Failed to load salary negotiations");
    } finally {
      setIsLoading(false);
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

  const activeNegotiations = negotiations.filter((n) => n.status === "active");
  const completedNegotiations = negotiations.filter((n) => n.status === "completed");

  // Calculate stats
  const stats = {
    active: activeNegotiations.length,
    completed: completedNegotiations.length,
    avgIncrease: completedNegotiations.length > 0
      ? completedNegotiations.reduce((sum, n) => {
          const initial = n.initialOffer?.totalCompensation || 0;
          const final = n.finalCompensation?.totalCompensation || 0;
          if (initial > 0 && final > 0) {
            return sum + ((final - initial) / initial) * 100;
          }
          return sum;
        }, 0) / completedNegotiations.length
      : 0,
    totalSaved: completedNegotiations.reduce((sum, n) => {
      const initial = n.initialOffer?.totalCompensation || 0;
      const final = n.finalCompensation?.totalCompensation || 0;
      return sum + Math.max(0, final - initial);
    }, 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-500"
          />
          <p className="mt-4 text-slate-600">Loading salary negotiations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Salary Negotiation
          </h1>
          <p className="text-slate-600">
            Manage your salary negotiations and track your compensation progression
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600" />
            <p className="text-green-800 text-sm m-0">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
            <p className="text-red-800 text-sm m-0">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "active", label: "Active Negotiations" },
              { id: "market-research", label: "Market Research" },
              { id: "progression", label: "Progression" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Active Negotiations</p>
                  <Icon icon="mingcute:briefcase-line" width={24} className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Avg. Increase</p>
                  <Icon icon="mingcute:trending-up-line" width={24} className="text-green-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.avgIncrease > 0 ? `+${stats.avgIncrease.toFixed(1)}%` : "0%"}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Total Saved</p>
                  <Icon icon="mingcute:dollar-line" width={24} className="text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  ${stats.totalSaved.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Negotiations List */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">All Negotiations</h2>
                <button
                  onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                >
                  Start New Negotiation
                </button>
              </div>

              {negotiations.length === 0 ? (
                <div className="p-12 text-center">
                  <Icon icon="mingcute:briefcase-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No salary negotiations yet</p>
                  <p className="text-sm text-slate-500 mb-6">
                    Start a negotiation from a job opportunity with an offer
                  </p>
                  <button
                    onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    View Job Opportunities
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {negotiations.map((negotiation) => (
                    <div
                      key={negotiation.id}
                      className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedNegotiation(negotiation)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">
                            {negotiation.jobTitle || "Position"} @ {negotiation.company || "Company"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>
                              Initial: ${negotiation.initialOffer?.totalCompensation?.toLocaleString() || "N/A"}
                            </span>
                            {negotiation.targetCompensation?.totalCompensation && (
                              <span>
                                Target: ${negotiation.targetCompensation.totalCompensation.toLocaleString()}
                              </span>
                            )}
                            {negotiation.finalCompensation?.totalCompensation && (
                              <span className="text-green-600 font-medium">
                                Final: ${negotiation.finalCompensation.totalCompensation.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              negotiation.status === "active"
                                ? "bg-blue-100 text-blue-700"
                                : negotiation.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {negotiation.status}
                          </span>
                          <Icon icon="mingcute:arrow-right-line" width={20} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "active" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Active Negotiations</h2>
            {activeNegotiations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Icon icon="mingcute:briefcase-line" width={48} className="text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No active negotiations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeNegotiations.map((negotiation) => (
                  <div
                    key={negotiation.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedNegotiation(negotiation)}
                  >
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {negotiation.jobTitle} @ {negotiation.company}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Initial: ${negotiation.initialOffer?.totalCompensation?.toLocaleString()} | 
                      Target: ${negotiation.targetCompensation?.totalCompensation?.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "market-research" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Market Research</h2>
            <p className="text-slate-600 mb-6">
              Market research data is available when viewing individual negotiations
            </p>
          </div>
        )}

        {activeTab === "progression" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Salary Progression</h2>
            <p className="text-slate-600 mb-6">
              Track your salary progression over time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

