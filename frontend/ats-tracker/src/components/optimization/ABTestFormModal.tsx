import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface ABTestFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ABTestFormModal({ onClose, onSuccess }: ABTestFormModalProps) {
  const [formData, setFormData] = useState({
    testName: "",
    testType: "resume",
    description: "",
    controlGroupConfig: {
      name: "Control",
      description: "",
    },
    variantGroups: [
      {
        name: "Variant A",
        description: "",
      },
    ],
    trafficSplit: { control: 50, variant_a: 50 },
    targetMetric: "response_rate",
    minimumSampleSize: 30,
    durationDays: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testTypes = [
    { value: "resume", label: "Resume Version" },
    { value: "cover_letter", label: "Cover Letter Version" },
    { value: "application_method", label: "Application Method" },
    { value: "timing", label: "Application Timing" },
    { value: "custom", label: "Custom Test" },
  ];

  const targetMetrics = [
    { value: "response_rate", label: "Response Rate" },
    { value: "interview_rate", label: "Interview Rate" },
    { value: "offer_rate", label: "Offer Rate" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.createABTest(formData);
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(response.error?.message || "Failed to create A/B test");
      }
    } catch (err: any) {
      console.error("Error creating A/B test:", err);
      setError(err.message || "Failed to create A/B test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    const variantLetter = String.fromCharCode(65 + formData.variantGroups.length); // A, B, C, etc.
    setFormData({
      ...formData,
      variantGroups: [
        ...formData.variantGroups,
        {
          name: `Variant ${variantLetter}`,
          description: "",
        },
      ],
    });
  };

  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      variantGroups: formData.variantGroups.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = [...formData.variantGroups];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variantGroups: updated });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Create A/B Test</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Test Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Test Name *
            </label>
            <input
              type="text"
              required
              value={formData.testName}
              onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Resume Template A vs B"
            />
          </div>

          {/* Test Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Test Type *
            </label>
            <select
              required
              value={formData.testType}
              onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {testTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what you're testing..."
            />
          </div>

          {/* Control Group */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Control Group</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.controlGroupConfig.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      controlGroupConfig: {
                        ...formData.controlGroupConfig,
                        name: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.controlGroupConfig.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      controlGroupConfig: {
                        ...formData.controlGroupConfig,
                        description: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Current/default approach"
                />
              </div>
            </div>
          </div>

          {/* Variant Groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Variant Groups</h4>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Icon icon="mingcute:add-line" width={16} />
                Add Variant
              </button>
            </div>
            <div className="space-y-3">
              {formData.variantGroups.map((variant, index) => (
                <div
                  key={index}
                  className="bg-blue-50 rounded-lg p-4 border border-blue-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-blue-900">
                      {variant.name}
                    </span>
                    {formData.variantGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Icon icon="mingcute:delete-line" width={18} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, "name", e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Variant name"
                    />
                    <textarea
                      value={variant.description}
                      onChange={(e) => updateVariant(index, "description", e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Describe this variant..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Metric *
              </label>
              <select
                required
                value={formData.targetMetric}
                onChange={(e) =>
                  setFormData({ ...formData, targetMetric: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {targetMetrics.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Sample Size
              </label>
              <input
                type="number"
                min="10"
                value={formData.minimumSampleSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimumSampleSize: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                min="7"
                value={formData.durationDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationDays: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Traffic Split (Control %)
              </label>
              <input
                type="number"
                min="10"
                max="90"
                value={formData.trafficSplit.control}
                onChange={(e) => {
                  const control = parseInt(e.target.value) || 50;
                  const variant = 100 - control;
                  setFormData({
                    ...formData,
                    trafficSplit: { control, variant_a: variant },
                  });
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Variant: {formData.trafficSplit.variant_a}%
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

