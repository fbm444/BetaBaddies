import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface ABTestingCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function ABTestingCard({ dateRange }: ABTestingCardProps) {
  const [abTests, setAbTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
                  onClick={async () => {
                    try {
                      const response = await api.getABTestResults(test.id);
                      if (response.ok && response.data) {
                        // Show results modal or navigate
                        console.log("Test results:", response.data.results);
                      }
                    } catch (err) {
                      console.error("Error fetching results:", err);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-400 transition-colors"
                >
                  View Results
                </button>
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

      {/* Create A/B Test Modal - Simplified for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create A/B Test</h3>
            <p className="text-sm text-slate-600 mb-4">
              A/B test creation form will be implemented here.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

