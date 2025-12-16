import { useState, useEffect } from "react";
import { api } from "../services/api";
import { EducationData, EducationInput, EDUCATION_LEVELS } from "../types";

interface EducationFormData {
  id?: string;
  institutionName: string;
  fieldOfStudy: string;
  educationLevel: string;
  startDate: string;
  graduationDate: string;
  gpa: string;
  currentlyEnrolled: boolean;
  achievements: string;
}

export function Education() {
  const [educationList, setEducationList] = useState<EducationData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [formData, setFormData] = useState<EducationFormData>({
    institutionName: "",
    fieldOfStudy: "",
    educationLevel: "",
    startDate: "",
    graduationDate: "",
    gpa: "",
    currentlyEnrolled: false,
    achievements: "",
  });

  // Helper functions for date conversion
  const convertMonthToDate = (monthString: string): string => {
    // Convert YYYY-MM to YYYY-MM-DD (first day of month)
    return monthString ? `${monthString}-01` : "";
  };

  const convertDateToMonth = (dateString: string): string => {
    // Convert YYYY-MM-DD to YYYY-MM
    return dateString ? dateString.substring(0, 7) : "";
  };

  useEffect(() => {
    fetchEducation();
  }, []);

  const fetchEducation = async () => {
    try {
      setLoading(true);
      const response = await api.getEducation();
      // Backend returns { ok: true, data: { educations: [...] } }
      if (response.data?.educations) {
        // Backend now handles sorting by dates and enrollment status
        setEducationList(response.data.educations);
      }
    } catch (error: any) {
      showMessage(error.message || "Failed to load education", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const resetForm = () => {
    setFormData({
      institutionName: "",
      fieldOfStudy: "",
      educationLevel: "",
      startDate: "",
      graduationDate: "",
      gpa: "",
      currentlyEnrolled: false,
      achievements: "",
    });
    setIsFormOpen(false);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.institutionName.trim()) {
      showMessage("Institution name is required", "error");
      return;
    }
    if (!formData.educationLevel) {
      showMessage("Education level is required", "error");
      return;
    }
    if (!formData.fieldOfStudy.trim()) {
      showMessage("Field of study is required", "error");
      return;
    }
    if (!formData.graduationDate) {
      showMessage("Graduation date is required", "error");
      return;
    }
    
    // Validate start date if provided
    if (formData.startDate && formData.graduationDate) {
      const startDate = new Date(convertMonthToDate(formData.startDate));
      const endDate = new Date(convertMonthToDate(formData.graduationDate));
      if (startDate >= endDate) {
        showMessage("Start date must be before graduation date", "error");
        return;
      }
    }

    // Validate GPA if provided
    if (formData.gpa) {
      const gpaValue = parseFloat(formData.gpa);
      if (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4.0) {
        showMessage("GPA must be a number between 0 and 4.0", "error");
        return;
      }
    }

    try {
      // Transform frontend data to match backend expectations
      const backendPayload: EducationInput = {
        school: formData.institutionName.trim(),
        degreeType: formData.educationLevel, // degree_type in backend = educationLevel in frontend
        field: formData.fieldOfStudy.trim() || undefined,
        startDate: formData.startDate ? convertMonthToDate(formData.startDate) : undefined,
        endDate: formData.graduationDate ? convertMonthToDate(formData.graduationDate) : undefined,
        gpa: formData.gpa ? parseFloat(formData.gpa) : undefined,
        isEnrolled: formData.currentlyEnrolled,
        honors: formData.achievements.trim() || undefined,
      };

      if (isEditing && formData.id) {
        await api.updateEducation(formData.id, backendPayload);
        showMessage("Education updated successfully", "success");
      } else {
        await api.createEducation(backendPayload);
        showMessage("Education added successfully", "success");
      }

      resetForm();
      fetchEducation();
    } catch (error: any) {
      showMessage(error.message || "Failed to save education", "error");
    }
  };

  const handleEdit = (education: EducationData) => {
    // Transform backend data to match frontend form structure
    setFormData({
      id: education.id,
      institutionName: education.school || "",
      fieldOfStudy: education.field || "",
      educationLevel: education.degreeType || "", // degree_type from backend = educationLevel in frontend
      startDate: education.startDate ? convertDateToMonth(education.startDate) : "",
      graduationDate: education.endDate ? convertDateToMonth(education.endDate) : "",
      gpa: education.gpa?.toString() || "",
      currentlyEnrolled: education.isEnrolled || false,
      achievements: education.honors || "",
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this education entry?")) {
      return;
    }

    try {
      await api.deleteEducation(id);
      showMessage("Education deleted successfully", "success");
      fetchEducation();
    } catch (error: any) {
      showMessage(error.message || "Failed to delete education", "error");
    }
  };


  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Education</h1>
        <p className="text-gray-600">Manage your educational background and qualifications</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {/* Controls: Add Button and View Toggle */}
      {!isFormOpen && (
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Education
          </button>
          
          {educationList.length > 0 && (
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  viewMode === "timeline"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Timeline View
              </button>
            </div>
          )}
        </div>
      )}

      {/* Education Form */}
      {isFormOpen && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6">
            {isEditing ? "Edit Education" : "Add Educational Background"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institution Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                name="institutionName"
                value={formData.institutionName}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="e.g., Harvard University"
                required
              />
            </div>

            {/* Education Level */}
            <div>
              <label htmlFor="education-level-select" className="block text-sm font-medium text-gray-700 mb-1">
                Education Level *
              </label>
              <select
                id="education-level-select"
                name="educationLevel"
                value={formData.educationLevel}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent text-gray-900 bg-white"
                required
                aria-required="true"
              >
                <option value="">Select Education Level</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Field of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field of Study *
              </label>
              <input
                type="text"
                name="fieldOfStudy"
                value={formData.fieldOfStudy}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="e.g., Computer Science"
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date (Optional)
              </label>
              <input
                type="month"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Currently Enrolled Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="currentlyEnrolled"
                checked={formData.currentlyEnrolled}
                onChange={handleChange}
                id="currentlyEnrolled"
              />
              <label htmlFor="currentlyEnrolled" className="text-sm font-medium text-gray-700 cursor-pointer">
                Currently enrolled
              </label>
            </div>

            {/* Graduation Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduation Date *
              </label>
              <input
                type="month"
                name="graduationDate"
                value={formData.graduationDate}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>

            {/* GPA Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GPA (Optional)
              </label>
              <input
                type="number"
                name="gpa"
                value={formData.gpa}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="4.0"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="e.g., 3.75"
              />
              <p className="text-xs text-gray-500 mt-1">Enter on a 4.0 scale</p>
            </div>

            {/* Achievements/Honors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Achievements/Honors (Optional)
              </label>
              <textarea
                name="achievements"
                value={formData.achievements}
                onChange={handleChange}
                rows={4}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="e.g., Dean's List, Cum Laude, Academic Scholarships, Awards..."
              />
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Education List/Timeline */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading education...</p>
        </div>
      ) : educationList.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">No education entries yet. Click "Add Education" to get started.</p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-4">
          {educationList.map((education) => (
            <div
              key={education.id}
              className={`p-6 bg-white border-2 rounded-lg hover:shadow-lg transition-all ${
                education.isEnrolled 
                  ? 'border-blue-400 bg-blue-50/30' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {education.school}
                    </h3>
                    {education.isEnrolled && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Currently Enrolled
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-gray-700 font-medium">
                    {education.degreeType}
                  </p>
                  {education.field && (
                    <p className="text-base text-gray-600 mt-1">
                      {education.field}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {!education.isEnrolled && (
                      <span className="text-sm text-gray-500">
                        ✓ Completed
                      </span>
                    )}
                    {education.gpa && (
                      <span className="text-sm font-medium text-gray-700">
                        GPA: {education.gpa.toFixed(2)}/4.0
                      </span>
                    )}
                    {(education.startDate || education.endDate) && (
                      <span className="text-sm text-gray-600">
                        📅 {education.startDate ? new Date(education.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Start date not specified'} - {education.isEnrolled ? 'Present' : (education.endDate ? new Date(education.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'End date not specified')}
                      </span>
                    )}
                  </div>
                  {education.honors && (
                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-sm font-semibold text-yellow-900 mb-1">🏆 Achievements & Honors</p>
                      <p className="text-sm text-yellow-800 whitespace-pre-line">
                        {education.honors}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(education)}
                    className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(education.id)}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-gray-300 to-gray-400"></div>
          
          <div className="space-y-8">
            {educationList.map((education) => {
            // Format dates for display
            const formatDate = (dateString?: string) => {
              if (!dateString) return null;
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return null;
                return date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short' 
                });
              } catch {
                return null;
              }
            };

            const startDateFormatted = formatDate(education.startDate);
            const endDateFormatted = education.isEnrolled ? 'Present' : formatDate(education.endDate);
            const duration = education.startDate && education.endDate && !education.isEnrolled
              ? (() => {
                  try {
                    const start = new Date(education.startDate);
                    const end = new Date(education.endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                    
                    const years = end.getFullYear() - start.getFullYear();
                    const months = end.getMonth() - start.getMonth();
                    const totalMonths = years * 12 + months;
                    if (totalMonths < 12) return `${totalMonths} months`;
                    const yearsOnly = Math.floor(totalMonths / 12);
                    const remainingMonths = totalMonths % 12;
                    return remainingMonths > 0 ? `${yearsOnly}y ${remainingMonths}m` : `${yearsOnly} years`;
                  } catch {
                    return null;
                  }
                })()
              : null;

            return (
              <div key={education.id} className="relative pl-32">
                {/* Year label */}
                <div className="absolute left-0 top-2 w-16 text-right">
                  <div className="text-lg font-bold text-gray-700">
                    {education.endDate ? new Date(education.endDate).getFullYear() : 'Present'}
                  </div>
                </div>
                
                {/* Content card */}
                <div>
                  <div className={`p-6 rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${
                    education.isEnrolled 
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-400' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">
                            {education.school}
                          </h3>
                          {education.isEnrolled && (
                            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full animate-pulse">
                              IN PROGRESS
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-gray-700">
                          {education.degreeType}
                        </p>
                        {education.field && (
                          <p className="text-base text-gray-600 mt-1">
                            Major: {education.field}
                          </p>
                        )}
                        
                        {/* Date range and duration */}
                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">📅</span>
                            <span>
                              {startDateFormatted && endDateFormatted 
                                ? `${startDateFormatted} - ${endDateFormatted}`
                                : startDateFormatted || endDateFormatted || 'Date not specified'
                              }
                            </span>
                          </div>
                          {duration && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">⏱️</span>
                              <span>{duration}</span>
                            </div>
                          )}
                        </div>

                        {education.gpa && (
                          <div className="mt-3 flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-700">📊 GPA:</span>
                            <span className="text-sm font-semibold text-gray-800">
                              {education.gpa.toFixed(2)}/4.0
                            </span>
                          </div>
                        )}
                        
                        {education.honors && (
                          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-300">
                            <p className="text-sm font-bold text-yellow-900 mb-1 flex items-center gap-1">
                              🏆 Achievements & Honors
                            </p>
                            <p className="text-sm text-yellow-900 whitespace-pre-line">
                              {education.honors}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(education)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(education.id)}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
