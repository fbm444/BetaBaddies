import axios from "axios";

class NewsApiService {
  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY;
    this.baseUrl = "https://newsapi.org/v2/everything";
  }

  /**
   * Fetch recent news articles about a company
   * @param {string} companyName - Name of the company
   * @param {number} limit - Number of articles to fetch (max 100)
   */
  async getCompanyNews(companyName, limit = 10) {
    if (!this.apiKey) {
      console.warn("⚠️ News API key not configured");
      return [];
    }

    try {
      // Calculate date range (last 30 days)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);

      // Build a more precise query
      // Use exact phrase match and filter out irrelevant results
      const query = `"${companyName}" AND (company OR corporation OR announces OR launches OR reports OR earnings)`;

      const response = await axios.get(this.baseUrl, {
        params: {
          apiKey: this.apiKey,
          q: query,
          language: "en",
          sortBy: "relevancy", // Changed from publishedAt to relevancy
          pageSize: Math.min(limit * 2, 100), // Fetch more to filter later
          from: fromDate.toISOString().split("T")[0],
          to: toDate.toISOString().split("T")[0],
        },
      });

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
          // Filter out articles that don't mention the company in title or description
          const titleLower = (article.heading || "").toLowerCase();
          const descLower = (article.description || "").toLowerCase();
          const companyLower = companyName.toLowerCase();
          
          return titleLower.includes(companyLower) || descLower.includes(companyLower);
        })
        .slice(0, limit); // Limit to requested number

      return mapped;
    } catch (error) {
      console.error("❌ Error calling News API:", error.message);

      if (error.response?.status === 429) {
        console.warn("⚠️ News API rate limit reached");
      } else if (error.response?.status === 426) {
        console.warn("⚠️ News API requires upgrade for this request");
      }

      return [];
    }
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

