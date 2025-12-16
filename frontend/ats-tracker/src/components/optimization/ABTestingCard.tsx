import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { ABTestFormModal } from "./ABTestFormModal";
import { ABTestResultsGraph } from "./ABTestResultsGraph";

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
        const rawTests = response.data.tests || [];
        // Normalize snake_case from backend into camelCase and parse JSON fields
        const normalized = rawTests.map((t: any) => {
          const control =
            typeof t.control_group_config === "string"
              ? JSON.parse(t.control_group_config)
              : t.control_group_config || {};
          const variants =
            typeof t.variant_groups === "string"
              ? JSON.parse(t.variant_groups)
              : t.variant_groups || [];
          const trafficSplit =
            typeof t.traffic_split === "string"
              ? JSON.parse(t.traffic_split)
              : t.traffic_split || {};

          return {
            ...t,
            testName: t.test_name || t.testName,
            testType: t.test_type || t.testType,
            createdAt: t.created_at || t.createdAt,
            startDate: t.start_date || t.startDate,
            endDate: t.end_date || t.endDate,
            sampleSize: t.sample_size || t.sampleSize,
            controlGroupConfig: control,
            variantGroups: variants,
            trafficSplit,
          };
        });
        setAbTests(normalized);
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

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
      if (response.ok && response.data && response.data.results) {
        setTestResults({ ...testResults, [testId]: response.data.results });
        setExpandedTestId(testId);
      } else {
        console.error("Error fetching test results:", response.error);
      }
    } catch (err) {
      console.error("Error fetching test results:", err);
    }
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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">A/B Testing Dashboard</h2>
          <p className="text-slate-600 text-sm">
            Compare how different versions of your resume, cover letter, or strategies perform.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={18} />
          New A/B Test
        </button>
      </div>

      {abTests.length > 0 ? (
        <div className="space-y-4">
          {abTests.map((test) => {
            const typeLabel =
              test.testType === "resume"
                ? "Resume"
                : test.testType === "cover_letter"
                ? "Cover Letter"
                : test.testType === "application_method"
                ? "Application Method"
                : (test.testType || "General");

            const totalSample =
              test.sampleSize ||
              test.sample_size ||
              testResults[test.id]?.groups?.reduce(
                (sum: number, g: any) => sum + (g.sampleSize || g.sample_size || 0),
                0
              ) ||
              null;

            return (
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
                    <span className="px-2 py-1 text-[11px] font-medium rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                      {typeLabel}
                    </span>
                    <h4 className="text-lg font-semibold text-slate-900 truncate max-w-xs">
                      {test.testName || test.test_name || "Untitled A/B Test"}
                    </h4>
                  </div>
                  {test.description && (
                    <p className="text-sm text-slate-700 mb-3 line-clamp-2">{test.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                    <div>
                      <p className="text-slate-500 mb-0.5">Created</p>
                      <p className="font-medium text-slate-900">{formatDate(test.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5">Test Window</p>
                      <p className="font-medium text-slate-900">
                        {formatDate(test.startDate)} – {formatDate(test.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5">Total Sample Size</p>
                      <p className="font-medium text-slate-900">
                        {totalSample !== null ? totalSample : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5">Winner</p>
                      <p className="font-medium text-slate-900">
                        {test.winner ? test.winner : "Not determined yet"}
                      </p>
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
                <button
                  onClick={() => fetchTestResults(test.id)}
                  className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded hover:bg-violet-700 transition-colors"
                >
                  {expandedTestId === test.id ? "Hide Graph" : "Show Graph"}
                </button>
              </div>
            </div>
          );
          })}
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

