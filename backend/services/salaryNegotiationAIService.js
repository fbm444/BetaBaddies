import OpenAI from "openai";
import profileService from "./profileService.js";
import database from "./database.js";
import salaryNegotiationService from "./salaryNegotiationService.js";
import salaryMarketResearchService from "./salaryMarketResearchService.js";

class SalaryNegotiationAIService {
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

  // Build context for negotiation
  async buildContext(negotiationId, userId) {
    const negotiation = await salaryNegotiationService.getNegotiationById(
      negotiationId,
      userId
    );
    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    let profile = null;
    try {
      profile = await profileService.getProfileByUserId(userId);
    } catch {
      profile = null;
    }

    // Get user's experience from jobs
    const jobsQuery = `
      SELECT title, company, start_date, end_date, is_current, description
      FROM jobs
      WHERE user_id = $1
      ORDER BY start_date DESC
      LIMIT 5
    `;
    const jobsResult = await database.query(jobsQuery, [userId]);
    const recentJobs = jobsResult.rows;

    // Get user's skills
    const skillsQuery = `
      SELECT skill_name, proficiency
      FROM skills
      WHERE user_id = $1
      ORDER BY proficiency DESC
      LIMIT 10
    `;
    const skillsResult = await database.query(skillsQuery, [userId]);
    const topSkills = skillsResult.rows.map((s) => s.skill_name);

    return {
      profile: {
        name: profile?.fullName || "Candidate",
        jobTitle: profile?.job_title || null,
        experience: recentJobs.length > 0 ? this.calculateExperience(recentJobs) : 0,
      },
      negotiation: {
        role: negotiation.jobTitle,
        company: negotiation.company,
        location: negotiation.location,
        initialOffer: negotiation.initialOffer,
        targetCompensation: negotiation.targetCompensation,
        marketData: negotiation.marketSalaryData,
      },
      experience: {
        recentJobs: recentJobs.map((j) => ({
          title: j.title,
          company: j.company,
          duration: this.calculateJobDuration(j.start_date, j.end_date, j.is_current),
        })),
        topSkills,
      },
    };
  }

  calculateExperience(jobs) {
    if (jobs.length === 0) return 0;
    const earliest = new Date(Math.min(...jobs.map((j) => new Date(j.start_date))));
    const now = new Date();
    return Math.floor((now - earliest) / (1000 * 60 * 60 * 24 * 365));
  }

  calculateJobDuration(startDate, endDate, isCurrent) {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : new Date(endDate);
    const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
    if (months < 12) return `${Math.round(months)} months`;
    return `${Math.round(months / 12)} years`;
  }

  // Generate talking points
  async generateTalkingPoints(negotiationId, userId, options = {}) {
    try {
      const { forceRegenerate = false } = options;

      // Check for existing talking points if not forcing regeneration
      if (!forceRegenerate) {
        const negotiation = await salaryNegotiationService.getNegotiationById(
          negotiationId,
          userId
        );
        if (negotiation?.talkingPoints && negotiation.talkingPoints.length > 0) {
          console.log(`✅ Returning cached talking points for negotiation ${negotiationId}`);
          return negotiation.talkingPoints;
        }
      }

      const context = await this.buildContext(negotiationId, userId);

      if (this.openai) {
        try {
          const talkingPoints = await this.generateTalkingPointsWithAI(context);
          if (talkingPoints && talkingPoints.length > 0) {
            // Save to negotiation
            await salaryNegotiationService.updateNegotiation(
              negotiationId,
              userId,
              {
                talkingPoints: JSON.stringify(talkingPoints),
              }
            );
            return talkingPoints;
          }
        } catch (error) {
          console.warn(
            "[SalaryNegotiationAIService] AI generation failed, using fallback:",
            error.message
          );
        }
      }

      // Fallback
      return this.generateTalkingPointsFallback(context);
    } catch (error) {
      console.error("❌ Error generating talking points:", error);
      throw error;
    }
  }

  async generateTalkingPointsWithAI(context) {
    const { profile, negotiation, experience } = context;

    const systemPrompt = `You are a salary negotiation coach. Generate personalized, confident talking points that highlight value and achievements. 
    Focus on specific accomplishments, market data, and mutual benefit. Keep each point concise and actionable.`;

    const userPrompt = `Generate 5-7 personalized talking points for salary negotiation:

Candidate Profile:
- Name: ${profile.name}
- Current Role: ${profile.jobTitle || "N/A"}
- Experience: ${profile.experience} years
- Recent Roles: ${experience.recentJobs.map((j) => `${j.title} at ${j.company} (${j.duration})`).join(", ")}
- Top Skills: ${experience.topSkills.join(", ")}

Negotiation Context:
- Role: ${negotiation.role} at ${negotiation.company}
- Location: ${negotiation.location}
- Initial Offer: $${negotiation.initialOffer?.totalCompensation?.toLocaleString() || "N/A"}
- Target: $${negotiation.targetCompensation?.totalCompensation?.toLocaleString() || "N/A"}
- Market Data: ${negotiation.marketData ? `50th percentile: $${negotiation.marketData.percentile50?.toLocaleString()}, 75th percentile: $${negotiation.marketData.percentile75?.toLocaleString()}` : "Not available"}

Generate talking points that:
1. Highlight specific achievements and value delivered
2. Reference market data appropriately
3. Are confident but not aggressive
4. Focus on mutual benefit
5. Include specific examples from their experience

Return as JSON array:
[
  {
    "id": "unique-id",
    "point": "Specific talking point text",
    "rationale": "Why this point is effective",
    "category": "experience" | "achievement" | "market" | "value"
  }
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }

      // Ensure it's an array and add IDs if missing
      const points = Array.isArray(parsed) ? parsed : [parsed];
      return points.map((p, idx) => ({
        id: p.id || `tp-${Date.now()}-${idx}`,
        point: p.point || "",
        rationale: p.rationale || "",
        category: p.category || "value",
      }));
    } catch (error) {
      console.error("❌ Error in AI talking points generation:", error);
      throw error;
    }
  }

  generateTalkingPointsFallback(context) {
    const { profile, negotiation } = context;
    return [
      {
        id: "tp-fallback-1",
        point: `I've successfully delivered [specific achievement] in my ${profile.experience} years of experience, which directly aligns with the needs of this role.`,
        rationale: "Highlights experience and value alignment",
        category: "experience",
      },
      {
        id: "tp-fallback-2",
        point: `Based on market research for ${negotiation.role} positions in ${negotiation.location}, the 75th percentile is around $${negotiation.marketData?.percentile75?.toLocaleString() || "market rate"}.`,
        rationale: "References market data to support negotiation",
        category: "market",
      },
      {
        id: "tp-fallback-3",
        point: `I'm excited about the opportunity to contribute to ${negotiation.company} and believe my background makes me a strong fit for this role.`,
        rationale: "Expresses enthusiasm and fit",
        category: "value",
      },
    ];
  }

  // Generate negotiation scripts
  async generateNegotiationScript(negotiationId, userId, scenario, options = {}) {
    try {
      const { forceRegenerate = false } = options;

      // Check for existing scripts
      if (!forceRegenerate) {
        const negotiation = await salaryNegotiationService.getNegotiationById(
          negotiationId,
          userId
        );
        if (negotiation?.scripts?.[scenario]) {
          console.log(`✅ Returning cached script for scenario ${scenario}`);
          return negotiation.scripts[scenario];
        }
      }

      const context = await this.buildContext(negotiationId, userId);

      if (this.openai) {
        try {
          const script = await this.generateScriptWithAI(context, scenario);
          if (script) {
            // Save to negotiation
            const negotiation = await salaryNegotiationService.getNegotiationById(
              negotiationId,
              userId
            );
            const existingScripts = negotiation?.scripts || {};
            existingScripts[scenario] = script;

            await salaryNegotiationService.updateNegotiation(negotiationId, userId, {
              scripts: JSON.stringify(existingScripts),
            });

            return script;
          }
        } catch (error) {
          console.warn(
            "[SalaryNegotiationAIService] AI script generation failed, using fallback:",
            error.message
          );
        }
      }

      return this.generateScriptFallback(context, scenario);
    } catch (error) {
      console.error("❌ Error generating negotiation script:", error);
      throw error;
    }
  }

  async generateScriptWithAI(context, scenario) {
    const { profile, negotiation } = context;

    const scenarioPrompts = {
      initial_negotiation: "initial salary negotiation call or email",
      counteroffer_response: "responding to a counteroffer from the employer",
      benefits_negotiation: "negotiating additional benefits or perks",
      timing_discussion: "discussing the timing of the negotiation",
      objection_handling: "handling common objections like 'we don't negotiate' or 'that's our best offer'",
    };

    const systemPrompt = `You are a salary negotiation coach. Generate practical, confident scripts for salary negotiations. 
    Include opening statements, key phrases, responses to objections, and closing statements.`;

    const userPrompt = `Generate a negotiation script for ${scenarioPrompts[scenario] || scenario}:

Context:
- Candidate: ${profile.name}
- Role: ${negotiation.role} at ${negotiation.company}
- Initial Offer: $${negotiation.initialOffer?.totalCompensation?.toLocaleString() || "N/A"}
- Target: $${negotiation.targetCompensation?.totalCompensation?.toLocaleString() || "N/A"}

Include:
1. Opening statement
2. Key phrases to use
3. Responses to common objections (if applicable)
4. Closing statement

Return as JSON:
{
  "scenario": "${scenario}",
  "script": "Full script text...",
  "keyPhrases": ["phrase1", "phrase2", ...],
  "commonObjections": [
    {
      "objection": "objection text",
      "response": "response text"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }

      return {
        scenario: parsed.scenario || scenario,
        script: parsed.script || "",
        keyPhrases: parsed.keyPhrases || [],
        commonObjections: parsed.commonObjections || [],
      };
    } catch (error) {
      console.error("❌ Error in AI script generation:", error);
      throw error;
    }
  }

  generateScriptFallback(context, scenario) {
    const { negotiation } = context;
    return {
      scenario,
      script: `Thank you for the offer for the ${negotiation.role} position at ${negotiation.company}. I'm very excited about this opportunity.

Based on my experience and market research for similar roles in ${negotiation.location}, I was hoping we could discuss a compensation package of $${context.negotiation.targetCompensation?.totalCompensation?.toLocaleString() || "target amount"}.

I believe this reflects the value I can bring to the team and aligns with market rates for this position. I'm open to discussing the breakdown between base salary, bonus, and equity.

Thank you for your consideration, and I look forward to continuing the conversation.`,
      keyPhrases: [
        "I'm very excited about this opportunity",
        "Based on my experience and market research",
        "I believe this reflects the value I can bring",
        "I'm open to discussing the breakdown",
      ],
      commonObjections: [
        {
          objection: "We don't negotiate salaries",
          response: "I understand your policy. Could we discuss other aspects of the compensation package, such as equity, bonus structure, or additional benefits?",
        },
        {
          objection: "That's our best offer",
          response: "I appreciate that. Could you help me understand how this offer was determined? I'd like to ensure we're aligned on the value I bring to the role.",
        },
      ],
    };
  }

  // Evaluate counteroffer
  async evaluateCounteroffer(negotiationId, userId, counterofferData) {
    try {
      const negotiation = await salaryNegotiationService.getNegotiationById(
        negotiationId,
        userId
      );
      if (!negotiation) {
        throw new Error("Negotiation not found");
      }

      const counterofferTotal = salaryNegotiationService.calculateTotalCompensation(
        counterofferData
      );
      const targetTotal = negotiation.targetCompensation?.totalCompensation || 0;
      const initialTotal = negotiation.initialOffer?.totalCompensation || 0;

      const comparison = salaryMarketResearchService.compareOfferToMarket(
        counterofferTotal,
        negotiation.marketSalaryData
      );

      const differenceFromTarget = counterofferTotal - targetTotal;
      const percentFromTarget = targetTotal > 0
        ? ((differenceFromTarget / targetTotal) * 100).toFixed(1)
        : 0;

      const improvementFromInitial = counterofferTotal - initialTotal;
      const percentImprovement = initialTotal > 0
        ? ((improvementFromInitial / initialTotal) * 100).toFixed(1)
        : 0;

      let recommendation = "";
      if (counterofferTotal >= targetTotal) {
        recommendation = "This counteroffer meets or exceeds your target. Consider accepting or negotiating for additional benefits.";
      } else if (counterofferTotal >= targetTotal * 0.95) {
        recommendation = "This counteroffer is very close to your target. You may want to accept or negotiate for a small increase or additional benefits.";
      } else if (counterofferTotal > initialTotal) {
        recommendation = "This counteroffer is an improvement but below your target. Consider negotiating further or accepting if other factors (benefits, growth opportunity) are strong.";
      } else {
        recommendation = "This counteroffer is below your initial offer. This is unusual - verify the details and consider declining or renegotiating.";
      }

      return {
        counterofferTotal,
        targetTotal,
        initialTotal,
        differenceFromTarget,
        percentFromTarget: parseFloat(percentFromTarget),
        improvementFromInitial,
        percentImprovement: parseFloat(percentImprovement),
        marketComparison: comparison,
        recommendation,
      };
    } catch (error) {
      console.error("❌ Error evaluating counteroffer:", error);
      throw error;
    }
  }

  // Generate timing strategy
  async generateTimingStrategy(negotiationId, userId) {
    try {
      const negotiation = await salaryNegotiationService.getNegotiationById(
        negotiationId,
        userId
      );
      if (!negotiation) {
        throw new Error("Negotiation not found");
      }

      const offerDate = negotiation.initialOffer?.date
        ? new Date(negotiation.initialOffer.date)
        : new Date();
      const daysSinceOffer = Math.floor(
        (new Date() - offerDate) / (1000 * 60 * 60 * 24)
      );

      let strategy = {
        whenToNegotiate: "",
        whenToRespond: "",
        timeline: [],
        tips: [],
      };

      if (daysSinceOffer < 1) {
        strategy.whenToNegotiate = "Wait 1-2 days before responding to show you've thoughtfully considered the offer.";
        strategy.whenToRespond = "Respond within 2-3 days to maintain momentum.";
        strategy.timeline = [
          "Day 1: Review offer thoroughly, research market data",
          "Day 2: Prepare talking points and scripts",
          "Day 3: Send negotiation response",
        ];
      } else if (daysSinceOffer < 3) {
        strategy.whenToNegotiate = "Now is a good time to respond. You've had time to consider the offer.";
        strategy.whenToRespond = "Respond within the next 1-2 days to keep the process moving.";
        strategy.timeline = [
          "Today: Finalize your negotiation approach",
          "Tomorrow: Send negotiation response",
        ];
      } else if (daysSinceOffer < 7) {
        strategy.whenToNegotiate = "Respond soon - you're approaching the typical response window.";
        strategy.whenToRespond = "Respond within 24-48 hours to avoid appearing disinterested.";
        strategy.timeline = ["Today: Send negotiation response ASAP"];
      } else {
        strategy.whenToNegotiate = "Respond immediately - you've waited longer than typical.";
        strategy.whenToRespond = "Respond today to maintain professionalism.";
        strategy.timeline = ["Today: Send negotiation response immediately"];
      }

      strategy.tips = [
        "Avoid negotiating on Fridays or before holidays",
        "Best days: Tuesday-Thursday, morning or early afternoon",
        "If they gave a deadline, respond 1-2 days before it",
        "Be respectful of their timeline while advocating for yourself",
      ];

      return strategy;
    } catch (error) {
      console.error("❌ Error generating timing strategy:", error);
      throw error;
    }
  }
}

export default new SalaryNegotiationAIService();

