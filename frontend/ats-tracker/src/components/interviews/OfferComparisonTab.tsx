import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type {
  JobOfferData,
  JobOfferInput,
  OfferStatus,
  NegotiationStatus,
  EquityType,
  HealthInsuranceCoverage,
  RemotePolicy,
} from "../../types/jobOffer.types";

interface OfferComparisonTabProps {
  interviews?: any[];
  jobOpportunities?: any[];
}

export function OfferComparisonTab({
  interviews = [],
  jobOpportunities = [],
}: OfferComparisonTabProps) {
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for creating/editing offers
  const [formData, setFormData] = useState<Partial<JobOfferInput>>({
    company: "",
    position_title: "",
    base_salary: 0,
    location: "",
    offer_status: "active",
  });

  const [selectedJobOpportunity, setSelectedJobOpportunity] = useState<string>("");

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);
      const response = await api.getJobOffers();
      if (response.success && response.data) {
        setOffers(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching offers:", err);
      setError(err.message || "Failed to fetch offers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    try {
      const response = await api.createJobOffer(formData);
      if (response.success) {
        setSuccessMessage("Offer created successfully!");
        setShowCreateModal(false);
        fetchOffers();
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create offer");
    }
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer) return;
    
    try {
      const response = await api.updateJobOffer(editingOffer.id, formData);
      if (response.success) {
        setSuccessMessage("Offer updated successfully!");
        setShowEditModal(false);
        setEditingOffer(null);
        fetchOffers();
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update offer");
    }
  };

  const handleEditOffer = (offer: any) => {
    setEditingOffer(offer);
    setFormData({
      job_opportunity_id: offer.job_opportunity_id,
      interview_id: offer.interview_id,
      company: offer.company,
      position_title: offer.position_title,
      base_salary: offer.base_salary,
      signing_bonus: offer.signing_bonus,
      annual_bonus: offer.annual_bonus,
      equity_type: offer.equity_type,
      equity_amount: offer.equity_amount,
      location: offer.location,
      remote_policy: offer.remote_policy,
      pto_days: offer.pto_days,
      retirement_401k_match_percentage: offer.retirement_401k_match_percentage,
      health_insurance_coverage: offer.health_insurance_coverage,
      culture_fit_score: offer.culture_fit_score,
      growth_opportunities_score: offer.growth_opportunities_score,
      work_life_balance_score: offer.work_life_balance_score,
      notes: offer.notes,
    });
    setShowEditModal(true);
  };

  const handleRemoveFromComparison = async (offerId: string) => {
    if (!confirm("Remove this offer from the comparison tool? (The original job opportunity will remain in your system)")) return;

    try {
      await api.deleteJobOffer(offerId);
      setSuccessMessage("Offer removed from comparison tool");
      fetchOffers();
    } catch (err: any) {
      setError(err.message || "Failed to remove offer");
    }
  };


  const handleCompareOffers = async () => {
    if (selectedOffers.length < 2) {
      setError("Please select at least 2 offers to compare");
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.compareJobOffers(selectedOffers);
      if (response.success && response.data) {
        setComparisonData(response.data);
        setShowComparisonView(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to compare offers");
    } finally {
      setIsLoading(false);
    }
  };


  const toggleOfferSelection = (offerId: string) => {
    setSelectedOffers((prev) =>
      prev.includes(offerId)
        ? prev.filter((id) => id !== offerId)
        : [...prev, offerId]
    );
  };

  const resetForm = () => {
    setFormData({
      company: "",
      position_title: "",
      base_salary: 0,
      location: "",
      offer_status: "active",
    });
    setSelectedJobOpportunity("");
  };

  const handleJobOpportunitySelect = (jobOpportunityId: string) => {
    setSelectedJobOpportunity(jobOpportunityId);
    
    const selectedJob = jobOpportunities.find(j => j.id === jobOpportunityId);
    if (selectedJob) {
      setFormData({
        ...formData,
        job_opportunity_id: selectedJob.id,
        company: selectedJob.company || "",
        position_title: selectedJob.title || "",
        location: selectedJob.location || "",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      declined: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-700",
      withdrawn: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (isLoading && offers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="mingcute:loading-line" className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show comparison view if active
  if (showComparisonView && comparisonData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Offer Comparison</h2>
            <p className="text-slate-600 mt-1">
              Comparing {comparisonData.offers?.length || 0} offers
            </p>
          </div>
          <button
            onClick={() => setShowComparisonView(false)}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            <Icon icon="mingcute:arrow-left-line" className="w-5 h-5 inline mr-2" />
            Back to Offers
          </button>
        </div>

        {/* Recommendations */}
        {comparisonData.recommendations && comparisonData.recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:light-bulb-line" className="w-6 h-6 text-yellow-500" />
              Recommendations
            </h3>
            <div className="space-y-4">
              {comparisonData.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {rec.recommendation_type === "best_overall" && (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:trophy-line" className="w-6 h-6 text-green-600" />
                        </div>
                      )}
                      {rec.recommendation_type === "best_financial" && (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:currency-dollar-line" className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      {rec.recommendation_type === "best_culture" && (
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:heart-line" className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{rec.company}</h4>
                      <p className="text-sm text-slate-600 mt-1">{rec.reasoning}</p>
                      {rec.pros && rec.pros.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-700 mb-1">Pros:</p>
                          <ul className="text-sm text-slate-600 space-y-1">
                            {rec.pros.map((pro: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Icon icon="mingcute:check-line" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Matrix */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 sticky left-0 bg-slate-50">
                    Category
                  </th>
                  {comparisonData.offers?.map((offer: any) => (
                    <th
                      key={offer.id}
                      className="px-6 py-4 text-center text-sm font-semibold text-slate-900"
                    >
                      {offer.company}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Compensation Section */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.offers?.length + 1} className="px-6 py-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Compensation
                    </h4>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Base Salary
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900 font-medium">
                      {formatCurrency(offer.base_salary)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Signing Bonus
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {formatCurrency(offer.signing_bonus || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Annual Bonus
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {formatCurrency(offer.annual_bonus || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Equity (4-yr)
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.equity_amount ? formatCurrency(offer.equity_amount) : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-slate-900 sticky left-0 bg-blue-50">
                    Total Comp (Year 1)
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {formatCurrency(offer.total_compensation_year_1 || 0)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-slate-900 sticky left-0 bg-blue-50">
                    Total Comp (Annual Avg)
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {formatCurrency(offer.total_compensation_annual_avg || 0)}
                    </td>
                  ))}
                </tr>

                {/* Benefits Section */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.offers?.length + 1} className="px-6 py-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Benefits & Perks
                    </h4>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    PTO Days
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.pto_days || "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    401k Match
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.retirement_401k_match_percentage
                        ? `${offer.retirement_401k_match_percentage}%`
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Health Insurance
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.health_insurance_coverage || "—"}
                    </td>
                  ))}
                </tr>

                {/* Location Section */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.offers?.length + 1} className="px-6 py-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Location & Work
                    </h4>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Location
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.location}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Remote Policy
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.remote_policy || "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    COL Adjusted Salary
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.col_adjusted_salary
                        ? formatCurrency(offer.col_adjusted_salary)
                        : "—"}
                    </td>
                  ))}
                </tr>

                {/* Scores Section */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.offers?.length + 1} className="px-6 py-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Quality Scores (1-5)
                    </h4>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Culture Fit
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.culture_fit_score ? `${offer.culture_fit_score}/5` : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Growth Opportunities
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.growth_opportunities_score
                        ? `${offer.growth_opportunities_score}/5`
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 sticky left-0 bg-white">
                    Work-Life Balance
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.work_life_balance_score
                        ? `${offer.work_life_balance_score}/5`
                        : "—"}
                    </td>
                  ))}
                </tr>

                {/* Overall Score */}
                <tr className="bg-green-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-slate-900 sticky left-0 bg-green-50">
                    Overall Score
                  </td>
                  {comparisonData.offers?.map((offer: any) => (
                    <td key={offer.id} className="px-6 py-4 text-sm text-center text-slate-900">
                      {offer.overall_score ? `${offer.overall_score.toFixed(1)}/100` : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:check-circle-line" className="w-5 h-5 text-green-500" />
          <p className="text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <Icon icon="mingcute:close-line" className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <Icon icon="mingcute:close-line" className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Job Offers</h2>
          <p className="text-slate-600 mt-1">
            Manage and compare your job offers to make the best decision
          </p>
        </div>
        <div className="flex gap-3">
          {selectedOffers.length >= 2 && (
            <button
              onClick={handleCompareOffers}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:compare-line" className="w-5 h-5" />
              Compare ({selectedOffers.length})
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
          >
            <Icon icon="mingcute:add-line" className="w-5 h-5" />
            Add Offer
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <Icon
            icon="mingcute:file-certificate-line"
            className="w-16 h-16 text-slate-300 mx-auto mb-4"
          />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No job offers yet
          </h3>
          <p className="text-slate-600 mb-6">
            Start adding your job offers to compare and evaluate them
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Add Your First Offer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                selectedOffers.includes(offer.id)
                  ? "border-blue-500 shadow-lg"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {offer.company}
                    </h3>
                    <p className="text-sm text-slate-600">{offer.position_title}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedOffers.includes(offer.id)}
                    onChange={() => toggleOfferSelection(offer.id)}
                    className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      offer.offer_status
                    )}`}
                  >
                    {offer.offer_status}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Base Salary</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(offer.base_salary)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total Comp (Yr 1)</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(offer.total_compensation_year_1 || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Overall Score</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {offer.overall_score ? `${offer.overall_score.toFixed(1)}/100` : "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Location</p>
                    <p className="text-sm text-slate-700 flex items-center gap-1">
                      <Icon icon="mingcute:location-line" className="w-4 h-4" />
                      {offer.location}
                    </p>
                  </div>

                  {offer.remote_policy && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Remote Policy</p>
                      <p className="text-sm text-slate-700">{offer.remote_policy}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleEditOffer(offer)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveFromComparison(offer.id)}
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Remove from comparison (job opportunity stays in system)"
                  >
                    <Icon icon="mingcute:close-line" className="w-5 h-5" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Offer Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {showEditModal ? "Edit Job Offer" : "Add Job Offer"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingOffer(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Select from existing job opportunity */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Create from Existing Job Opportunity (Optional)
                </h4>
                <select
                  value={selectedJobOpportunity}
                  onChange={(e) => handleJobOpportunitySelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Start from scratch</option>
                  {jobOpportunities.filter(j => j.status === "Offer").map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company} - {job.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-600 mt-2">
                  Select a job opportunity with "Offer" status to auto-fill company, position, and location
                </p>
              </div>

              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={formData.company || ""}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Position Title *
                    </label>
                    <input
                      type="text"
                      value={formData.position_title || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, position_title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Compensation */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Compensation</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Base Salary *
                    </label>
                    <input
                      type="number"
                      value={formData.base_salary || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, base_salary: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      placeholder="e.g., 120000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Signing Bonus
                    </label>
                    <input
                      type="number"
                      value={formData.signing_bonus || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, signing_bonus: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      placeholder="e.g., 25000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Annual Bonus
                    </label>
                    <input
                      type="number"
                      value={formData.annual_bonus || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, annual_bonus: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      placeholder="e.g., 15000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Location & Work</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Remote Policy
                    </label>
                    <select
                      value={formData.remote_policy || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, remote_policy: e.target.value as RemotePolicy })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Full Remote">Full Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      PTO Days
                    </label>
                    <input
                      type="number"
                      value={formData.pto_days || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, pto_days: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      401k Match %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.retirement_401k_match_percentage || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          retirement_401k_match_percentage: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Health Insurance
                    </label>
                    <select
                      value={formData.health_insurance_coverage || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          health_insurance_coverage: e.target.value as HealthInsuranceCoverage,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="None">None</option>
                      <option value="Partial">Partial</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Non-Financial Factors */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Quality Factors (1-5 scale)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Culture Fit
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.culture_fit_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          culture_fit_score: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Growth Opportunities
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.growth_opportunities_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          growth_opportunities_score: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Work-Life Balance
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.work_life_balance_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          work_life_balance_score: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingOffer(null);
                  resetForm();
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateOffer : handleCreateOffer}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {showEditModal ? "Update Offer" : "Create Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
