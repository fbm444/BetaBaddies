import { ResumeTemplate } from "../../types";

interface TemplatePreviewProps {
  template: ResumeTemplate;
  scale?: number; // Scale factor for preview (0.5 = half size, 1.0 = full size)
}

export function TemplatePreview({ template, scale = 1.0 }: TemplatePreviewProps) {
  const parseColors = (colors: string | object | undefined) => {
    if (!colors) {
      return {
        primary: "#3351FD",
        secondary: "#000000",
        text: "#000000",
        background: "#FFFFFF",
        accent: "#F5F5F5",
      };
    }
    if (typeof colors === "string") {
      try {
        return JSON.parse(colors);
      } catch {
        return {
          primary: "#3351FD",
          secondary: "#000000",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F5F5F5",
        };
      }
    }
    return colors as any;
  };

  const parseFonts = (fonts: string | object | undefined) => {
    if (!fonts) {
      return {
        heading: "Inter",
        body: "Inter",
        size: { heading: "24px", body: "12px" },
      };
    }
    if (typeof fonts === "string") {
      try {
        return JSON.parse(fonts);
      } catch {
        return {
          heading: "Inter",
          body: "Inter",
          size: { heading: "24px", body: "12px" },
        };
      }
    }
    return fonts as any;
  };

  const colors = parseColors(template.colors);
  const fonts = parseFonts(template.fonts);
  const sectionOrder = Array.isArray(template.sectionOrder)
    ? template.sectionOrder
    : template.sectionOrder
    ? JSON.parse(template.sectionOrder as any)
    : ["personal", "summary", "experience", "education", "skills"];

  const headerStyle = template.layoutConfig?.headerStyle || "centered";
  const alignment = template.layoutConfig?.alignment || "left";
  const templateType = template.templateType || "chronological";

  // Strong sample resume data with quantified achievements
  const sampleData = {
    name: "Sarah Chen",
    title: "Senior Product Manager",
    email: "sarah.chen@email.com",
    phone: "(415) 555-0123",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/sarahchen",
    summary:
      templateType === "functional"
        ? "Results-driven product leader with 8+ years of experience driving product strategy and execution. Expert in cross-functional collaboration, data-driven decision making, and scaling products from 0 to 1M+ users. Proven track record of increasing revenue by 40% and reducing churn by 25%."
        : templateType === "hybrid"
        ? "Strategic product leader with 8+ years of experience building and scaling B2B SaaS products. Led product initiatives that generated $15M+ in annual recurring revenue. Expert in agile methodologies, user research, and building high-performing product teams."
        : "Senior Product Manager with 8+ years of experience leading product strategy and execution for high-growth SaaS companies. Led product initiatives that increased revenue by 40% and reduced customer churn by 25%. Expert in agile methodologies, user research, and cross-functional collaboration.",
    experience: [
      {
        title: "Senior Product Manager",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        period: "2020 - Present",
        bullets: [
          "Led product strategy for core platform, increasing ARR by $8M (40% YoY growth)",
          "Reduced customer churn by 25% through data-driven product improvements",
          "Managed cross-functional team of 12 engineers, designers, and analysts",
          "Launched 3 major features that increased user engagement by 60%",
        ],
      },
      {
        title: "Product Manager",
        company: "StartupXYZ",
        location: "San Francisco, CA",
        period: "2018 - 2020",
        bullets: [
          "Built product roadmap that scaled user base from 10K to 500K in 18 months",
          "Increased conversion rate by 35% through A/B testing and optimization",
          "Collaborated with engineering to ship 20+ features on time and on budget",
        ],
      },
      {
        title: "Associate Product Manager",
        company: "BigTech Co.",
        location: "Mountain View, CA",
        period: "2016 - 2018",
        bullets: [
          "Owned product features used by 1M+ daily active users",
          "Improved feature adoption by 45% through user research and iteration",
        ],
      },
    ],
    education: [
      {
        degree: "MBA, Technology Management",
        school: "Stanford University",
        year: "2016",
        honors: "Magna Cum Laude",
      },
      {
        degree: "BS, Computer Science",
        school: "UC Berkeley",
        year: "2014",
        honors: "Dean's List",
      },
    ],
    skills: {
      technical: ["Product Strategy", "Roadmapping", "Agile/Scrum", "SQL", "Analytics"],
      leadership: ["Team Leadership", "Stakeholder Management", "Cross-functional Collaboration"],
      tools: ["Jira", "Figma", "Mixpanel", "Tableau", "A/B Testing"],
    },
    certifications: [
      { name: "Certified Product Manager (CPM)", issuer: "Product School", year: "2019" },
      { name: "Agile Certified Practitioner", issuer: "PMI", year: "2018" },
    ],
    projects: [
      {
        name: "AI-Powered Recommendation Engine",
        description: "Led development of ML-based recommendation system that increased user engagement by 40%",
        period: "2021",
      },
    ],
  };

  const previewStyle = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: scale < 1 ? `${100 / scale}%` : "100%",
  };

  // Render based on template type
  if (templateType === "functional") {
    return (
      <div
        className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden"
        style={previewStyle}
      >
        <div
          className="p-4"
          style={{
            backgroundColor: colors.background || "#FFFFFF",
            fontFamily: fonts.body || "Roboto",
            color: colors.text || "#000000",
          }}
        >
          {/* Header - Left Aligned */}
          <div className="mb-4 pb-3 border-b-2" style={{ borderColor: colors.primary || "#000000" }}>
            <h1
              className="font-bold mb-1 text-left"
              style={{
                color: colors.primary || "#000000",
                fontFamily: fonts.heading || "Roboto",
                fontSize: fonts.size?.heading
                  ? `calc(${fonts.size.heading} * ${scale})`
                  : `${22 * scale}px`,
              }}
            >
              {sampleData.name}
            </h1>
            <div
              className="text-xs flex flex-wrap gap-2 text-left"
              style={{
                color: colors.secondary || "#3351FD",
                fontSize: `${10 * scale}px`,
              }}
            >
              <span>{sampleData.email}</span>
              <span>•</span>
              <span>{sampleData.phone}</span>
              <span>•</span>
              <span>{sampleData.location}</span>
            </div>
          </div>

          {/* Summary */}
          {sectionOrder.includes("summary") && (
            <div className="mb-3">
              <h2
                className="font-semibold mb-1 text-left"
                style={{
                  color: colors.primary || "#000000",
                  fontFamily: fonts.heading || "Roboto",
                  fontSize: fonts.size?.heading
                    ? `calc((${fonts.size.heading} - 2px) * ${scale})`
                    : `${18 * scale}px`,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Professional Summary
              </h2>
              <p
                className="text-xs leading-relaxed text-left"
                style={{
                  fontSize: fonts.size?.body
                    ? `calc(${fonts.size.body} * ${scale})`
                    : `${11 * scale}px`,
                }}
              >
                {sampleData.summary}
              </p>
            </div>
          )}

          {/* Skills - Prominent in Functional Format */}
          {sectionOrder.includes("skills") && (
            <div className="mb-3">
              <h2
                className="font-semibold mb-2 text-left"
                style={{
                  color: colors.primary || "#000000",
                  fontFamily: fonts.heading || "Roboto",
                  fontSize: fonts.size?.heading
                    ? `calc((${fonts.size.heading} - 2px) * ${scale})`
                    : `${18 * scale}px`,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Core Competencies
              </h2>
              <div className="space-y-2">
                <div>
                  <div
                    className="font-semibold text-xs mb-1"
                    style={{
                      color: colors.secondary || "#3351FD",
                      fontSize: `${11 * scale}px`,
                    }}
                  >
                    Product Management
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sampleData.skills.technical.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-white text-xs"
                        style={{
                          backgroundColor: colors.primary || "#000000",
                          fontSize: `${9 * scale}px`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div
                    className="font-semibold text-xs mb-1"
                    style={{
                      color: colors.secondary || "#3351FD",
                      fontSize: `${11 * scale}px`,
                    }}
                  >
                    Leadership & Collaboration
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sampleData.skills.leadership.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-white text-xs"
                        style={{
                          backgroundColor: colors.primary || "#000000",
                          fontSize: `${9 * scale}px`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div
                    className="font-semibold text-xs mb-1"
                    style={{
                      color: colors.secondary || "#3351FD",
                      fontSize: `${11 * scale}px`,
                    }}
                  >
                    Tools & Technologies
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sampleData.skills.tools.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-white text-xs"
                        style={{
                          backgroundColor: colors.primary || "#000000",
                          fontSize: `${9 * scale}px`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Experience - Condensed */}
          {sectionOrder.includes("experience") && (
            <div className="mb-3">
              <h2
                className="font-semibold mb-2 text-left"
                style={{
                  color: colors.primary || "#000000",
                  fontFamily: fonts.heading || "Roboto",
                  fontSize: fonts.size?.heading
                    ? `calc((${fonts.size.heading} - 2px) * ${scale})`
                    : `${18 * scale}px`,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Professional Experience
              </h2>
              {sampleData.experience.map((exp, idx) => (
                <div key={idx} className="mb-2">
                  <div className="flex justify-between items-start mb-0.5">
                    <div>
                      <span
                        className="font-semibold text-xs"
                        style={{
                          fontSize: `${11 * scale}px`,
                        }}
                      >
                        {exp.title}
                      </span>
                      <span
                        className="text-xs ml-1"
                        style={{
                          fontSize: `${11 * scale}px`,
                        }}
                      >
                        | {exp.company}
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        color: colors.secondary || "#3351FD",
                        fontSize: `${10 * scale}px`,
                      }}
                    >
                      {exp.period}
                    </span>
                  </div>
                  <ul
                    className="list-disc list-inside space-y-0.5 ml-2"
                    style={{
                      fontSize: `${10 * scale}px`,
                    }}
                  >
                    {exp.bullets.slice(0, 2).map((bullet, bidx) => (
                      <li key={bidx}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {sectionOrder.includes("education") && (
            <div className="mb-3">
              <h2
                className="font-semibold mb-1 text-left"
                style={{
                  color: colors.primary || "#000000",
                  fontFamily: fonts.heading || "Roboto",
                  fontSize: fonts.size?.heading
                    ? `calc((${fonts.size.heading} - 2px) * ${scale})`
                    : `${18 * scale}px`,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Education
              </h2>
              {sampleData.education.map((edu, idx) => (
                <div key={idx} className="mb-1">
                  <span
                    className="font-semibold text-xs"
                    style={{
                      fontSize: `${11 * scale}px`,
                    }}
                  >
                    {edu.degree}
                  </span>
                  <span
                    className="text-xs ml-1"
                    style={{
                      fontSize: `${11 * scale}px`,
                    }}
                  >
                    - {edu.school} ({edu.year})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chronological or Hybrid format
  const isTwoColumn = templateType === "hybrid";
  
  return (
    <div
      className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden"
      style={previewStyle}
    >
      <div
        className="p-4"
        style={{
          backgroundColor: colors.background || "#FFFFFF",
          fontFamily: fonts.body || "Inter",
          color: colors.text || "#000000",
        }}
      >
        {/* Header */}
        <div
          className={`mb-4 pb-3 border-b-2 ${
            headerStyle === "centered" ? "text-center" : "text-left"
          }`}
          style={{
            borderColor: colors.primary || "#3351FD",
            borderWidth: templateType === "hybrid" ? "3px" : "2px",
          }}
        >
          <h1
            className="font-bold mb-1"
            style={{
              color: colors.primary || "#3351FD",
              fontFamily: fonts.heading || "Inter",
              fontSize: fonts.size?.heading
                ? `calc(${fonts.size.heading} * ${scale})`
                : `${24 * scale}px`,
            }}
          >
            {sampleData.name}
          </h1>
          {templateType === "hybrid" && (
            <div
              className="text-xs font-medium mb-1"
              style={{
                color: colors.secondary || "#666666",
                fontSize: `${11 * scale}px`,
              }}
            >
              {sampleData.title}
            </div>
          )}
          <div
            className={`text-xs flex flex-wrap gap-2 ${
              headerStyle === "centered" ? "justify-center" : "justify-start"
            }`}
            style={{
              color: colors.secondary || "#000000",
              fontSize: `${10 * scale}px`,
            }}
          >
            <span>{sampleData.email}</span>
            <span>•</span>
            <span>{sampleData.phone}</span>
            <span>•</span>
            <span>{sampleData.location}</span>
            {templateType === "hybrid" && <span>•</span>}
            {templateType === "hybrid" && <span>{sampleData.linkedin}</span>}
          </div>
        </div>

        {/* Two-column layout for hybrid */}
        {isTwoColumn ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div>
              {/* Summary */}
              {sectionOrder.includes("summary") && (
                <div className="mb-3">
                  <h2
                    className="font-semibold mb-1 border-b pb-0.5"
                    style={{
                      color: colors.primary || "#000000",
                      fontFamily: fonts.heading || "Georgia",
                      fontSize: fonts.size?.heading
                        ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                        : `${20 * scale}px`,
                      borderColor: colors.primary || "#000000",
                    }}
                  >
                    Professional Summary
                  </h2>
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      fontSize: fonts.size?.body
                        ? `calc(${fonts.size.body} * ${scale})`
                        : `${12 * scale}px`,
                      textAlign: "justify",
                    }}
                  >
                    {sampleData.summary}
                  </p>
                </div>
              )}

              {/* Experience */}
              {sectionOrder.includes("experience") && (
                <div className="mb-3">
                  <h2
                    className="font-semibold mb-2 border-b pb-0.5"
                    style={{
                      color: colors.primary || "#000000",
                      fontFamily: fonts.heading || "Georgia",
                      fontSize: fonts.size?.heading
                        ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                        : `${20 * scale}px`,
                      borderColor: colors.primary || "#000000",
                    }}
                  >
                    Professional Experience
                  </h2>
                  {sampleData.experience.map((exp, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span
                            className="font-bold text-xs"
                            style={{
                              fontSize: `${12 * scale}px`,
                            }}
                          >
                            {exp.title}
                          </span>
                          <span
                            className="text-xs ml-1 italic"
                            style={{
                              fontSize: `${11 * scale}px`,
                            }}
                          >
                            {exp.company}
                          </span>
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: colors.secondary || "#666666",
                            fontSize: `${10 * scale}px`,
                          }}
                        >
                          {exp.period}
                        </span>
                      </div>
                      <ul
                        className="list-disc list-inside space-y-0.5 ml-2"
                        style={{
                          fontSize: `${11 * scale}px`,
                        }}
                      >
                        {exp.bullets.map((bullet, bidx) => (
                          <li key={bidx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div>
              {/* Skills */}
              {sectionOrder.includes("skills") && (
                <div className="mb-3">
                  <h2
                    className="font-semibold mb-2 border-b pb-0.5"
                    style={{
                      color: colors.primary || "#000000",
                      fontFamily: fonts.heading || "Georgia",
                      fontSize: fonts.size?.heading
                        ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                        : `${20 * scale}px`,
                      borderColor: colors.primary || "#000000",
                    }}
                  >
                    Core Skills
                  </h2>
                  <div className="space-y-2">
                    <div>
                      <div
                        className="font-semibold text-xs mb-1"
                        style={{
                          color: colors.secondary || "#666666",
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        Product Management
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sampleData.skills.technical.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-white text-xs"
                            style={{
                              backgroundColor: colors.primary || "#000000",
                              fontSize: `${9 * scale}px`,
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div
                        className="font-semibold text-xs mb-1"
                        style={{
                          color: colors.secondary || "#666666",
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        Leadership
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sampleData.skills.leadership.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-white text-xs"
                            style={{
                              backgroundColor: colors.primary || "#000000",
                              fontSize: `${9 * scale}px`,
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Education */}
              {sectionOrder.includes("education") && (
                <div className="mb-3">
                  <h2
                    className="font-semibold mb-2 border-b pb-0.5"
                    style={{
                      color: colors.primary || "#000000",
                      fontFamily: fonts.heading || "Georgia",
                      fontSize: fonts.size?.heading
                        ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                        : `${20 * scale}px`,
                      borderColor: colors.primary || "#000000",
                    }}
                  >
                    Education
                  </h2>
                  {sampleData.education.map((edu, idx) => (
                    <div key={idx} className="mb-2">
                      <div
                        className="font-bold text-xs"
                        style={{
                          fontSize: `${11 * scale}px`,
                        }}
                      >
                        {edu.degree}
                      </div>
                      <div
                        className="text-xs italic"
                        style={{
                          color: colors.secondary || "#666666",
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        {edu.school} • {edu.year}
                      </div>
                      {edu.honors && (
                        <div
                          className="text-xs"
                          style={{
                            fontSize: `${9 * scale}px`,
                          }}
                        >
                          {edu.honors}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {sectionOrder.includes("certifications") && sampleData.certifications.length > 0 && (
                <div className="mb-3">
                  <h2
                    className="font-semibold mb-1 border-b pb-0.5"
                    style={{
                      color: colors.primary || "#000000",
                      fontFamily: fonts.heading || "Georgia",
                      fontSize: fonts.size?.heading
                        ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                        : `${20 * scale}px`,
                      borderColor: colors.primary || "#000000",
                    }}
                  >
                    Certifications
                  </h2>
                  {sampleData.certifications.map((cert, idx) => (
                    <div key={idx} className="mb-1">
                      <span
                        className="font-semibold text-xs"
                        style={{
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        {cert.name}
                      </span>
                      <span
                        className="text-xs ml-1"
                        style={{
                          color: colors.secondary || "#666666",
                          fontSize: `${9 * scale}px`,
                        }}
                      >
                        - {cert.issuer} ({cert.year})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single column for chronological */
          <>
            {/* Summary */}
            {sectionOrder.includes("summary") && (
              <div className="mb-3">
                <h2
                  className="font-semibold mb-1 border-b pb-0.5"
                  style={{
                    color: colors.primary || "#3351FD",
                    fontFamily: fonts.heading || "Inter",
                    fontSize: fonts.size?.heading
                      ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                      : `${18 * scale}px`,
                    borderColor: colors.primary || "#3351FD",
                  }}
                >
                  Professional Summary
                </h2>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    fontSize: fonts.size?.body
                      ? `calc(${fonts.size.body} * ${scale})`
                      : `${11 * scale}px`,
                  }}
                >
                  {sampleData.summary}
                </p>
              </div>
            )}

            {/* Experience */}
            {sectionOrder.includes("experience") && (
              <div className="mb-3">
                <h2
                  className="font-semibold mb-2 border-b pb-0.5"
                  style={{
                    color: colors.primary || "#3351FD",
                    fontFamily: fonts.heading || "Inter",
                    fontSize: fonts.size?.heading
                      ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                      : `${18 * scale}px`,
                    borderColor: colors.primary || "#3351FD",
                  }}
                >
                  Professional Experience
                </h2>
                {sampleData.experience.map((exp, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span
                          className="font-bold text-xs"
                          style={{
                            fontSize: `${12 * scale}px`,
                          }}
                        >
                          {exp.title}
                        </span>
                        <span
                          className="text-xs ml-1"
                          style={{
                            fontSize: `${11 * scale}px`,
                          }}
                        >
                          - {exp.company}
                        </span>
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: colors.secondary || "#000000",
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        {exp.period}
                      </span>
                    </div>
                    <ul
                      className="list-disc list-inside space-y-0.5 ml-2"
                      style={{
                        fontSize: `${10 * scale}px`,
                      }}
                    >
                      {exp.bullets.map((bullet, bidx) => (
                        <li key={bidx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {sectionOrder.includes("education") && (
              <div className="mb-3">
                <h2
                  className="font-semibold mb-1 border-b pb-0.5"
                  style={{
                    color: colors.primary || "#3351FD",
                    fontFamily: fonts.heading || "Inter",
                    fontSize: fonts.size?.heading
                      ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                      : `${18 * scale}px`,
                    borderColor: colors.primary || "#3351FD",
                  }}
                >
                  Education
                </h2>
                {sampleData.education.map((edu, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className="font-bold text-xs"
                          style={{
                            fontSize: `${11 * scale}px`,
                          }}
                        >
                          {edu.degree}
                        </span>
                        <span
                          className="text-xs ml-1"
                          style={{
                            fontSize: `${11 * scale}px`,
                          }}
                        >
                          - {edu.school}
                        </span>
                      </div>
                      <span
                        className="text-xs"
                        style={{
                          color: colors.secondary || "#000000",
                          fontSize: `${10 * scale}px`,
                        }}
                      >
                        {edu.year}
                      </span>
                    </div>
                    {edu.honors && (
                      <div
                        className="text-xs italic ml-2"
                        style={{
                          color: colors.secondary || "#000000",
                          fontSize: `${9 * scale}px`,
                        }}
                      >
                        {edu.honors}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {sectionOrder.includes("skills") && (
              <div className="mb-3">
                <h2
                  className="font-semibold mb-1 border-b pb-0.5"
                  style={{
                    color: colors.primary || "#3351FD",
                    fontFamily: fonts.heading || "Inter",
                    fontSize: fonts.size?.heading
                      ? `calc((${fonts.size.heading} - 4px) * ${scale})`
                      : `${18 * scale}px`,
                    borderColor: colors.primary || "#3351FD",
                  }}
                >
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1">
                  {[
                    ...sampleData.skills.technical,
                    ...sampleData.skills.leadership.slice(0, 2),
                    ...sampleData.skills.tools.slice(0, 3),
                  ].map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-white text-xs"
                      style={{
                        backgroundColor: colors.primary || "#3351FD",
                        fontSize: `${9 * scale}px`,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
