import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { NetworkROI, DateRange } from "../../types/analytics.types";

interface NetworkROIProps {
  dateRange?: DateRange;
}

export function NetworkROI({ dateRange }: NetworkROIProps) {
  const [data, setData] = useState<NetworkROI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getNetworkROI(dateRange);
        if (response.ok && response.data?.roi) {
          setData(response.data.roi);
        } else {
          setError("Failed to load network ROI data");
        }
      } catch (err: any) {
        console.error("Failed to fetch network ROI:", err);
        setError(err.message || "Failed to load network ROI data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading network ROI data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon
          icon="mingcute:alert-line"
          className="mx-auto mb-3 text-red-500"
          width={40}
        />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load network ROI. Please try again later."}
        </p>
      </div>
    );
  }

  const referralRate =
    data.overall.totalActivities > 0
      ? Math.round(
          (data.overall.referrals / data.overall.totalActivities) * 100 * 10
        ) / 10
      : 0;

  const opportunityRate =
    data.overall.totalActivities > 0
      ? Math.round(
          (data.overall.opportunitiesFromNetwork /
            data.overall.totalActivities) *
            100 *
            10
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-5 text-white">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal">Total Activities</p>
            <Icon
              icon="mingcute:user-community-line"
              width={24}
              className="text-white"
            />
          </div>
          <p className="text-5xl font-medium leading-none text-[#E7EFFF]">
            {data.overall.totalActivities}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">
              Referrals Generated
            </p>
            <Icon
              icon="mingcute:user-add-line"
              width={20}
              className="text-[#09244B]"
            />
          </div>
          <p className="text-4xl font-extralight text-[#5A87E6]">
            {data.overall.referrals}
          </p>
          <p className="text-xs text-[#6D7A99] mt-1">
            {referralRate}% referral rate
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">
              Opportunities
            </p>
            <Icon
              icon="mingcute:briefcase-line"
              width={20}
              className="text-[#09244B]"
            />
          </div>
          <p className="text-4xl font-extralight text-[#5A87E6]">
            {data.overall.opportunitiesFromNetwork}
          </p>
          <p className="text-xs text-[#6D7A99] mt-1">
            {opportunityRate}% opportunity rate
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">
              Unique Contacts
            </p>
            <Icon
              icon="mingcute:contacts-line"
              width={20}
              className="text-[#09244B]"
            />
          </div>
          <p className="text-4xl font-extralight text-[#5A87E6]">
            {data.overall.uniqueContacts}
          </p>
        </div>
      </div>

      {/* Activities by Type */}
      {data.byType.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">
            Activities by Type
          </h3>
          <div className="space-y-3">
            {data.byType
              .filter((item) => item.type != null) // Filter out null/undefined types
              .map((item, index) => {
                const referralPercent =
                  item.count > 0
                    ? Math.round((item.referrals / item.count) * 100 * 10) / 10
                    : 0;
                const opportunityPercent =
                  item.count > 0
                    ? Math.round((item.opportunities / item.count) * 100 * 10) /
                      10
                    : 0;

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#0F1D3A]">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[#6D7A99]">
                        {item.count} activities
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded-lg bg-white">
                        <p className="text-xs text-[#6D7A99] mb-1">Referrals</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-semibold text-[#3351FD]">
                            {item.referrals}
                          </p>
                          <p className="text-xs text-[#6D7A99]">
                            ({referralPercent}%)
                          </p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white">
                        <p className="text-xs text-[#6D7A99] mb-1">
                          Opportunities
                        </p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-semibold text-[#3351FD]">
                            {item.opportunities}
                          </p>
                          <p className="text-xs text-[#6D7A99]">
                            ({opportunityPercent}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.overall.totalActivities === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon
            icon="mingcute:user-community-line"
            className="mx-auto mb-3 text-[#6D7A99]"
            width={48}
          />
          <p className="text-sm text-[#6D7A99]">
            No networking activities tracked yet. Start networking to see ROI
            analytics.
          </p>
        </div>
      )}
    </div>
  );
}
