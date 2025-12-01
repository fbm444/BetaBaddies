import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type {
  SalaryNegotiation,
} from "../../types";
import { NegotiationOverviewTab } from "./tabs/NegotiationOverviewTab";
import { MarketResearchTab } from "./tabs/MarketResearchTab";
import { TalkingPointsTab } from "./tabs/TalkingPointsTab";
import { NegotiationScriptsTab } from "./tabs/NegotiationScriptsTab";
import { TimingStrategyTab } from "./tabs/TimingStrategyTab";
import { CounterofferEvaluatorTab } from "./tabs/CounterofferEvaluatorTab";
import { ConfidenceExercisesTab } from "./tabs/ConfidenceExercisesTab";

type DetailTabType =
  | "overview"
  | "market-research"
  | "talking-points"
  | "scripts"
  | "timing"
  | "counteroffer"
  | "exercises";

interface NegotiationDetailModalProps {
  negotiation: SalaryNegotiation | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function NegotiationDetailModal({
  negotiation,
  onClose,
  onUpdate,
}: NegotiationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTabType>("overview");
  const [fullNegotiation, setFullNegotiation] = useState<SalaryNegotiation | null>(negotiation);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (negotiation) {
      setFullNegotiation(negotiation);
      setActiveTab("overview");
      // Fetch full negotiation details if needed
      fetchFullNegotiation();
    }
  }, [negotiation]);

  const fetchFullNegotiation = async () => {
    if (!negotiation) return;
    try {
      setIsLoading(true);
      const response = await api.getSalaryNegotiation(negotiation.id);
      if (response.ok && response.data?.negotiation) {
        setFullNegotiation(response.data.negotiation);
      }
    } catch (err) {
      console.error("Failed to fetch full negotiation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!negotiation) return null;

  const tabs: { id: DetailTabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "mingcute:file-list-line" },
    { id: "market-research", label: "Market Research", icon: "mingcute:chart-line" },
    { id: "talking-points", label: "Talking Points", icon: "mingcute:message-line" },
    { id: "scripts", label: "Scripts", icon: "mingcute:file-text-line" },
    { id: "timing", label: "Timing Strategy", icon: "mingcute:time-line" },
    { id: "counteroffer", label: "Counteroffer", icon: "mingcute:exchange-line" },
    { id: "exercises", label: "Exercises", icon: "mingcute:lightbulb-line" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">
              {negotiation.jobTitle || "Position"} @ {negotiation.company || "Company"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {negotiation.location || "Location not specified"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <nav className="flex space-x-1 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon icon={tab.icon} width={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Icon
                icon="mingcute:loading-line"
                className="w-8 h-8 animate-spin text-blue-500"
              />
            </div>
          ) : (
            <>
              {activeTab === "overview" && fullNegotiation && (
                <NegotiationOverviewTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "market-research" && fullNegotiation && (
                <MarketResearchTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "talking-points" && fullNegotiation && (
                <TalkingPointsTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "scripts" && fullNegotiation && (
                <NegotiationScriptsTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "timing" && fullNegotiation && (
                <TimingStrategyTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "counteroffer" && fullNegotiation && (
                <CounterofferEvaluatorTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
              {activeTab === "exercises" && fullNegotiation && (
                <ConfidenceExercisesTab
                  negotiation={fullNegotiation}
                  onUpdate={onUpdate}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

