import OpenAI from "openai";
import database from "./database.js";
import profileService from "./profileService.js";

class WritingAIService {
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

  // Analyze clarity
  async analyzeClarity(response, context = {}) {
    if (!response || response.trim().length === 0) {
      return {
        score: 0,
        feedback: "No response provided for analysis.",
      };
    }

    if (this.openai) {
      try {
        return await this.analyzeClarityWithAI(response, context);
      } catch (error) {
        console.warn("[WritingAIService] AI clarity analysis failed, using fallback:", error.message);
      }
    }

    return this.analyzeClarityFallback(response);
  }

  // Analyze professionalism
  async analyzeProfessionalism(response, context = {}) {
    if (!response || response.trim().length === 0) {
      return {
        score: 0,
        feedback: "No response provided for analysis.",
      };
    }

    if (this.openai) {
      try {
        return await this.analyzeProfessionalismWithAI(response, context);
      } catch (error) {
        console.warn("[WritingAIService] AI professionalism analysis failed, using fallback:", error.message);
      }
    }

    return this.analyzeProfessionalismFallback(response);
  }

  // Analyze structure
  async analyzeStructure(response, context = {}) {
    if (!response || response.trim().length === 0) {
      return {
        score: 0,
        feedback: "No response provided for analysis.",
      };
    }

    if (this.openai) {
      try {
        return await this.analyzeStructureWithAI(response, context);
      } catch (error) {
        console.warn("[WritingAIService] AI structure analysis failed, using fallback:", error.message);
      }
    }

    return this.analyzeStructureFallback(response);
  }

  // Analyze storytelling
  async analyzeStorytelling(response, context = {}) {
    if (!response || response.trim().length === 0) {
      return {
        score: 0,
        feedback: "No response provided for analysis.",
      };
    }

    if (this.openai) {
      try {
        return await this.analyzeStorytellingWithAI(response, context);
      } catch (error) {
        console.warn("[WritingAIService] AI storytelling analysis failed, using fallback:", error.message);
      }
    }

    return this.analyzeStorytellingFallback(response);
  }

  // Generate comprehensive feedback
  async generateFeedback(response, prompt, userId) {
    try {
      // Get user profile for context
      let profile = null;
      try {
        profile = await profileService.getProfileByUserId(userId);
      } catch (e) {
        console.warn("Could not fetch profile for feedback context");
      }

      const context = {
        profile,
        prompt,
        response,
      };

      // Analyze all dimensions
      const [clarity, professionalism, structure, storytelling] = await Promise.all([
        this.analyzeClarity(response, context),
        this.analyzeProfessionalism(response, context),
        this.analyzeStructure(response, context),
        this.analyzeStorytelling(response, context),
      ]);

      // Calculate overall score
      const overallScore = Math.round(
        (clarity.score + professionalism.score + structure.score + storytelling.score) / 4
      );

      // Generate improvements and tips
      const improvements = await this.generateImprovements(response, {
        clarity,
        professionalism,
        structure,
        storytelling,
      });

      const tips = await this.generateTips(userId, {
        clarity,
        professionalism,
        structure,
        storytelling,
      });

      // Identify strengths
      const strengths = this.identifyStrengths({
        clarity,
        professionalism,
        structure,
        storytelling,
      });

      return {
        clarityScore: clarity.score,
        professionalismScore: professionalism.score,
        structureScore: structure.score,
        storytellingScore: storytelling.score,
        overallScore,
        clarityFeedback: clarity.feedback,
        professionalismFeedback: professionalism.feedback,
        structureFeedback: structure.feedback,
        storytellingFeedback: storytelling.feedback,
        strengths,
        improvements,
        tips,
        generatedBy: this.openai ? "openai" : "fallback",
      };
    } catch (error) {
      console.error("❌ Error generating feedback:", error);
      throw error;
    }
  }

  // AI-powered clarity analysis
  async analyzeClarityWithAI(response, context) {
    const systemPrompt = `You are a communication expert. Analyze the clarity and readability of written responses.
    Evaluate sentence structure, word choice, and overall readability. Provide a score from 1-10 and specific feedback.`;

    const userPrompt = `Analyze the clarity of this response:

Response: "${response}"

Provide:
1. A score from 1-10 (10 = extremely clear, 1 = very unclear)
2. Specific feedback on clarity, sentence structure, and word choice
3. Examples of what could be improved

Return as JSON:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback text>"
}`;

    const response_ai = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = response_ai.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    return {
      score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
      feedback: parsed.feedback || "Clarity analysis completed.",
    };
  }

  // AI-powered professionalism analysis
  async analyzeProfessionalismWithAI(response, context) {
    const systemPrompt = `You are a professional communication expert. Analyze the professionalism and tone of written responses.
    Evaluate formality, appropriateness, and industry standards. Provide a score from 1-10 and specific feedback.`;

    const userPrompt = `Analyze the professionalism of this response:

Response: "${response}"

Provide:
1. A score from 1-10 (10 = highly professional, 1 = unprofessional)
2. Specific feedback on tone, formality, and appropriateness

Return as JSON:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback text>"
}`;

    const response_ai = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = response_ai.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    return {
      score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
      feedback: parsed.feedback || "Professionalism analysis completed.",
    };
  }

  // AI-powered structure analysis
  async analyzeStructureWithAI(response, context) {
    const systemPrompt = `You are a writing coach. Analyze the structure and organization of written responses.
    Evaluate use of STAR method, logical flow, and paragraph organization. Provide a score from 1-10 and specific feedback.`;

    const userPrompt = `Analyze the structure of this response:

Response: "${response}"

Provide:
1. A score from 1-10 (10 = excellent structure, 1 = poor structure)
2. Specific feedback on organization, flow, and structure (STAR method if applicable)

Return as JSON:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback text>"
}`;

    const response_ai = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = response_ai.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    return {
      score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
      feedback: parsed.feedback || "Structure analysis completed.",
    };
  }

  // AI-powered storytelling analysis
  async analyzeStorytellingWithAI(response, context) {
    const systemPrompt = `You are a storytelling expert. Analyze the engagement and memorability of written responses.
    Evaluate narrative effectiveness, impact, and engagement level. Provide a score from 1-10 and specific feedback.`;

    const userPrompt = `Analyze the storytelling effectiveness of this response:

Response: "${response}"

Provide:
1. A score from 1-10 (10 = highly engaging and memorable, 1 = not engaging)
2. Specific feedback on narrative, engagement, and memorability

Return as JSON:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback text>"
}`;

    const response_ai = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = response_ai.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    return {
      score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
      feedback: parsed.feedback || "Storytelling analysis completed.",
    };
  }

  // Generate improvements
  async generateImprovements(response, feedback) {
    if (this.openai) {
      try {
        const systemPrompt = `You are a writing coach. Generate specific, actionable improvement suggestions.`;

        const userPrompt = `Based on this feedback analysis, provide 3-5 specific, actionable improvement suggestions:

Clarity: ${feedback.clarity.feedback}
Professionalism: ${feedback.professionalism.feedback}
Structure: ${feedback.structure.feedback}
Storytelling: ${feedback.storytelling.feedback}

Return as JSON array:
["suggestion 1", "suggestion 2", "suggestion 3"]`;

        const response_ai = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 400,
        });

        const raw = response_ai.choices[0]?.message?.content || "";
        const parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn("AI improvement generation failed, using fallback");
      }
    }

    return this.generateImprovementsFallback(feedback);
  }

  // Generate tips
  async generateTips(userId, feedback) {
    if (this.openai) {
      try {
        const systemPrompt = `You are a writing coach. Generate personalized tips for improvement.`;

        const userPrompt = `Based on this feedback, provide 2-3 personalized tips:

Clarity Score: ${feedback.clarity.score}/10
Professionalism Score: ${feedback.professionalism.score}/10
Structure Score: ${feedback.structure.score}/10
Storytelling Score: ${feedback.storytelling.score}/10

Return as JSON array:
["tip 1", "tip 2", "tip 3"]`;

        const response_ai = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 300,
        });

        const raw = response_ai.choices[0]?.message?.content || "";
        const parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn("AI tips generation failed, using fallback");
      }
    }

    return this.generateTipsFallback(feedback);
  }

  // Identify strengths
  identifyStrengths(feedback) {
    const strengths = [];
    if (feedback.clarity.score >= 8) strengths.push("Clear and readable communication");
    if (feedback.professionalism.score >= 8) strengths.push("Professional tone and language");
    if (feedback.structure.score >= 8) strengths.push("Well-organized structure");
    if (feedback.storytelling.score >= 8) strengths.push("Engaging storytelling");
    if (strengths.length === 0) strengths.push("Good effort - keep practicing!");
    return strengths;
  }

  // Fallback methods
  analyzeClarityFallback(response) {
    const wordCount = response.split(/\s+/).length;
    const avgSentenceLength = response.split(/[.!?]+/).filter(s => s.trim()).length > 0
      ? wordCount / response.split(/[.!?]+/).filter(s => s.trim()).length
      : 0;

    let score = 7;
    if (avgSentenceLength > 25) score -= 2;
    if (avgSentenceLength < 10) score -= 1;
    if (wordCount < 50) score -= 1;

    return {
      score: Math.max(1, Math.min(10, score)),
      feedback: `Your response has ${wordCount} words with an average sentence length of ${avgSentenceLength.toFixed(1)} words. Aim for sentences between 15-20 words for optimal clarity.`,
    };
  }

  analyzeProfessionalismFallback(response) {
    const hasProfessionalLanguage = !/\b(like|um|uh|yeah|gonna|wanna)\b/i.test(response);
    const hasProperCapitalization = /^[A-Z]/.test(response.trim());
    
    let score = 6;
    if (hasProfessionalLanguage) score += 2;
    if (hasProperCapitalization) score += 1;

    return {
      score: Math.max(1, Math.min(10, score)),
      feedback: "Use professional language and proper capitalization. Avoid casual expressions in professional contexts.",
    };
  }

  analyzeStructureFallback(response) {
    const paragraphs = response.split(/\n\n+/).filter(p => p.trim());
    const hasStructure = paragraphs.length >= 2;
    
    let score = 6;
    if (hasStructure) score += 2;

    return {
      score: Math.max(1, Math.min(10, score)),
      feedback: "Consider using the STAR method (Situation, Task, Action, Result) to structure your responses. Break your response into clear paragraphs.",
    };
  }

  analyzeStorytellingFallback(response) {
    const hasSpecificDetails = /\d+|[A-Z][a-z]+ (?:at|in|for|with)/.test(response);
    
    let score = 6;
    if (hasSpecificDetails) score += 2;

    return {
      score: Math.max(1, Math.min(10, score)),
      feedback: "Include specific details, numbers, and concrete examples to make your response more engaging and memorable.",
    };
  }

  generateImprovementsFallback(feedback) {
    const improvements = [];
    if (feedback.clarity.score < 7) improvements.push("Work on sentence clarity and word choice");
    if (feedback.professionalism.score < 7) improvements.push("Enhance professional tone and language");
    if (feedback.structure.score < 7) improvements.push("Improve response structure and organization");
    if (feedback.storytelling.score < 7) improvements.push("Add more engaging details and examples");
    return improvements.length > 0 ? improvements : ["Continue practicing to refine your responses"];
  }

  generateTipsFallback(feedback) {
    return [
      "Practice writing responses regularly to improve",
      "Review your responses before submitting",
      "Use the STAR method for structured answers",
    ];
  }

  // Compare two responses
  async compareResponses(response1, response2, feedback1, feedback2) {
    const comparison = {
      clarity: {
        score1: feedback1.clarityScore,
        score2: feedback2.clarityScore,
        improvement: feedback2.clarityScore - feedback1.clarityScore,
      },
      professionalism: {
        score1: feedback1.professionalismScore,
        score2: feedback2.professionalismScore,
        improvement: feedback2.professionalismScore - feedback1.professionalismScore,
      },
      structure: {
        score1: feedback1.structureScore,
        score2: feedback2.structureScore,
        improvement: feedback2.structureScore - feedback1.structureScore,
      },
      storytelling: {
        score1: feedback1.storytellingScore,
        score2: feedback2.storytellingScore,
        improvement: feedback2.storytellingScore - feedback1.storytellingScore,
      },
      overall: {
        score1: feedback1.overallScore,
        score2: feedback2.overallScore,
        improvement: feedback2.overallScore - feedback1.overallScore,
      },
    };

    return comparison;
  }
}

export default new WritingAIService();

