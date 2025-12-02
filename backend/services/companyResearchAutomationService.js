import OpenAI from "openai";
import abstractApiService from "./externalApis/abstractApiService.js";
import newsApiService from "./externalApis/newsApiService.js";
import companyResearchService from "./companyResearchService.js";
import database from "./database.js";

class CompanyResearchAutomationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
      });
    }
  }

  /**
   * Perform automated company research using Abstract API, News API, and OpenAI
   */
  async researchCompany(jobId, userId) {
    try {
      // 1. Get job details from job_opportunities table
      const jobQuery = await database.query(
        "SELECT id, company, title as job_title, job_description as description FROM job_opportunities WHERE id = $1 AND user_id = $2",
        [jobId, userId]
      );

      if (jobQuery.rows.length === 0) {
        throw new Error("Job not found");
      }

      const job = jobQuery.rows[0];
      const companyName = job.company;

      console.log(`🔍 Starting research for company: ${companyName}`);

      // 2. Call Abstract API for company enrichment
      const domain = abstractApiService.extractDomain(companyName);
      const abstractData = await abstractApiService.enrichCompany(domain);

      // 3. Call News API for recent articles
      const newsArticles = await newsApiService.getCompanyNews(companyName, 10);

      // 4. Skip AI generation during initial research (will be generated on-demand when viewing details)
      // This makes the research much faster!

      // 5. Combine all data sources (without AI enrichment)
      const enrichedData = this.combineDataSources(
        companyName,
        abstractData,
        newsArticles,
        null // No AI enrichment during initial research
      );

      // 6. Save to database
      await this.saveToDatabase(jobId, enrichedData);

      console.log(`✅ Research complete for ${companyName}`);

      return enrichedData;
    } catch (error) {
      console.error("❌ Error in company research automation:", error);
      throw error;
    }
  }

  /**
   * Use OpenAI to enrich company data and fill gaps
   */
  async enrichWithAI(companyName, abstractData, newsArticles, job) {
    if (!this.openai) {
      console.warn("⚠️ OpenAI not configured, skipping AI enrichment");
      return null;
    }

    try {
      const prompt = `You are a company research assistant. Analyze the following information about ${companyName} and provide additional insights.

Company Name: ${companyName}
Job Position: ${job.job_title}
${job.description ? `Job Description: ${job.description}` : ""}

Available Data:
${abstractData ? `- Industry: ${abstractData.industry || "Unknown"}
- Size: ${abstractData.employeeCount || "Unknown"} employees
- Location: ${abstractData.locality || "Unknown"}
- Description: ${abstractData.description || "Not available"}` : "- No company enrichment data available"}

Recent News (${newsArticles.length} articles):
${newsArticles
  .slice(0, 5)
  .map((article) => `- ${article.heading}`)
  .join("\n")}

Based on this information, provide a JSON response with the following structure:
{
  "mission": "Company's mission and values (inferred or researched)",
  "culture": "Company culture description",
  "products": ["List of main products or services"],
  "competitors": ["List of 3-5 main competitors"],
  "recentDevelopments": "Summary of recent company developments and news",
  "whyWorkHere": "Why someone might want to work at this company (3-4 compelling reasons)",
  "interviewTips": "Tips for interviewing at this company based on culture and role"
}

If you cannot find specific information, provide reasonable inferences based on the company name, industry, and available data. Keep responses concise and professional.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a professional company research analyst. Provide accurate, helpful information for job seekers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "{}";

      // Try to extract JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Error parsing AI response JSON:", parseError);
      }

      return null;
    } catch (error) {
      console.error("❌ Error calling OpenAI:", error.message);
      return null;
    }
  }

  /**
   * Combine data from all sources into a unified structure
   */
  combineDataSources(companyName, abstractData, newsArticles, aiEnrichment) {
    return {
      companyInfo: {
        name: companyName,
        industry: abstractData?.industry || null,
        size: abstractData?.employeeCount || null,
        location: abstractData?.locality
          ? `${abstractData.locality}${abstractData.country ? `, ${abstractData.country}` : ""}`
          : null,
        website: abstractData?.domain || null,
        description:
          abstractData?.description ||
          null, // No fallback to AI, keep it null if Abstract API doesn't provide it
        companyLogo: abstractData?.logoUrl || null,
        foundedYear: abstractData?.foundedYear || null,
        mission: aiEnrichment?.mission || null,
        culture: aiEnrichment?.culture || null,
        products: aiEnrichment?.products || [],
        competitors: aiEnrichment?.competitors || [],
        recentDevelopments: aiEnrichment?.recentDevelopments || null,
        whyWorkHere: aiEnrichment?.whyWorkHere || null,
        interviewTips: aiEnrichment?.interviewTips || null,
      },
      socialMedia: this.extractSocialMedia(abstractData),
      news: newsArticles.map((article) => ({
        heading: article.heading,
        description: article.description,
        type: newsApiService.categorizeArticle(article),
        date: article.date,
        source: article.source,
        url: article.url,
      })),
    };
  }

  /**
   * Extract social media links from Abstract API data
   */
  extractSocialMedia(abstractData) {
    const media = [];

    if (abstractData?.linkedinUrl) {
      media.push({
        platform: "LinkedIn",
        link: abstractData.linkedinUrl,
      });
    }

    // Abstract API might provide other social media in the future
    // Add more platforms as needed

    return media;
  }

  /**
   * Save enriched data to database
   */
  async saveToDatabase(jobId, enrichedData) {
    const { companyInfo, socialMedia, news } = enrichedData;

    // 1. Upsert company info (now properly linked to job_opportunities)
    const companyInfoResult = await companyResearchService.upsertCompanyInfo(
      jobId,
      {
        size: companyInfo.size,
        industry: companyInfo.industry,
        location: companyInfo.location,
        website: companyInfo.website,
        description: companyInfo.description,
        companyLogo: companyInfo.companyLogo,
        mission: companyInfo.mission,
        culture: companyInfo.culture,
        values: companyInfo.values,
        recentDevelopments: companyInfo.recentDevelopments,
        products: companyInfo.products,
        competitors: companyInfo.competitors,
        whyWorkHere: companyInfo.whyWorkHere,
        interviewTips: companyInfo.interviewTips,
        foundedYear: companyInfo.foundedYear,
        enrichedData: companyInfo.enrichedData || null,
      }
    );

    const companyInfoId = companyInfoResult.id;

    // 2. Add social media links
    for (const media of socialMedia) {
      try {
        await companyResearchService.addCompanyMedia(
          companyInfoId,
          media.platform,
          media.link
        );
      } catch (err) {
        console.warn(`Failed to add social media: ${media.platform}`, err.message);
      }
    }

    // 3. Add news articles
    for (const newsItem of news) {
      try {
        await companyResearchService.addCompanyNews(companyInfoId, {
          heading: newsItem.heading,
          description: newsItem.description,
          type: newsItem.type,
          date: newsItem.date,
          source: newsItem.source,
        });
      } catch (err) {
        console.warn(`Failed to add news item: ${newsItem.heading}`, err.message);
      }
    }

    return companyInfoId;
  }
}

export default new CompanyResearchAutomationService();

