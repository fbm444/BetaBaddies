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

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition shadow-md"
      >
        <Icon icon="mingcute:trophy-line" width={20} />
        Celebrate Milestone
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Celebrate a Milestone</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedMilestone(null);
                    setDescription("");
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <Icon icon="mingcute:close-line" width={24} />
                </button>
              </div>

              {!selectedMilestone ? (
                <div className="space-y-4">
                  {Object.entries(groupedMilestones).map(([category, milestones]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 capitalize">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {milestones.map((milestone) => (
                          <button
                            key={milestone.type}
                            onClick={() => setSelectedMilestone(milestone)}
                            className="text-left p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                          >
                            <div className="font-medium text-slate-900">{milestone.title}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              {milestone.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-500 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mingcute:trophy-line" width={24} className="text-yellow-600" />
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedMilestone.title}
                      </h3>
                    </div>
                    <p className="text-slate-700">{selectedMilestone.description}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add any additional context or details about this milestone..."
                      className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateMilestone}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                          Creating...
                        </span>
                      ) : (
                        "Celebrate Milestone"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMilestone(null);
                        setDescription("");
                      }}
                      className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
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

