import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { ABTestFormModal } from "./ABTestFormModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface ABTestingCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function ABTestingCard({ dateRange }: ABTestingCardProps) {
  const [abTests, setAbTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    fetchABTests();
  }, [dateRange]);

  const fetchABTests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getABTests();
      if (response.ok && response.data) {
        setAbTests(response.data.tests || []);
      } else {
        setError(response.error?.message || "Failed to load A/B tests");
      }
    } catch (err: any) {
      console.error("Error fetching A/B tests:", err);
      setError(err.message || "Failed to load A/B tests");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const fetchTestResults = async (testId: string) => {
    try {
      const response = await api.getABTestResults(testId);
      if (response.ok && response.data) {
        setTestResults({ ...testResults, [testId]: response.data.results });
        setExpandedTestId(testId);
      }
    } catch (err) {
      console.error("Error fetching test results:", err);
    }
  };

  const prepareChartData = (test: any, results: any) => {
    const data = [];
    
    // Control group
    if (test.controlGroupConfig || results?.control) {
      const control = results?.control || test.results?.control || {};
      data.push({
        name: test.controlGroupConfig?.name || "Control",
        responseRate: (control.responseRate || 0) * 100,
        interviewRate: (control.interviewRate || 0) * 100,
        offerRate: (control.offerRate || 0) * 100,
        sampleSize: control.sampleSize || control.applicationCount || 0,
      });
    }

    // Variant groups
    if (test.variantGroups && Array.isArray(test.variantGroups)) {
      test.variantGroups.forEach((variant: any, index: number) => {
        const variantKey = `variant_${String.fromCharCode(65 + index).toLowerCase()}`;
        const variantData = results?.[variantKey] || test.results?.[variantKey] || {};
        data.push({
          name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
          responseRate: (variantData.responseRate || 0) * 100,
          interviewRate: (variantData.interviewRate || 0) * 100,
          offerRate: (variantData.offerRate || 0) * 100,
          sampleSize: variantData.sampleSize || variantData.applicationCount || 0,
        });
      });
    } else if (results?.variant_a || test.results?.variantA) {
      // Fallback for variant_a format
      const variantA = results?.variant_a || test.results?.variantA || {};
      data.push({
        name: "Variant A",
        responseRate: (variantA.responseRate || 0) * 100,
        interviewRate: (variantA.interviewRate || 0) * 100,
        offerRate: (variantA.offerRate || 0) * 100,
        sampleSize: variantA.sampleSize || variantA.applicationCount || 0,
      });
    }

    return data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading A/B tests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">A/B Test Results</h2>
          <p className="text-slate-600">
            Show A/B test results for different application strategies
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={18} />
          Create A/B Test
        </button>
      </div>

      {abTests.length > 0 ? (
        <div className="space-y-4">
          {abTests.map((test) => (
            <div
              key={test.id}
              className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-6 border border-violet-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(
                        test.status
                      )}`}
                    >
                      {test.status || "Draft"}
                    </span>
                    <h4 className="text-lg font-semibold text-slate-900">{test.testName}</h4>
                  </div>
                  {test.description && (
                    <p className="text-sm text-slate-700 mb-3">{test.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Variant A</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {test.variantA?.name || "Control"}
                      </p>
                      {test.results?.variantA && (
                        <p className="text-xs text-slate-600 mt-1">
                          Response: {test.results.variantA.responseRate?.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Variant B</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {test.variantB?.name || "Test"}
                      </p>
                      {test.results?.variantB && (
                        <p className="text-xs text-slate-600 mt-1">
                          Response: {test.results.variantB.responseRate?.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  {test.winner && (
                    <div className="mt-4 p-2 bg-green-100 rounded border border-green-200">
                      <p className="text-xs font-semibold text-green-700">
                        Winner: {test.winner}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Graph for Completed Tests */}
              {test.status === "completed" && (
                <div className="mt-6 pt-6 border-t border-violet-200">
                  {expandedTestId === test.id && testResults[test.id] ? (
                    <ABTestResultsGraph
                      test={test}
                      results={testResults[test.id]}
                      onClose={() => setExpandedTestId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => fetchTestResults(test.id)}
                      className="w-full px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Icon icon="mingcute:chart-line" width={18} />
                      View Detailed Results Graph
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {test.status === "draft" && (
                  <button
                    onClick={async () => {
                      try {
                        await api.startABTest(test.id);
                        fetchABTests();
                      } catch (err) {
                        console.error("Error starting test:", err);
                      }
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Start Test
                  </button>
                )}
                {test.status === "active" && (
                  <button
                    onClick={async () => {
                      try {
                        await api.completeABTest(test.id);
                        fetchABTests();
                      } catch (err) {
                        console.error("Error completing test:", err);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Complete Test
                  </button>
                )}
                {test.status === "completed" && (
                  <button
                    onClick={() => fetchTestResults(test.id)}
                    className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded hover:bg-violet-700 transition-colors"
                  >
                    {expandedTestId === test.id ? "Hide Graph" : "Show Graph"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:experiment-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No A/B tests available</p>
          <p className="text-sm text-slate-500 mt-1">
            Create an A/B test to compare different application strategies
          </p>
        </div>
      )}

      {/* Create A/B Test Modal */}
      {showCreateModal && (
        <ABTestFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchABTests();
          }}
        />
      )}
    </div>
  );
}

