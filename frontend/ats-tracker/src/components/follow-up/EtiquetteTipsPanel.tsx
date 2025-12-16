import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface EtiquetteTipsPanelProps {
  applicationStage: string;
  daysSinceLastContact?: number;
}

export function EtiquetteTipsPanel({ applicationStage, daysSinceLastContact = 0 }: EtiquetteTipsPanelProps) {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTips();
  }, [applicationStage, daysSinceLastContact]);

  const fetchTips = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFollowUpEtiquetteTips(applicationStage, daysSinceLastContact);
      if (response.ok && response.data?.tips) {
        setTips(response.data.tips);
      }
    } catch (error) {
      console.error("Failed to fetch etiquette tips:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (tips.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500 rounded-lg">
          <Icon icon="mingcute:lightbulb-line" className="text-white" width={20} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Follow-Up Etiquette Tips</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
          <span>Loading tips...</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
              <Icon icon="mingcute:check-circle-line" className="text-blue-500 mt-0.5 flex-shrink-0" width={18} />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

