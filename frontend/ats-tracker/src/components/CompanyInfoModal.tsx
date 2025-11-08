import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { CompanyInfo } from "../types";

interface CompanyInfoModalProps {
  opportunityId: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  industry?: string;
  onClose: () => void;
}

export function CompanyInfoModal({
  opportunityId,
  companyName,
  jobTitle,
  location,
  industry,
  onClose,
}: CompanyInfoModalProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getCompanyInformation(opportunityId);
        if (response.ok && response.data) {
          setCompanyInfo(response.data.companyInfo);
        } else {
          setError("Failed to load company information");
        }
      } catch (err: any) {
        console.error("Failed to fetch company information:", err);
        setError(err.message || "Failed to load company information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [opportunityId]);

  const handleLogoError = () => {
    setLogoError(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Company Information
            </h2>
            <p className="text-slate-600 text-sm">
              {jobTitle} at {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="ml-3 text-slate-600">Loading company information...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:alert-line" className="text-red-600" width={20} />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && companyInfo && (
            <div className="space-y-6">
              {/* Company Header */}
              <div className="flex items-start gap-4">
                {companyInfo.logo && !logoError && (
                  <div className="flex-shrink-0">
                    <img
                      src={companyInfo.logo}
                      alt={`${companyInfo.name} logo`}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200"
                      onError={handleLogoError}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {companyInfo.name}
                  </h3>
                  {companyInfo.website && (
                    <a
                      href={companyInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Icon icon="mingcute:link-line" width={16} />
                      Visit Company Website
                    </a>
                  )}
                </div>
              </div>

              {/* Company Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Industry */}
                {(industry || companyInfo.industry) && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mingcute:building-line" className="text-slate-600" width={18} />
                      <span className="text-sm font-medium text-slate-600">Industry</span>
                    </div>
                    <p className="text-slate-900 font-medium">
                      {companyInfo.industry || industry || "N/A"}
                    </p>
                  </div>
                )}

                {/* Location */}
                {location && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mingcute:location-line" className="text-slate-600" width={18} />
                      <span className="text-sm font-medium text-slate-600">Location</span>
                    </div>
                    <p className="text-slate-900 font-medium">{location}</p>
                  </div>
                )}

                {/* Company Size */}
                {companyInfo.size && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mingcute:user-group-line" className="text-slate-600" width={18} />
                      <span className="text-sm font-medium text-slate-600">Company Size</span>
                    </div>
                    <p className="text-slate-900 font-medium">{companyInfo.size}</p>
                  </div>
                )}

                {/* Founded */}
                {companyInfo.founded && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mingcute:calendar-line" className="text-slate-600" width={18} />
                      <span className="text-sm font-medium text-slate-600">Founded</span>
                    </div>
                    <p className="text-slate-900 font-medium">{companyInfo.founded}</p>
                  </div>
                )}

                {/* Headquarters */}
                {companyInfo.headquarters && (
                  <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="mingcute:map-line" className="text-slate-600" width={18} />
                      <span className="text-sm font-medium text-slate-600">Headquarters</span>
                    </div>
                    <p className="text-slate-900 font-medium">{companyInfo.headquarters}</p>
                  </div>
                )}
              </div>

              {/* Company Description */}
              {companyInfo.description && (
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">About</h4>
                  <p className="text-slate-700 leading-relaxed">{companyInfo.description}</p>
                </div>
              )}

              {/* Mission Statement */}
              {companyInfo.mission && (
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Mission</h4>
                  <p className="text-slate-700 leading-relaxed">{companyInfo.mission}</p>
                </div>
              )}

              {/* No Additional Info Available */}
              {!companyInfo.description &&
                !companyInfo.mission &&
                !companyInfo.size &&
                !companyInfo.founded &&
                !companyInfo.headquarters && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="mingcute:information-line" className="text-blue-600 mt-0.5" width={20} />
                      <div>
                        <p className="text-sm text-blue-900 font-medium mb-1">
                          Limited Company Information Available
                        </p>
                        <p className="text-sm text-blue-800">
                          Additional company details are not available from the job posting URL.
                          {companyInfo.website && (
                            <>
                              {" "}
                              Visit the{" "}
                              <a
                                href={companyInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-medium"
                              >
                                company website
                              </a>{" "}
                              for more information.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

