import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";
import type { SalaryNegotiation, NegotiationScript } from "../../../types";

interface NegotiationScriptsTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: (updatedNegotiation?: SalaryNegotiation) => void;
}

const scenarios = [
  { id: "initial_negotiation", label: "Initial Negotiation", icon: "mingcute:handshake-line" },
  { id: "counteroffer_response", label: "Counteroffer Response", icon: "mingcute:exchange-line" },
  { id: "benefits_negotiation", label: "Benefits Negotiation", icon: "mingcute:gift-line" },
  { id: "timing_discussion", label: "Timing Discussion", icon: "mingcute:time-line" },
  { id: "objection_handling", label: "Objection Handling", icon: "mingcute:question-line" },
];

export function NegotiationScriptsTab({
  negotiation,
  onUpdate,
}: NegotiationScriptsTabProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>("initial_negotiation");
  const [scripts, setScripts] = useState<Record<string, NegotiationScript>>(
    negotiation.scripts || {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (negotiation.scripts) {
      setScripts(negotiation.scripts);
    }
  }, [negotiation]);

  const handleGenerateScript = async (scenario: string, regenerate = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.generateNegotiationScript(negotiation.id, scenario, regenerate);

      if (response.ok && response.data?.script) {
        const newScript = response.data.script;
        const updatedScripts = {
          ...scripts,
          [scenario]: newScript,
        };
        setScripts(updatedScripts);
        
        // Update the negotiation object with cached script
        const updatedNegotiation = {
          ...negotiation,
          scripts: updatedScripts,
        };
        onUpdate(updatedNegotiation);
      } else {
        setError(response.error || "Failed to generate script");
      }
    } catch (err: any) {
      console.error("Failed to generate script:", err);
      setError(err.message || "Failed to generate script");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentScript = scripts[selectedScenario];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Negotiation Scripts</h3>
        <p className="text-sm text-slate-600 mt-1">
          AI-generated scripts for different negotiation scenarios
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Scenario Selector */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedScenario === scenario.id
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Icon icon={scenario.icon} width={18} />
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script Display */}
      {currentScript ? (
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-slate-900">
                {scenarios.find((s) => s.id === selectedScenario)?.label}
              </h4>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                Cached
              </span>
            </div>
            <button
              onClick={() => handleGenerateScript(selectedScenario, true)}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Icon icon="mingcute:refresh-line" width={16} />
              Regenerate
            </button>
          </div>

          {/* Script Text */}
          {currentScript.script && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-slate-700">Script</h5>
                <button
                  onClick={() => handleCopy(currentScript.script)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Icon icon="mingcute:copy-line" width={14} />
                  Copy
                </button>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{currentScript.script}</p>
              </div>
            </div>
          )}

          {/* Key Phrases */}
          {currentScript.keyPhrases && currentScript.keyPhrases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-slate-700">Key Phrases</h5>
                <button
                  onClick={() => handleCopy(currentScript.keyPhrases.join("\n"))}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Icon icon="mingcute:copy-line" width={14} />
                  Copy All
                </button>
              </div>
              <ul className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                {currentScript.keyPhrases.map((phrase, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-blue-700 mt-1">•</span>
                    <span>{phrase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Objections */}
          {currentScript.commonObjections && currentScript.commonObjections.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-slate-700 mb-2">Common Objections & Responses</h5>
              <div className="space-y-3">
                {currentScript.commonObjections.map((obj, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-900">
                        <span className="text-red-600">Objection:</span> {obj.objection}
                      </p>
                      <button
                        onClick={() => handleCopy(obj.response)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Icon icon="mingcute:copy-line" width={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="text-green-600 font-medium">Response:</span> {obj.response}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
          <Icon icon="mingcute:file-text-line" width={48} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No script generated for this scenario</p>
          <p className="text-sm text-slate-500 mb-6">
            Click "Generate Script" to create a negotiation script
          </p>
          <button
            onClick={() => handleGenerateScript(selectedScenario, false)}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
          >
            {isLoading ? "Generating..." : "Generate Script"}
          </button>
        </div>
      )}
    </div>
  );
}

