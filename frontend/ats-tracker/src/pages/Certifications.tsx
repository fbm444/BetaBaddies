import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CertificationData } from "../types";
import { api } from "../services/api";

export function Certifications() {
  // Helper function to get the base URL for static files
  const getStaticFileUrl = (filePath: string): string => {
    if (filePath.startsWith('http')) {
      return filePath;
    }
    // If path starts with /uploads, use relative path (Vite proxy handles it)
    if (filePath.startsWith('/uploads')) {
      return filePath;
    }
    // Otherwise, construct full URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '') || 'http://localhost:3001';
    return filePath.startsWith('/') ? `${baseUrl}${filePath}` : `${baseUrl}/${filePath}`;
  };

  const [certifications, setCertifications] = useState<CertificationData[]>([]);
  const [filteredCertifications, setFilteredCertifications] = useState<
    CertificationData[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
    platform: string;
    badge_image: string | null;
    verification_url: string;
    category: string;
    description: string;
    assessment_score: string; // Score number
    assessment_max_score: string; // Max score number
    achievements: string; // Comma-separated for editing
  }>({
    name: "",
    org_name: "",
    date_earned: "",
    expiration_date: "",
    never_expires: false,
    platform: "",
    badge_image: null,
    verification_url: "",
    category: "",
    description: "",
    assessment_score: "",
    assessment_max_score: "",
    achievements: "",
  });
  
  // Badge upload state
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgePreview, setBadgePreview] = useState<string | null>(null);
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const badgeFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch certifications on mount
  useEffect(() => {
    fetchCertifications();
  }, []);

  // Get unique categories from certifications
  const getAvailableCategories = () => {
    const categories = new Set<string>();
    certifications.forEach((cert) => {
      if (cert.category) {
        categories.add(cert.category);
      }
    });
    return Array.from(categories).sort();
  };

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
          cert.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((cert) => cert.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((cert) => cert.category === categoryFilter);
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
  }, [certifications, searchTerm, statusFilter, categoryFilter, sortBy]);

  const calculateCertificationStatus = (
    cert: CertificationData
  ): Pick<CertificationData, "status" | "daysUntilExpiration"> => {
    if (cert.never_expires) {
      return { status: "active" as const, daysUntilExpiration: null };
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
    };
    certifications.forEach((cert) => {
      stats.total++;
      const { status } = calculateCertificationStatus(cert);
      if (status === "active") stats.active++;
      else if (status === "expiring") stats.expiring++;
      else if (status === "expired") stats.expired++;
      // Permanent certifications are now considered active, so they're already counted above
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

  const handleBadgeUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingBadge(true);
      const response = await api.uploadCertificationBadgeImage(file);
      if (response.ok && response.data) {
        return response.data.filePath;
      }
      return null;
    } catch (err: any) {
      console.error("Failed to upload badge:", err);
      alert(err.message || "Failed to upload badge image");
      return null;
    } finally {
      setUploadingBadge(false);
    }
  };

  const handleBadgeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setBadgeFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBadgePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCertification = async () => {
    try {
      // Upload badge if a new file was selected
      let badgeImagePath = formData.badge_image;
      if (badgeFile) {
        const uploadedPath = await handleBadgeUpload(badgeFile);
        if (uploadedPath) {
          badgeImagePath = uploadedPath;
        }
      }

      // Combine score and max score into "score/maxScore" format
      let assessmentScores = null;
      if (formData.assessment_score.trim() || formData.assessment_max_score.trim()) {
        const score = formData.assessment_score.trim() || "0";
        const maxScore = formData.assessment_max_score.trim() || "0";
        assessmentScores = `${score}/${maxScore}`;
      }

      // Parse achievements (comma-separated)
      let achievements = null;
      if (formData.achievements.trim()) {
        achievements = formData.achievements
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a.length > 0);
      }

      const backendData: any = {
        name: formData.name,
        orgName: formData.org_name,
        dateEarned: formData.date_earned,
        neverExpires: formData.never_expires,
      };

      if (!formData.never_expires && formData.expiration_date) {
        backendData.expirationDate = formData.expiration_date;
      }

      // Add optional fields
      if (formData.platform.trim()) {
        backendData.platform = formData.platform;
      }
      if (badgeImagePath) {
        backendData.badgeImage = badgeImagePath;
      }
      if (formData.verification_url.trim()) {
        backendData.verificationUrl = formData.verification_url;
      }
      if (formData.category.trim()) {
        backendData.category = formData.category;
      }
      if (formData.description.trim()) {
        backendData.description = formData.description;
      }
      if (assessmentScores) {
        backendData.assessmentScores = assessmentScores;
      }
      if (achievements && achievements.length > 0) {
        backendData.achievements = achievements;
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
      // Upload badge if a new file was selected
      let badgeImagePath = formData.badge_image;
      if (badgeFile) {
        const uploadedPath = await handleBadgeUpload(badgeFile);
        if (uploadedPath) {
          badgeImagePath = uploadedPath;
        }
      }

      // Combine score and max score into "score/maxScore" format
      let assessmentScores = null;
      if (formData.assessment_score.trim() || formData.assessment_max_score.trim()) {
        const score = formData.assessment_score.trim() || "0";
        const maxScore = formData.assessment_max_score.trim() || "0";
        assessmentScores = `${score}/${maxScore}`;
      }

      // Parse achievements (comma-separated)
      let achievements = null;
      if (formData.achievements.trim()) {
        achievements = formData.achievements
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a.length > 0);
      }

      const backendData: any = {
        name: formData.name,
        orgName: formData.org_name,
        dateEarned: formData.date_earned,
        neverExpires: formData.never_expires,
      };

      if (!formData.never_expires && formData.expiration_date) {
        backendData.expirationDate = formData.expiration_date;
      }

      // Add optional fields
      if (formData.platform.trim()) {
        backendData.platform = formData.platform;
      }
      if (badgeImagePath) {
        backendData.badgeImage = badgeImagePath;
      }
      if (formData.verification_url.trim()) {
        backendData.verificationUrl = formData.verification_url;
      }
      if (formData.category.trim()) {
        backendData.category = formData.category;
      }
      if (formData.description.trim()) {
        backendData.description = formData.description;
      }
      if (assessmentScores) {
        backendData.assessmentScores = assessmentScores;
      }
      if (achievements && achievements.length > 0) {
        backendData.achievements = achievements;
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
    
    // Parse assessment scores from "score/maxScore" format
    let assessmentScore = "";
    let assessmentMaxScore = "";
    if (cert.assessment_scores) {
      const scoreStr = String(cert.assessment_scores);
      const parts = scoreStr.split("/");
      if (parts.length === 2) {
        assessmentScore = parts[0].trim();
        assessmentMaxScore = parts[1].trim();
      } else {
        // If not in "score/maxScore" format, try to extract numbers
        const numbers = scoreStr.match(/\d+/g);
        if (numbers && numbers.length >= 1) {
          assessmentScore = numbers[0];
          if (numbers.length >= 2) {
            assessmentMaxScore = numbers[1];
          }
        }
      }
    }

    // Format achievements as comma-separated string
    let achievementsStr = "";
    if (cert.achievements && Array.isArray(cert.achievements)) {
      achievementsStr = cert.achievements.join(", ");
    }
    
    setFormData({
      name: cert.name,
      org_name: cert.org_name,
      date_earned: formatDateForInput(cert.date_earned),
      expiration_date: formatDateForInput(cert.expiration_date),
      never_expires: cert.never_expires,
      platform: cert.platform || "",
      badge_image: cert.badge_image || null,
      verification_url: cert.verification_url || "",
      category: cert.category || "",
      description: cert.description || "",
      assessment_score: assessmentScore,
      assessment_max_score: assessmentMaxScore,
      achievements: achievementsStr,
    });
    
    // Set badge preview if exists
    if (cert.badge_image) {
      setBadgePreview(getStaticFileUrl(cert.badge_image));
    } else {
      setBadgePreview(null);
    }
    setBadgeFile(null);
    
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
      platform: "",
      badge_image: null,
      verification_url: "",
      category: "",
      description: "",
      assessment_score: "",
      assessment_max_score: "",
      achievements: "",
    });
    setBadgeFile(null);
    setBadgePreview(null);
    if (badgeFileInputRef.current) {
      badgeFileInputRef.current.value = "";
    }
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
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {getAvailableCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
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
          {categoryFilter !== "all" && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
              Category: {categoryFilter}
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
                {/* Badge Image */}
                {cert.badge_image && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={getStaticFileUrl(cert.badge_image)}
                      alt={`${cert.name} badge`}
                      className="w-28 h-28 object-contain rounded-lg border border-slate-200 bg-slate-50"
                      onError={(e) => {
                        console.error('Failed to load badge image:', cert.badge_image, 'Full URL:', getStaticFileUrl(cert.badge_image));
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Status Badge and Category */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}
                  >
                    <Icon icon={badge.icon} width={14} />
                    {badge.label}
                  </span>
                  {cert.category && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                      <Icon icon="mingcute:tag-line" width={14} />
                      {cert.category}
                    </span>
                  )}
                </div>

                {/* Certification Name */}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {cert.name}
                </h3>

                {/* Organization and Platform */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon icon="mingcute:building-2-line" width={18} />
                    <span className="text-sm font-medium">{cert.org_name}</span>
                  </div>
                  {cert.platform && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icon icon="mingcute:global-line" width={18} />
                      <span className="text-sm">{cert.platform}</span>
                    </div>
                  )}
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

                {/* Assessment Scores */}
                {cert.assessment_scores && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon icon="mingcute:star-line" width={16} className="text-yellow-500" />
                      <span className="text-slate-700 font-medium">
                        {String(cert.assessment_scores)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Verification URL */}
                {cert.verification_url && (
                  <div className="mb-4">
                    <a
                      href={cert.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Icon icon="mingcute:link-line" width={16} />
                      Verify Certification
                    </a>
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
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}
                      >
                        <Icon icon={badge.icon} width={14} />
                        {badge.label}
                      </span>
                      {cert.category && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                          <Icon icon="mingcute:tag-line" width={14} />
                          {cert.category}
                        </span>
                      )}
                      <h3 className="text-xl font-semibold text-slate-900">
                        {cert.name}
                      </h3>
                    </div>
                    {cert.badge_image && (
                      <div className="mb-2">
                        <img
                          src={getStaticFileUrl(cert.badge_image)}
                          alt={`${cert.name} badge`}
                          className="w-20 h-20 object-contain rounded border border-slate-200 bg-slate-50"
                          onError={(e) => {
                            console.error('Failed to load badge image:', cert.badge_image, 'Full URL:', getStaticFileUrl(cert.badge_image));
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Icon icon="mingcute:building-2-line" width={16} />
                        <span>{cert.org_name}</span>
                      </div>
                      {cert.platform && (
                        <div className="flex items-center gap-1">
                          <Icon icon="mingcute:global-line" width={16} />
                          <span>{cert.platform}</span>
                        </div>
                      )}
                      {cert.verification_url && (
                        <a
                          href={cert.verification_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Icon icon="mingcute:link-line" width={16} />
                          Verify
                        </a>
                      )}
                      {cert.assessment_scores && (
                        <div className="flex items-center gap-1">
                          <Icon icon="mingcute:star-line" width={16} className="text-yellow-500" />
                          <span className="font-medium">
                            {String(cert.assessment_scores)}
                          </span>
                        </div>
                      )}
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

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Platform</option>
                  <option value="HackerRank">HackerRank</option>
                  <option value="LeetCode">LeetCode</option>
                  <option value="Codecademy">Codecademy</option>
                  <option value="Coursera">Coursera</option>
                  <option value="edX">edX</option>
                  <option value="Udemy">Udemy</option>
                  <option value="Pluralsight">Pluralsight</option>
                  <option value="AWS">AWS</option>
                  <option value="Google Cloud">Google Cloud</option>
                  <option value="Microsoft">Microsoft</option>
                  <option value="Other">Other</option>
                </select>
                {formData.platform === "Other" && (
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => {
                      const value = e.target.value;
                      // If user starts typing and value is not "Other", update platform
                      if (value !== "Other") {
                        setFormData({ ...formData, platform: value });
                      }
                    }}
                    onFocus={(e) => {
                      // Clear "Other" when user focuses to type
                      if (e.currentTarget.value === "Other") {
                        setFormData({ ...formData, platform: "" });
                      }
                    }}
                    className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter platform name"
                  />
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="coding">Coding</option>
                  <option value="business">Business</option>
                  <option value="design">Design</option>
                  <option value="data-science">Data Science</option>
                  <option value="cloud">Cloud</option>
                  <option value="security">Security</option>
                  <option value="networking">Networking</option>
                  <option value="other">Other</option>
                </select>
                {formData.category === "other" && (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      // If user starts typing and value is not "other", update category
                      if (value !== "other") {
                        setFormData({ ...formData, category: value });
                      }
                    }}
                    onFocus={(e) => {
                      // Clear "other" when user focuses to type
                      if (e.currentTarget.value === "other") {
                        setFormData({ ...formData, category: "" });
                      }
                    }}
                    className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category name"
                  />
                )}
              </div>

              {/* Badge Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Badge Image
                </label>
                {badgePreview && (
                  <div className="mb-2">
                    <img
                      src={badgePreview}
                      alt="Badge preview"
                      className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <input
                  ref={badgeFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleBadgeFileChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploadingBadge}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Upload a badge image or screenshot (max 5MB, JPEG/PNG/GIF/WebP)
                </p>
              </div>

              {/* Verification URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Verification URL
                </label>
                <input
                  type="url"
                  value={formData.verification_url}
                  onChange={(e) =>
                    setFormData({ ...formData, verification_url: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/verify/..."
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

              {/* Description (Rich Text - Markdown) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a description for this certification. You can use HTML tags like &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, etc."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Supports HTML tags (e.g., &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;u&gt;underline&lt;/u&gt;, &lt;br/&gt; for line breaks)
                </p>
              </div>

              {/* Assessment Scores */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assessment Scores
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.assessment_score}
                    onChange={(e) =>
                      setFormData({ ...formData, assessment_score: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Score"
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.assessment_max_score}
                    onChange={(e) =>
                      setFormData({ ...formData, assessment_max_score: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Out of"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your score and the maximum possible score
                </p>
              </div>

              {/* Achievements */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Achievements
                </label>
                <input
                  type="text"
                  value={formData.achievements}
                  onChange={(e) =>
                    setFormData({ ...formData, achievements: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Top 10%, Perfect Score, etc. (comma-separated)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter achievements separated by commas
                </p>
              </div>
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
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {selectedCertification.name}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border ${badge.color}`}
                        >
                          <Icon icon={badge.icon} width={16} />
                          {badge.label}
                        </span>
                        {selectedCertification.category && (
                          <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border bg-purple-50 text-purple-700 border-purple-200">
                            <Icon icon="mingcute:tag-line" width={16} />
                            {selectedCertification.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Icon icon="mingcute:close-line" width={24} />
                    </button>
                  </div>

                  {/* Badge Image */}
                  {selectedCertification.badge_image && (
                    <div className="mb-6 flex justify-center">
                      <img
                        src={getStaticFileUrl(selectedCertification.badge_image)}
                        alt={`${selectedCertification.name} badge`}
                        className="w-40 h-40 object-contain rounded-lg border border-slate-200 bg-slate-50"
                        onError={(e) => {
                          console.error('Failed to load badge image:', selectedCertification.badge_image, 'Full URL:', getStaticFileUrl(selectedCertification.badge_image));
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Organization and Platform */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Issuing Organization
                      </h3>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Icon icon="mingcute:building-2-line" width={20} />
                        <p>{selectedCertification.org_name}</p>
                      </div>
                      {selectedCertification.platform && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Icon icon="mingcute:global-line" width={20} />
                          <p>Platform: {selectedCertification.platform}</p>
                        </div>
                      )}
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

                    {/* Verification URL */}
                    {selectedCertification.verification_url && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">
                          Verification
                        </h4>
                        <a
                          href={selectedCertification.verification_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          <Icon icon="mingcute:link-line" width={20} />
                          Verify this certification
                        </a>
                      </div>
                    )}

                    {/* Description */}
                    {selectedCertification.description && (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">
                          Description
                        </h4>
                        <div 
                          className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700 prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                          dangerouslySetInnerHTML={{ __html: selectedCertification.description }}
                        />
                      </div>
                    )}

                    {/* Assessment Scores */}
                    {selectedCertification.assessment_scores && (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">
                          Assessment Scores
                        </h4>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-sm text-slate-700">
                            {String(selectedCertification.assessment_scores)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {selectedCertification.achievements && 
                     Array.isArray(selectedCertification.achievements) &&
                     selectedCertification.achievements.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">
                          Achievements
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedCertification.achievements.map((achievement, idx) => (
                            <li key={idx} className="text-slate-700">
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
