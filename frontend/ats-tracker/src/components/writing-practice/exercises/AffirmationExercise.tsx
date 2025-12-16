import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";

interface AffirmationExerciseProps {
  onComplete: () => void;
  onClose: () => void;
}

const affirmations = [
  "I am well-prepared and confident for this interview",
  "I have valuable skills and experiences to offer",
  "I communicate clearly and effectively",
  "I handle challenges with grace and professionalism",
  "I am deserving of this opportunity",
  "I am calm, focused, and ready to succeed",
  "I trust in my abilities and preparation",
  "I will present myself authentically and confidently",
];

export function AffirmationExercise({ onComplete, onClose }: AffirmationExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readAffirmations, setReadAffirmations] = useState<Set<number>>(new Set());
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (currentIndex < affirmations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMarkAsRead = () => {
    setReadAffirmations(new Set([...readAffirmations, currentIndex]));
  };

  const handleComplete = async () => {
    if (effectivenessRating === null) {
      alert("Please rate the effectiveness of this exercise");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.completeNervesExercise({
        exerciseType: "affirmation",
        effectivenessRating,
        notes: notes.trim() || undefined,
        exerciseData: {
          affirmationsRead: readAffirmations.size,
          totalAffirmations: affirmations.length,
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

  const progress = ((readAffirmations.size) / affirmations.length) * 100;
  const allRead = readAffirmations.size === affirmations.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Affirmation Exercise</h2>
            <p className="text-sm text-slate-600 mt-1">
              {readAffirmations.size} of {affirmations.length} affirmations read
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close exercise"
          >
            <Icon icon="mingcute:close-line" width={24} aria-hidden="true" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Exercise Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center space-y-6">
            {/* Affirmation Card */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-12 border border-orange-200 min-h-[400px] flex flex-col items-center justify-center">
              <Icon
                icon={readAffirmations.has(currentIndex) ? "mingcute:check-circle-line" : "mingcute:heart-line"}
                width={64}
                className={`mb-6 ${readAffirmations.has(currentIndex) ? "text-green-500" : "text-orange-500"}`}
              />
              <h3 className="text-3xl font-bold text-slate-900 mb-4 text-center max-w-2xl">
                {affirmations[currentIndex]}
              </h3>
              {readAffirmations.has(currentIndex) && (
                <p className="text-green-600 font-medium mt-4 flex items-center gap-2">
                  <Icon icon="mingcute:check-line" width={20} />
                  You've read this affirmation
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon icon="mingcute:arrow-left-line" width={20} />
                Previous
              </button>

              {!readAffirmations.has(currentIndex) && (
                <button
                  onClick={handleMarkAsRead}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
                >
                  <Icon icon="mingcute:check-line" width={20} />
                  Mark as Read
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={currentIndex === affirmations.length - 1}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <Icon icon="mingcute:arrow-right-line" width={20} />
              </button>
            </div>

            {/* Completion Section */}
            {allRead && (
              <div className="mt-8 space-y-4 w-full max-w-md mx-auto">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-green-800 font-medium">
                    Great! You've read all affirmations. How did this exercise make you feel?
                  </p>
                </div>

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
                            ? "bg-orange-500 text-white"
                            : "bg-white border-2 border-slate-300 text-slate-700 hover:border-orange-300"
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows={3}
                    placeholder="How did these affirmations make you feel?"
                  />
                </div>

                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Complete Exercise"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

