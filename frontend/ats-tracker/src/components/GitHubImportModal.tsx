import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  languages: Record<string, number> | null;
  stars: number;
  forks: number;
  watchers?: number;
  isPrivate: boolean;
  isArchived: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt?: string;
  topics?: string[];
}

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  existingProjects?: Array<{ name: string; link?: string | null }>;
}

export function GitHubImportModal({
  isOpen,
  onClose,
  onImport,
  existingProjects = [],
}: GitHubImportModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [selectedRepoDetails, setSelectedRepoDetails] = useState<string | null>(null);
  const [contributionData, setContributionData] = useState<any>(null);
  const [showContributions, setShowContributions] = useState(false);
  const [connectFormData, setConnectFormData] = useState({
    accessToken: "",
    username: "",
  });

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await api.getGitHubStatus();
      setIsConnected(response.data.connected);
      setUsername(response.data.username);
      
      if (response.data.connected) {
        await fetchRepositories();
      }
    } catch (err: any) {
      console.error("Failed to check GitHub connection:", err);
      setError(err.message || "Failed to check GitHub connection");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getGitHubRepositories();
      setRepositories(response.data.repositories || []);
    } catch (err: any) {
      console.error("Failed to fetch repositories:", err);
      setError(err.message || "Failed to fetch repositories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await api.importGitHubRepositories(includePrivate);
      await fetchRepositories();
    } catch (err: any) {
      console.error("Failed to import repositories:", err);
      setError(err.message || "Failed to import repositories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncRepositories = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      await api.syncGitHubRepositories();
      await fetchRepositories();
    } catch (err: any) {
      console.error("Failed to sync repositories:", err);
      setError(err.message || "Failed to sync repositories");
    } finally {
      setIsSyncing(false);
    }
  };


  const handleViewContributions = async (repoId: string) => {
    try {
      setIsLoading(true);
      const response = await api.getGitHubRepositoryContributions(repoId);
      setContributionData(response.data);
      setSelectedRepoDetails(repoId);
      setShowContributions(true);
    } catch (err: any) {
      console.error("Failed to fetch contributions:", err);
      setError(err.message || "Failed to fetch contribution data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!connectFormData.accessToken || !connectFormData.username) {
      setError("Please enter both access token and username");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      await api.connectGitHub(
        connectFormData.accessToken,
        connectFormData.username
      );
      setShowConnectForm(false);
      setConnectFormData({ accessToken: "", username: "" });
      await checkConnection();
    } catch (err: any) {
      console.error("Failed to connect GitHub:", err);
      setError(err.message || "Failed to connect GitHub account");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setError(null);
      await api.disconnectGitHub();
      setIsConnected(false);
      setUsername(null);
      setRepositories([]);
      setSelectedRepos(new Set());
    } catch (err: any) {
      console.error("Failed to disconnect GitHub:", err);
      setError(err.message || "Failed to disconnect GitHub account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleAddSelectedToProjects = async () => {
    if (selectedRepos.size === 0) {
      setError("Please select at least one repository");
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      let successCount = 0;
      let failCount = 0;

      for (const repoId of selectedRepos) {
        try {
          await api.addGitHubRepositoryToProjects(repoId);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to add repository ${repoId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        onImport();
        onClose();
      }

      if (failCount > 0) {
        setError(`${successCount} imported successfully, ${failCount} failed`);
      }
    } catch (err: any) {
      console.error("Failed to add repositories to projects:", err);
      setError(err.message || "Failed to add repositories to projects");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleRepoSelection = (repoId: string) => {
    setSelectedRepos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filteredRepos = getFilteredRepositories();
    if (selectedRepos.size === filteredRepos.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(filteredRepos.map((r) => r.id)));
    }
  };

  const getFilteredRepositories = () => {
    // First filter by private/public visibility
    const visibilityFiltered = repositories.filter((repo) => {
      // If includePrivate is false, exclude private repos
      if (!includePrivate && repo.isPrivate) {
        return false;
      }
      return true;
    });

    // Then filter out already imported repositories
    const notImported = visibilityFiltered.filter((repo) => {
      // Check if a project with the same name exists
      const projectWithSameName = existingProjects.find(
        (p) => p.name.toLowerCase() === repo.name.toLowerCase()
      );
      
      // Also check if a project with the same URL exists
      const projectWithSameUrl = existingProjects.find(
        (p) => p.link && p.link === repo.htmlUrl
      );
      
      return !projectWithSameName && !projectWithSameUrl;
    });

    // Then apply search filter
    if (!searchTerm) return notImported;
    const term = searchTerm.toLowerCase();
    return notImported.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.description?.toLowerCase().includes(term) ||
        repo.language?.toLowerCase().includes(term)
    );
  };

  if (!isOpen) return null;

  const filteredRepos = getFilteredRepositories();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ marginTop: '64px' }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[calc(90vh-64px)] flex flex-col my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Icon icon="mingcute:github-line" width={28} className="text-slate-900" />
            <h2 className="text-2xl font-bold text-slate-900">
              Import from GitHub
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading && !repositories.length ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading...</p>
              </div>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-12">
              <Icon
                icon="mingcute:github-line"
                width={64}
                className="text-slate-400 mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                GitHub Not Connected
              </h3>
              <p className="text-slate-600 mb-6">
                Connect your GitHub account to import repositories as projects.
              </p>
              
              {!showConnectForm ? (
                <button
                  onClick={() => setShowConnectForm(true)}
                  className="bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Icon icon="mingcute:github-line" width={20} />
                  Connect GitHub Account
                </button>
              ) : (
                <div className="max-w-md mx-auto mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      GitHub Username
                    </label>
                    <input
                      type="text"
                      value={connectFormData.username}
                      onChange={(e) =>
                        setConnectFormData({
                          ...connectFormData,
                          username: e.target.value,
                        })
                      }
                      placeholder="your-username"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={connectFormData.accessToken}
                      onChange={(e) =>
                        setConnectFormData({
                          ...connectFormData,
                          accessToken: e.target.value,
                        })
                      }
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Create a token at{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        github.com/settings/tokens
                      </a>
                      . Required scopes: <code className="bg-slate-100 px-1 rounded">repo</code> (for private repos) or <code className="bg-slate-100 px-1 rounded">public_repo</code>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex-1 bg-blue-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Connecting...
                        </>
                      ) : (
                        "Connect"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowConnectForm(false);
                        setConnectFormData({ accessToken: "", username: "" });
                        setError(null);
                      }}
                      className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search and Actions */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Icon
                      icon="mingcute:search-line"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      width={20}
                    />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSyncRepositories}
                    disabled={isSyncing || isLoading}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                    title="Sync repository data from GitHub"
                  >
                    {isSyncing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700"></div>
                    ) : (
                      <Icon icon="mingcute:refresh-line" width={18} />
                    )}
                    Sync
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePrivate}
                      onChange={(e) => setIncludePrivate(e.target.checked)}
                      className="w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Include private repositories</span>
                  </label>
                  <button
                    onClick={handleImportRepositories}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Icon icon="mingcute:download-line" width={18} />
                    Import from GitHub
                  </button>
                </div>
              </div>

              {/* Select All */}
              {filteredRepos.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        filteredRepos.length > 0 &&
                        filteredRepos.every((r) => selectedRepos.has(r.id))
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Select All ({filteredRepos.length})
                    </span>
                  </label>
                  <span className="text-sm text-slate-500">
                    {selectedRepos.size} selected
                  </span>
                </div>
              )}

              {/* Repository List */}
              {filteredRepos.length === 0 ? (
                <div className="text-center py-12">
                  <Icon
                    icon="mingcute:github-line"
                    width={48}
                    className="text-slate-400 mx-auto mb-4"
                  />
                  <p className="text-slate-600">
                    {searchTerm
                      ? "No repositories match your search"
                      : repositories.length > 0
                      ? "All repositories have already been imported as projects"
                      : "No repositories found. Click 'Import from GitHub' to import from GitHub."}
                  </p>
                  {repositories.length > 0 && repositories.length !== filteredRepos.length && (
                    <p className="text-sm text-slate-500 mt-2">
                      {repositories.length - filteredRepos.length} repository
                      {repositories.length - filteredRepos.length !== 1 ? "ies" : ""} already imported
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRepos.map((repo) => {
                    const formatDate = (dateString: string) => {
                      if (!dateString) return "N/A";
                      return new Date(dateString).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                    };

                    const languages = repo.languages
                      ? Object.keys(repo.languages).slice(0, 3)
                      : repo.language
                      ? [repo.language]
                      : [];

                    return (
                      <div
                        key={repo.id}
          className={`p-4 border rounded-lg transition-colors ${
            selectedRepos.has(repo.id)
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRepos.has(repo.id)}
                            onChange={() => toggleRepoSelection(repo.id)}
                            className="mt-1 w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-slate-900">
                                {repo.name}
                              </h3>
                              {repo.isPrivate && (
                                <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                  Private
                                </span>
                              )}
                              {repo.isArchived && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  Archived
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-2 flex-wrap">
                              {languages.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Icon icon="mingcute:code-line" width={14} />
                                  {languages.join(", ")}
                                  {repo.languages && Object.keys(repo.languages).length > 3 && (
                                    <span className="text-slate-400">
                                      +{Object.keys(repo.languages).length - 3}
                                    </span>
                                  )}
                                </span>
                              )}
                              <span className="flex items-center gap-1" title="Stars">
                                <Icon icon="mingcute:star-line" width={14} />
                                {repo.stars}
                              </span>
                              <span className="flex items-center gap-1" title="Forks">
                                <Icon icon="mingcute:git-fork-line" width={14} />
                                {repo.forks}
                              </span>
                              {repo.watchers !== undefined && (
                                <span className="flex items-center gap-1" title="Watchers">
                                  <Icon icon="mingcute:eye-line" width={14} />
                                  {repo.watchers}
                                </span>
                              )}
                              {repo.pushedAt && (
                                <span className="flex items-center gap-1" title={`Last updated: ${formatDate(repo.pushedAt)}`}>
                                  <Icon icon="mingcute:time-line" width={14} />
                                  Updated {formatDate(repo.pushedAt)}
                                </span>
                              )}
                            </div>
                            {repo.topics && repo.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {repo.topics.slice(0, 5).map((topic, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                                  >
                                    {topic}
                                  </span>
                                ))}
                                {repo.topics.length > 5 && (
                                  <span className="px-2 py-0.5 text-xs text-slate-500">
                                    +{repo.topics.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleViewContributions(repo.id)}
                                className="text-xs px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                                title="View contribution activity"
                              >
                                <Icon icon="mingcute:chart-line" width={14} />
                                Contributions
                              </button>
                              <a
                                href={repo.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Icon icon="mingcute:external-link-line" width={14} />
                                GitHub
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Contributions Modal */}
          {showContributions && contributionData && selectedRepoDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                  <h3 className="text-xl font-bold text-slate-900">Contribution Activity</h3>
                  <button
                    onClick={() => {
                      setShowContributions(false);
                      setSelectedRepoDetails(null);
                      setContributionData(null);
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Icon icon="mingcute:close-line" width={24} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {contributionData.statistics && (
                    <div className="mb-6 space-y-3">
                      <h4 className="font-semibold text-slate-900">Statistics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-slate-900">
                            {contributionData.statistics.totalCommits || 0}
                          </div>
                          <div className="text-sm text-slate-600">Total Commits</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-slate-900">
                            {contributionData.statistics.averageCommitsPerDay?.toFixed(1) || 0}
                          </div>
                          <div className="text-sm text-slate-600">Avg Commits/Day</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-slate-900">
                            {contributionData.statistics.mostActiveDay || "N/A"}
                          </div>
                          <div className="text-sm text-slate-600">Most Active Day</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-slate-900">
                            {contributionData.statistics.daysWithCommits || 0}
                          </div>
                          <div className="text-sm text-slate-600">Active Days</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {contributionData.contributions && contributionData.contributions.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Recent Activity</h4>
                      <div className="space-y-2">
                        {contributionData.contributions.slice(0, 30).map((contrib: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {new Date(contrib.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                              <div className="text-xs text-slate-500">
                                {contrib.commits || 0} commit{contrib.commits !== 1 ? "s" : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded ${
                                  contrib.commits > 10
                                    ? "bg-green-500"
                                    : contrib.commits > 5
                                    ? "bg-green-400"
                                    : contrib.commits > 0
                                    ? "bg-green-300"
                                    : "bg-slate-200"
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Commit History */}
                  {contributionData.commitHistory && contributionData.commitHistory.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-slate-900 mb-3">Commit History</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {contributionData.commitHistory.slice(0, 50).map((commit: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a
                                    href={commit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {commit.message.split('\n')[0] || "No message"}
                                  </a>
                                  <span className="text-xs text-slate-400 font-mono">
                                    {commit.sha?.substring(0, 7)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>
                                    {new Date(commit.date).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {commit.stats ? (
                                    <>
                                      <span className="text-green-600">
                                        +{commit.stats.additions ?? 0}
                                      </span>
                                      <span className="text-red-600">
                                        -{commit.stats.deletions ?? 0}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 italic">No stats available</span>
                                  )}
                                  {commit.files > 0 && (
                                    <span className="ml-1">{commit.files} file{commit.files !== 1 ? "s" : ""}</span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={commit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="View on GitHub"
                              >
                                <Icon icon="mingcute:external-link-line" width={18} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                      {contributionData.commitHistory.length > 50 && (
                        <p className="text-xs text-slate-500 mt-2 text-center">
                          Showing 50 of {contributionData.commitHistory.length} commits
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 border-t flex-shrink-0">
                  <button
                    onClick={() => {
                      setShowContributions(false);
                      setSelectedRepoDetails(null);
                      setContributionData(null);
                    }}
                    className="w-full px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              {isConnected && username && (
                <span>Connected as <strong>{username}</strong></span>
              )}
            </div>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isDisconnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:unlink-line" width={16} />
                    Disconnect
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            {isConnected && filteredRepos.length > 0 && (
              <button
                onClick={handleAddSelectedToProjects}
                disabled={isImporting || selectedRepos.size === 0}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:add-line" width={18} />
                    Import Selected ({selectedRepos.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

