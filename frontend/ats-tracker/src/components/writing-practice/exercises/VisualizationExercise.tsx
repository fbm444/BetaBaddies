import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";

interface VisualizationExerciseProps {
  onComplete: () => void;
  onClose: () => void;
}

export function VisualizationExercise({ onComplete, onClose }: VisualizationExerciseProps) {
  const [step, setStep] = useState(0);
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      title: "Find a Comfortable Position",
      description: "Sit or lie down in a comfortable position. Close your eyes and take a few deep breaths.",
      icon: "mingcute:sofa-line",
    },
    {
      title: "Visualize the Setting",
      description: "Imagine yourself in the interview room. See the environment clearly - the room, the lighting, the furniture.",
      icon: "mingcute:building-line",
    },
    {
      title: "See Yourself Succeeding",
      description: "Visualize yourself answering questions confidently. See yourself smiling, making eye contact, and expressing your ideas clearly.",
      icon: "mingcute:user-smile-line",
    },
    {
      title: "Feel the Confidence",
      description: "Feel the confidence in your body. Notice how calm and prepared you feel. Imagine the positive energy flowing through you.",
      icon: "mingcute:heart-line",
    },
    {
      title: "Hear Positive Feedback",
      description: "Imagine the interviewer responding positively. Visualize them nodding, smiling, and showing interest in what you're saying.",
      icon: "mingcute:message-smile-line",
    },
    {
      title: "Feel the Success",
      description: "Visualize yourself leaving the interview feeling accomplished. See yourself celebrating your success and feeling proud.",
      icon: "mingcute:trophy-line",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (effectivenessRating === null) {
      alert("Please rate the effectiveness of this exercise");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.completeNervesExercise({
        exerciseType: "visualization",
        effectivenessRating,
        notes: notes.trim() || undefined,
        exerciseData: {
          stepsCompleted: step + 1,
          totalSteps: steps.length,
        },
      });
      onComplete();
    } catch (err: any) {
      console.error("Failed to save exercise:", err);
      alert("Failed to save exercise. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Visualization Exercise</h2>
            <p className="text-sm text-slate-600 mt-1">Step {step + 1} of {steps.length}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Exercise Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center space-y-6">
            {/* Step Content */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-12 border border-purple-200 min-h-[400px] flex flex-col items-center justify-center">
              <Icon icon={currentStep.icon} width={80} className="text-purple-500 mb-6" />
              <h3 className="text-3xl font-bold text-slate-900 mb-4">{currentStep.title}</h3>
              <p className="text-lg text-slate-700 max-w-2xl leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={step === 0}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon icon="mingcute:arrow-left-line" width={20} />
                Previous
              </button>

              {step < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium flex items-center gap-2"
                >
                  Next
                  <Icon icon="mingcute:arrow-right-line" width={20} />
                </button>
              ) : (
                <div className="space-y-4 w-full max-w-md">
                  {/* Rating */}
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      How effective was this exercise? (1-5)
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setEffectivenessRating(rating)}
                          className={`w-12 h-12 rounded-lg font-semibold transition-colors ${
                            effectivenessRating === rating
                              ? "bg-purple-500 text-white"
                              : "bg-white border-2 border-slate-300 text-slate-700 hover:border-purple-300"
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                      rows={3}
                      placeholder="How did this visualization make you feel?"
                    />
                  </div>

                  <button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Saving..." : "Complete Exercise"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

