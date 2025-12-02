import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface MilestoneCelebrationProps {
  teamId?: string;
  onMilestoneCreated?: () => void;
}

export function MilestoneCelebration({
  teamId,
  onMilestoneCreated,
}: MilestoneCelebrationProps) {
  const [predefinedMilestones, setPredefinedMilestones] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPredefinedMilestones();
  }, []);

  const fetchPredefinedMilestones = async () => {
    try {
      const response = await api.getPredefinedMilestones();
      if (response.ok && response.data) {
        setPredefinedMilestones(response.data.milestones || []);
      }
    } catch (error) {
      console.error("Failed to fetch predefined milestones:", error);
    }
  };

  const handleCreateMilestone = async () => {
    if (!selectedMilestone || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.createMilestone({
        teamId,
        milestoneType: selectedMilestone.type,
        milestoneTitle: selectedMilestone.title,
        milestoneDescription: description || selectedMilestone.description,
        sharedWithTeam: teamId ? true : false,
      });

      if (response.ok) {
        setShowModal(false);
        setSelectedMilestone(null);
        setDescription("");
        if (onMilestoneCreated) {
          onMilestoneCreated();
        }
      }
    } catch (error) {
      console.error("Failed to create milestone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedMilestones = predefinedMilestones.reduce((acc, milestone) => {
    const category = milestone.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(milestone);
    return acc;
  }, {} as Record<string, any[]>);

  // Get icon for milestone type/category
  const getMilestoneIcon = (milestone: any) => {
    const type = milestone.type || "";
    const category = milestone.category || "";
    const title = milestone.title || "";

    // Type-specific icons (check both type and title)
    // Check for "resume_optimized" or "optimized" BEFORE general resume check
    if (type === "resume_optimized" || 
        (type.includes("optimized") && type.includes("resume")) ||
        (title.toLowerCase().includes("optimized") && title.toLowerCase().includes("resume"))) {
      return "mingcute:magic-line";
    }
    if (type.includes("application") || title.toLowerCase().includes("application")) {
      return "mingcute:file-line";
    }
    if (type.includes("phone_screen") || title.toLowerCase().includes("phone screen")) {
      return "mingcute:phone-line";
    }
    if (type.includes("technical") || title.toLowerCase().includes("technical")) {
      return "mingcute:code-line";
    }
    if (type.includes("interview") || title.toLowerCase().includes("interview")) {
      return "mingcute:calendar-line";
    }
    if (type.includes("offer") || title.toLowerCase().includes("offer")) {
      return "mingcute:gift-line";
    }
    if (type.includes("resume") || title.toLowerCase().includes("resume")) {
      return "mingcute:file-document-line";
    }
    if (type.includes("cover_letter") || title.toLowerCase().includes("cover letter")) {
      return "mingcute:mail-line";
    }
    if (type.includes("network") || title.toLowerCase().includes("network")) {
      return "mingcute:user-3-line";
    }
    if (type.includes("skill") || type.includes("certification") || title.toLowerCase().includes("skill") || title.toLowerCase().includes("certification")) {
      return "mingcute:certificate-line";
    }

    // Category-based fallback
    switch (category) {
      case "application":
        return "mingcute:file-line";
      case "interview":
        return "mingcute:calendar-line";
      case "offer":
        return "mingcute:gift-line";
      case "preparation":
        return "mingcute:file-document-line";
      case "networking":
        return "mingcute:user-3-line";
      default:
        return "mingcute:trophy-line";
    }
  };

  // Get color classes for milestone category
  const getCategoryColorClasses = (category: string) => {
    switch (category) {
      case "application":
        return {
          iconBg: "bg-gradient-to-br from-blue-400 to-blue-600",
          cardHover: "hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100",
          previewBg: "bg-gradient-to-br from-blue-50 to-blue-100",
          previewBorder: "border-blue-400",
          previewAccent: "bg-gradient-to-br from-blue-400 to-blue-600",
        };
      case "interview":
        return {
          iconBg: "bg-gradient-to-br from-purple-400 to-purple-600",
          cardHover: "hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100",
          previewBg: "bg-gradient-to-br from-purple-50 to-purple-100",
          previewBorder: "border-purple-400",
          previewAccent: "bg-gradient-to-br from-purple-400 to-purple-600",
        };
      case "offer":
        return {
          iconBg: "bg-gradient-to-br from-green-400 to-green-600",
          cardHover: "hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100",
          previewBg: "bg-gradient-to-br from-green-50 to-green-100",
          previewBorder: "border-green-400",
          previewAccent: "bg-gradient-to-br from-green-400 to-green-600",
        };
      case "preparation":
        return {
          iconBg: "bg-gradient-to-br from-orange-400 to-orange-600",
          cardHover: "hover:border-orange-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100",
          previewBg: "bg-gradient-to-br from-orange-50 to-orange-100",
          previewBorder: "border-orange-400",
          previewAccent: "bg-gradient-to-br from-orange-400 to-orange-600",
        };
      case "networking":
        return {
          iconBg: "bg-gradient-to-br from-pink-400 to-pink-600",
          cardHover: "hover:border-pink-400 hover:bg-gradient-to-br hover:from-pink-50 hover:to-pink-100",
          previewBg: "bg-gradient-to-br from-pink-50 to-pink-100",
          previewBorder: "border-pink-400",
          previewAccent: "bg-gradient-to-br from-pink-400 to-pink-600",
        };
      default:
        return {
          iconBg: "bg-gradient-to-br from-yellow-400 to-orange-500",
          cardHover: "hover:border-yellow-400 hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50",
          previewBg: "bg-gradient-to-br from-yellow-50 to-orange-50",
          previewBorder: "border-yellow-400",
          previewAccent: "bg-gradient-to-br from-yellow-400 to-orange-500",
        };
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-5 py-2.5 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl font-medium"
      >
        <Icon icon="mingcute:trophy-fill" width={20} />
        Celebrate Milestone
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setSelectedMilestone(null);
              setDescription("");
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-200 scale-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Icon icon="mingcute:trophy-fill" width={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Celebrate a Milestone</h2>
                    <p className="text-yellow-100 text-sm mt-0.5">Share your achievement with your team</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedMilestone(null);
                    setDescription("");
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                >
                  <Icon icon="mingcute:close-line" width={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {!selectedMilestone ? (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <p className="text-slate-600">Select a milestone type to celebrate</p>
                  </div>
                  {Object.entries(groupedMilestones).map(([category, milestones]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-3">
                          {category}
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {milestones.map((milestone) => {
                          const colorClasses = getCategoryColorClasses(category);
                          const icon = getMilestoneIcon(milestone);
                          return (
                            <button
                              key={milestone.type}
                              onClick={() => setSelectedMilestone(milestone)}
                              className={`group text-left p-4 border-2 border-slate-200 rounded-xl ${colorClasses.cardHover} transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-white`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-xl ${colorClasses.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md`}>
                                  <Icon icon={icon} width={24} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
                                    {milestone.title}
                                  </div>
                                  <div className="text-sm text-slate-600 mt-1.5 line-clamp-2">
                                    {milestone.description}
                                  </div>
                                </div>
                                <Icon 
                                  icon="mingcute:arrow-right-line" 
                                  width={20} 
                                  className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" 
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Milestone Preview */}
                  {(() => {
                    const colorClasses = getCategoryColorClasses(selectedMilestone.category || "other");
                    const icon = getMilestoneIcon(selectedMilestone);
                    return (
                      <div className={`relative ${colorClasses.previewBg} border-2 ${colorClasses.previewBorder} rounded-2xl p-6 overflow-hidden`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 ${colorClasses.previewAccent} opacity-20 rounded-full -mr-16 -mt-16`}></div>
                        <div className={`absolute bottom-0 left-0 w-24 h-24 ${colorClasses.previewAccent} opacity-20 rounded-full -ml-12 -mb-12`}></div>
                        <div className="relative">
                          <div className="flex items-start gap-4 mb-3">
                            <div className={`w-16 h-16 rounded-xl ${colorClasses.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
                              <Icon icon={icon} width={32} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-slate-900 mb-1">
                                {selectedMilestone.title}
                              </h3>
                              <p className="text-slate-700 leading-relaxed">{selectedMilestone.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Additional Details */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Icon icon="mingcute:edit-line" width={16} className="text-slate-500" />
                      Additional Details
                      <span className="text-xs font-normal text-slate-500">(Optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share the story behind this achievement... What made it special? How did you accomplish it?"
                      className="w-full border-2 border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all resize-none text-slate-700 placeholder-slate-400"
                      rows={5}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Your team will see this when celebrating your milestone
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCreateMilestone}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3.5 rounded-xl hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                          <span>Creating Milestone...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="mingcute:trophy-fill" width={20} />
                          <span>Celebrate Milestone</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMilestone(null);
                        setDescription("");
                      }}
                      className="px-6 py-3.5 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all font-medium"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

