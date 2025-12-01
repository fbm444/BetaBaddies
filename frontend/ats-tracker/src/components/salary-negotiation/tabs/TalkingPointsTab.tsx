import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";
import type { SalaryNegotiation, TalkingPoint } from "../../../types";

interface TalkingPointsTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: () => void;
}

export function TalkingPointsTab({
  negotiation,
  onUpdate,
}: TalkingPointsTabProps) {
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>(
    negotiation.talkingPoints || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (negotiation.talkingPoints) {
      setTalkingPoints(negotiation.talkingPoints);
    }
  }, [negotiation]);

  const handleGenerate = async (regenerate = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.generateTalkingPoints(negotiation.id, regenerate);

      if (response.ok && response.data?.talkingPoints) {
        setTalkingPoints(response.data.talkingPoints);
        onUpdate();
      } else {
        setError(response.error || "Failed to generate talking points");
      }
    } catch (err: any) {
      console.error("Failed to generate talking points:", err);
      setError(err.message || "Failed to generate talking points");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (point: TalkingPoint) => {
    setEditingPointId(point.id);
    setEditText(point.point);
  };

  const handleSaveEdit = (pointId: string) => {
    setTalkingPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, point: editText } : p))
    );
    setEditingPointId(null);
    setEditText("");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "experience":
        return "bg-blue-100 text-blue-700";
      case "achievement":
        return "bg-green-100 text-green-700";
      case "market":
        return "bg-purple-100 text-purple-700";
      case "value":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Negotiation Talking Points</h3>
          <p className="text-sm text-slate-600 mt-1">
            AI-generated personalized talking points based on your experience
          </p>
        </div>
        <button
          onClick={() => handleGenerate(talkingPoints.length > 0)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : talkingPoints.length > 0 ? (
            <>
              <Icon icon="mingcute:refresh-line" width={16} />
              Regenerate
            </>
          ) : (
            <>
              <Icon icon="mingcute:magic-line" width={16} />
              Generate Talking Points
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {talkingPoints.length > 0 ? (
        <div className="space-y-4">
          {talkingPoints.map((point) => (
            <div
              key={point.id}
              className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                        point.category
                      )}`}
                    >
                      {point.category}
                    </span>
                  </div>
                  {editingPointId === point.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(point.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPointId(null);
                            setEditText("");
                          }}
                          className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-900 font-medium mb-2">{point.point}</p>
                      {point.rationale && (
                        <p className="text-sm text-slate-600 italic">"{point.rationale}"</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingPointId !== point.id && (
                    <>
                      <button
                        onClick={() => handleCopy(point.point)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Icon icon="mingcute:copy-line" width={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(point)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Icon icon="mingcute:edit-line" width={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
          <Icon icon="mingcute:message-line" width={48} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No talking points generated yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Click "Generate Talking Points" to create personalized negotiation points
          </p>
          <button
            onClick={() => handleGenerate(false)}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? "Generating..." : "Generate Talking Points"}
          </button>
        </div>
      )}
    </div>
  );
}

