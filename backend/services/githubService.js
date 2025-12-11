import database from "./database.js";
import { ApiError } from "../utils/ApiError.js";
import axios from "axios";

class GitHubService {
  constructor() {
    this.githubApiBase = "https://api.github.com";
  }

  /**
   * Get user's GitHub access token
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Access token or null
   */
  async getGitHubAccessToken(userId) {
    try {
      const result = await database.query(
        `SELECT github_access_token, github_token_expires_at 
         FROM users 
         WHERE u_id = $1 AND github_access_token IS NOT NULL`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const { github_access_token, github_token_expires_at } = result.rows[0];

      // Check if token is expired
      if (
        github_token_expires_at &&
        new Date(github_token_expires_at) < new Date()
      ) {
        console.warn("⚠️ GitHub access token expired");
        return null;
      }

      return github_access_token;
    } catch (error) {
      console.error("❌ Error getting GitHub access token:", error);
      throw error;
    }
  }

  /**
   * Get user's GitHub username
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} GitHub username or null
   */
  async getGitHubUsername(userId) {
    try {
      const result = await database.query(
        `SELECT github_username FROM users WHERE u_id = $1 AND github_username IS NOT NULL`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].github_username;
    } catch (error) {
      console.error("❌ Error getting GitHub username:", error);
      throw error;
    }
  }

  /**
   * Store GitHub OAuth tokens
   * @param {string} userId - User ID
   * @param {string} accessToken - GitHub access token
   * @param {string} username - GitHub username
   * @param {string} refreshToken - Optional refresh token
   * @param {Date} expiresAt - Optional token expiration date
   */
  async storeGitHubTokens(userId, accessToken, username, refreshToken = null, expiresAt = null) {
    try {
      await database.query(
        `UPDATE users 
         SET github_access_token = $2,
             github_username = $3,
             github_refresh_token = $4,
             github_token_expires_at = $5
         WHERE u_id = $1`,
        [userId, accessToken, username, refreshToken, expiresAt]
      );
    } catch (error) {
      console.error("❌ Error storing GitHub tokens:", error);
      throw error;
    }
  }

  /**
   * Fetch user's GitHub profile
   * @param {string} accessToken - GitHub OAuth access token
   * @returns {Promise<Object>} GitHub user profile
   */
  async fetchGitHubProfile(accessToken) {
    try {
      const response = await axios.get(`${this.githubApiBase}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name,
        email: response.data.email,
        avatar_url: response.data.avatar_url,
        bio: response.data.bio,
        public_repos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      };
    } catch (error) {
      console.error("❌ Error fetching GitHub profile:", error);
      if (error.response) {
        throw new ApiError(
          `GitHub API error: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`,
          error.response.status
        );
      }
      throw new ApiError(
        `Failed to fetch GitHub profile: ${error.message}`,
        500
      );
    }
  }

  /**
   * Fetch user's public repositories
   * @param {string} accessToken - GitHub OAuth access token
   * @param {string} username - GitHub username
   * @param {boolean} includePrivate - Whether to include private repos (requires token)
   * @returns {Promise<Array>} Array of repositories
   */
  async fetchUserRepositories(accessToken, username, includePrivate = false) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Fetch repositories
      // Note: Cannot use both 'type' and 'affiliation' parameters together
      const reposResponse = await axios.get(
        `${this.githubApiBase}/user/repos`,
        {
          headers,
          params: {
            per_page: 100,
            sort: "updated",
            direction: "desc",
            type: includePrivate ? "all" : "public",
          },
        }
      );

      const repos = reposResponse.data;

      // Fetch languages for each repository
      const reposWithLanguages = await Promise.all(
        repos.map(async (repo) => {
          try {
            const languagesResponse = await axios.get(repo.languages_url, {
              headers,
            });
            const languages = languagesResponse.data;

            // Calculate language percentages
            const totalBytes = Object.values(languages).reduce(
              (sum, bytes) => sum + bytes,
              0
            );
            const languagesPercent = {};
            if (totalBytes > 0) {
              Object.entries(languages).forEach(([lang, bytes]) => {
                languagesPercent[lang] = Math.round(
                  (bytes / totalBytes) * 100 * 100
                ) / 100; // Round to 2 decimal places
              });
            }

            return {
              ...repo,
              languages: languagesPercent,
              primary_language: repo.language,
            };
          } catch (langError) {
            console.warn(
              `⚠️ Could not fetch languages for ${repo.name}:`,
              langError.message
            );
            return {
              ...repo,
              languages: {},
              primary_language: repo.language,
            };
          }
        })
      );

      return reposWithLanguages.map((repo) => ({
        github_repo_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.primary_language,
        languages: repo.languages,
        stars_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        watchers_count: repo.watchers_count,
        open_issues_count: repo.open_issues_count,
        size: repo.size,
        is_private: repo.private,
        is_fork: repo.fork,
        is_archived: repo.archived,
        default_branch: repo.default_branch,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        topics: repo.topics || [],
        homepage: repo.homepage,
        license_name: repo.license?.name,
        license_url: repo.license?.url,
      }));
    } catch (error) {
      console.error("❌ Error fetching GitHub repositories:", error);
      if (error.response) {
        throw new ApiError(
          `GitHub API error: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`,
          error.response.status
        );
      }
      throw new ApiError(
        `Failed to fetch GitHub repositories: ${error.message}`,
        500
      );
    }
  }

  /**
   * Import repositories to database
   * @param {string} userId - User ID
   * @param {Array} repositories - Array of repository data
   * @returns {Promise<Object>} Import result
   */
  async importRepositories(userId, repositories) {
    try {
      const imported = [];
      const updated = [];

      for (const repo of repositories) {
        try {
          // Check if repository already exists
          const existing = await database.query(
            `SELECT id FROM github_repositories 
             WHERE user_id = $1 AND github_repo_id = $2`,
            [userId, repo.github_repo_id]
          );

          if (existing.rows.length > 0) {
            // Update existing repository
            const result = await database.query(
              `UPDATE github_repositories 
               SET name = $3,
                   full_name = $4,
                   description = $5,
                   html_url = $6,
                   clone_url = $7,
                   language = $8,
                   languages = $9,
                   stars_count = $10,
                   forks_count = $11,
                   watchers_count = $12,
                   open_issues_count = $13,
                   size = $14,
                   is_private = $15,
                   is_fork = $16,
                   is_archived = $17,
                   default_branch = $18,
                   created_at = $19,
                   updated_at = $20,
                   pushed_at = $21,
                   topics = $22,
                   homepage = $23,
                   license_name = $24,
                   license_url = $25,
                   last_synced_at = NOW(),
                   updated_at_db = NOW()
               WHERE user_id = $1 AND github_repo_id = $2
               RETURNING id`,
              [
                userId,
                repo.github_repo_id,
                repo.name,
                repo.full_name,
                repo.description,
                repo.html_url,
                repo.clone_url,
                repo.language,
                JSON.stringify(repo.languages),
                repo.stars_count,
                repo.forks_count,
                repo.watchers_count,
                repo.open_issues_count,
                repo.size,
                repo.is_private,
                repo.is_fork,
                repo.is_archived,
                repo.default_branch,
                repo.created_at,
                repo.updated_at,
                repo.pushed_at,
                repo.topics,
                repo.homepage,
                repo.license_name,
                repo.license_url,
              ]
            );
            updated.push(result.rows[0].id);
          } else {
            // Insert new repository
            const result = await database.query(
              `INSERT INTO github_repositories (
                 user_id, github_repo_id, name, full_name, description,
                 html_url, clone_url, language, languages, stars_count,
                 forks_count, watchers_count, open_issues_count, size,
                 is_private, is_fork, is_archived, default_branch,
                 created_at, updated_at, pushed_at, topics, homepage,
                 license_name, license_url, last_synced_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
               RETURNING id`,
              [
                userId,
                repo.github_repo_id,
                repo.name,
                repo.full_name,
                repo.description,
                repo.html_url,
                repo.clone_url,
                repo.language,
                JSON.stringify(repo.languages),
                repo.stars_count,
                repo.forks_count,
                repo.watchers_count,
                repo.open_issues_count,
                repo.size,
                repo.is_private,
                repo.is_fork,
                repo.is_archived,
                repo.default_branch,
                repo.created_at,
                repo.updated_at,
                repo.pushed_at,
                repo.topics,
                repo.homepage,
                repo.license_name,
                repo.license_url,
              ]
            );
            imported.push(result.rows[0].id);
          }
        } catch (repoError) {
          console.error(
            `❌ Error importing repository ${repo.name}:`,
            repoError
          );
          // Continue with next repository
        }
      }

      return {
        imported: imported.length,
        updated: updated.length,
        total: imported.length + updated.length,
      };
    } catch (error) {
      console.error("❌ Error importing repositories:", error);
      throw error;
    }
  }

  /**
   * Get user's imported repositories
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (featured, language, etc.)
   * @returns {Promise<Array>} Array of repositories
   */
  async getUserRepositories(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          id, github_repo_id, name, full_name, description,
          html_url, clone_url, language, languages, stars_count,
          forks_count, watchers_count, open_issues_count, size,
          is_private, is_fork, is_archived, is_featured, default_branch,
          created_at, updated_at, pushed_at, topics, homepage,
          license_name, license_url, last_synced_at, created_at_db, updated_at_db
        FROM github_repositories
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (filters.featured !== undefined) {
        paramCount++;
        query += ` AND is_featured = $${paramCount}`;
        params.push(filters.featured);
      }

      if (filters.language) {
        paramCount++;
        query += ` AND language = $${paramCount}`;
        params.push(filters.language);
      }

      if (filters.includePrivate === false) {
        query += ` AND is_private = false`;
      }

      query += ` ORDER BY pushed_at DESC, stars_count DESC`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapRowToRepository);
    } catch (error) {
      console.error("❌ Error getting user repositories:", error);
      throw error;
    }
  }

  /**
   * Toggle featured status for a repository
   * @param {string} userId - User ID
   * @param {string} repositoryId - Repository ID
   * @param {boolean} isFeatured - Featured status
   * @returns {Promise<Object>} Updated repository
   */
  async setFeaturedStatus(userId, repositoryId, isFeatured) {
    try {
      const result = await database.query(
        `UPDATE github_repositories 
         SET is_featured = $3, updated_at_db = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [repositoryId, userId, isFeatured]
      );

      if (result.rows.length === 0) {
        throw new ApiError("Repository not found", 404);
      }

      return this.mapRowToRepository(result.rows[0]);
    } catch (error) {
      console.error("❌ Error setting featured status:", error);
      throw error;
    }
  }

  /**
   * Fetch contribution activity for a repository
   * @param {string} accessToken - GitHub access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} username - GitHub username
   * @returns {Promise<Object>} Contribution activity with statistics
   */
  async fetchContributionActivity(accessToken, owner, repo, username) {
    try {
      // GitHub API doesn't provide direct contribution stats per user per repo
      // We'll use the contributions API which requires authentication
      const response = await axios.get(
        `${this.githubApiBase}/repos/${owner}/${repo}/stats/contributors`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      // Find the user's contribution data
      const userContributions = response.data.find(
        (contributor) => contributor.author?.login === username
      );

      if (!userContributions) {
        return {
          dailyContributions: [],
          statistics: {
            totalCommits: 0,
            totalAdditions: 0,
            totalDeletions: 0,
            averageCommitsPerWeek: 0,
            averageCommitsPerDay: 0,
            mostActiveWeek: null,
            commitFrequency: "No activity",
            weeksActive: 0,
          },
        };
      }

      // Transform weeks data to daily contributions
      const dailyContributions = [];
      let totalCommits = 0;
      let totalAdditions = 0;
      let totalDeletions = 0;
      let maxWeekCommits = 0;
      let mostActiveWeek = null;

      userContributions.weeks.forEach((week) => {
        const weekStart = new Date(week.w * 1000);
        const weekCommits = week.c || 0;
        const weekAdditions = week.a || 0;
        const weekDeletions = week.d || 0;

        totalCommits += weekCommits;
        totalAdditions += weekAdditions;
        totalDeletions += weekDeletions;

        if (weekCommits > maxWeekCommits) {
          maxWeekCommits = weekCommits;
          mostActiveWeek = {
            week: weekStart.toISOString().split("T")[0],
            commits: weekCommits,
            additions: weekAdditions,
            deletions: weekDeletions,
          };
        }

        // Distribute commits across the week (more accurate than dividing by 7)
        if (weekCommits > 0) {
          // Create daily entries for this week
          for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            // Distribute commits proportionally (simplified - assumes uniform distribution)
            dailyContributions.push({
              date: date.toISOString().split("T")[0],
              commits: i < weekCommits % 7 
                ? Math.ceil(weekCommits / 7) 
                : Math.floor(weekCommits / 7),
              additions: Math.floor(weekAdditions / 7),
              deletions: Math.floor(weekDeletions / 7),
            });
          }
        }
      });

      // Calculate statistics
      const weeksActive = userContributions.weeks.filter(
        (w) => w.c > 0
      ).length;
      const averageCommitsPerWeek =
        weeksActive > 0 ? totalCommits / weeksActive : 0;
      const averageCommitsPerDay =
        dailyContributions.length > 0
          ? totalCommits / dailyContributions.length
          : 0;

      // Determine commit frequency
      let commitFrequency = "No activity";
      if (averageCommitsPerDay >= 5) {
        commitFrequency = "Very Active";
      } else if (averageCommitsPerDay >= 2) {
        commitFrequency = "Active";
      } else if (averageCommitsPerDay >= 0.5) {
        commitFrequency = "Moderate";
      } else if (averageCommitsPerDay > 0) {
        commitFrequency = "Occasional";
      }

      // Get last 30 days of activity for better visualization
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentContributions = dailyContributions.filter(
        (contrib) => new Date(contrib.date) >= thirtyDaysAgo
      );

      return {
        dailyContributions: recentContributions,
        allContributions: dailyContributions,
        statistics: {
          totalCommits,
          totalAdditions,
          totalDeletions,
          averageCommitsPerWeek: Math.round(averageCommitsPerWeek * 100) / 100,
          averageCommitsPerDay: Math.round(averageCommitsPerDay * 100) / 100,
          mostActiveWeek,
          commitFrequency,
          weeksActive,
          totalWeeks: userContributions.weeks.length,
        },
      };
    } catch (error) {
      console.warn(
        `⚠️ Could not fetch contribution activity for ${owner}/${repo}:`,
        error.message
      );
      return {
        dailyContributions: [],
        allContributions: [],
        statistics: {
          totalCommits: 0,
          totalAdditions: 0,
          totalDeletions: 0,
          averageCommitsPerWeek: 0,
          averageCommitsPerDay: 0,
          mostActiveWeek: null,
          commitFrequency: "No activity",
          weeksActive: 0,
          totalWeeks: 0,
        },
      };
    }
  }

  /**
   * Get overall contribution statistics for all user repositories
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Overall contribution statistics
   */
  async getOverallContributionStats(userId) {
    try {
      const accessToken = await this.getGitHubAccessToken(userId);
      const username = await this.getGitHubUsername(userId);

      if (!accessToken || !username) {
        return {
          totalCommits: 0,
          totalRepositories: 0,
          averageCommitsPerRepo: 0,
          mostActiveRepository: null,
          commitFrequency: "No activity",
        };
      }

      const repositories = await this.getUserRepositories(userId, {
        includePrivate: false,
      });

      let totalCommits = 0;
      let repoStats = [];

      // Fetch contribution stats for each repository
      for (const repo of repositories.slice(0, 20)) {
        // Limit to 20 repos to avoid rate limiting
        try {
          const [owner, repoName] = repo.fullName.split("/");
          const contributions = await this.fetchContributionActivity(
            accessToken,
            owner,
            repoName,
            username
          );

          if (contributions.statistics.totalCommits > 0) {
            totalCommits += contributions.statistics.totalCommits;
            repoStats.push({
              repositoryId: repo.id,
              repositoryName: repo.name,
              commits: contributions.statistics.totalCommits,
              frequency: contributions.statistics.commitFrequency,
            });
          }
        } catch (error) {
          console.warn(
            `⚠️ Could not fetch stats for ${repo.name}:`,
            error.message
          );
        }
      }

      // Sort by commits
      repoStats.sort((a, b) => b.commits - a.commits);

      return {
        totalCommits,
        totalRepositories: repositories.length,
        averageCommitsPerRepo:
          repositories.length > 0
            ? Math.round((totalCommits / repositories.length) * 100) / 100
            : 0,
        mostActiveRepository: repoStats[0] || null,
        commitFrequency:
          totalCommits > 0
            ? totalCommits / 30 >= 5
              ? "Very Active"
              : totalCommits / 30 >= 2
              ? "Active"
              : totalCommits / 30 >= 0.5
              ? "Moderate"
              : "Occasional"
            : "No activity",
        topRepositories: repoStats.slice(0, 5),
      };
    } catch (error) {
      console.error("❌ Error getting overall contribution stats:", error);
      throw error;
    }
  }

  /**
   * Sync repositories (refresh data from GitHub)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync result
   */
  async syncRepositories(userId) {
    try {
      const accessToken = await this.getGitHubAccessToken(userId);
      const username = await this.getGitHubUsername(userId);

      if (!accessToken || !username) {
        throw new ApiError("GitHub not connected", 400);
      }

      const repositories = await this.fetchUserRepositories(
        accessToken,
        username,
        true // Include private repos if accessible
      );

      const result = await this.importRepositories(userId, repositories);

      return {
        ...result,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error syncing repositories:", error);
      throw error;
    }
  }

  /**
   * Link repository to skills
   * @param {string} userId - User ID
   * @param {string} repositoryId - Repository ID
   * @param {Array<string>} skillIds - Array of skill IDs
   * @returns {Promise<Object>} Link result
   */
  async linkRepositoryToSkills(userId, repositoryId, skillIds) {
    try {
      // Verify repository belongs to user
      const repoCheck = await database.query(
        `SELECT id FROM github_repositories WHERE id = $1 AND user_id = $2`,
        [repositoryId, userId]
      );

      if (repoCheck.rows.length === 0) {
        throw new ApiError("Repository not found", 404);
      }

      // Remove existing links
      await database.query(
        `DELETE FROM github_repository_skills WHERE repository_id = $1`,
        [repositoryId]
      );

      // Add new links
      if (skillIds && skillIds.length > 0) {
        for (const skillId of skillIds) {
          // Verify skill belongs to user
          const skillCheck = await database.query(
            `SELECT id FROM skills WHERE id = $1 AND user_id = $2`,
            [skillId, userId]
          );

          if (skillCheck.rows.length > 0) {
            await database.query(
              `INSERT INTO github_repository_skills (repository_id, skill_id)
               VALUES ($1, $2)
               ON CONFLICT (repository_id, skill_id) DO NOTHING`,
              [repositoryId, skillId]
            );
          }
        }
      }

      return { success: true, linkedSkills: skillIds.length };
    } catch (error) {
      console.error("❌ Error linking repository to skills:", error);
      throw error;
    }
  }

  /**
   * Get repository statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getRepositoryStatistics(userId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_repos,
          COUNT(*) FILTER (WHERE is_featured = true) as featured_repos,
          COUNT(*) FILTER (WHERE is_private = false) as public_repos,
          COUNT(*) FILTER (WHERE is_private = true) as private_repos,
          COUNT(*) FILTER (WHERE is_fork = true) as forks,
          SUM(stars_count) as total_stars,
          SUM(forks_count) as total_forks,
          COUNT(DISTINCT language) FILTER (WHERE language IS NOT NULL) as unique_languages
        FROM github_repositories
        WHERE user_id = $1
      `;

      const result = await database.query(statsQuery, [userId]);
      const stats = result.rows[0];

      // Get most used languages
      const languagesQuery = `
        SELECT language, COUNT(*) as repo_count
        FROM github_repositories
        WHERE user_id = $1 AND language IS NOT NULL
        GROUP BY language
        ORDER BY repo_count DESC
        LIMIT 10
      `;

      const languagesResult = await database.query(languagesQuery, [userId]);

      return {
        totalRepos: parseInt(stats.total_repos) || 0,
        featuredRepos: parseInt(stats.featured_repos) || 0,
        publicRepos: parseInt(stats.public_repos) || 0,
        privateRepos: parseInt(stats.private_repos) || 0,
        forks: parseInt(stats.forks) || 0,
        totalStars: parseInt(stats.total_stars) || 0,
        totalForks: parseInt(stats.total_forks) || 0,
        uniqueLanguages: parseInt(stats.unique_languages) || 0,
        topLanguages: languagesResult.rows.map((row) => ({
          language: row.language,
          repoCount: parseInt(row.repo_count),
        })),
      };
    } catch (error) {
      console.error("❌ Error getting repository statistics:", error);
      throw error;
    }
  }

  /**
   * Helper method to map database row to repository object
   */
  mapRowToRepository(row) {
    return {
      id: row.id,
      githubRepoId: row.github_repo_id,
      name: row.name,
      fullName: row.full_name,
      description: row.description,
      htmlUrl: row.html_url,
      cloneUrl: row.clone_url,
      language: row.language,
      languages: typeof row.languages === "string" 
        ? JSON.parse(row.languages) 
        : row.languages || {},
      starsCount: row.stars_count,
      forksCount: row.forks_count,
      watchersCount: row.watchers_count,
      openIssuesCount: row.open_issues_count,
      size: row.size,
      isPrivate: row.is_private,
      isFork: row.is_fork,
      isArchived: row.is_archived,
      isFeatured: row.is_featured,
      defaultBranch: row.default_branch,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pushedAt: row.pushed_at,
      topics: row.topics || [],
      homepage: row.homepage,
      licenseName: row.license_name,
      licenseUrl: row.license_url,
      lastSyncedAt: row.last_synced_at,
      createdAtDb: row.created_at_db,
      updatedAtDb: row.updated_at_db,
    };
  }
}

export default new GitHubService();

