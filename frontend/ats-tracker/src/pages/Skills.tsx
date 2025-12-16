import { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../services/api";
import {
  SkillData,
  SkillInput,
  SkillCategory,
  ProficiencyLevel,
  COMMON_SKILLS,
  PROFICIENCY_CONFIG,
  CATEGORY_CONFIG,
} from "../types";
import { isValidUrl, getUrlErrorMessage } from "../utils/urlValidation";

// Sortable skill item for drag-and-drop
function SortableSkillItem({
  skill,
  onEdit,
  onDelete,
}: {
  skill: SkillData;
  onEdit: (skill: SkillData) => void;
  onDelete: (skill: SkillData) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const proficiencyConfig = PROFICIENCY_CONFIG[skill.proficiency];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-lg border border-slate-200 p-4 transition-all hover:shadow-md ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
        >
          <Icon icon="mingcute:drag-line" width={20} height={20} />
        </button>

        {/* Skill Badge (if available) */}
        {skill.skillBadge && (
          <img
            src={skill.skillBadge}
            alt={`${skill.skillName} badge`}
            className="w-8 h-8 object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Skill Name */}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-slate-900 truncate">
            {skill.skillName}
          </h4>
          {/* Proficiency Bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${proficiencyConfig.percent}%`,
                  backgroundColor: proficiencyConfig.color,
                }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: proficiencyConfig.textColor }}
            >
              {proficiencyConfig.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(skill)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit skill"
          >
            <Icon icon="mingcute:edit-line" width={18} height={18} />
          </button>
          <button
            onClick={() => onDelete(skill)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete skill"
          >
            <Icon icon="mingcute:delete-line" width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Category section with collapsible content
function CategorySection({
  category,
  skills,
  onReorder,
  onEdit,
  onDelete,
  isCollapsed,
  onToggleCollapse,
}: {
  category: SkillCategory;
  skills: SkillData[];
  onReorder: (skills: SkillData[]) => void;
  onEdit: (skill: SkillData) => void;
  onDelete: (skill: SkillData) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[category];

  // Calculate proficiency breakdown
  const proficiencyBreakdown = skills.reduce((acc, skill) => {
    acc[skill.proficiency] = (acc[skill.proficiency] || 0) + 1;
    return acc;
  }, {} as Record<ProficiencyLevel, number>);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = skills.findIndex((s) => s.id === active.id);
      const newIndex = skills.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(skills, oldIndex, newIndex));
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Category Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-200"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${categoryConfig.color}20` }}
          >
            <Icon
              icon={categoryConfig.icon}
              width={24}
              height={24}
              style={{ color: categoryConfig.color }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {category}{" "}
              <span className="text-slate-500">({skills.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              {categoryConfig.description}
            </p>
          </div>
        </div>
        <Icon
          icon={isCollapsed ? "mingcute:down-line" : "mingcute:up-line"}
          width={20}
          height={20}
          className="text-slate-400"
        />
      </div>

      {/* Category Content */}
      {!isCollapsed && (
        <div className="p-4">
          {skills.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Icon
                icon="mingcute:information-line"
                width={32}
                height={32}
                className="mx-auto mb-2 text-slate-400"
              />
              <p className="text-sm">No skills in this category yet</p>
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={skills.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <SortableSkillItem
                        key={skill.id}
                        skill={skill}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Proficiency Summary */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700 mb-2">
                  Proficiency Breakdown:
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Expert",
                      "Advanced",
                      "Intermediate",
                      "Beginner",
                    ] as ProficiencyLevel[]
                  ).map((level) => {
                    const count = proficiencyBreakdown[level] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={level}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: PROFICIENCY_CONFIG[level].bgColor,
                          color: PROFICIENCY_CONFIG[level].textColor,
                        }}
                      >
                        {count} {level}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Add/Edit Modal
function SkillModal({
  isOpen,
  onClose,
  onSave,
  skill,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SkillInput) => void;
  skill?: SkillData;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<SkillInput>({
    skillName: skill?.skillName || "",
    proficiency: skill?.proficiency || "Beginner",
    category: skill?.category || "Technical",
    skillBadge: skill?.skillBadge || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (skill) {
      setFormData({
        skillName: skill.skillName,
        proficiency: skill.proficiency,
        category: skill.category || "Technical",
        skillBadge: skill.skillBadge || "",
      });
    } else {
      setFormData({
        skillName: "",
        proficiency: "Beginner",
        category: "Technical",
        skillBadge: "",
      });
    }
    setErrors({});
  }, [skill, isOpen]);

  // Filter suggestions based on input and category
  useEffect(() => {
    if (formData.skillName && formData.category) {
      const categorySkills =
        COMMON_SKILLS[formData.category as SkillCategory] || [];
      const filtered = categorySkills
        .filter((s) =>
          s.toLowerCase().includes(formData.skillName.toLowerCase())
        )
        .slice(0, 10);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [formData.skillName, formData.category]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.skillName.trim()) {
      newErrors.skillName = "Skill name is required";
    } else if (formData.skillName.length > 100) {
      newErrors.skillName = "Skill name must be less than 100 characters";
    }

    if (!formData.proficiency) {
      newErrors.proficiency = "Proficiency level is required";
    }

    if (formData.skillBadge && !isValidUrl(formData.skillBadge)) {
      newErrors.skillBadge = getUrlErrorMessage("badge URL");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setFormData({ ...formData, skillName: suggestion });
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">
            {skill ? "Edit Skill" : "Add New Skill"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="mingcute:close-line" width={24} height={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Skill Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Skill Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.skillName}
              onChange={(e) => {
                setFormData({ ...formData, skillName: e.target.value });
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                errors.skillName ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="e.g., JavaScript, Leadership"
              disabled={isSubmitting}
            />
            {errors.skillName && (
              <p className="text-red-500 text-xs mt-1">{errors.skillName}</p>
            )}

            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
                  💡 Suggestions:
                </div>
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Proficiency Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  "Beginner",
                  "Intermediate",
                  "Advanced",
                  "Expert",
                ] as ProficiencyLevel[]
              ).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, proficiency: level })
                  }
                  disabled={isSubmitting}
                  className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    formData.proficiency === level
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{level}</span>
                    <span className="text-xs text-slate-500">
                      {PROFICIENCY_CONFIG[level].percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${PROFICIENCY_CONFIG[level].percent}%`,
                        backgroundColor: PROFICIENCY_CONFIG[level].color,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
            {errors.proficiency && (
              <p className="text-red-500 text-xs mt-1">{errors.proficiency}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="skill-category-select" className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <select
              id="skill-category-select"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as SkillCategory,
                })
              }
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow"
            >
              <option value="Technical">Technical</option>
              <option value="Soft Skills">Soft Skills</option>
              <option value="Languages">Languages</option>
              <option value="Industry-Specific">Industry-Specific</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {formData.category &&
                CATEGORY_CONFIG[formData.category as SkillCategory]
                  ?.description}
            </p>
          </div>

          {/* Skill Badge URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Skill Badge URL{" "}
              <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.skillBadge}
              onChange={(e) =>
                setFormData({ ...formData, skillBadge: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                errors.skillBadge ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="https://example.com/badge.png"
              disabled={isSubmitting}
            />
            {errors.skillBadge && (
              <p className="text-red-500 text-xs mt-1">{errors.skillBadge}</p>
            )}
            {formData.skillBadge && isValidUrl(formData.skillBadge) && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Badge Preview:</p>
                <img
                  src={formData.skillBadge}
                  alt="Badge preview"
                  className="w-12 h-12 object-contain border border-slate-200 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    width={18}
                    height={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>{skill ? "Update Skill" : "Add Skill"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  skill,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skill: SkillData | null;
  isDeleting: boolean;
}) {
  if (!isOpen || !skill) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Icon
              icon="mingcute:alert-line"
              width={24}
              height={24}
              className="text-red-600"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Skill?
            </h3>
            <p className="text-sm text-slate-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-slate-700 mb-6">
          Are you sure you want to delete <strong>{skill.skillName}</strong>?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Icon
                  icon="mingcute:loading-line"
                  width={18}
                  height={18}
                  className="animate-spin"
                />
                Deleting...
              </>
            ) : (
              "Delete Skill"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Skills Page
export function Skills() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"category" | "list">("category");

  // Search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | SkillCategory>(
    "all"
  );

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<SkillCategory>
  >(new Set());

  // Fetch skills on mount
  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getSkills();
      if (response.ok) {
        setSkills(response.data!.skills);
      }
    } catch (err: any) {
      console.error("Failed to fetch skills:", err);
      setError("Failed to load skills. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search skills
  const filteredSkills = useMemo(() => {
    let filtered = skills;

    // Apply category filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((skill) => skill.category === activeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((skill) =>
        skill.skillName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [skills, activeFilter, searchTerm]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<SkillCategory, SkillData[]> = {
      Technical: [],
      "Soft Skills": [],
      Languages: [],
      "Industry-Specific": [],
    };

    filteredSkills.forEach((skill) => {
      const category = skill.category || "Technical";
      grouped[category].push(skill);
    });

    return grouped;
  }, [filteredSkills]);

  // Handle add skill
  const handleAddSkill = async (data: SkillInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createSkill(data);
      if (response.ok) {
        setSkills([...skills, response.data!.skill]);
        setIsAddModalOpen(false);
        showSuccess("Skill added successfully!");
      }
    } catch (err: any) {
      // Handle ApiError with status and code information
      if (err.status === 409) {
        setError(
          "You already have this skill. Try editing the existing one instead."
        );
      } else {
        setError(err.message || "Failed to add skill");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit skill
  const handleEditSkill = async (data: SkillInput) => {
    if (!selectedSkill) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateSkill(selectedSkill.id, data);
      if (response.ok) {
        setSkills(
          skills.map((s) =>
            s.id === selectedSkill.id ? response.data!.skill : s
          )
        );
        setIsEditModalOpen(false);
        setSelectedSkill(null);
        showSuccess("Skill updated successfully!");
      }
    } catch (err: any) {
      // Handle ApiError with status and code information
      if (err.status === 409) {
        setError("Another skill with this name already exists.");
      } else {
        setError(err.message || "Failed to update skill");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete skill
  const handleDeleteSkill = async () => {
    if (!selectedSkill) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.deleteSkill(selectedSkill.id);
      if (response.ok) {
        setSkills(skills.filter((s) => s.id !== selectedSkill.id));
        setIsDeleteModalOpen(false);
        setSelectedSkill(null);
        showSuccess("Skill deleted successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle skill reorder within category
  const handleReorder = (
    category: SkillCategory,
    reorderedSkills: SkillData[]
  ) => {
    // Update the skills array with reordered items
    const otherSkills = skills.filter((s) => s.category !== category);
    setSkills([...otherSkills, ...reorderedSkills]);
  };

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Export functions
  const exportAsJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString().split("T")[0],
      totalSkills: skills.length,
      skillsByCategory,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-export-${exportData.exportDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Skills exported as JSON!");
  };

  const exportAsCSV = () => {
    const csv = [
      ["Category", "Skill Name", "Proficiency", "Proficiency %"],
      ...skills.map((s) => [
        s.category || "Technical",
        s.skillName,
        s.proficiency,
        PROFICIENCY_CONFIG[s.proficiency].percent.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Skills exported as CSV!");
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (category: SkillCategory) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-poppins min-h-full flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            width={48}
            height={48}
            className="animate-spin text-blue-700 mx-auto mb-4"
          />
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading your skills...
          </div>
          <div className="text-base text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-poppins min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-slate-900 mb-2">
            Skills Portfolio
          </h1>
          <p className="text-slate-600">
            Manage your technical and professional skills • {skills.length}{" "}
            total
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
        >
          <Icon icon="mingcute:add-line" width={20} height={20} />
          Add Skill
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Icon
            icon="mingcute:check-circle-line"
            width={20}
            height={20}
            className="text-green-600"
          />
          <p className="text-green-800 text-sm m-0">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Icon
            icon="mingcute:alert-line"
            width={20}
            height={20}
            className="text-red-600"
          />
          <p className="text-red-800 text-sm m-0">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium text-slate-700">View:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("category")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "category"
                  ? "bg-blue-700 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Icon
                icon="mingcute:grid-line"
                width={16}
                height={16}
                className="inline mr-1"
              />
              Category View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-blue-700 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Icon
                icon="mingcute:list-check-line"
                width={16}
                height={16}
                className="inline mr-1"
              />
              List View
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Icon
            icon="mingcute:search-line"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filter:</span>
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
            }`}
          >
            All ({skills.length})
          </button>
          {(
            [
              "Technical",
              "Soft Skills",
              "Languages",
              "Industry-Specific",
            ] as SkillCategory[]
          ).map((category) => {
            const count = skills.filter((s) => s.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === category
                    ? "text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
                style={{
                  backgroundColor:
                    activeFilter === category
                      ? CATEGORY_CONFIG[category].color
                      : undefined,
                }}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Actions */}
      {skills.length > 0 && (
        <div className="flex justify-end gap-3 mb-6">
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Icon icon="mingcute:file-export-line" width={16} height={16} />
            Export JSON
          </button>
          <button
            onClick={exportAsCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Icon icon="mingcute:file-export-line" width={16} height={16} />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Icon icon="mingcute:printer-line" width={16} height={16} />
            Print
          </button>
        </div>
      )}

      {/* Skills Display */}
      {filteredSkills.length === 0 ? (
        <div className="text-center py-20">
          <Icon
            icon="mingcute:star-line"
            width={64}
            height={64}
            className="mx-auto mb-4 text-slate-300"
          />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            {searchTerm || activeFilter !== "all"
              ? "No skills found"
              : "No skills yet"}
          </h2>
          <p className="text-slate-600 mb-6">
            {searchTerm || activeFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Start building your skills portfolio by adding your first skill"}
          </p>
          {!searchTerm && activeFilter === "all" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              Add Your First Skill
            </button>
          )}
        </div>
      ) : viewMode === "category" ? (
        <div className="space-y-6">
          {(
            [
              "Technical",
              "Soft Skills",
              "Languages",
              "Industry-Specific",
            ] as SkillCategory[]
          ).map((category) => {
            const categorySkills = skillsByCategory[category];
            if (categorySkills.length === 0 && activeFilter !== "all")
              return null;

            return (
              <CategorySection
                key={category}
                category={category}
                skills={categorySkills}
                onReorder={(reordered) => handleReorder(category, reordered)}
                onEdit={(skill) => {
                  setSelectedSkill(skill);
                  setIsEditModalOpen(true);
                }}
                onDelete={(skill) => {
                  setSelectedSkill(skill);
                  setIsDeleteModalOpen(true);
                }}
                isCollapsed={collapsedCategories.has(category)}
                onToggleCollapse={() => toggleCategoryCollapse(category)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSkills.map((skill) => (
            <SortableSkillItem
              key={skill.id}
              skill={skill}
              onEdit={(skill) => {
                setSelectedSkill(skill);
                setIsEditModalOpen(true);
              }}
              onDelete={(skill) => {
                setSelectedSkill(skill);
                setIsDeleteModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SkillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setError(null);
        }}
        onSave={handleAddSkill}
        isSubmitting={isSubmitting}
      />

      <SkillModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSkill(null);
          setError(null);
        }}
        onSave={handleEditSkill}
        skill={selectedSkill || undefined}
        isSubmitting={isSubmitting}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSkill(null);
          setError(null);
        }}
        onConfirm={handleDeleteSkill}
        skill={selectedSkill}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
