import { useState } from "react";
import { Icon } from "@iconify/react";
import type { SalaryNegotiation } from "../../../types";

interface ConfidenceExercisesTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: () => void;
}

const exerciseTypes = [
  {
    id: "role_play",
    title: "Role-Play Scenarios",
    description: "Practice negotiation conversations with different scenarios",
    icon: "mingcute:user-2-line",
    color: "blue",
  },
  {
    id: "script_practice",
    title: "Script Practice",
    description: "Practice delivering your negotiation scripts",
    icon: "mingcute:play-line",
    color: "green",
  },
  {
    id: "value_articulation",
    title: "Value Articulation",
    description: "Practice explaining your value and achievements",
    icon: "mingcute:star-line",
    color: "purple",
  },
  {
    id: "objection_handling",
    title: "Objection Handling",
    description: "Practice responding to common objections",
    icon: "mingcute:question-line",
    color: "orange",
  },
];

export function ConfidenceExercisesTab({
  negotiation,
  onUpdate,
}: ConfidenceExercisesTabProps) {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState(3);
  const [notes, setNotes] = useState("");

  const handleStartExercise = (exerciseId: string) => {
    setActiveExercise(exerciseId);
    setSelfRating(3);
    setNotes("");
  };

  const handleCompleteExercise = () => {
    // TODO: Save exercise completion to backend
    setActiveExercise(null);
    setSelfRating(3);
    setNotes("");
    onUpdate();
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "green":
        return "bg-green-50 border-green-200 text-green-700";
      case "purple":
        return "bg-purple-50 border-purple-200 text-purple-700";
      case "orange":
        return "bg-orange-50 border-orange-200 text-orange-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  if (activeExercise) {
    const exercise = exerciseTypes.find((e) => e.id === activeExercise);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{exercise?.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{exercise?.description}</p>
          </div>
          <button
            onClick={() => setActiveExercise(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Exercise Instructions</h4>
            <p className="text-slate-700">
              Practice your negotiation skills. Take your time to think through your responses.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Self-Rating (1-5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelfRating(rating)}
                  className={`w-12 h-12 rounded-lg font-semibold transition-colors ${
                    selfRating >= rating
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rate your confidence level after completing this exercise
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Write down what went well, what you learned, or areas to improve..."
            />
          </div>

          <button
            onClick={handleCompleteExercise}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Complete Exercise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Confidence Building Exercises</h3>
        <p className="text-sm text-slate-600 mt-1">
          Practice your negotiation skills with interactive exercises
        </p>
      </div>

      {/* Exercise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exerciseTypes.map((exercise) => (
          <div
            key={exercise.id}
            className={`bg-white rounded-xl p-6 border-2 ${getColorClasses(exercise.color)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <Icon icon={exercise.icon} width={32} height={32} className="text-current flex-shrink-0" style={{ display: 'inline-block' }} />
            </div>
            <h4 className="text-lg font-semibold mb-2">{exercise.title}</h4>
            <p className="text-sm mb-4 opacity-80">{exercise.description}</p>
            <button
              onClick={() => handleStartExercise(exercise.id)}
              className="w-full px-4 py-2 bg-white text-current rounded-lg hover:bg-opacity-80 font-medium transition-colors"
            >
              Start Exercise
            </button>
          </div>
        ))}
      </div>

      {/* Completed Exercises */}
      {negotiation.practiceSessionsCompleted > 0 && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600" />
            <p className="text-sm font-medium text-green-900">
              {negotiation.practiceSessionsCompleted} practice session
              {negotiation.practiceSessionsCompleted !== 1 ? "s" : ""} completed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

