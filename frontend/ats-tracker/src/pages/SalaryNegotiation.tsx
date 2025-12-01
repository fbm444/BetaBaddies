import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import { NegotiationDetailModal } from "../components/salary-negotiation/NegotiationDetailModal";
import { AddProgressionEntryModal } from "../components/salary-negotiation/AddProgressionEntryModal";
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
  JobData,
} from "../types";
import { SalaryProgressionChart } from "../components/salary-negotiation/SalaryProgressionChart";

type TabType = "overview" | "market-research" | "progression";
type StatusFilter = "all" | "active" | "completed" | "draft" | "archived";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [progressionEntries, setProgressionEntries] = useState<SalaryProgressionEntry[]>([]);
  const [employmentJobs, setEmploymentJobs] = useState<JobData[]>([]);
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [showAddProgressionModal, setShowAddProgressionModal] = useState(false);

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
    // Always fetch progression data on mount so employment data is available
    fetchProgression();
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

  const fetchProgression = async () => {
    try {
      setLoadingProgression(true);
      // Fetch both salary progression entries and employment data
      const [progressionRes, jobsRes] = await Promise.all([
        api.getSalaryProgression().catch((err) => {
          console.error("Error fetching progression:", err);
          return { ok: false, data: { progression: [] } };
        }),
        api.getJobs().catch((err) => {
          console.error("Error fetching jobs:", err);
          return { ok: false, data: { jobs: [] } };
        }),
      ]);

      console.log("Progression response:", progressionRes);
      console.log("Jobs response:", jobsRes);
      console.log("Jobs response data:", jobsRes.data);
      console.log("Jobs response data.jobs:", jobsRes.data?.jobs);

      if (progressionRes.ok && progressionRes.data?.progression) {
        console.log("Setting progression entries:", progressionRes.data.progression);
        setProgressionEntries(progressionRes.data.progression);
      } else {
        setProgressionEntries([]);
      }

      // Extract jobs from response - same structure as Employment.tsx uses
      if (jobsRes.ok && jobsRes.data) {
        const jobsList = jobsRes.data.jobs || [];
        console.log("All jobs from API:", jobsList);
        console.log("Jobs response structure:", jobsRes);
        
        // Filter jobs that have salary data and startDate
        const jobsWithSalary = jobsList.filter((job: JobData) => {
          if (!job) return false;
          
          // Check for salary - can be number or string
          const salaryValue = typeof job.salary === 'string' ? parseFloat(job.salary) : job.salary;
          const hasSalary = salaryValue && !isNaN(salaryValue) && salaryValue > 0;
          const hasStartDate = job.startDate && job.startDate.trim() !== '';
          
          console.log(`Job ${job.title || 'Unknown'} @ ${job.company || 'Unknown'}: salary=${job.salary} (parsed: ${salaryValue}), startDate=${job.startDate}, hasSalary=${hasSalary}, hasStartDate=${hasStartDate}`);
          
          return hasSalary && hasStartDate;
        });
        
        console.log("Jobs with salary after filtering:", jobsWithSalary);
        console.log("Setting employment jobs:", jobsWithSalary);
        setEmploymentJobs(jobsWithSalary);
      } else {
        console.log("Jobs response not ok or no data. Response:", jobsRes);
        setEmploymentJobs([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch salary progression:", err);
      setProgressionEntries([]);
      setEmploymentJobs([]);
    } finally {
      setLoadingProgression(false);
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
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to create negotiation";
        showMessage(errorMessage, "error");
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
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Negotiations</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                  >
                    Start New Negotiation
                  </button>
                </div>
                
                {/* Status Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-600 font-medium">Filter:</span>
                  {[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value as StatusFilter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === filter.value
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const filteredNegotiations = statusFilter === "all" 
                  ? negotiations 
                  : negotiations.filter((n) => n.status === statusFilter);
                
                if (filteredNegotiations.length === 0) {
                  return (
                    <div className="p-12 text-center">
                      <Icon icon="mingcute:briefcase-line" width={48} className="text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 mb-4">
                        {statusFilter === "all" 
                          ? "No salary negotiations yet"
                          : `No ${statusFilter} negotiations`}
                      </p>
                      {statusFilter === "all" && (
                        <>
                          <p className="text-sm text-slate-500 mb-6">
                            Start a negotiation from a job opportunity with an offer
                          </p>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                          >
                            Start New Negotiation
                          </button>
                        </>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="divide-y divide-slate-200">
                    {filteredNegotiations.map((negotiation) => (
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
              );
              })()}
            </div>
          </div>
        )}

        {activeTab === "market-research" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Market Research</h2>
              <p className="text-slate-600">
                View market salary data for all your negotiations
              </p>
            </div>

            {negotiations.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
                <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">No negotiations yet</p>
                <p className="text-sm text-slate-500">
                  Create a negotiation to see market research data here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {negotiations
                  .filter((neg) => neg.marketSalaryData)
                  .map((negotiation) => {
                    const marketData = negotiation.marketSalaryData!;
                    const offerTotal = negotiation.initialOffer?.totalCompensation || 0;

                    return (
                      <div
                        key={negotiation.id}
                        className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-colors"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                              {negotiation.jobTitle || "Unknown Role"}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Icon icon="mingcute:building-line" width={16} />
                                {negotiation.company || "Unknown Company"}
                              </span>
                              {negotiation.location && (
                                <span className="flex items-center gap-1">
                                  <Icon icon="mingcute:map-pin-line" width={16} />
                                  {negotiation.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedNegotiation(negotiation);
                              setShowDetailModal(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            View Details
                            <Icon icon="mingcute:arrow-right-line" width={16} />
                          </button>
                        </div>

                        {/* Market Data Percentiles */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1 font-medium">25th Percentile</p>
                            <p className="text-xl font-bold text-slate-900">
                              ${(marketData.percentile25 || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Lower range</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                            <p className="text-xs text-blue-700 mb-1 font-semibold">50th Percentile (Median)</p>
                            <p className="text-2xl font-bold text-blue-900">
                              ${(marketData.percentile50 || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Market average</p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1 font-medium">75th Percentile</p>
                            <p className="text-xl font-bold text-slate-900">
                              ${(marketData.percentile75 || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Upper range</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700 mb-1 font-medium">90th Percentile</p>
                            <p className="text-xl font-bold text-purple-900">
                              ${(marketData.percentile90 || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">Top performers</p>
                          </div>
                        </div>

                        {/* Your Offer Comparison */}
                        {offerTotal > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-5 border border-blue-200 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 mb-1">Your Initial Offer</p>
                                <p className="text-2xl font-bold text-blue-900">
                                  ${offerTotal.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-600 mb-1">Market Position</p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {offerTotal < (marketData.percentile25 || 0)
                                    ? "Below 25th percentile"
                                    : offerTotal < (marketData.percentile50 || 0)
                                    ? "25th-50th percentile"
                                    : offerTotal < (marketData.percentile75 || 0)
                                    ? "50th-75th percentile"
                                    : offerTotal < (marketData.percentile90 || 0)
                                    ? "75th-90th percentile"
                                    : "Above 90th percentile"}
                                </p>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      marketData.percentile90 > marketData.percentile25
                                        ? ((offerTotal - (marketData.percentile25 || 0)) /
                                            ((marketData.percentile90 || 1) - (marketData.percentile25 || 0))) *
                                            100
                                        : 50
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="flex justify-between mt-2 text-xs text-slate-600">
                                <span>${(marketData.percentile25 || 0).toLocaleString()}</span>
                                <span>${(marketData.percentile90 || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Market Insights */}
                        {marketData.notes && (
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon="mingcute:lightbulb-line" width={18} className="text-yellow-500" />
                              <h5 className="text-sm font-semibold text-slate-900">Market Insights</h5>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {marketData.notes}
                            </p>
                          </div>
                        )}

                        {/* Footer Info */}
                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Icon icon="mingcute:information-line" width={14} />
                              <span>Source: {marketData.source || "AI Generated"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Icon icon="mingcute:calendar-line" width={14} />
                              <span>Updated: {new Date(marketData.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                            Cached
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {negotiations.filter((neg) => neg.marketSalaryData).length === 0 && (
                  <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
                    <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-2">No market research data available</p>
                    <p className="text-sm text-slate-500 mb-6">
                      Market research data will appear here once you generate it for your negotiations
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("overview");
                        setStatusFilter("active");
                      }}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                    >
                      View Active Negotiations
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "progression" && (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Salary Progression</h2>
                  <p className="text-blue-100 text-lg">
                    Track your compensation growth and career trajectory
                  </p>
                </div>
                <button
                  onClick={() => setShowAddProgressionModal(true)}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-semibold flex items-center gap-2 shadow-lg transition-all"
                >
                  <Icon icon="mingcute:add-line" width={18} />
                  Add Entry
                </button>
              </div>
            </div>

            {loadingProgression ? (
              <div className="bg-white rounded-xl p-16 text-center border border-slate-200 shadow-sm">
                <Icon
                  icon="mingcute:loading-line"
                  className="w-16 h-16 animate-spin mx-auto text-blue-500 mb-6"
                />
                <p className="text-slate-600 text-lg font-medium">Loading progression data...</p>
                <p className="text-slate-500 text-sm mt-2">Fetching your salary history</p>
              </div>
            ) : (() => {
              // Combine progression entries and employment jobs
              const combinedData: Array<{
                id: string;
                date: string;
                salary: number;
                roleTitle: string;
                company: string;
                location?: string;
                source: "progression" | "employment";
              }> = [];

              console.log("Progression entries:", progressionEntries);
              console.log("Employment jobs:", employmentJobs);

              // Add progression entries
              if (progressionEntries && progressionEntries.length > 0) {
                progressionEntries.forEach((entry) => {
                  if (entry && entry.effectiveDate && entry.totalCompensation) {
                    combinedData.push({
                      id: entry.id,
                      date: entry.effectiveDate,
                      salary: entry.totalCompensation,
                      roleTitle: entry.roleTitle || "Unknown Role",
                      company: entry.company || "Unknown Company",
                      location: entry.location,
                      source: "progression",
                    });
                  }
                });
              }

              // Add employment jobs with salary
              if (employmentJobs && employmentJobs.length > 0) {
                console.log("Adding employment jobs to combined data:", employmentJobs);
                employmentJobs.forEach((job) => {
                  if (job && job.startDate) {
                    // Handle salary as number or string
                    const salaryValue = typeof job.salary === 'string' ? parseFloat(job.salary) : (job.salary || 0);
                    if (salaryValue > 0) {
                      combinedData.push({
                        id: `employment-${job.id}`,
                        date: job.startDate,
                        salary: salaryValue,
                        roleTitle: job.title || "Unknown Role",
                        company: job.company || "Unknown Company",
                        location: job.location,
                        source: "employment",
                      });
                    }
                  }
                });
              } else {
                console.log("No employment jobs to add. employmentJobs:", employmentJobs);
              }

              console.log("Combined data:", combinedData);

              // Sort by date
              combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (combinedData.length === 0) {
                return (
                  <div className="bg-white rounded-xl p-16 text-center border border-slate-200 shadow-sm">
                    <div className="max-w-md mx-auto">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon icon="mingcute:chart-line" width={48} className="text-blue-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">No Salary Data Yet</h3>
                      <p className="text-slate-600 mb-6 leading-relaxed">
                        Start tracking your salary progression by adding salary information to your employment history or creating manual entries.
                      </p>
                      <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <Icon icon="mingcute:check-circle-line" width={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-700">
                            Add salary to your employment entries in the <strong>Employment</strong> page
                          </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <Icon icon="mingcute:check-circle-line" width={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-700">
                            Or manually add progression entries using the button above
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddProgressionModal(true)}
                        className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Icon icon="mingcute:add-line" width={18} className="inline mr-2" />
                        Add First Entry
                      </button>
                    </div>
                  </div>
                );
              }

              const firstEntry = combinedData[0];
              const lastEntry = combinedData[combinedData.length - 1];
              const totalIncrease = lastEntry.salary - firstEntry.salary;
              const percentIncrease = firstEntry.salary > 0
                ? (totalIncrease / firstEntry.salary) * 100
                : 0;
              const avgIncrease = combinedData.length > 1
                ? totalIncrease / (combinedData.length - 1)
                : 0;

              // Convert to chart format
              const chartEntries: SalaryProgressionEntry[] = combinedData.map((item) => ({
                id: item.id,
                baseSalary: item.salary,
                totalCompensation: item.salary,
                currency: "USD",
                roleTitle: item.roleTitle,
                company: item.company,
                location: item.location,
                effectiveDate: item.date,
                createdAt: item.date,
              }));

              return (
                <>
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-green-700">Current Salary</p>
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <Icon icon="mingcute:dollar-line" width={24} className="text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-bold text-green-900 mb-1">
                        ${lastEntry.salary.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-700 font-medium">
                        {lastEntry.roleTitle} @ {lastEntry.company}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-blue-700">Total Increase</p>
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Icon icon="mingcute:trending-up-line" width={24} className="text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-bold text-blue-900 mb-1">
                        ${totalIncrease.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-700 font-medium">
                        {percentIncrease > 0 ? `+${percentIncrease.toFixed(1)}%` : `${percentIncrease.toFixed(1)}%`} growth
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-purple-700">Avg. Per Move</p>
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Icon icon="mingcute:arrow-up-line" width={24} className="text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-bold text-purple-900 mb-1">
                        ${avgIncrease > 0 ? `+${Math.round(avgIncrease).toLocaleString()}` : Math.round(avgIncrease).toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-700 font-medium">
                        {combinedData.length - 1} career moves
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-orange-700">Data Points</p>
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <Icon icon="mingcute:file-list-line" width={24} className="text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-bold text-orange-900 mb-1">
                        {combinedData.length}
                      </p>
                      <p className="text-xs text-orange-700 font-medium">
                        {progressionEntries.length} negotiation{progressionEntries.length !== 1 ? 's' : ''}, {employmentJobs.length} job{employmentJobs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">Compensation Over Time</h3>
                        <p className="text-slate-600 text-sm mt-1">Visual representation of your salary growth</p>
                      </div>
                    </div>
                    {chartEntries.length > 0 ? (
                      <SalaryProgressionChart entries={chartEntries} />
                    ) : (
                      <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-slate-500">No chart data available</p>
                      </div>
                    )}
                  </div>

                  {/* Detailed Timeline */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">Career Timeline</h3>
                        <p className="text-slate-600 text-sm mt-1">Detailed breakdown of each position and compensation</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {combinedData
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((item, index, array) => {
                          const previousItem = array[index + 1];
                          const increase = previousItem ? item.salary - previousItem.salary : 0;
                          const percentIncrease = previousItem && previousItem.salary > 0
                            ? (increase / previousItem.salary) * 100
                            : 0;
                          const isLatest = index === 0;

                          return (
                            <div 
                              key={item.id} 
                              className={`relative flex items-start gap-4 p-5 rounded-xl border-2 transition-all ${
                                isLatest 
                                  ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md" 
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:shadow-sm"
                              }`}
                            >
                              {/* Timeline connector */}
                              {index < combinedData.length - 1 && (
                                <div className="absolute left-6 top-14 w-0.5 h-full bg-slate-300 -z-10" />
                              )}
                              
                              {/* Number badge */}
                              <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                                isLatest ? "bg-blue-500 ring-4 ring-blue-200" : "bg-slate-400"
                              }`}>
                                {combinedData.length - index}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <h4 className={`font-bold text-lg mb-1 ${
                                      isLatest ? "text-blue-900" : "text-slate-900"
                                    }`}>
                                      {item.roleTitle} @ {item.company}
                                    </h4>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <p className="text-sm text-slate-600 flex items-center gap-1">
                                        <Icon icon="mingcute:calendar-line" width={14} />
                                        {new Date(item.date).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })}
                                      </p>
                                      {item.location && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                          <Icon icon="mingcute:map-pin-line" width={14} />
                                          {item.location}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    <p className={`text-3xl font-bold mb-1 ${
                                      isLatest ? "text-blue-600" : "text-slate-900"
                                    }`}>
                                      ${item.salary.toLocaleString()}
                                    </p>
                                    {increase !== 0 && (
                                      <div className="flex items-center gap-2 sm:justify-end">
                                        <Icon 
                                          icon={increase > 0 ? "mingcute:arrow-up-line" : "mingcute:arrow-down-line"} 
                                          width={16} 
                                          className={increase > 0 ? "text-green-600" : "text-red-600"}
                                        />
                                        <p
                                          className={`text-sm font-semibold ${
                                            increase > 0 ? "text-green-600" : "text-red-600"
                                          }`}
                                        >
                                          {increase > 0 ? "+" : ""}${increase.toLocaleString()} (
                                          {percentIncrease > 0 ? "+" : ""}
                                          {percentIncrease.toFixed(1)}%)
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                      item.source === "progression"
                                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                                        : "bg-green-100 text-green-700 border border-green-200"
                                    }`}
                                  >
                                    <Icon 
                                      icon={item.source === "progression" ? "mingcute:handshake-line" : "mingcute:briefcase-line"} 
                                      width={14} 
                                    />
                                    {item.source === "progression" ? "Negotiation" : "Employment"}
                                  </span>
                                  {isLatest && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                      <Icon icon="mingcute:star-line" width={14} />
                                      Current
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              );
            })()}
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

      {/* Add Progression Entry Modal */}
      {showAddProgressionModal && (
        <AddProgressionEntryModal
          onClose={() => setShowAddProgressionModal(false)}
          onSuccess={() => {
            fetchProgression();
            showMessage("Progression entry added successfully!", "success");
          }}
        />
      )}
    </div>
  );
}

