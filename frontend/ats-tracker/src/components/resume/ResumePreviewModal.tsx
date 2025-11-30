import { Icon } from "@iconify/react";
import { Resume } from "../../types";

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: Resume | null;
  showComments?: boolean;
  commentsSection?: React.ReactNode;
}

// Helper function to format date as "Month Year"
const formatDateMonthYear = (dateString: string | undefined | null): string => {
  if (!dateString) return "";
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = parseInt(dateMatch[2], 10);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[month - 1]} ${year}`;
  }
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  } catch (e) {
    // If parsing fails, return original string
  }
  return dateString;
};

// Get enabled sections in order
const getEnabledSections = (resume: Resume) => {
  const sectionConfig = resume.sectionConfig || {};
  const defaultOrder = ["personal", "summary", "experience", "education", "skills", "projects", "certifications"];
  const customOrder = sectionConfig.sectionOrder || defaultOrder;
  
  return customOrder
    .map((sectionId) => {
      const section = sectionConfig[sectionId] as any;
      if (section && section.visible === false) return null;
      return { id: sectionId, order: customOrder.indexOf(sectionId) };
    })
    .filter((s): s is { id: string; order: number } => s !== null)
    .sort((a, b) => a.order - b.order);
};

export function ResumePreviewModal({
  isOpen,
  onClose,
  resume,
  showComments = false,
  commentsSection,
}: ResumePreviewModalProps) {
  if (!isOpen || !resume) return null;

  const colors = resume.customizations?.colors || {
    primary: "#3351FD",
    secondary: "#000000",
    text: "#000000",
    background: "#FFFFFF",
  };
  const fonts = resume.customizations?.fonts || {
    heading: "Inter",
    body: "Inter",
  };

  const enabledSections = getEnabledSections(resume);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Resume Preview</h2>
            <p className="text-sm text-gray-500 mt-1">
              {resume.name || resume.versionName || "Untitled Resume"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="mingcute:close-line" className="w-6 h-6" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div
            className="bg-white shadow-lg p-12 mx-auto max-w-3xl"
            style={{
              fontFamily: fonts.body || "Inter",
              backgroundColor: colors.background || "#FFFFFF",
            }}
          >
            {enabledSections.map((section) => {
              const sectionId = section.id;

              // Personal Info Section
              if (sectionId === "personal") {
                return (
                  <div
                    key={sectionId}
                    className={`border-b pb-6 mb-6 ${
                      resume.customizations?.headerStyle === "right"
                        ? "text-right"
                        : resume.customizations?.headerStyle === "left"
                        ? "text-left"
                        : "text-center"
                    }`}
                    style={{
                      borderColor: colors.primary,
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h1
                      className="text-4xl font-bold mb-2"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      {resume.content?.personalInfo?.firstName}{" "}
                      {resume.content?.personalInfo?.lastName}
                    </h1>
                    <div
                      className="flex items-center justify-center gap-4 mt-3 text-sm flex-wrap"
                      style={{ color: colors.secondary }}
                    >
                      {resume.content?.personalInfo?.email && (
                        <span>{resume.content.personalInfo.email}</span>
                      )}
                      {resume.content?.personalInfo?.phone && (
                        <span>• {resume.content.personalInfo.phone}</span>
                      )}
                      {resume.content?.personalInfo?.location && (
                        <span>• {resume.content.personalInfo.location}</span>
                      )}
                      {resume.content?.personalInfo?.linkedIn && (
                        <span>• {resume.content.personalInfo.linkedIn}</span>
                      )}
                      {resume.content?.personalInfo?.portfolio && (
                        <span>• {resume.content.personalInfo.portfolio}</span>
                      )}
                    </div>
                  </div>
                );
              }

              // Summary Section
              if (sectionId === "summary" && resume.content?.summary) {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Summary
                    </h2>
                    <p
                      className="leading-relaxed"
                      style={{
                        color: colors.text,
                        fontFamily: fonts.body,
                      }}
                    >
                      {resume.content.summary}
                    </p>
                  </div>
                );
              }

              // Experience Section
              if (sectionId === "experience") {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Experience
                    </h2>
                    {!resume.content?.experience || resume.content.experience.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No experience entries yet</p>
                    ) : (
                      <div className="space-y-6">
                        {resume.content.experience.map((exp: any) => (
                          <div
                            key={exp.id}
                            className="border-l-2 pl-4 relative"
                            style={{ borderColor: colors.primary }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h3
                                className="text-lg font-semibold"
                                style={{
                                  color: colors.text,
                                  fontFamily: fonts.heading,
                                }}
                              >
                                {exp.title}
                              </h3>
                              <span className="text-sm" style={{ color: colors.secondary }}>
                                {formatDateMonthYear(exp.startDate)} -{" "}
                                {exp.isCurrent ? "Present" : formatDateMonthYear(exp.endDate)}
                              </span>
                            </div>
                            <p
                              className="font-medium mb-2"
                              style={{
                                color: colors.text,
                                fontFamily: fonts.body,
                              }}
                            >
                              {exp.company}
                            </p>
                            {exp.location && (
                              <p className="text-sm mb-2" style={{ color: colors.secondary }}>
                                {exp.location}
                              </p>
                            )}
                            {exp.description && exp.description.length > 0 && (
                              <ul
                                className="list-disc list-inside space-y-1"
                                style={{
                                  color: colors.text,
                                  fontFamily: fonts.body,
                                }}
                              >
                                {exp.description.map((desc: string, idx: number) => (
                                  <li key={idx}>{desc}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Education Section
              if (sectionId === "education") {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Education
                    </h2>
                    {!resume.content?.education || resume.content.education.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No education entries yet</p>
                    ) : (
                      <div className="space-y-4">
                        {resume.content.education.map((edu: any) => (
                          <div key={edu.id}>
                            <h3
                              className="text-lg font-semibold"
                              style={{
                                color: colors.text,
                                fontFamily: fonts.heading,
                              }}
                            >
                              {edu.degree}
                            </h3>
                            <p
                              style={{
                                color: colors.text,
                                fontFamily: fonts.body,
                              }}
                            >
                              {edu.school}
                            </p>
                            {edu.field && (
                              <p className="text-sm" style={{ color: colors.secondary }}>
                                {edu.field}
                              </p>
                            )}
                            {edu.endDate && (
                              <p className="text-sm" style={{ color: colors.secondary }}>
                                {formatDateMonthYear(edu.endDate)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Skills Section
              if (sectionId === "skills") {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Skills
                    </h2>
                    {!resume.content?.skills || resume.content.skills.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No skills yet</p>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const skillsByCategory = (resume.content.skills || []).reduce(
                            (acc: Record<string, any[]>, skill: any) => {
                              const group = skill.group || skill.category || "Technical";
                              if (!acc[group]) acc[group] = [];
                              acc[group].push(skill);
                              return acc;
                            },
                            {}
                          );

                          return (
                            <div>
                              {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                                <div key={category} className="mb-2">
                                  <span
                                    className="text-xs font-semibold uppercase tracking-wide"
                                    style={{ color: colors.secondary }}
                                  >
                                    {category}:
                                  </span>
                                  <div
                                    className="text-sm leading-relaxed ml-0"
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.body,
                                    }}
                                  >
                                    {categorySkills.map((skill: any) => skill.name).join(", ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              }

              // Projects Section
              if (sectionId === "projects") {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Projects
                    </h2>
                    {!resume.content?.projects || resume.content.projects.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No projects yet</p>
                    ) : (
                      <div className="space-y-4">
                        {resume.content.projects.map((proj: any) => (
                          <div key={proj.id}>
                            <h3
                              className="text-lg font-semibold"
                              style={{
                                color: colors.text,
                                fontFamily: fonts.heading,
                              }}
                            >
                              {proj.name}
                            </h3>
                            <p
                              style={{
                                color: colors.text,
                                fontFamily: fonts.body,
                              }}
                            >
                              {proj.description}
                            </p>
                            {proj.technologies && proj.technologies.length > 0 && (
                              <p className="text-sm" style={{ color: colors.secondary }}>
                                Technologies: {proj.technologies.join(", ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Certifications Section
              if (sectionId === "certifications") {
                return (
                  <div
                    key={sectionId}
                    className="mb-6"
                    style={{
                      marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                    }}
                  >
                    <h2
                      className="text-2xl font-semibold mb-3"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                      }}
                    >
                      Certifications
                    </h2>
                    {!resume.content?.certifications || resume.content.certifications.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No certifications yet</p>
                    ) : (
                      <div className="space-y-3">
                        {resume.content.certifications.map((cert: any) => (
                          <div key={cert.id}>
                            <h3
                              className="text-lg font-semibold"
                              style={{
                                color: colors.text,
                                fontFamily: fonts.heading,
                              }}
                            >
                              {cert.name}
                            </h3>
                            <p
                              style={{
                                color: colors.text,
                                fontFamily: fonts.body,
                              }}
                            >
                              {cert.organization}
                            </p>
                            {cert.dateEarned && (
                              <p className="text-sm" style={{ color: colors.secondary }}>
                                {formatDateMonthYear(cert.dateEarned)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Comments Section */}
        {showComments && commentsSection && (
          <div className="border-t border-gray-200 bg-white">
            {commentsSection}
          </div>
        )}
      </div>
    </div>
  );
}

