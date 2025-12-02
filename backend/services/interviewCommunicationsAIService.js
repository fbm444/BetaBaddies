import OpenAI from "openai";
import profileService from "./profileService.js";
import database from "./database.js";

class InterviewCommunicationsAIService {
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

  // Build shared context from profile, interview, and job opportunity
  async buildContext(interviewId, userId) {
    const interviewQuery = `
      SELECT 
        i.*,
        jo.title       AS job_title,
        jo.company     AS company,
        jo.industry    AS industry,
        p.first_name,
        p.last_name,
        p.job_title    AS profile_job_title
      FROM interviews i
      LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
      LEFT JOIN profiles p ON i.user_id = p.user_id
      WHERE i.id = $1 AND i.user_id = $2
    `;

    const result = await database.query(interviewQuery, [interviewId, userId]);
    if (result.rows.length === 0) {
      throw new Error("Interview not found");
    }

    const row = result.rows[0];

    let profile = null;
    try {
      profile = await profileService.getProfileByUserId(userId);
    } catch {
      profile = null;
    }

    const fullName =
      (row.first_name && row.last_name && `${row.first_name} ${row.last_name}`) ||
      profile?.fullName ||
      null;

    const interviewDate = row.scheduled_at ? new Date(row.scheduled_at) : null;

    return {
      profile: {
        name: fullName,
        jobTitle: row.profile_job_title || profile?.job_title || null,
      },
      job: {
        title: row.job_title || row.title || null,
        company: row.company || null,
        industry: row.industry || null,
      },
      interview: {
        id: row.id,
        type: row.type,
        date: interviewDate,
        notes: row.notes || "",
        interviewerName: row.interviewer_name || null,
        interviewerEmail: row.interviewer_email || null,
      },
    };
  }

  // ---------- Thank-you note generation ----------

  async generateThankYouDraft(interviewId, userId, options = {}) {
    const { templateStyle = "standard" } = options;
    const context = await this.buildContext(interviewId, userId);

    // Try AI first if available
    if (this.openai) {
      try {
        const draft = await this.generateThankYouWithAI(context, templateStyle);
        if (draft?.subject && draft?.body) {
          return { ...draft, generatedBy: "openai" };
        }
      } catch (error) {
        console.warn(
          "[InterviewCommunicationsAIService] OpenAI thank-you generation failed, using fallback:",
          error.message
        );
      }
    }

    // Fallback template
    const fallback = this.generateThankYouFallback(context, templateStyle);
    return { ...fallback, generatedBy: "fallback" };
  }

  async generateThankYouWithAI(context, templateStyle) {
    const interviewDateStr = context.interview.date
      ? context.interview.date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "recently";

    const systemPrompt =
      "You are a professional career coach who writes concise, warm, and professional thank-you emails after job interviews. " +
      "Always keep the email to 2–4 short paragraphs, and avoid inventing specific facts that are not in the context. " +
      "You can adapt tone and length slightly based on the requested template style.";

    const userPrompt = `
Interview context:
- Candidate name: ${context.profile.name || "Candidate"}
- Candidate role/title: ${context.profile.jobTitle || "N/A"}
- Role interviewed for: ${context.job.title || "N/A"}
- Company: ${context.job.company || "N/A"}
- Interview type: ${context.interview.type || "N/A"}
- Interview date: ${interviewDateStr}
- Interviewer name: ${context.interview.interviewerName || "Interviewer"}
- Interview notes (may be partial): ${context.interview.notes || "N/A"}

Task:
Write a short, polished thank-you email from the candidate to the interviewer.
It should:
- Thank them for their time on the specified date.
- Reference the role and company.
- Briefly mention interest in the role and fit.
- Optionally reference 1–2 high-level topics from the notes, without fabricating details.
- End with a polite closing and the candidate's name.

Template style to use (if mentioned):
- "standard": neutral, professional, balanced length.
- "enthusiastic": slightly warmer and more expressive about excitement for the role.
- "concise": shorter, very direct and to the point (1–2 short paragraphs).
Requested style: ${templateStyle}

Return a JSON object with:
{
  "subject": "string",
  "body": "string"
}
Do not include any additional commentary.
`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to recover JSON block if the model wrapped it
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI JSON for thank-you note");
      }
    }

    return {
      subject: parsed.subject || `Thank You - ${context.job.title || "Interview"} at ${context.job.company || ""}`.trim(),
      body: parsed.body || "",
    };
  }

  generateThankYouFallback(context, templateStyle) {
    const name = context.interview.interviewerName || "Interviewer";
    const candidate = context.profile.name || "Candidate";
    const company = context.job.company || "your company";
    const role = context.job.title || "the role";

    const dateStr = context.interview.date
      ? context.interview.date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "recently";

    let body = `Dear ${name},\n\n`;

    // Standard base text
    if (templateStyle === "concise") {
      body += `Thank you for speaking with me on ${dateStr} about the ${role} position at ${company}. `;
      body += `I appreciated the chance to learn more about the team and remain very interested in the role.\n\n`;
      body += `Please let me know if you need any additional information from me.\n\n`;
      body += `Best regards,\n${candidate}`;
    } else {
      body += `Thank you for taking the time to speak with me on ${dateStr} about the ${role} position at ${company}. `;
      body += `I appreciated learning more about the team and how this role contributes to ${company}'s work.\n\n`;

      if (context.interview.notes) {
        const snippet = context.interview.notes.split(" ").slice(0, 12).join(" ");
        body += `Our discussion about ${snippet}... was especially insightful and reinforced my excitement about this opportunity.\n\n`;
      }

      if (templateStyle === "enthusiastic") {
        body += `I am genuinely excited about the possibility of joining ${company} and contributing to the team's goals. `;
        body += `I believe my background and experience align strongly with what you're looking for in this role.\n\n`;
      } else {
        body += `I am very interested in the opportunity to contribute to ${company} and believe my background and experience align well with the needs of the role.\n\n`;
      }

      body += `Please let me know if I can provide any additional information. I look forward to hearing from you.\n\n`;
      body += `Best regards,\n${candidate}`;
    }

    const subject = `Thank You - ${role} at ${company}`;

    return { subject, body };
  }

  // ---------- Follow-up email drafts ----------

  async generateFollowUpDraft(interviewId, userId, action) {
    const context = await this.buildContext(interviewId, userId);

    if (this.openai) {
      try {
        const draft = await this.generateFollowUpWithAI(context, action);
        if (draft?.subject && draft?.body) {
          return { ...draft, generatedBy: "openai" };
        }
      } catch (error) {
        console.warn(
          "[InterviewCommunicationsAIService] OpenAI follow-up generation failed, using fallback:",
          error.message
        );
      }
    }

    const fallback = this.generateFollowUpFallback(context, action);
    return { ...fallback, generatedBy: "fallback" };
  }

  async generateFollowUpWithAI(context, action) {
    const interviewDateStr = context.interview.date
      ? context.interview.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "the interview date";

    const systemPrompt =
      "You are a professional career coach writing concise, polite follow-up emails after job interviews. " +
      "Emails should be 2–3 short paragraphs and should never pressure the recipient.";

    const userPrompt = `
Interview context:
- Candidate name: ${context.profile.name || "Candidate"}
- Role interviewed for: ${context.job.title || "N/A"}
- Company: ${context.job.company || "N/A"}
- Interview date: ${interviewDateStr}
- Interviewer name: ${context.interview.interviewerName || "Hiring Manager"}

Follow-up action:
- Type: ${action.action_type}
- Due date: ${action.due_date || "N/A"}
- Notes: ${action.notes || "N/A"}

Task:
Write a short, professional email appropriate for this follow-up type.
For "follow_up_email" or "status_inquiry", the goal is to check in on status while staying warm and respectful.
For "thank_you_note", express gratitude similar to a standard thank-you email.

Return a JSON object with:
{
  "subject": "string",
  "body": "string"
}
`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
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
        throw new Error("Failed to parse AI JSON for follow-up email");
      }
    }

    return {
      subject:
        parsed.subject ||
        this.buildDefaultFollowUpSubject(context, action.action_type),
      body: parsed.body || "",
    };
  }

  buildDefaultFollowUpSubject(context, actionType) {
    const role = context.job.title || "Interview";
    const company = context.job.company || "";
    if (actionType === "thank_you_note") {
      return `Thank You - ${role} at ${company}`.trim();
    }
    if (actionType === "status_inquiry") {
      return `Interview Status - ${role} at ${company}`.trim();
    }
    if (actionType === "feedback_request") {
      return `Feedback Request - ${role} Interview`.trim();
    }
    if (actionType === "networking_follow_up") {
      return `Staying in Touch - ${company}`.trim();
    }
    return `Following Up on ${role} Interview`.trim();
  }

  generateFollowUpFallback(context, action) {
    const candidate = context.profile.name || "Candidate";
    const company = context.job.company || "your company";
    const role = context.job.title || "the role";
    const interviewer = context.interview.interviewerName || "Hiring Manager";

    const subject = this.buildDefaultFollowUpSubject(context, action.action_type);

    let body = `Dear ${interviewer},\n\n`;

    if (action.action_type === "thank_you_note") {
      body += `Thank you again for speaking with me about the ${role} position at ${company}. `;
      body += `I appreciated the opportunity to learn more about the role and team, and I remain very interested in the position.\n\n`;
      body += `Please let me know if there is any additional information I can provide. I look forward to hearing from you.\n\n`;
      body += `Best regards,\n${candidate}`;
      return { subject, body };
    }

    if (action.action_type === "status_inquiry") {
      body += `I hope you're doing well. I wanted to kindly check in regarding the ${role} position at ${company}, `;
      body += `for which we spoke on ${context.interview.date?.toLocaleDateString("en-US") || "a recent date"}. `;
      body += `I'm still very interested in the opportunity and would appreciate any updates you can share on the hiring timeline.\n\n`;
      body += `Thank you again for your time and consideration.\n\n`;
      body += `Best regards,\n${candidate}`;
      return { subject, body };
    }

    if (action.action_type === "feedback_request") {
      body += `Thank you again for the opportunity to interview for the ${role} position at ${company}. `;
      body += `While I understand that I was not selected to move forward, I would really appreciate any feedback you might be able to share about my interview or candidacy.\n\n`;
      body += `Even a few brief points on what I could improve would be very helpful as I continue my search and work on my skills.\n\n`;
      body += `Thank you again for your time and consideration.\n\n`;
      body += `Best regards,\n${candidate}`;
      return { subject, body };
    }

    if (action.action_type === "networking_follow_up") {
      body += `Thank you again for speaking with me about the ${role} position at ${company}. `;
      body += `Although I understand the team has decided to move in a different direction for this role, I enjoyed our conversation and remain very interested in ${company}'s work.\n\n`;
      body += `If any future opportunities arise that you feel may be a good fit, I would be grateful to stay in touch and be considered. `;
      body += `In the meantime, please don't hesitate to reach out if I can ever be helpful from my side.\n\n`;
      body += `Best regards,\n${candidate}`;
      return { subject, body };
    }

    // Generic follow-up email
    body += `I hope you're doing well. I wanted to follow up on the ${role} position at ${company}. `;
    body += `I enjoyed our conversation and remain excited about the possibility of joining the team.\n\n`;
    body += `If you need any additional information from me, please let me know. I look forward to hearing from you.\n\n`;
    body += `Best regards,\n${candidate}`;

    return { subject, body };
  }
}

export default new InterviewCommunicationsAIService();


