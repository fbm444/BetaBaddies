import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type {
  InterviewResponse,
  InterviewResponseInput,
  InterviewResponseVersionInput,
  InterviewResponseTagInput,
  InterviewResponseOutcomeInput,
  GapAnalysis,
  QuestionType,
  TagType,
  OutcomeType,
  QUESTION_TYPE_LABELS,
  TAG_TYPE_LABELS,
  OUTCOME_TYPE_LABELS,
  QUESTION_TYPE_COLORS,
  OUTCOME_TYPE_COLORS,
} from "../types";

export function InterviewResponseLibrary() {
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<InterviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);

  // Filters
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<InterviewResponse | null>(null);

  useEffect(() => {
    fetchResponses();
    fetchGapAnalysis();
  }, []);

  useEffect(() => {
    filterResponses();
  }, [responses, questionTypeFilter, searchTerm]);

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getInterviewResponses();
      if (response.ok && response.data) {
        setResponses(response.data.responses);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load responses");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGapAnalysis = async () => {
    try {
      const response = await api.getGapAnalysis();
      if (response.ok && response.data) {
        setGapAnalysis(response.data.gapAnalysis);
      }
    } catch (err) {
      console.error("Failed to fetch gap analysis:", err);
    }
  };

  const filterResponses = () => {
    let filtered = [...responses];

    if (questionTypeFilter !== "all") {
      filtered = filtered.filter((r) => r.questionType === questionTypeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.questionText.toLowerCase().includes(term) ||
          r.currentVersion.responseText.toLowerCase().includes(term) ||
          r.tags.some((t) => t.tagValue.toLowerCase().includes(term))
      );
    }

    setFilteredResponses(filtered);
  };

  const handleViewResponse = (response: InterviewResponse) => {
    setSelectedResponse(response);
    setShowViewModal(true);
  };

  const handleExport = async (format: "json" | "markdown") => {
    try {
      await api.exportPrepGuide(format);
    } catch (err: any) {
      alert(err.message || "Failed to export prep guide");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500" width={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins' }}>
            Interview Response Library
          </h2>
          <p className="text-slate-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            Build and refine your best interview responses
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport("markdown")}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
            style={{ fontFamily: 'Poppins' }}
          >
            <Icon icon="mingcute:download-line" width={18} />
            Export Guide
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center gap-2"
            style={{ fontFamily: 'Poppins' }}
          >
            <Icon icon="mingcute:add-line" width={18} />
            Add Response
          </button>
        </div>
      </div>

      {/* Gap Analysis */}
      {gapAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2" style={{ fontFamily: 'Poppins' }}>
            Response Coverage Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {gapAnalysis.existing.map((item) => (
              <div key={item.question_type} className="text-center">
                <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Poppins' }}>
                  {item.count}
                </div>
                <div className="text-sm text-blue-800" style={{ fontFamily: 'Poppins' }}>
                  {QUESTION_TYPE_LABELS[item.question_type as QuestionType]}
                </div>
              </div>
            ))}
            {gapAnalysis.missing.length > 0 && (
              <div className="col-span-3 mt-2">
                <p className="text-sm text-blue-700" style={{ fontFamily: 'Poppins' }}>
                  Missing question types: {gapAnalysis.missing.map((m) => QUESTION_TYPE_LABELS[m.questionType as QuestionType]).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Icon
              icon="mingcute:search-line"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              width={20}
            />
            <input
              type="text"
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: 'Poppins' }}
            />
          </div>
        </div>
        <select
          value={questionTypeFilter}
          onChange={(e) => setQuestionTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ fontFamily: 'Poppins' }}
        >
          <option value="all">All Types</option>
          <option value="behavioral">Behavioral</option>
          <option value="technical">Technical</option>
          <option value="situational">Situational</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800" style={{ fontFamily: 'Poppins' }}>
          {error}
        </div>
      )}

      {/* Responses List */}
      {filteredResponses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Icon icon="mingcute:file-line" className="mx-auto text-slate-400 mb-4" width={48} />
          <p className="text-slate-600 mb-4" style={{ fontFamily: 'Poppins' }}>
            {searchTerm || questionTypeFilter !== "all"
              ? "No responses match your filters"
              : "No responses yet. Create your first response to get started!"}
          </p>
          {!searchTerm && questionTypeFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              style={{ fontFamily: 'Poppins' }}
            >
              Add Your First Response
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredResponses.map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              onView={() => handleViewResponse(response)}
              onRefresh={fetchResponses}
            />
          ))}
        </div>
      )}

      {/* Add Response Modal */}
      {showAddModal && (
        <ResponseFormModal
          onClose={() => {
            setShowAddModal(false);
            fetchResponses();
            fetchGapAnalysis();
          }}
        />
      )}

      {/* View Response Modal */}
      {showViewModal && selectedResponse && (
        <ResponseViewModal
          response={selectedResponse}
          onClose={() => {
            setShowViewModal(false);
            setSelectedResponse(null);
          }}
          onRefresh={fetchResponses}
        />
      )}
    </div>
  );
}

function ResponseCard({
  response,
  onView,
  onRefresh,
}: {
  response: InterviewResponse;
  onView: () => void;
  onRefresh: () => void;
}) {
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this response?")) return;

    try {
      await api.deleteInterviewResponse(response.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete response");
    }
  };

  const successfulOutcomes = response.outcomes.filter(
    (o) => o.outcomeType === "offer" || o.outcomeType === "next_round"
  ).length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{
                backgroundColor: QUESTION_TYPE_COLORS[response.questionType],
                fontFamily: 'Poppins'
              }}
            >
              {QUESTION_TYPE_LABELS[response.questionType]}
            </span>
            {response.versionCount && response.versionCount > 1 && (
              <span className="text-xs text-slate-500" style={{ fontFamily: 'Poppins' }}>
                {response.versionCount} versions
              </span>
            )}
            {successfulOutcomes > 0 && (
              <span className="text-xs text-green-600 font-medium" style={{ fontFamily: 'Poppins' }}>
                ✓ {successfulOutcomes} successful
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Poppins' }}>
            {response.questionText}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2 mb-3" style={{ fontFamily: 'Poppins' }}>
            {response.currentVersion.responseText}
          </p>
          {response.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {response.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                  style={{ fontFamily: 'Poppins' }}
                >
                  {tag.tagValue}
                </span>
              ))}
              {response.tags.length > 5 && (
                <span className="text-xs text-slate-500" style={{ fontFamily: 'Poppins' }}>
                  +{response.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onView}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Icon icon="mingcute:eye-line" width={20} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Icon icon="mingcute:delete-line" width={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResponseFormModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<InterviewResponseInput>({
    questionText: "",
    questionType: "behavioral",
    responseText: "",
    tags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState({ tagType: "skill" as TagType, tagValue: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText || !formData.responseText) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createInterviewResponse(formData);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create response");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.tagValue.trim()) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), { ...newTag, tagValue: newTag.tagValue.trim() }],
      });
      setNewTag({ tagType: "skill", tagValue: "" });
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins' }}>
            Add Interview Response
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" style={{ fontFamily: 'Poppins' }}>
              Question Type *
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value as QuestionType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: 'Poppins' }}
              required
            >
              <option value="behavioral">Behavioral</option>
              <option value="technical">Technical</option>
              <option value="situational">Situational</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" style={{ fontFamily: 'Poppins' }}>
              Question Text *
            </label>
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              required
              style={{ fontFamily: 'Poppins' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" style={{ fontFamily: 'Poppins' }}>
              Your Response *
            </label>
            <textarea
              value={formData.responseText}
              onChange={(e) => setFormData({ ...formData, responseText: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              required
              style={{ fontFamily: 'Poppins' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" style={{ fontFamily: 'Poppins' }}>
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <select
                value={newTag.tagType}
                onChange={(e) => setNewTag({ ...newTag, tagType: e.target.value as TagType })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: 'Poppins' }}
              >
                <option value="skill">Skill</option>
                <option value="experience">Experience</option>
                <option value="company">Company</option>
                <option value="technology">Technology</option>
                <option value="industry">Industry</option>
              </select>
              <input
                type="text"
                value={newTag.tagValue}
                onChange={(e) => setNewTag({ ...newTag, tagValue: e.target.value })}
                placeholder="Tag value"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: 'Poppins' }}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                style={{ fontFamily: 'Poppins' }}
              >
                Add
              </button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm flex items-center gap-1"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {tag.tagValue}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <Icon icon="mingcute:close-line" width={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              style={{ fontFamily: 'Poppins' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
              style={{ fontFamily: 'Poppins' }}
            >
              {isSubmitting ? "Creating..." : "Create Response"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResponseViewModal({
  response,
  onClose,
  onRefresh,
}: {
  response: InterviewResponse;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"current" | "versions" | "tags" | "outcomes">("current");
  const [newVersionText, setNewVersionText] = useState("");
  const [newTag, setNewTag] = useState({ tagType: "skill" as TagType, tagValue: "" });
  const [newOutcome, setNewOutcome] = useState<InterviewResponseOutcomeInput>({
    outcomeType: "next_round",
  });

  const handleCreateVersion = async () => {
    if (!newVersionText.trim()) {
      alert("Please enter a response text");
      return;
    }

    try {
      await api.createResponseVersion(response.id, { responseText: newVersionText });
      setNewVersionText("");
      onRefresh();
      const updated = await api.getInterviewResponse(response.id);
      if (updated.ok && updated.data) {
        setActiveTab("versions");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create version");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.tagValue.trim()) return;

    try {
      await api.addResponseTag(response.id, newTag);
      setNewTag({ tagType: "skill", tagValue: "" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add tag");
    }
  };

  const handleAddOutcome = async () => {
    try {
      await api.addResponseOutcome(response.id, newOutcome);
      setNewOutcome({ outcomeType: "next_round" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add outcome");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins' }}>
            Response Details
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{
                backgroundColor: QUESTION_TYPE_COLORS[response.questionType],
                fontFamily: 'Poppins'
              }}
            >
              {QUESTION_TYPE_LABELS[response.questionType]}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Poppins' }}>
            {response.questionText}
          </h3>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-4">
          <div className="flex gap-4">
            {[
              { id: "current", label: "Current Response" },
              { id: "versions", label: `Versions (${response.versionCount || 1})` },
              { id: "tags", label: `Tags (${response.tags.length})` },
              { id: "outcomes", label: `Outcomes (${response.outcomes.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2 px-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-slate-600"
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === "current" && (
            <div>
              <p className="text-slate-700 whitespace-pre-wrap mb-4" style={{ fontFamily: 'Poppins' }}>
                {response.currentVersion.responseText}
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Create New Version</h4>
                <textarea
                  value={newVersionText}
                  onChange={(e) => setNewVersionText(e.target.value)}
                  placeholder="Enter your improved response..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2"
                  rows={4}
                  style={{ fontFamily: 'Poppins' }}
                />
                <button
                  onClick={handleCreateVersion}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Save as New Version
                </button>
              </div>
            </div>
          )}

          {activeTab === "versions" && (
            <div className="space-y-4">
              {response.versions?.map((version) => (
                <div key={version.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600" style={{ fontFamily: 'Poppins' }}>
                      Version {version.versionNumber}
                    </span>
                    <span className="text-xs text-slate-500" style={{ fontFamily: 'Poppins' }}>
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap" style={{ fontFamily: 'Poppins' }}>
                    {version.responseText}
                  </p>
                  {version.editNotes && (
                    <p className="text-sm text-slate-500 mt-2 italic" style={{ fontFamily: 'Poppins' }}>
                      Notes: {version.editNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "tags" && (
            <div>
              <div className="flex gap-2 mb-4">
                <select
                  value={newTag.tagType}
                  onChange={(e) => setNewTag({ ...newTag, tagType: e.target.value as TagType })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                  style={{ fontFamily: 'Poppins' }}
                >
                  <option value="skill">Skill</option>
                  <option value="experience">Experience</option>
                  <option value="company">Company</option>
                  <option value="technology">Technology</option>
                  <option value="industry">Industry</option>
                </select>
                <input
                  type="text"
                  value={newTag.tagValue}
                  onChange={(e) => setNewTag({ ...newTag, tagValue: e.target.value })}
                  placeholder="Tag value"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  style={{ fontFamily: 'Poppins' }}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {response.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-sm"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {TAG_TYPE_LABELS[tag.tagType]}: {tag.tagValue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "outcomes" && (
            <div>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>Add Outcome</h4>
                <div className="space-y-3">
                  <select
                    value={newOutcome.outcomeType}
                    onChange={(e) => setNewOutcome({ ...newOutcome, outcomeType: e.target.value as OutcomeType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <option value="offer">Offer</option>
                    <option value="next_round">Next Round</option>
                    <option value="rejected">Rejected</option>
                    <option value="no_decision">No Decision</option>
                  </select>
                  <input
                    type="text"
                    value={newOutcome.company || ""}
                    onChange={(e) => setNewOutcome({ ...newOutcome, company: e.target.value })}
                    placeholder="Company (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    style={{ fontFamily: 'Poppins' }}
                  />
                  <input
                    type="text"
                    value={newOutcome.jobTitle || ""}
                    onChange={(e) => setNewOutcome({ ...newOutcome, jobTitle: e.target.value })}
                    placeholder="Job Title (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    style={{ fontFamily: 'Poppins' }}
                  />
                  <button
                    onClick={handleAddOutcome}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Add Outcome
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {response.outcomes.map((outcome) => (
                  <div key={outcome.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{
                          backgroundColor: OUTCOME_TYPE_COLORS[outcome.outcomeType],
                          fontFamily: 'Poppins'
                        }}
                      >
                        {OUTCOME_TYPE_LABELS[outcome.outcomeType]}
                      </span>
                      <span className="text-xs text-slate-500" style={{ fontFamily: 'Poppins' }}>
                        {new Date(outcome.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {(outcome.company || outcome.jobTitle) && (
                      <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                        {outcome.company} {outcome.jobTitle && `- ${outcome.jobTitle}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

