import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { CertificationData } from "../types";
import { api } from "../services/api";

export function Certifications() {
  const [certifications, setCertifications] = useState<CertificationData[]>([]);
  const [filteredCertifications, setFilteredCertifications] = useState<
    CertificationData[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"earned" | "expiration" | "name">(
    "expiration"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCertification, setSelectedCertification] =
    useState<CertificationData | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    org_name: string;
    date_earned: string;
    expiration_date: string;
    never_expires: boolean;
  }>({
    name: "",
    org_name: "",
    date_earned: "",
    expiration_date: "",
    never_expires: false,
  });

  // Fetch certifications on mount
  useEffect(() => {
    fetchCertifications();
  }, []);

  // Filter and sort whenever relevant state changes
  useEffect(() => {
    let filtered: CertificationData[] = certifications.map((cert) => ({
      ...cert,
      ...calculateCertificationStatus(cert),
    }));

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (cert) =>
          cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.org_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((cert) => cert.status === statusFilter);
    }

    // Apply sorting
    if (sortBy === "earned") {
      filtered.sort(
        (a, b) =>
          new Date(b.date_earned).getTime() - new Date(a.date_earned).getTime()
      );
    } else if (sortBy === "expiration") {
      filtered.sort((a, b) => {
        if (a.never_expires) return 1;
        if (b.never_expires) return -1;
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return (
          new Date(a.expiration_date).getTime() -
          new Date(b.expiration_date).getTime()
        );
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredCertifications(filtered);
  }, [certifications, searchTerm, statusFilter, sortBy]);

  const calculateCertificationStatus = (
    cert: CertificationData
  ): Pick<CertificationData, "status" | "daysUntilExpiration"> => {
    if (cert.never_expires) {
      return { status: "permanent" as const, daysUntilExpiration: null };
    }

    if (!cert.expiration_date) {
      return { status: "active" as const, daysUntilExpiration: null };
    }

    const today = new Date();
    const expirationDate = new Date(cert.expiration_date);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return { status: "expired" as const, daysUntilExpiration };
    } else if (daysUntilExpiration <= 30) {
      return { status: "expiring" as const, daysUntilExpiration };
    } else {
      return { status: "active" as const, daysUntilExpiration };
    }
  };

  const getStatistics = () => {
    const stats = {
      total: 0,
      active: 0,
      expiring: 0,
      expired: 0,
      permanent: 0,
    };
    certifications.forEach((cert) => {
      stats.total++;
      const { status } = calculateCertificationStatus(cert);
      if (status === "active") stats.active++;
      else if (status === "expiring") stats.expiring++;
      else if (status === "expired") stats.expired++;
      else if (status === "permanent") stats.permanent++;
    });
    return stats;
  };

  const stats = getStatistics();

  const fetchCertifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getCertifications();
      if (response.ok && response.data) {
        setCertifications(response.data.certifications || []);
      } else {
        setCertifications([]);
        setError("Failed to load certifications");
      }
    } catch (err: any) {
      console.error("Failed to fetch certifications:", err);
      setError(err.message || "Failed to load certifications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCertification = async () => {
    try {
      const backendData: any = {
        name: formData.name,
        orgName: formData.org_name,
        dateEarned: formData.date_earned,
        neverExpires: formData.never_expires,
      };

      if (!formData.never_expires && formData.expiration_date) {
        backendData.expirationDate = formData.expiration_date;
      }

      console.log("Sending certification data:", backendData);
      await api.createCertification(backendData);
      setShowAddModal(false);
      resetForm();
      fetchCertifications();
    } catch (err: any) {
      console.error("Failed to create certification:", err);
      const errorMessage =
        err.status === 409
          ? "A certification with this name already exists. Please edit the existing one instead."
          : err.message || "Failed to create certification";
      alert(errorMessage);
    }
  };

  const handleUpdateCertification = async () => {
    if (!selectedCertification) return;
    try {
      const backendData: any = {
        name: formData.name,
        orgName: formData.org_name,
        dateEarned: formData.date_earned,
        neverExpires: formData.never_expires,
      };

      if (!formData.never_expires && formData.expiration_date) {
        backendData.expirationDate = formData.expiration_date;
      }

      console.log("Updating certification data:", backendData);
      await api.updateCertification(selectedCertification.id, backendData);
      setShowEditModal(false);
      resetForm();
      setSelectedCertification(null);
      fetchCertifications();
    } catch (err: any) {
      console.error("Failed to update certification:", err);
      const errorMessage =
        err.status === 409
          ? "Another certification with this name already exists."
          : err.message || "Failed to update certification";
      alert(errorMessage);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this certification?")) return;
    try {
      await api.deleteCertification(id);
      fetchCertifications();
    } catch (err: any) {
      alert(err.message || "Failed to delete certification");
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (cert: CertificationData) => {
    setSelectedCertification(cert);
    
    // Helper function to format date for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return "";
      try {
        // Parse the ISO date and extract YYYY-MM-DD
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "";
      }
    };
    
    setFormData({
      name: cert.name,
      org_name: cert.org_name,
      date_earned: formatDateForInput(cert.date_earned),
      expiration_date: formatDateForInput(cert.expiration_date),
      never_expires: cert.never_expires,
    });
    setShowEditModal(true);
  };

  const openDetailModal = (cert: CertificationData) => {
    setSelectedCertification(cert);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      org_name: "",
      date_earned: "",
      expiration_date: "",
      never_expires: false,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          icon: "mingcute:check-circle-fill",
          label: "Active",
        };
      case "expiring":
        return {
          color: "bg-amber-100 text-amber-700 border-amber-200",
          icon: "mingcute:alert-fill",
          label: "Expiring Soon",
        };
      case "expired":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: "mingcute:close-circle-fill",
          label: "Expired",
        };
      case "permanent":
        return {
          color: "bg-indigo-100 text-indigo-700 border-indigo-200",
          icon: "mingcute:infinity-fill",
          label: "Permanent",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: "mingcute:question-fill",
          label: "Unknown",
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDaysUntilExpiration = (days: number | null) => {
    if (days === null) return "";
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `${days} days left`;
  };

  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading certifications...
          </div>
          <div className="text-base text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Certifications
          </h1>
          <p className="text-lg text-slate-600">
            Manage your professional certifications and credentials
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md"
        >
          <Icon icon="mingcute:add-line" width={20} />
          Add Certification
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Expiring Soon Warning */}
      {stats.expiring > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Icon
            icon="mingcute:alert-fill"
            width={24}
            className="text-amber-600"
          />
          <p className="text-sm text-amber-800">
            ⚠️ You have <strong>{stats.expiring}</strong> certification
            {stats.expiring > 1 ? "s" : ""} expiring within 30 days
          </p>
        </div>
      )}

      {/* Statistics Bar */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Icon
              icon="mingcute:certificate-line"
              width={20}
              className="text-slate-600"
            />
            <span className="text-slate-600 font-medium">
              {stats.total} Total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              icon="mingcute:check-circle-fill"
              width={20}
              className="text-green-500"
            />
            <span className="text-slate-600">{stats.active} Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              icon="mingcute:alert-fill"
              width={20}
              className="text-amber-500"
            />
            <span className="text-slate-600">{stats.expiring} Expiring</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              icon="mingcute:close-circle-fill"
              width={20}
              className="text-red-500"
            />
            <span className="text-slate-600">{stats.expired} Expired</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              icon="mingcute:infinity-fill"
              width={20}
              className="text-indigo-500"
            />
            <span className="text-slate-600">{stats.permanent} Permanent</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width={20}
              />
              <input
                type="text"
                placeholder="Search certifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "earned" | "expiration" | "name")
              }
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expiration">Sort by Expiration</option>
              <option value="earned">Sort by Earned Date</option>
              <option value="name">Sort by Name</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 ${
                  viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Icon icon="mingcute:grid-line" width={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 ${
                  viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Icon icon="mingcute:list-check-line" width={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters summary */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-slate-600 font-medium">
            {filteredCertifications.length} certifications
          </span>
          {searchTerm && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
              Search: "{searchTerm}"
            </span>
          )}
          {statusFilter !== "all" && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
              Status: {statusFilter}
            </span>
          )}
        </div>
      </div>

      {/* Certifications Grid/List */}
      {filteredCertifications.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
          <Icon
            icon="mingcute:certificate-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No certifications found
          </h3>
          <p className="text-slate-600 mb-6">
            Start by adding your first certification
          </p>
          <button
            onClick={openAddModal}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-all inline-flex items-center gap-2"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Add Your First Certification
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertifications.map((cert) => {
            const badge = getStatusBadge(cert.status || "active");
            const daysUntilExpiration = cert.daysUntilExpiration ?? null;
            return (
              <div
                key={cert.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
              >
                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}
                  >
                    <Icon icon={badge.icon} width={14} />
                    {badge.label}
                  </span>
                </div>

                {/* Certification Name */}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {cert.name}
                </h3>

                {/* Organization */}
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                  <Icon icon="mingcute:building-2-line" width={18} />
                  <span className="text-sm font-medium">{cert.org_name}</span>
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon icon="mingcute:calendar-line" width={16} />
                    <span>Earned: {formatDate(cert.date_earned)}</span>
                  </div>
                  {cert.never_expires ? (
                    <div className="flex items-center gap-2 text-indigo-600 font-medium">
                      <Icon icon="mingcute:infinity-fill" width={16} />
                      <span>Never Expires</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icon icon="mingcute:hourglass-line" width={16} />
                      <span>
                        Expires: {formatDate(cert.expiration_date || "")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Days Until Expiration */}
                {daysUntilExpiration !== null && !cert.never_expires && (
                  <div
                    className={`text-sm font-medium mb-4 ${
                      daysUntilExpiration < 0
                        ? "text-red-600"
                        : daysUntilExpiration <= 30
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    ⏰ {formatDaysUntilExpiration(daysUntilExpiration)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => openDetailModal(cert)}
                    className="flex-1 px-4 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openEditModal(cert)}
                    className="px-3 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <Icon icon="mingcute:edit-line" width={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteCertification(cert.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                  >
                    <Icon icon="mingcute:delete-line" width={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredCertifications.map((cert) => {
            const badge = getStatusBadge(cert.status || "active");
            const daysUntilExpiration = cert.daysUntilExpiration ?? null;
            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}
                      >
                        <Icon icon={badge.icon} width={14} />
                        {badge.label}
                      </span>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {cert.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Icon icon="mingcute:building-2-line" width={16} />
                        <span>{cert.org_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon icon="mingcute:calendar-line" width={16} />
                        <span>Earned: {formatDate(cert.date_earned)}</span>
                      </div>
                      {cert.never_expires ? (
                        <div className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Icon icon="mingcute:infinity-fill" width={16} />
                          <span>Never Expires</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Icon icon="mingcute:hourglass-line" width={16} />
                            <span>
                              Expires: {formatDate(cert.expiration_date || "")}
                            </span>
                          </div>
                          {daysUntilExpiration !== null && (
                            <span
                              className={`font-medium ${
                                daysUntilExpiration < 0
                                  ? "text-red-600"
                                  : daysUntilExpiration <= 30
                                  ? "text-amber-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatDaysUntilExpiration(daysUntilExpiration)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetailModal(cert)}
                      className="px-4 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all text-sm font-medium"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openEditModal(cert)}
                      className="px-3 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
                    >
                      <Icon icon="mingcute:edit-line" width={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCertification(cert.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                    >
                      <Icon icon="mingcute:delete-line" width={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {showAddModal ? "Add New Certification" : "Edit Certification"}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AWS Certified Solutions Architect"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Issuing Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.org_name}
                  onChange={(e) =>
                    setFormData({ ...formData, org_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Amazon Web Services (AWS)"
                />
              </div>

              {/* Date Earned */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Earned <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date_earned}
                  onChange={(e) =>
                    setFormData({ ...formData, date_earned: e.target.value })
                  }
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Never Expires Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="neverExpires"
                  checked={formData.never_expires}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      never_expires: e.target.checked,
                      expiration_date: "",
                    })
                  }
                  className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="neverExpires"
                  className="text-sm font-medium text-slate-700"
                >
                  This certification never expires
                </label>
              </div>

              {/* Expiration Date */}
              {!formData.never_expires && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expiration Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expiration_date: e.target.value,
                      })
                    }
                    min={formData.date_earned || undefined}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-medium hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={
                  showAddModal
                    ? handleAddCertification
                    : handleUpdateCertification
                }
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
              >
                {showAddModal ? "Add Certification" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCertification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const badge = getStatusBadge(
                selectedCertification.status || "active"
              );
              return (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {selectedCertification.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border ${badge.color}`}
                      >
                        <Icon icon={badge.icon} width={16} />
                        {badge.label}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Icon icon="mingcute:close-line" width={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Organization */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Issuing Organization
                      </h3>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Icon icon="mingcute:building-2-line" width={20} />
                        <p>{selectedCertification.org_name}</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">
                          Date Earned
                        </h4>
                        <p className="text-slate-900">
                          {formatDate(selectedCertification.date_earned)}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">
                          Expiration Date
                        </h4>
                        {selectedCertification.never_expires ? (
                          <p className="text-indigo-600 font-medium flex items-center gap-1">
                            <Icon icon="mingcute:infinity-fill" width={16} />
                            Never Expires
                          </p>
                        ) : (
                          <p className="text-slate-900">
                            {formatDate(
                              selectedCertification.expiration_date || ""
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Days Until Expiration */}
                    {(() => {
                      const daysUntilExpiration =
                        selectedCertification.daysUntilExpiration ?? null;
                      if (
                        daysUntilExpiration === null ||
                        selectedCertification.never_expires
                      ) {
                        return null;
                      }
                      return (
                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-1">
                            Status
                          </h4>
                          <p
                            className={`font-medium ${
                              daysUntilExpiration < 0
                                ? "text-red-600"
                                : daysUntilExpiration <= 30
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatDaysUntilExpiration(daysUntilExpiration)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openEditModal(selectedCertification);
                      }}
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
                    >
                      Edit Certification
                    </button>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-medium hover:bg-slate-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
