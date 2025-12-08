/**
 * Client-Side DOCX Export Utility
 * Generates DOCX files directly in the browser without server involvement
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

interface ResumeData {
  content: {
    personalInfo: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedIn?: string;
      portfolio?: string;
    };
    summary?: string;
    experience?: Array<{
      title?: string;
      company?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      achievements?: string[];
    }>;
    education?: Array<{
      school?: string;
      degree?: string;
      field?: string;
      gpa?: string;
      startDate?: string;
      endDate?: string;
      honors?: string;
    }>;
    skills?: Array<{
      name?: string;
      proficiency?: string;
      category?: string;
    }>;
    projects?: Array<{
      name?: string;
      description?: string;
      technologies?: string[];
      link?: string;
    }>;
    certifications?: Array<{
      name?: string;
      organization?: string;
      dateEarned?: string;
    }>;
  };
}

interface CoverLetterData {
  content: {
    recipientName?: string;
    recipientTitle?: string;
    company?: string;
    body?: string;
    closing?: string;
  };
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Export resume to DOCX format
 */
export async function exportResumeToDOCX(
  resumeData: ResumeData,
  filename: string
): Promise<void> {
  const { personalInfo, summary, experience, education, skills, projects, certifications } =
    resumeData.content;

  const children: (Paragraph | Table)[] = [];

  // Header: Name
  if (personalInfo?.firstName || personalInfo?.lastName) {
    children.push(
      new Paragraph({
        text: `${personalInfo.firstName || ""} ${personalInfo.lastName || ""}`.trim(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Contact Information
  const contactInfo: string[] = [];
  if (personalInfo?.email) contactInfo.push(personalInfo.email);
  if (personalInfo?.phone) contactInfo.push(personalInfo.phone);
  if (personalInfo?.location) contactInfo.push(personalInfo.location);
  if (personalInfo?.linkedIn) contactInfo.push(`LinkedIn: ${personalInfo.linkedIn}`);
  if (personalInfo?.portfolio) contactInfo.push(`Portfolio: ${personalInfo.portfolio}`);

  if (contactInfo.length > 0) {
    children.push(
      new Paragraph({
        text: contactInfo.join(" | "),
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Summary
  if (summary) {
    children.push(
      new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );
    children.push(
      new Paragraph({
        text: summary,
        spacing: { after: 400 },
      })
    );
  }

  // Experience
  if (experience && experience.length > 0) {
    children.push(
      new Paragraph({
        text: "Experience",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    experience.forEach((exp) => {
      // Job title and company
      const titleCompany = [
        exp.title,
        exp.company ? `at ${exp.company}` : null,
        exp.location ? `(${exp.location})` : null,
      ]
        .filter(Boolean)
        .join(" ");

      if (titleCompany) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: titleCompany, bold: true }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      // Dates
      if (exp.startDate || exp.endDate) {
        const dateRange = [
          exp.startDate,
          exp.endDate || "Present",
        ]
          .filter(Boolean)
          .join(" - ");

        children.push(
          new Paragraph({
            text: dateRange,
            italics: true,
            spacing: { after: 100 },
          })
        );
      }

      // Description
      if (exp.description) {
        children.push(
          new Paragraph({
            text: exp.description,
            spacing: { after: 200 },
          })
        );
      }

      // Achievements
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach((achievement) => {
          children.push(
            new Paragraph({
              text: `• ${achievement}`,
              spacing: { after: 100 },
            })
          );
        });
      }
    });
  }

  // Education
  if (education && education.length > 0) {
    children.push(
      new Paragraph({
        text: "Education",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    education.forEach((edu) => {
      const eduInfo = [
        edu.degree,
        edu.field ? `in ${edu.field}` : null,
        edu.school ? `from ${edu.school}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      if (eduInfo) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: eduInfo, bold: true }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (edu.startDate || edu.endDate) {
        const dateRange = [
          edu.startDate,
          edu.endDate || "Present",
        ]
          .filter(Boolean)
          .join(" - ");

        children.push(
          new Paragraph({
            text: dateRange,
            italics: true,
            spacing: { after: 100 },
          })
        );
      }

      if (edu.gpa) {
        children.push(
          new Paragraph({
            text: `GPA: ${edu.gpa}`,
            spacing: { after: 100 },
          })
        );
      }

      if (edu.honors) {
        children.push(
          new Paragraph({
            text: `Honors: ${edu.honors}`,
            spacing: { after: 200 },
          })
        );
      }
    });
  }

  // Skills
  if (skills && skills.length > 0) {
    children.push(
      new Paragraph({
        text: "Skills",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    // Group skills by category if available
    const skillsByCategory = skills.reduce((acc, skill) => {
      const category = skill.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill.name || "");
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(skillsByCategory).forEach(([category, skillNames]) => {
      if (Object.keys(skillsByCategory).length > 1) {
        children.push(
          new Paragraph({
            text: category,
            bold: true,
            spacing: { after: 100 },
          })
        );
      }
      children.push(
        new Paragraph({
          text: skillNames.join(", "),
          spacing: { after: 200 },
        })
      );
    });
  }

  // Projects
  if (projects && projects.length > 0) {
    children.push(
      new Paragraph({
        text: "Projects",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    projects.forEach((project) => {
      if (project.name) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: project.name, bold: true }),
              project.link
                ? new TextRun({ text: ` - ${project.link}`, color: "0066CC" })
                : null,
            ].filter(Boolean) as TextRun[],
            spacing: { after: 100 },
          })
        );
      }

      if (project.description) {
        children.push(
          new Paragraph({
            text: project.description,
            spacing: { after: 100 },
          })
        );
      }

      if (project.technologies && project.technologies.length > 0) {
        children.push(
          new Paragraph({
            text: `Technologies: ${project.technologies.join(", ")}`,
            italics: true,
            spacing: { after: 200 },
          })
        );
      }
    });
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    children.push(
      new Paragraph({
        text: "Certifications",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    certifications.forEach((cert) => {
      const certInfo = [
        cert.name,
        cert.organization ? `from ${cert.organization}` : null,
        cert.dateEarned ? `(${cert.dateEarned})` : null,
      ]
        .filter(Boolean)
        .join(" ");

      children.push(
        new Paragraph({
          text: certInfo,
          spacing: { after: 200 },
        })
      );
    });
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Export cover letter to DOCX format
 */
export async function exportCoverLetterToDOCX(
  coverLetterData: CoverLetterData,
  filename: string
): Promise<void> {
  const { content, personalInfo } = coverLetterData;

  const children: Paragraph[] = [];

  // Date (current date)
  children.push(
    new Paragraph({
      text: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
    })
  );

  // Recipient information
  if (content?.recipientName || content?.company) {
    const recipientInfo = [
      content.recipientName,
      content.recipientTitle,
      content.company,
    ]
      .filter(Boolean)
      .join("\n");

    children.push(
      new Paragraph({
        text: recipientInfo,
        spacing: { after: 400 },
      })
    );
  }

  // Greeting
  const greeting = content?.recipientName
    ? `Dear ${content.recipientName},`
    : "Dear Hiring Manager,";

  children.push(
    new Paragraph({
      text: greeting,
      spacing: { after: 400 },
    })
  );

  // Body
  if (content?.body) {
    // Split body into paragraphs
    const paragraphs = content.body.split("\n\n").filter((p) => p.trim());

    paragraphs.forEach((paragraph) => {
      children.push(
        new Paragraph({
          text: paragraph.trim(),
          spacing: { after: 300 },
        })
      );
    });
  }

  // Closing
  children.push(
    new Paragraph({
      text: content?.closing || "Sincerely,",
      spacing: { before: 400, after: 800 },
    })
  );

  // Signature
  if (personalInfo?.firstName || personalInfo?.lastName) {
    children.push(
      new Paragraph({
        text: `${personalInfo.firstName || ""} ${personalInfo.lastName || ""}`.trim(),
        spacing: { after: 200 },
      })
    );
  }

  if (personalInfo?.email) {
    children.push(
      new Paragraph({
        text: personalInfo.email,
        spacing: { after: 200 },
      })
    );
  }

  if (personalInfo?.phone) {
    children.push(
      new Paragraph({
        text: personalInfo.phone,
      })
    );
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Export text content to DOCX (simple text export)
 */
export async function exportTextToDOCX(
  text: string,
  filename: string
): Promise<void> {
  const paragraphs = text.split("\n").filter((p) => p.trim());

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs.map(
          (text) =>
            new Paragraph({
              text: text.trim(),
              spacing: { after: 200 },
            })
        ),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

