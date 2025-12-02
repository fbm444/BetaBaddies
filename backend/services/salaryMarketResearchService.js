import OpenAI from "openai";

class SalaryMarketResearchService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;

    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    } else {
      this.openai = null;
    }
  }

  // Research market salary data
  async researchMarketSalary(role, location, experienceLevel, industry) {
    try {
      if (this.openai) {
        const marketData = await this.researchMarketSalaryWithAI(
          role,
          location,
          experienceLevel,
          industry
        );
        if (marketData) {
          return { ...marketData, generatedBy: "openai" };
        }
      }

      // Fallback to static/default data
      return this.getFallbackMarketData(role, location, experienceLevel, industry);
    } catch (error) {
      console.warn(
        "[SalaryMarketResearchService] Market research failed, using fallback:",
        error.message
      );
      return this.getFallbackMarketData(role, location, experienceLevel, industry);
    }
  }

  // Research market salary using AI
  async researchMarketSalaryWithAI(role, location, experienceLevel, industry) {
    const systemPrompt = `You are a salary research expert. Provide accurate market salary data based on real-world compensation data. 
    Always provide realistic salary ranges based on the role, location, experience level, and industry. 
    Return data in JSON format with percentiles.`;

    const userPrompt = `Research market salary data for the following position:
- Role: ${role}
- Location: ${location}
- Experience Level: ${experienceLevel} years
- Industry: ${industry || "General"}

Provide salary data in USD with the following percentiles:
- 25th percentile (lower quartile)
- 50th percentile (median)
- 75th percentile (upper quartile)
- 90th percentile (top 10%)

Also include:
- Source information (e.g., "Based on industry standards and market data")
- Date of research
- Brief notes on factors affecting salary (company size, specific skills, etc.)

Return as JSON:
{
  "role": "${role}",
  "location": "${location}",
  "experienceLevel": ${experienceLevel},
  "industry": "${industry || "General"}",
  "percentile25": <number>,
  "percentile50": <number>,
  "percentile75": <number>,
  "percentile90": <number>,
  "source": "<source description>",
  "date": "<current date>",
  "notes": "<brief notes on factors affecting salary>"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent data
        max_tokens: 500,
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        // Try to extract JSON from markdown code blocks
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse AI response for market research");
        }
      }

      // Validate parsed data
      if (
        !parsed.percentile25 ||
        !parsed.percentile50 ||
        !parsed.percentile75 ||
        !parsed.percentile90
      ) {
        throw new Error("Invalid market data structure from AI");
      }

      return {
        role: parsed.role || role,
        location: parsed.location || location,
        experienceLevel: parsed.experienceLevel || experienceLevel,
        industry: parsed.industry || industry || "General",
        percentile25: parseFloat(parsed.percentile25),
        percentile50: parseFloat(parsed.percentile50),
        percentile75: parseFloat(parsed.percentile75),
        percentile90: parseFloat(parsed.percentile90),
        source: parsed.source || "AI-generated market research",
        date: parsed.date || new Date().toISOString().split("T")[0],
        notes: parsed.notes || "Market data based on role, location, and experience level",
      };
    } catch (error) {
      console.error("❌ Error in AI market research:", error);
      throw error;
    }
  }

  // Fallback market data
  getFallbackMarketData(role, location, experienceLevel, industry) {
    // Simple fallback based on experience level
    // These are rough estimates - in production, you'd want more sophisticated logic
    const baseSalary = 50000 + experienceLevel * 10000; // Rough estimate

    return {
      role,
      location,
      experienceLevel,
      industry: industry || "General",
      percentile25: Math.round(baseSalary * 0.8),
      percentile50: Math.round(baseSalary),
      percentile75: Math.round(baseSalary * 1.3),
      percentile90: Math.round(baseSalary * 1.6),
      source: "Fallback estimation",
      date: new Date().toISOString().split("T")[0],
      notes: `Estimated salary range based on ${experienceLevel} years of experience. For accurate data, please verify with industry sources.`,
      generatedBy: "fallback",
    };
  }

  // Compare offer to market data
  compareOfferToMarket(offerAmount, marketData) {
    if (!marketData || !offerAmount) {
      return null;
    }

    const { percentile25, percentile50, percentile75, percentile90 } = marketData;

    let percentile = null;
    let comparison = null;

    if (offerAmount <= percentile25) {
      percentile = 25;
      comparison = "below_25th";
    } else if (offerAmount <= percentile50) {
      percentile = 50;
      comparison = "below_median";
    } else if (offerAmount <= percentile75) {
      percentile = 75;
      comparison = "above_median";
    } else if (offerAmount <= percentile90) {
      percentile = 90;
      comparison = "above_75th";
    } else {
      percentile = 90;
      comparison = "above_90th";
    }

    const differenceFromMedian = offerAmount - percentile50;
    const percentDifference = ((differenceFromMedian / percentile50) * 100).toFixed(1);

    return {
      percentile,
      comparison,
      differenceFromMedian,
      percentDifference: parseFloat(percentDifference),
      recommendation:
        offerAmount < percentile50
          ? "Consider negotiating - offer is below market median"
          : offerAmount < percentile75
          ? "Offer is competitive - minor negotiation may be possible"
          : "Offer is strong - negotiate for additional benefits if desired",
    };
  }

  // Get market insights
  async getMarketInsights(role, location, industry) {
    try {
      if (this.openai) {
        const insights = await this.getMarketInsightsWithAI(role, location, industry);
        if (insights) {
          return insights;
        }
      }

      return {
        insights: [
          "Market rates vary significantly by company size and funding stage",
          "Remote positions may have different salary ranges than in-office",
          "Equity and benefits can significantly impact total compensation",
        ],
        generatedBy: "fallback",
      };
    } catch (error) {
      console.warn("[SalaryMarketResearchService] Market insights failed:", error.message);
      return {
        insights: ["Market data unavailable. Please research independently."],
        generatedBy: "fallback",
      };
    }
  }

  // Get market insights using AI
  async getMarketInsightsWithAI(role, location, industry) {
    const prompt = `Provide 3-5 key insights about salary trends and factors affecting compensation for ${role} positions in ${location}${industry ? ` in the ${industry} industry` : ""}. 
    Focus on practical factors like company size, skills in demand, and negotiation leverage.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });

      const insights = response.choices[0]?.message?.content || "";
      return {
        insights: insights
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => line.replace(/^[-•*]\s*/, "").trim()),
        generatedBy: "openai",
      };
    } catch (error) {
      console.error("❌ Error getting market insights:", error);
      return null;
    }
  }
}

export default new SalaryMarketResearchService();

