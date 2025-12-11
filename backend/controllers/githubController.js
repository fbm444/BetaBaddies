import githubService from "../services/githubService.js";
import projectService from "../services/projectService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GitHubController {
  /**
   * Connect GitHub account (store OAuth token)
   * POST /api/v1/github/connect
   */
  connect = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { accessToken, username, refreshToken, expiresAt } = req.body;

    if (!accessToken || !username) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_CREDENTIALS",
          message: "Access token and username are required",
        },
      });
    }

    // Verify token by fetching user profile
    const profile = await githubService.fetchGitHubProfile(accessToken);

    // Store tokens
    await githubService.storeGitHubTokens(
      userId,
      accessToken,
      username,
      refreshToken,
      expiresAt ? new Date(expiresAt) : null
    );

    res.status(200).json({
      ok: true,
      data: {
        message: "GitHub account connected successfully",
        profile: {
          username: profile.login,
          name: profile.name,
          avatarUrl: profile.avatar_url,
          publicRepos: profile.public_repos,
        },
      },
    });
  });

  /**
   * Disconnect GitHub account
   * DELETE /api/v1/github/disconnect
   */
  disconnect = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // Clear GitHub tokens
    await githubService.storeGitHubTokens(userId, null, null, null, null);

    res.status(200).json({
      ok: true,
      data: {
        message: "GitHub account disconnected successfully",
      },
    });
  });

  /**
   * Get GitHub connection status
   * GET /api/v1/github/status
   */
  getStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const accessToken = await githubService.getGitHubAccessToken(userId);
    const username = await githubService.getGitHubUsername(userId);

    res.status(200).json({
      ok: true,
      data: {
        connected: !!(accessToken && username),
        username: username || null,
      },
    });
  });

  /**
   * Import repositories from GitHub
   * POST /api/v1/github/repositories/import
   */
  importRepositories = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { includePrivate = false } = req.body;

    const accessToken = await githubService.getGitHubAccessToken(userId);
    const username = await githubService.getGitHubUsername(userId);

    if (!accessToken || !username) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "GITHUB_NOT_CONNECTED",
          message: "GitHub account not connected. Please connect your GitHub account first.",
        },
      });
    }

    // Fetch repositories from GitHub
    const repositories = await githubService.fetchUserRepositories(
      accessToken,
      username,
      includePrivate
    );

    // Import to database
    const result = await githubService.importRepositories(userId, repositories);

    res.status(200).json({
      ok: true,
      data: {
        message: "Repositories imported successfully",
        ...result,
      },
    });
  });

  /**
   * Sync repositories (refresh data from GitHub)
   * POST /api/v1/github/repositories/sync
   */
  syncRepositories = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const result = await githubService.syncRepositories(userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Repositories synced successfully",
        ...result,
      },
    });
  });

  /**
   * Get user's imported repositories
   * GET /api/v1/github/repositories
   */
  getRepositories = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { featured, language, includePrivate } = req.query;

    const filters = {};
    if (featured !== undefined) {
      filters.featured = featured === "true";
    }
    if (language) {
      filters.language = language;
    }
    if (includePrivate === "false") {
      filters.includePrivate = false;
    }

    const repositories = await githubService.getUserRepositories(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        repositories,
        count: repositories.length,
      },
    });
  });

  /**
   * Get a specific repository
   * GET /api/v1/github/repositories/:id
   */
  getRepository = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const repositories = await githubService.getUserRepositories(userId);
    const repository = repositories.find((repo) => repo.id === id);

    if (!repository) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        repository,
      },
    });
  });

  /**
   * Toggle featured status for a repository
   * PUT /api/v1/github/repositories/:id/featured
   */
  setFeatured = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "isFeatured must be a boolean",
        },
      });
    }

    const repository = await githubService.setFeaturedStatus(
      userId,
      id,
      isFeatured
    );

    res.status(200).json({
      ok: true,
      data: {
        repository,
        message: `Repository ${isFeatured ? "added to" : "removed from"} featured`,
      },
    });
  });

  /**
   * Link repository to skills
   * POST /api/v1/github/repositories/:id/skills
   */
  linkToSkills = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { skillIds } = req.body;

    if (!Array.isArray(skillIds)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "skillIds must be an array",
        },
      });
    }

    const result = await githubService.linkRepositoryToSkills(
      userId,
      id,
      skillIds
    );

    res.status(200).json({
      ok: true,
      data: {
        message: "Repository linked to skills successfully",
        ...result,
      },
    });
  });

  /**
   * Get repository statistics
   * GET /api/v1/github/repositories/statistics
   */
  getStatistics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const statistics = await githubService.getRepositoryStatistics(userId);

    res.status(200).json({
      ok: true,
      data: {
        statistics,
      },
    });
  });

  /**
   * Get contribution activity for a repository
   * GET /api/v1/github/repositories/:id/contributions
   */
  getContributions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const accessToken = await githubService.getGitHubAccessToken(userId);
    const username = await githubService.getGitHubUsername(userId);

    if (!accessToken || !username) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "GITHUB_NOT_CONNECTED",
          message: "GitHub account not connected",
        },
      });
    }

    // Get repository details
    const repositories = await githubService.getUserRepositories(userId);
    const repository = repositories.find((repo) => repo.id === id);

    if (!repository) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository not found",
        },
      });
    }

    // Extract owner and repo name from full_name
    const [owner, repoName] = repository.fullName.split("/");

    const contributions = await githubService.fetchContributionActivity(
      accessToken,
      owner,
      repoName,
      username
    );

    res.status(200).json({
      ok: true,
      data: {
        contributions,
        count: contributions.length,
      },
    });
  });

  /**
   * Create a project from a GitHub repository
   * POST /api/v1/github/repositories/:id/add-to-projects
   */
  addToProjects = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    // Get repository details
    const repositories = await githubService.getUserRepositories(userId);
    const repository = repositories.find((repo) => repo.id === id);

    if (!repository) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository not found",
        },
      });
    }

    // Check if project with this name already exists
    const existingProjects = await projectService.getProjectsByUserId(userId);
    const existingProject = existingProjects.find(
      (p) => p.name === repository.name
    );

    if (existingProject) {
      return res.status(409).json({
        ok: false,
        error: {
          code: "PROJECT_ALREADY_EXISTS",
          message: `A project named "${repository.name}" already exists`,
        },
      });
    }

    // Convert GitHub repository to project format
    const projectData = {
      name: repository.name,
      link: repository.htmlUrl,
      description: repository.description || "",
      startDate: repository.createdAt
        ? new Date(repository.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      endDate: repository.updatedAt
        ? new Date(repository.updatedAt).toISOString().split("T")[0]
        : null,
      technologies: repository.language
        ? Object.keys(repository.languages || {})
            .slice(0, 10)
            .join(", ")
        : repository.language || "",
      status: repository.isArchived ? "Completed" : "Ongoing",
      industry: null, // Can be set manually later
    };

    // Create the project
    const project = await projectService.createProject(userId, projectData);

    res.status(201).json({
      ok: true,
      data: {
        project,
        message: "Project created from GitHub repository successfully",
      },
    });
  });
}

export default new GitHubController();

