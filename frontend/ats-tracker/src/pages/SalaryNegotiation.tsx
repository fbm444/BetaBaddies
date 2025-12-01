import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import { NegotiationDetailModal } from "../components/salary-negotiation/NegotiationDetailModal";
import type {
  SalaryNegotiation,
  SalaryNegotiationInput,
  CompensationPackage,
  MarketSalaryData,
  TalkingPoint,
  NegotiationScript,
  TimingStrategy,
  SalaryProgressionEntry,
  JobOpportunityData,
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [loadingJobOpportunities, setLoadingJobOpportunities] = useState(false);
  const [creatingNegotiation, setCreatingNegotiation] = useState(false);

  // Form state for creating negotiation
  const [formData, setFormData] = useState({
    jobOpportunityId: "",
    initialOffer: {
      baseSalary: "",
      bonus: "",
      equity: "",
      benefitsValue: "",
      currency: "USD",
      date: new Date().toISOString().split("T")[0],
    },
    targetCompensation: {
      baseSalary: "",
      bonus: "",
      equity: "",
      benefitsValue: "",
    },
  });

  useEffect(() => {
    fetchNegotiations();
    fetchJobOpportunities();
  }, []);

  const fetchJobOpportunities = async () => {
    try {
      setLoadingJobOpportunities(true);
      const response = await api.getJobOpportunities({ status: "Offer" as any });
      if (response.ok && response.data) {
        const opportunities = response.data.jobOpportunities || [];
        setJobOpportunities(opportunities);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunities:", err);
    } finally {
      setLoadingJobOpportunities(false);
    }
  };

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

  const handleCreateNegotiation = async () => {
    if (!formData.jobOpportunityId) {
      showMessage("Please select a job opportunity", "error");
      return;
    }

    if (!formData.initialOffer.baseSalary) {
      showMessage("Please enter the initial base salary", "error");
      return;
    }

    try {
      setCreatingNegotiation(true);
      const negotiationData: SalaryNegotiationInput = {
        jobOpportunityId: formData.jobOpportunityId,
        offerData: {
          initialOffer: {
            baseSalary: parseFloat(formData.initialOffer.baseSalary) || 0,
            bonus: parseFloat(formData.initialOffer.bonus) || 0,
            equity: parseFloat(formData.initialOffer.equity) || 0,
            benefitsValue: parseFloat(formData.initialOffer.benefitsValue) || 0,
            currency: formData.initialOffer.currency,
          },
          targetCompensation: formData.targetCompensation.baseSalary
            ? {
                baseSalary: parseFloat(formData.targetCompensation.baseSalary) || 0,
                bonus: parseFloat(formData.targetCompensation.bonus) || 0,
                equity: parseFloat(formData.targetCompensation.equity) || 0,
                benefitsValue: parseFloat(formData.targetCompensation.benefitsValue) || 0,
              }
            : undefined,
          initialOfferDate: formData.initialOffer.date,
        },
      };

      const response = await api.createSalaryNegotiation(negotiationData);
      if (response.ok && response.data?.negotiation) {
        showMessage("Salary negotiation created successfully!", "success");
        setShowCreateModal(false);
        // Reset form
        setFormData({
          jobOpportunityId: "",
          initialOffer: {
            baseSalary: "",
            bonus: "",
            equity: "",
            benefitsValue: "",
            currency: "USD",
            date: new Date().toISOString().split("T")[0],
          },
          targetCompensation: {
            baseSalary: "",
            bonus: "",
            equity: "",
            benefitsValue: "",
          },
        });
        // Refresh negotiations list
        await fetchNegotiations();
      } else {
        showMessage(response.error || "Failed to create negotiation", "error");
      }
    } catch (err: any) {
      console.error("Failed to create negotiation:", err);
      showMessage(err.message || "Failed to create negotiation", "error");
    } finally {
      setCreatingNegotiation(false);
    }
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
                  onClick={() => setShowCreateModal(true)}
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
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    Start New Negotiation
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {negotiations.map((negotiation) => (
                    <div
                      key={negotiation.id}
                      className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedNegotiation(negotiation);
                        setShowDetailModal(true);
                      }}
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
                    onClick={() => {
                      setSelectedNegotiation(negotiation);
                      setShowDetailModal(true);
                    }}
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

      {/* Create Negotiation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Start New Salary Negotiation</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateNegotiation();
              }}
              className="space-y-6"
            >
              {/* Job Opportunity Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Opportunity <span className="text-red-500">*</span>
                </label>
                {loadingJobOpportunities ? (
                  <div className="text-sm text-slate-500">Loading job opportunities...</div>
                ) : jobOpportunities.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                      No job opportunities with "Offer" status found.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        navigate(ROUTES.JOB_OPPORTUNITIES);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Go to Job Opportunities to create one
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.jobOpportunityId}
                    onChange={(e) =>
                      setFormData({ ...formData, jobOpportunityId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a job opportunity...</option>
                    {jobOpportunities.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} @ {job.company} - {job.location}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Initial Offer Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Initial Offer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Base Salary <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.initialOffer.baseSalary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialOffer: { ...formData.initialOffer, baseSalary: e.target.value },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="200000"
                        required
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bonus</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.initialOffer.bonus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialOffer: { ...formData.initialOffer, bonus: e.target.value },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="30000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Equity</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.initialOffer.equity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialOffer: { ...formData.initialOffer, equity: e.target.value },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="50000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Benefits Value</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.initialOffer.benefitsValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialOffer: { ...formData.initialOffer, benefitsValue: e.target.value },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="15000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                    <select
                      value={formData.initialOffer.currency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initialOffer: { ...formData.initialOffer, currency: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Offer Date</label>
                    <input
                      type="date"
                      value={formData.initialOffer.date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initialOffer: { ...formData.initialOffer, date: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Calculated Total */}
                {formData.initialOffer.baseSalary && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Total Initial Compensation:</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(
                        (parseFloat(formData.initialOffer.baseSalary) || 0) +
                        (parseFloat(formData.initialOffer.bonus) || 0) +
                        (parseFloat(formData.initialOffer.equity) || 0) +
                        (parseFloat(formData.initialOffer.benefitsValue) || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Target Compensation Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Target Compensation (Optional)</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Set your target compensation. You can update this later.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Base Salary</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.targetCompensation.baseSalary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetCompensation: {
                              ...formData.targetCompensation,
                              baseSalary: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="230000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Bonus</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.targetCompensation.bonus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetCompensation: {
                              ...formData.targetCompensation,
                              bonus: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="40000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Equity</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.targetCompensation.equity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetCompensation: {
                              ...formData.targetCompensation,
                              equity: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="70000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Benefits Value</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.targetCompensation.benefitsValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetCompensation: {
                              ...formData.targetCompensation,
                              benefitsValue: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="15000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Target Total */}
                {formData.targetCompensation.baseSalary && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Total Target Compensation:</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(
                        (parseFloat(formData.targetCompensation.baseSalary) || 0) +
                        (parseFloat(formData.targetCompensation.bonus) || 0) +
                        (parseFloat(formData.targetCompensation.equity) || 0) +
                        (parseFloat(formData.targetCompensation.benefitsValue) || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingNegotiation || !formData.jobOpportunityId || !formData.initialOffer.baseSalary}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingNegotiation ? "Creating..." : "Create Negotiation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Negotiation Detail Modal */}
      {showDetailModal && selectedNegotiation && (
        <NegotiationDetailModal
          negotiation={selectedNegotiation}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedNegotiation(null);
          }}
          onUpdate={() => {
            fetchNegotiations();
          }}
        />
      )}
    </div>
  );
}

