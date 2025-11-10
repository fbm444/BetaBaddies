import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../services/api";
import type {
  SkillGapSnapshot,
  SkillGapSnapshotResponse,
  SkillGapProgressRequest,
  SkillGapProgressEntry,
} from "../types";

interface UseSkillGapOptions {
  autoFetch?: boolean;
  onSnapshot?: (snapshot: SkillGapSnapshot) => void;
}

interface UseSkillGapResult {
  snapshot: SkillGapSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchSnapshot: () => Promise<SkillGapSnapshotResponse | null>;
  refreshSnapshot: () => Promise<SkillGapSnapshotResponse | null>;
  logProgress: (
    skillName: string,
    payload: SkillGapProgressRequest
  ) => Promise<SkillGapProgressEntry | null>;
}

const DEFAULT_OPTIONS: UseSkillGapOptions = {
  autoFetch: true,
};

export function useSkillGap(
  jobId: string | undefined,
  options: UseSkillGapOptions = {}
): UseSkillGapResult {
  const { autoFetch, onSnapshot } = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options]
  );
  const [snapshot, setSnapshot] = useState<SkillGapSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSnapshot = useCallback(
    (nextSnapshot: SkillGapSnapshot) => {
      setSnapshot(nextSnapshot);
      onSnapshot?.(nextSnapshot);
    },
    [onSnapshot]
  );

  const fetchSnapshot = useCallback(async () => {
    if (!jobId) {
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSkillGapSnapshot(jobId);
      if (response.ok && response.data) {
        handleSnapshot(response.data.snapshot);
        return response.data;
      }
      setError("Unable to load skill gap analysis.");
    } catch (err) {
      console.error("Failed to fetch skill gap snapshot:", err);
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : "Unable to load skill gap analysis.";
      setError(message);
    } finally {
      setLoading(false);
    }
    return null;
  }, [jobId, handleSnapshot]);

  const refreshSnapshot = useCallback(async () => {
    if (!jobId) {
      return null;
    }
    try {
      setRefreshing(true);
      setError(null);
      const response = await api.refreshSkillGapSnapshot(jobId);
      if (response.ok && response.data) {
        handleSnapshot(response.data.snapshot);
        return response.data;
      }
      setError("Unable to refresh skill gap analysis.");
    } catch (err) {
      console.error("Failed to refresh skill gap snapshot:", err);
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : "Unable to refresh skill gap analysis.";
      setError(message);
    } finally {
      setRefreshing(false);
    }
    return null;
  }, [jobId, handleSnapshot]);

  const logProgress = useCallback(
    async (
      skillName: string,
      payload: SkillGapProgressRequest
    ): Promise<SkillGapProgressEntry | null> => {
      if (!jobId) {
        return null;
      }
      try {
        const response = await api.logSkillGapProgress(jobId, skillName, payload);
        if (response.ok && response.data) {
          return response.data.progressEntry;
        }
        setError("Unable to record progress.");
      } catch (err) {
        console.error("Failed to record skill gap progress:", err);
        const message =
          err instanceof ApiError
            ? err.detail || err.message
            : err instanceof Error
            ? err.message
            : "Unable to record progress.";
        setError(message);
      }
      return null;
    },
    [jobId]
  );

  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    if (!jobId) {
      setSnapshot(null);
      return;
    }
    fetchSnapshot();
  }, [jobId, autoFetch, fetchSnapshot]);

  return {
    snapshot,
    loading,
    refreshing,
    error,
    fetchSnapshot,
    refreshSnapshot,
    logProgress,
  };
}

