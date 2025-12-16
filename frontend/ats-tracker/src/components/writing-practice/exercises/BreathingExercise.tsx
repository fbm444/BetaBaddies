import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";

interface BreathingExerciseProps {
  onComplete: () => void;
  onClose: () => void;
}

export function BreathingExercise({ onComplete, onClose }: BreathingExerciseProps) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "rest">("inhale");
  const [cycle, setCycle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(4); // 4 seconds per phase
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalCycles = 5;

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Move to next phase
            if (phase === "inhale") {
              setPhase("hold");
              return 4;
            } else if (phase === "hold") {
              setPhase("exhale");
              return 4;
            } else if (phase === "exhale") {
              setPhase("rest");
              return 2;
            } else {
              // Rest complete, start new cycle
              if (cycle < totalCycles - 1) {
                setCycle((prev) => prev + 1);
                setPhase("inhale");
                return 4;
              } else {
                // Exercise complete
                setIsRunning(false);
                return 0;
              }
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, phase, cycle]);

  const startExercise = () => {
    setIsRunning(true);
    setCycle(0);
    setPhase("inhale");
    setTimeRemaining(4);
  };

  const pauseExercise = () => {
    setIsRunning(false);
  };

  const resetExercise = () => {
    setIsRunning(false);
    setCycle(0);
    setPhase("inhale");
    setTimeRemaining(4);
  };

  const handleComplete = async () => {
    if (effectivenessRating === null) {
      alert("Please rate the effectiveness of this exercise");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.completeNervesExercise({
        exerciseType: "breathing",
        effectivenessRating,
        notes: notes.trim() || undefined,
        exerciseData: {
          cyclesCompleted: cycle + 1,
          totalCycles: totalCycles,
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

  const getPhaseInstructions = () => {
    switch (phase) {
      case "inhale":
        return { text: "Breathe In", color: "bg-blue-500", icon: "mingcute:arrow-up-line" };
      case "hold":
        return { text: "Hold", color: "bg-green-500", icon: "mingcute:pause-line" };
      case "exhale":
        return { text: "Breathe Out", color: "bg-orange-500", icon: "mingcute:arrow-down-line" };
      case "rest":
        return { text: "Rest", color: "bg-purple-500", icon: "mingcute:heart-line" };
    }
  };

  const phaseInfo = getPhaseInstructions();
  const progress = ((cycle + (phase === "inhale" ? 0 : phase === "hold" ? 0.33 : phase === "exhale" ? 0.66 : 1)) / totalCycles) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Breathing Exercise</h2>
            <p className="text-sm text-slate-600 mt-1">Cycle {cycle + 1} of {totalCycles}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close exercise"
          >
            <Icon icon="mingcute:close-line" width={24} aria-hidden="true" />
          </button>
        </div>

        {/* Exercise Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isRunning && cycle === 0 && phase === "inhale" && (
            <div className="text-center space-y-6">
              <div className="bg-blue-50 rounded-xl p-8 border border-blue-200">
                <Icon icon="mingcute:wind-line" width={64} className="text-blue-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-900 mb-2">4-4-4-2 Breathing</h3>
                <p className="text-blue-800">
                  This exercise will guide you through 5 cycles of breathing:
                </p>
                <ul className="text-left mt-4 space-y-2 text-blue-700">
                  <li className="flex items-center gap-2">
                    <Icon icon="mingcute:check-line" width={20} className="text-blue-600" />
                    <span>Inhale for 4 seconds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon icon="mingcute:check-line" width={20} className="text-blue-600" />
                    <span>Hold for 4 seconds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon icon="mingcute:check-line" width={20} className="text-blue-600" />
                    <span>Exhale for 4 seconds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon icon="mingcute:check-line" width={20} className="text-blue-600" />
                    <span>Rest for 2 seconds</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={startExercise}
                className="px-8 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium text-lg"
              >
                Start Exercise
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center space-y-8">
              {/* Breathing Circle Animation */}
              <div className="flex items-center justify-center">
                <div
                  className={`${phaseInfo.color} rounded-full transition-all duration-1000 ease-in-out flex items-center justify-center text-white`}
                  style={{
                    width: phase === "inhale" ? "200px" : phase === "hold" ? "200px" : "100px",
                    height: phase === "inhale" ? "200px" : phase === "hold" ? "200px" : "100px",
                  }}
                >
                  <Icon icon={phaseInfo.icon} width={48} />
                </div>
              </div>

              {/* Phase Text */}
              <div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{phaseInfo.text}</h3>
                <p className="text-6xl font-bold text-slate-700">{timeRemaining}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={pauseExercise}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium"
                >
                  Pause
                </button>
                <button
                  onClick={resetExercise}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {!isRunning && cycle > 0 && (
            <div className="text-center space-y-6">
              <div className="bg-green-50 rounded-xl p-8 border border-green-200">
                <Icon icon="mingcute:check-circle-line" width={64} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">Exercise Complete!</h3>
                <p className="text-green-800">You completed {cycle + 1} breathing cycles.</p>
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
                          ? "bg-blue-700 text-white"
                          : "bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-300"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="How did this exercise make you feel?"
                />
              </div>

              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Complete Exercise"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

