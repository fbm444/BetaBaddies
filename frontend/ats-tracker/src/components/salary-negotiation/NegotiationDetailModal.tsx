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
  const [currentNegotiationId, setCurrentNegotiationId] = useState<string | null>(negotiation?.id || null);

  // Only reset tab when negotiation ID changes (new negotiation selected)
  useEffect(() => {
    if (negotiation) {
      const isNewNegotiation = currentNegotiationId !== negotiation.id;
      
      if (isNewNegotiation) {
        setActiveTab("overview");
        setCurrentNegotiationId(negotiation.id);
      }
      
      setFullNegotiation(negotiation);
      fetchFullNegotiation();
    }
  }, [negotiation?.id]); // Only depend on ID, not the whole object

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

  // Update negotiation data when prop changes (but don't reset tab)
  useEffect(() => {
    if (negotiation && negotiation.id === currentNegotiationId) {
      // Only update if it's the same negotiation (not a new one)
      setFullNegotiation(negotiation);
    }
  }, [negotiation, currentNegotiationId]);

  if (!negotiation) return null;

  const tabs: { id: DetailTabType; label: string; icon?: string }[] = [
    { id: "overview", label: "Overview", icon: "mingcute:file-list-line" },
    { id: "market-research", label: "Market Research", icon: "mingcute:chart-line" },
    { id: "talking-points", label: "Talking Points", icon: "mingcute:message-line" },
    { id: "scripts", label: "Scripts", icon: "mingcute:file-text-line" },
    { id: "timing", label: "Timing Strategy" },
    { id: "counteroffer", label: "Counteroffer", icon: "mingcute:exchange-line" },
    { id: "exercises", label: "Exercises", icon: "mingcute:lightbulb-line" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl my-auto flex flex-col max-h-[calc(100vh-2rem)] min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
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
        <div className="overflow-x-auto flex-shrink-0">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent ${
                  activeTab === tab.id
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-slate-600"
                }`}
                style={{
                  outline: 'none',
                  boxShadow: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderRadius: '0'
                }}
                onFocus={(e) => e.target.blur()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {tab.icon && (
                  <Icon icon={tab.icon} width={18} height={18} className="flex-shrink-0" style={{ minWidth: '18px', minHeight: '18px' }} />
                )}
                <span className="flex-shrink-0">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
                  onUpdate={(updatedNegotiation) => {
                    if (updatedNegotiation) {
                      setFullNegotiation(updatedNegotiation);
                    }
                  }}
                />
              )}
              {activeTab === "talking-points" && fullNegotiation && (
                <TalkingPointsTab
                  negotiation={fullNegotiation}
                  onUpdate={(updatedNegotiation) => {
                    if (updatedNegotiation) {
                      setFullNegotiation(updatedNegotiation);
                    }
                    // Don't call parent onUpdate to avoid tab reset
                    // onUpdate();
                  }}
                />
              )}
              {activeTab === "scripts" && fullNegotiation && (
                <NegotiationScriptsTab
                  negotiation={fullNegotiation}
                  onUpdate={(updatedNegotiation) => {
                    if (updatedNegotiation) {
                      setFullNegotiation(updatedNegotiation);
                    }
                  }}
                />
              )}
              {activeTab === "timing" && fullNegotiation && (
                <TimingStrategyTab
                  negotiation={fullNegotiation}
                  onUpdate={(updatedNegotiation) => {
                    if (updatedNegotiation) {
                      setFullNegotiation(updatedNegotiation);
                    }
                  }}
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

