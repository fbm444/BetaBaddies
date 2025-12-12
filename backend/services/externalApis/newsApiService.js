import axios from "axios";
import { wrapApiCall } from "../../utils/apiCallWrapper.js";

class NewsApiService {
  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY;
    this.baseUrl = "https://newsapi.org/v2/everything";
  }

  /**
   * Fetch recent news articles about a company
   * @param {string} companyName - Name of the company
   * @param {number} limit - Number of articles to fetch (max 100)
   * @param {number} userId - Optional user ID for tracking
   */
  async getCompanyNews(companyName, limit = 10, userId = null) {
    return wrapApiCall({
      serviceName: "newsapi",
      endpoint: "getCompanyNews",
      userId,
      apiCall: async () => {
        if (!this.apiKey) {
          throw new Error("News API key not configured");
        }
        // Calculate date range (last 30 days)
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);

        // Build a more precise query
        const query = `"${companyName}" AND (company OR corporation OR announces OR launches OR reports OR earnings)`;

        const response = await axios.get(this.baseUrl, {
          params: {
            apiKey: this.apiKey,
            q: query,
            language: "en",
            sortBy: "relevancy",
            pageSize: Math.min(limit * 2, 100),
            from: fromDate.toISOString().split("T")[0],
            to: toDate.toISOString().split("T")[0],
          },
        });
        return response;
      },
      fallback: async (error) => {
        // Fallback: return empty array
        console.warn("Using fallback for News API - returning empty results");
        return { data: { articles: [] } };
      },
    }).then((response) => {
      const articles = response.data.articles || [];

      // Filter and map articles
      const mapped = articles
        .map((article) => ({
          heading: article.title,
          description: article.description || article.content?.substring(0, 500),
          url: article.url,
          source: article.source?.name,
          date: article.publishedAt ? new Date(article.publishedAt) : null,
          imageUrl: article.urlToImage,
        }))
        .filter((article) => {
          const titleLower = (article.heading || "").toLowerCase();
          const descLower = (article.description || "").toLowerCase();
          const companyLower = companyName.toLowerCase();
          
          return titleLower.includes(companyLower) || descLower.includes(companyLower);
        })
        .slice(0, limit);

      return mapped;
    }).catch(() => {
      // Return empty array if both API and fallback fail
      return [];
    });
  }

  /**
   * Categorize news articles by type
   */
  categorizeArticle(article) {
    const titleLower = article.heading?.toLowerCase() || "";
    const descLower = article.description?.toLowerCase() || "";
    const combined = `${titleLower} ${descLower}`;

    if (
      combined.includes("acquisition") ||
      combined.includes("merger") ||
      combined.includes("acquires")
    ) {
      return "acquisition";
    }

    if (
      combined.includes("funding") ||
      combined.includes("investment") ||
      combined.includes("raises")
    ) {
      return "funding";
    }

    if (
      combined.includes("product") ||
      combined.includes("launch") ||
      combined.includes("releases")
    ) {
      return "product";
    }

    if (
      combined.includes("hiring") ||
      combined.includes("layoff") ||
      combined.includes("employees")
    ) {
      return "personnel";
    }

    if (
      combined.includes("partnership") ||
      combined.includes("partner") ||
      combined.includes("collaboration")
    ) {
      return "partnership";
    }

    return "misc";
  }
}

export default new NewsApiService();

