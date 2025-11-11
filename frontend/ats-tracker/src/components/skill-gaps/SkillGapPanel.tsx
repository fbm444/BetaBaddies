import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type {
  ApplicationHistoryEntry,
  JobOpportunityData,
  SkillGapItem,
  SkillGapProgressEntry,
  SkillGapProgressRequest,
  SkillGapSnapshot,
  StatusHistoryEntry,
} from "../../types";
import { useSkillGap } from "../../hooks/useSkillGap";

interface JobSkillGapPanelProps {
  opportunity: JobOpportunityData;
  onHistorySync?: (entries: ApplicationHistoryEntry[]) => void;
}

interface ProgressModalProps {
  open: boolean;
  gap: SkillGapItem | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: SkillGapProgressRequest) => Promise<void>;
}

const PRIORITY_CONFIG: Record<
  SkillGapItem["priority"],
  { label: string; text: string; bg: string; border: string }
> = {
  P1: {
    label: "Critical",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  P2: {
    label: "High",
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  P3: {
    label: "Medium",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
};

const PROGRESS_STATUS_LABELS: Record<
  SkillGapProgressEntry["status"],
  string
> = {
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
};

const PROFICIENCY_LABELS = [
  "None",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
  "Master",
] as const;

const PROFICIENCY_OPTIONS = [
  { value: "", label: "Keep current level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
  { value: "master", label: "Master" },
];

function getProficiencyLabel(level: number) {
  const index = Math.max(0, Math.min(PROFICIENCY_LABELS.length - 1, Math.round(level)));
  return PROFICIENCY_LABELS[index];
}

const isStatusHistoryEntry = (
  entry: ApplicationHistoryEntry
): entry is StatusHistoryEntry => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "status" in entry &&
    "timestamp" in entry &&
    typeof (entry as StatusHistoryEntry).status === "string"
  );
};

const isSkillGapSnapshotEntry = (
  entry: ApplicationHistoryEntry
): entry is SkillGapSnapshot => {
  return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_snapshot";
};

const isSkillGapProgressEntry = (
  entry: ApplicationHistoryEntry
): entry is SkillGapProgressEntry => {
  return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_progress";
};

function getHistoryTimestamp(entry: ApplicationHistoryEntry): string {
  if (isStatusHistoryEntry(entry)) {
    return entry.timestamp;
  }
  if (isSkillGapSnapshotEntry(entry)) {
    return entry.generatedAt;
  }
  if (isSkillGapProgressEntry(entry)) {
    return entry.updatedAt;
  }
  if (typeof entry === "object" && entry !== null) {
    if ("timestamp" in entry && typeof (entry as any).timestamp === "string") {
      return (entry as any).timestamp;
    }
    if ("generatedAt" in entry && typeof (entry as any).generatedAt === "string") {
      return (entry as any).generatedAt;
    }
    if ("updatedAt" in entry && typeof (entry as any).updatedAt === "string") {
      return (entry as any).updatedAt;
    }
  }
  return new Date().toISOString();
}

export function JobSkillGapPanel({ opportunity, onHistorySync }: JobSkillGapPanelProps) {
  const [historyEntries, setHistoryEntries] = useState<ApplicationHistoryEntry[]>(
    opportunity.applicationHistory || []
  );
  const [selectedGap, setSelectedGap] = useState<SkillGapItem | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<SkillGapSnapshot | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setHistoryEntries(opportunity.applicationHistory || []);
  }, [opportunity.applicationHistory]);

  const syncHistory = useCallback(
    (updater: (entries: ApplicationHistoryEntry[]) => ApplicationHistoryEntry[]) => {
      setHistoryEntries((prev) => {
        const updated = updater(prev);
        onHistorySync?.(updated);
        return updated;
      });
    },
    [onHistorySync]
  );

  const dispatchDashboardRefresh = useCallback(
    (snapshotId?: string) => {
      window.dispatchEvent(
        new CustomEvent("dashboard:refresh", {
          detail: {
            source: "skill-gap",
            jobId: opportunity.id,
            snapshotId,
          },
        })
      );
    },
    [opportunity.id]
  );

  const handleSnapshotUpdate = useCallback(
    (snapshot: SkillGapSnapshot) => {
      syncHistory((prev) => {
        const exists = prev.some(
          (entry) =>
            isSkillGapSnapshotEntry(entry) && entry.snapshotId === snapshot.snapshotId
        );
        if (exists) {
          return prev;
        }
        const combined = [...prev, snapshot];
        return combined.length > 25
          ? combined.slice(combined.length - 25)
          : combined;
      });
      dispatchDashboardRefresh(snapshot.snapshotId);
    },
    [syncHistory, dispatchDashboardRefresh]
  );

  const { snapshot, loading, refreshing, error, fetchSnapshot, refreshSnapshot, logProgress } =
    useSkillGap(opportunity.id, {
      onSnapshot: handleSnapshotUpdate,
    });

  // Handle snapshot changes for smooth animations (must be after snapshot is declared)
  useEffect(() => {
    if (snapshot) {
      // New snapshot received, start fade-in animation
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPreviousSnapshot(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [snapshot]);

  const sortedProgressEntries = useMemo(
    () =>
      historyEntries
        .filter(isSkillGapProgressEntry)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [historyEntries]
  );

  const sortedSnapshots = useMemo(() => {
    // Filter and deduplicate snapshots by snapshotId
    const snapshotMap = new Map<string, SkillGapSnapshot>();
    historyEntries
      .filter(isSkillGapSnapshotEntry)
      .forEach((entry) => {
        if (!snapshotMap.has(entry.snapshotId)) {
          snapshotMap.set(entry.snapshotId, entry);
        }
      });
    
    // Sort by date (newest first) and limit to last 10 snapshots
    return Array.from(snapshotMap.values())
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      )
      .slice(0, 10);
  }, [historyEntries]);

  const handleGenerateClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsAnimating(true);
    try {
      // Always generate a new snapshot, don't fetch existing one
      const result = await refreshSnapshot();
      dispatchDashboardRefresh(result?.snapshot?.snapshotId);
    } finally {
      // Animation will be handled by handleSnapshotUpdate
    }
  };

  const handleRefreshClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Store current snapshot for smooth transition
    if (snapshot) {
      setPreviousSnapshot(snapshot);
    }
    setIsAnimating(true);
    try {
      const result = await refreshSnapshot();
      dispatchDashboardRefresh(result?.snapshot?.snapshotId);
    } finally {
      // Animation will be handled by handleSnapshotUpdate
    }
  };

  const openProgressModal = (gap: SkillGapItem) => {
    setSelectedGap(gap);
    setIsProgressModalOpen(true);
    setSuccessMessage(null);
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedGap(null);
  };

  const handleProgressSubmit = async (payload: SkillGapProgressRequest) => {
    if (!selectedGap) return;
    setProgressSubmitting(true);
    try {
      const progressEntry = await logProgress(selectedGap.skillName, payload);
      if (progressEntry) {
        syncHistory((prev) => {
          const trimmed =
            prev.length >= 25 ? prev.slice(prev.length - 24) : [...prev];
          return [...trimmed, progressEntry];
        });
        setSuccessMessage(
          `Progress recorded for ${selectedGap.skillName}.`
        );
        const result = await refreshSnapshot();
        dispatchDashboardRefresh(result?.snapshot?.snapshotId);
        closeProgressModal();
      }
    } finally {
      setProgressSubmitting(false);
    }
  };

  const totalGaps = snapshot?.stats.totalGaps ?? 0;
  const criticalGaps = snapshot?.stats.criticalGaps ?? 0;
  const learningPlanHours = snapshot?.learningPlan.totalHours ?? 0;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="mingcute:briefcase-line" className="text-blue-500" width={20} />
            <h3 className="text-lg font-semibold text-slate-900">
              Skill Gaps & Learning Plan
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            Compare your skills with <span className="font-medium text-slate-900">{opportunity.title}</span> at <span className="font-medium text-slate-900">{opportunity.company}</span> and follow a curated learning path.
          </p>
          {snapshot?.trend && (
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Icon
                icon={
                  snapshot.trend.direction === "improving"
                    ? "mingcute:trending-up-line"
                    : snapshot.trend.direction === "rising"
                    ? "mingcute:trending-down-line"
                    : "mingcute:compass-2-line"
                }
                width={16}
              />
              <span>{snapshot.trend.message}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!snapshot && !loading ? (
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon 
                icon="mingcute:radar-line" 
                className={loading || refreshing ? "animate-spin" : ""}
                width={18} 
              />
              {loading || refreshing ? "Generating..." : "Generate Analysis"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon
                icon="mingcute:refresh-2-line"
                className={loading || refreshing ? "animate-spin" : ""}
                width={18}
              />
              {loading || refreshing ? "Refreshing..." : "Refresh Analysis"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !snapshot ? (
        <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition-opacity duration-300">
          <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
            <span>Generating skills analysis…</span>
          </div>
        </div>
      ) : null}

      {!loading && !snapshot && !previousSnapshot ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 transition-opacity duration-300">
          <div className="flex items-center gap-3">
            <Icon icon="mingcute:lightbulb-line" width={22} className="text-blue-500" />
            <div>
              <p className="font-medium text-slate-800">
                Generate a skill gap analysis to see personalized recommendations.
              </p>
              <p>
                We'll scan the job description, compare it with your profile skills, and propose learning resources to close the gaps.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Show previous snapshot with fade-out while loading new one */}
      {previousSnapshot && (loading || refreshing) && !snapshot && (
        <div className="mt-6 space-y-6 opacity-40 transition-opacity duration-300 pointer-events-none">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon="mingcute:target-line"
              title="Total Requirements"
              value={previousSnapshot.stats.totalRequirements}
              tone="slate"
            />
            <SummaryTile
              icon="mingcute:warning-line"
              title="Open Skill Gaps"
              value={previousSnapshot.stats.totalGaps}
              tone={previousSnapshot.stats.totalGaps > 0 ? "amber" : "green"}
            />
            <SummaryTile
              icon="mingcute:alert-line"
              title="Critical Gaps"
              value={previousSnapshot.stats.criticalGaps}
              tone={previousSnapshot.stats.criticalGaps > 0 ? "red" : "green"}
            />
            <SummaryTile
              icon="mingcute:book-3-line"
              title="Plan Hours"
              value={previousSnapshot.learningPlan.totalHours}
              suffix="hrs"
              tone="blue"
            />
          </div>
        </div>
      )}

      {snapshot && (
        <div 
          className={`mt-6 space-y-6 transition-all duration-500 ${
            isAnimating && previousSnapshot ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon="mingcute:target-line"
              title="Total Requirements"
              value={snapshot.stats.totalRequirements}
              tone="slate"
            />
            <SummaryTile
              icon="mingcute:warning-line"
              title="Open Skill Gaps"
              value={totalGaps}
              tone={totalGaps > 0 ? "amber" : "green"}
            />
            <SummaryTile
              icon="mingcute:alert-line"
              title="Critical Gaps"
              value={criticalGaps}
              tone={criticalGaps > 0 ? "red" : "green"}
            />
            <SummaryTile
              icon="mingcute:book-3-line"
              title="Plan Hours"
              value={learningPlanHours}
              suffix="hrs"
              tone="blue"
            />
          </div>

          {snapshot.gaps.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800 flex gap-3 items-start">
              <Icon icon="mingcute:check-circle-line" width={24} className="mt-1" />
              <div>
                <p className="font-semibold text-green-900">No skill gaps detected for this job.</p>
                <p>
                  Excellent! Your current skills align with this opportunity. Keep your profile updated as you continue learning.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshot.gaps.map((gap, index) => {
                const priority = PRIORITY_CONFIG[gap.priority];
                return (
                  <div
                    key={gap.skillName}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md"
                    style={{
                      animation: !isAnimating ? `fadeInUp 0.5s ease-out ${index * 0.05}s both` : undefined,
                      opacity: isAnimating && previousSnapshot ? 0 : 1,
                    }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon icon="mingcute:compass-3-line" className="text-blue-500" width={18} />
                          <h4 className="text-base font-semibold text-slate-900">
                            {gap.skillName}
                          </h4>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Required: <span className="font-medium">{getProficiencyLabel(gap.requiredLevel)}</span> · Current:{" "}
                          <span className="font-medium">{getProficiencyLabel(gap.currentLevel)}</span>
                        </p>
                        {gap.summary && (
                          <p className="mt-2 text-sm text-slate-600">{gap.summary}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${priority.bg} ${priority.text} border ${priority.border}`}
                      >
                        <Icon icon="mingcute:alert-line" width={14} />
                        {priority.label}
                      </span>
                    </div>

                    {gap.recommendedResources && gap.recommendedResources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Recommended Resources
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {gap.recommendedResources.map((resource, index) => (
                            <a
                              key={`${resource.title}-${index}`}
                              href={resource.url || "#"}
                              target={resource.url ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              <Icon
                                icon="mingcute:open-book-line"
                                width={18}
                                className="mt-1 text-blue-500 transition group-hover:text-blue-600"
                              />
                              <div>
                                <p className="font-medium text-slate-800 group-hover:text-blue-600">
                                  {resource.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {resource.provider}
                                  {resource.estimatedHours
                                    ? ` • ${resource.estimatedHours} hrs`
                                    : null}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openProgressModal(gap)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Icon icon="mingcute:flag-line" width={14} />
                        Log Progress
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {snapshot.learningPlan.steps.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    Personalized Learning Plan
                  </h4>
                  <p className="text-xs text-slate-600">
                    Estimated total time: {learningPlanHours || snapshot.learningPlan.steps.length * 2} hrs
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {snapshot.learningPlan.steps.map((step, index) => (
                  <div key={`${step.skillName}-${index}`} className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {index + 1}. {step.skillName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Priority: {PRIORITY_CONFIG[step.priority].label}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">
                        {step.estimatedHours ?? 2} hrs
                      </span>
                    </div>
                    {step.recommendedResources && step.recommendedResources.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {step.recommendedResources.map((resource, resourceIndex) => (
                          <li key={`${resource.title}-${resourceIndex}`} className="text-xs text-slate-600">
                            •{" "}
                            {resource.url ? (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {resource.title}
                              </a>
                            ) : (
                              resource.title
                            )}{" "}
                            <span className="text-slate-400">
                              ({resource.provider})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.suggestedDeadline && (
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        Suggested completion: {step.suggestedDeadline}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Gap History & Trends */}
          {sortedSnapshots.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Icon icon="mingcute:history-line" className="text-blue-500" width={20} />
                <h4 className="text-base font-semibold text-slate-900">
                  Analysis History & Trends
                </h4>
                <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {sortedSnapshots.length} {sortedSnapshots.length === 1 ? "snapshot" : "snapshots"}
                </span>
              </div>
              <div className="space-y-4">
                {sortedSnapshots.map((snapshotEntry, index) => {
                  const isLatest = index === 0;
                  const prevSnapshot = sortedSnapshots[index + 1];
                  const trend = snapshotEntry.trend;
                  const totalGaps = snapshotEntry.stats?.totalGaps || snapshotEntry.gaps?.length || 0;
                  const totalRequirements = snapshotEntry.stats?.totalRequirements || snapshotEntry.requirements?.length || 0;
                  const criticalGaps = snapshotEntry.stats?.criticalGaps || 0;
                  
                  return (
                    <div
                      key={snapshotEntry.snapshotId}
                      className={`relative rounded-lg border-2 p-5 transition-all duration-200 ${
                        isLatest
                          ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      {isLatest && (
                        <div className="absolute -top-2.5 -right-2.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                            <Icon icon="mingcute:star-fill" width={12} />
                            Latest
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                              isLatest ? "bg-blue-500" : "bg-slate-200"
                            }`}>
                              <Icon 
                                icon="mingcute:radar-line" 
                                className={isLatest ? "text-white" : "text-slate-600"} 
                                width={20} 
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">
                                  {new Date(snapshotEntry.generatedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(snapshotEntry.generatedAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {trend && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs">
                                  <Icon
                                    icon={
                                      trend.direction === "improving"
                                        ? "mingcute:trending-up-line"
                                        : trend.direction === "rising"
                                        ? "mingcute:trending-down-line"
                                        : "mingcute:compass-2-line"
                                    }
                                    width={14}
                                    className={
                                      trend.direction === "improving"
                                        ? "text-green-600"
                                        : trend.direction === "rising"
                                        ? "text-red-600"
                                        : "text-slate-500"
                                    }
                                  />
                                  <span className={
                                    trend.direction === "improving"
                                      ? "font-medium text-green-700"
                                      : trend.direction === "rising"
                                      ? "font-medium text-red-700"
                                      : "text-slate-600"
                                  }>
                                    {trend.message}
                                  </span>
                                  {prevSnapshot && (
                                    <span className="text-slate-400">
                                      • {prevSnapshot.stats?.totalGaps || prevSnapshot.gaps?.length || 0} → {totalGaps} gaps
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <Icon icon="mingcute:target-line" className="text-slate-600" width={16} />
                              <div>
                                <div className="text-xs text-slate-500">Requirements</div>
                                <div className="text-sm font-semibold text-slate-900">{totalRequirements}</div>
                              </div>
                            </div>
                            <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                              totalGaps > 0
                                ? "bg-amber-50 border-amber-200"
                                : "bg-green-50 border-green-200"
                            }`}>
                              <Icon 
                                icon={totalGaps > 0 ? "mingcute:warning-line" : "mingcute:check-circle-line"} 
                                className={totalGaps > 0 ? "text-amber-600" : "text-green-600"} 
                                width={16} 
                              />
                              <div>
                                <div className={`text-xs ${totalGaps > 0 ? "text-amber-700" : "text-green-700"}`}>Gaps</div>
                                <div className={`text-sm font-semibold ${totalGaps > 0 ? "text-amber-900" : "text-green-900"}`}>
                                  {totalGaps}
                                </div>
                              </div>
                            </div>
                            <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                              criticalGaps > 0
                                ? "bg-red-50 border-red-200"
                                : "bg-green-50 border-green-200"
                            }`}>
                              <Icon 
                                icon={criticalGaps > 0 ? "mingcute:alert-line" : "mingcute:check-circle-line"} 
                                className={criticalGaps > 0 ? "text-red-600" : "text-green-600"} 
                                width={16} 
                              />
                              <div>
                                <div className={`text-xs ${criticalGaps > 0 ? "text-red-700" : "text-green-700"}`}>Critical</div>
                                <div className={`text-sm font-semibold ${criticalGaps > 0 ? "text-red-900" : "text-green-900"}`}>
                                  {criticalGaps}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                              <Icon icon="mingcute:book-3-line" className="text-blue-600" width={16} />
                              <div>
                                <div className="text-xs text-blue-700">Plan Hours</div>
                                <div className="text-sm font-semibold text-blue-900">
                                  {snapshotEntry.learningPlan?.totalHours || 0} hrs
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">
                Skill Gap Progress
              </h4>
              {successMessage && (
                <span className="text-xs font-medium text-green-600">
                  {successMessage}
                </span>
              )}
            </div>
            {sortedProgressEntries.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Log your progress to keep track of completed lessons and improved proficiency.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {sortedProgressEntries.map((entry) => (
                  <div
                    key={entry.progressId}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {entry.skillName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {PROGRESS_STATUS_LABELS[entry.status]}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
                    )}
                    {entry.resource && (
                      <div className="mt-2 text-xs text-slate-500">
                        Resource:{" "}
                        {entry.resource.url ? (
                          <a
                            href={entry.resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {entry.resource.title}
                          </a>
                        ) : (
                          entry.resource.title
                        )}{" "}
                        <span className="text-slate-400">
                          ({entry.resource.provider})
                        </span>
                      </div>
                    )}
                    {entry.newProficiency && (
                      <p className="mt-2 text-xs font-medium text-blue-600">
                        Updated proficiency: {entry.newProficiency}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ProgressModal
        open={isProgressModalOpen}
        gap={selectedGap}
        loading={progressSubmitting}
        onClose={closeProgressModal}
        onSubmit={handleProgressSubmit}
      />
    </section>
    </>
  );
}

interface SummaryTileProps {
  icon: string;
  title: string;
  value: number;
  suffix?: string;
  tone: "slate" | "blue" | "green" | "amber" | "red";
}

function SummaryTile({ icon, title, value, suffix, tone }: SummaryTileProps) {
  const toneClasses: Record<string, string> = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <Icon icon={icon} width={24} className="opacity-80" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-xl font-semibold text-slate-900">
          {value}
          {suffix ? <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span> : null}
        </p>
      </div>
    </div>
  );
}

function ProgressModal({ open, gap, loading, onClose, onSubmit }: ProgressModalProps) {
  const [status, setStatus] = useState<SkillGapProgressRequest["status"]>("in-progress");
  const [notes, setNotes] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceProvider, setResourceProvider] = useState("");
  const [newProficiency, setNewProficiency] = useState("");

  useEffect(() => {
    if (gap) {
      setStatus(gap.priority === "P1" ? "in-progress" : "planned");
      setNotes("");
      setResourceTitle("");
      setResourceUrl("");
      setResourceProvider("");
      setNewProficiency("");
    }
  }, [gap]);

  if (!open || !gap) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      status,
      notes: notes.trim() || undefined,
      resourceTitle: resourceTitle.trim() || undefined,
      resourceUrl: resourceUrl.trim() || undefined,
      resourceProvider: resourceProvider.trim() || undefined,
      newProficiency: newProficiency || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-poppins">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Log Progress · {gap.skillName}
            </h3>
            <p className="text-xs text-slate-600">
              Update your learning progress and optionally adjust your proficiency level.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as SkillGapProgressRequest["status"])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(PROGRESS_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Updated proficiency
              </label>
              <select
                value={newProficiency}
                onChange={(event) => setNewProficiency(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {PROFICIENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="What did you work on? Any highlights?"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Resource title
              </label>
              <input
                type="text"
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Course name, article, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Provider
              </label>
              <input
                type="text"
                value={resourceProvider}
                onChange={(event) => setResourceProvider(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Coursera, AWS Skill Builder..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Resource URL
            </label>
            <input
              type="url"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Icon icon="mingcute:loading-line" className="animate-spin" width={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:check-line" width={18} />
                  Save Progress
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

