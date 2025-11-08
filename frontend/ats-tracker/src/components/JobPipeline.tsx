const formatStageDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};
import { useState, useMemo, type CSSProperties } from "react";
import { Icon } from "@iconify/react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  JobOpportunityData,
  JobStatus,
} from "../types";
import { JOB_STATUSES, STATUS_COLORS } from "../types";
import { highlightSearchTerm } from "../utils/searchHighlight";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";

interface JobPipelineProps {
  opportunities: JobOpportunityData[];
  onStatusChange: (id: string, newStatus: JobStatus) => Promise<void>;
  onView?: (opportunity: JobOpportunityData) => void;
  onCreate?: (status: JobStatus) => void;
  searchTerm?: string;
}

interface PipelineColumnProps {
  status: JobStatus;
  opportunities: JobOpportunityData[];
  onView?: (opportunity: JobOpportunityData) => void;
  onCreate?: (status: JobStatus) => void;
  searchTerm?: string;
}

interface PipelineCardProps {
  opportunity: JobOpportunityData;
  onView?: (opportunity: JobOpportunityData) => void;
  searchTerm?: string;
}

const getDaysInStage = (dateString?: string): number | null => {
  if (!dateString) return null;
  const updatedAt = new Date(dateString);
  if (Number.isNaN(updatedAt.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  updatedAt.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - updatedAt.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const getDaysInStageLabel = (daysInStage: number | null) => {
  if (daysInStage === null) return "Stage timing unavailable";
  if (daysInStage <= 1) return "1 Day";
  if (daysInStage === 1) return "1 Day";
  return `${daysInStage} Days`;
};

const formatDeadlineStatus = (daysRemaining: number | null) => {
  if (daysRemaining === null) return null;
  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);
    return `${daysOverdue} Day${daysOverdue !== 1 ? "s" : ""} Overdue`;
  }
  if (daysRemaining === 0) return "Due Today";
  if (daysRemaining === 1) return "1 Day Left to Apply";
  return `${daysRemaining} Days Left to Apply`;
};

// Pipeline Card Component
function PipelineCard({
  opportunity,
  onView,
  searchTerm,
}: PipelineCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const daysRemaining = getDaysRemaining(opportunity.applicationDeadline);
  const isOverdueInterested =
    opportunity.status === "Interested" &&
    daysRemaining !== null &&
    daysRemaining < 0;
  const accentColor = isOverdueInterested ? "#F89000" : STATUS_COLORS[opportunity.status];
  const baseStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    borderLeft: `8px solid ${accentColor}`,
  };
  const deadlineUrgency = getDeadlineUrgency(daysRemaining);
  const deadlineColor = getDeadlineColor(deadlineUrgency);
  const deadlineBgColor = getDeadlineBgColor(deadlineUrgency);
  const deadlineStatus = formatDeadlineStatus(daysRemaining);

  const daysInStage = getDaysInStage(opportunity.statusUpdatedAt);
  const stageLabel = getDaysInStageLabel(daysInStage);
  const stageDate = formatStageDate(opportunity.statusUpdatedAt);

  return (
    <div
      ref={setNodeRef}
      style={baseStyle}
      className={`bg-white rounded-[11px] border border-[#D1D1D1] p-2 pl-3 w-[165px] min-h-[90px] mb-3 shadow-[1px_2px_4px_rgba(0,0,0,0.07)] cursor-grab active:cursor-grabbing transition-transform ${
        isDragging ? "scale-[1.01] shadow-[0_18px_40px_rgba(17,23,58,0.12)]" : "hover:-translate-y-1"
      }`}
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onView && onView(opportunity);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-medium text-slate-900 leading-tight truncate">
            {highlightSearchTerm(opportunity.title, searchTerm)}
          </h4>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#848484] mt-0.5 truncate">
            <span className="truncate">
              {highlightSearchTerm(opportunity.company, searchTerm)}
            </span>
            {opportunity.location && (
              <>
                <span className="text-[#C9C9C9]">•</span>
                <span className="truncate text-[#848484]">{opportunity.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1 text-[9px] font-medium">
        {((opportunity.status === "Interested" && opportunity.applicationDeadline) || opportunity.statusUpdatedAt) && (
          <div className="flex flex-wrap items-center gap-2">
            {opportunity.status === "Interested" && opportunity.applicationDeadline && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: deadlineBgColor,
                  color: deadlineColor,
                }}
              >
                <Icon icon="mingcute:edit-4-line" width={10} />
                {deadlineStatus || formatDeadlineText(daysRemaining)}
              </span>
            )}

            {opportunity.statusUpdatedAt && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5"
                  style={{
                    backgroundColor: "#EAE0FF",
                    color: "#916BE3",
                  }}
                >
                  <Icon icon="mingcute:calendar-line" width={10} />
                  {stageLabel}
                </span>
                {stageDate && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#F3F6FF] text-[#6A94EE] font-medium">
                    {stageDate}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Pipeline Column Component
function PipelineColumn({
  status,
  opportunities,
  onView,
  onCreate,
  searchTerm,
}: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColor = STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[210px] max-w-[220px] bg-[#F8F8F8] rounded-3xl p-5 border border-[#F0F0F0] shadow-none flex flex-col"
    >
      <div className="flex items-center mb-4">
        <div className="flex items-center gap-2 flex-1 pr-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm whitespace-nowrap">{status}</h3>
            <span
              className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: "#D3E4FF",
                color: "#3351FD",
                borderRadius: "5px",
                minWidth: "26px",
              }}
            >
              {opportunities.length}
            </span>
          </span>
        </div>
        <div className="ml-auto flex items-center pr-3">
          {onCreate && (
            <button
              onClick={() => onCreate(status)}
              className="text-[#515151] hover:text-[#2f2f2f] transition-colors flex items-center justify-center bg-transparent p-0"
              title={`Add job to ${status}`}
            >
              <Icon icon="mingcute:add-line" width={14} />
            </button>
          )}
        </div>
      </div>
      <div className="h-px bg-[#E4E4E4] mb-4 -mx-5" />

      <SortableContext
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3 min-h-[120px] overflow-y-auto pr-1.5">
          {opportunities.length === 0 ? (
            <div className="text-center py-8 px-3 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              <Icon
                icon="mingcute:inbox-line"
                width={24}
                className="mx-auto mb-2 opacity-50"
              />
              Drop jobs here
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <PipelineCard
                key={opportunity.id}
                opportunity={opportunity}
                onView={onView}
                searchTerm={searchTerm}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main Pipeline Component
export function JobPipeline({
  opportunities,
  onStatusChange,
  onView,
  onCreate,
  searchTerm,
}: JobPipelineProps) {
  const [, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group opportunities by status
  const opportunitiesByStatus = useMemo(() => {
    const grouped: Record<JobStatus, JobOpportunityData[]> = {
      Interested: [],
      Applied: [],
      "Phone Screen": [],
      Interview: [],
      Offer: [],
      Rejected: [],
    };

    opportunities.forEach((opp) => {
      if (opp.status in grouped) {
        grouped[opp.status].push(opp);
      }
    });

    // Sort by status_updated_at (most recent first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as JobStatus].sort((a, b) => {
        const aDate = a.statusUpdatedAt ? new Date(a.statusUpdatedAt).getTime() : 0;
        const bDate = b.statusUpdatedAt ? new Date(b.statusUpdatedAt).getTime() : 0;
        return bDate - aDate;
      });
    });

    return grouped;
  }, [opportunities]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping on a status column or another card
    let newStatus: JobStatus | null = null;

    // If dropping on a status column
    if (JOB_STATUSES.includes(overId as JobStatus)) {
      newStatus = overId as JobStatus;
    } else {
      // If dropping on another card, find that card's status
      const targetOpportunity = opportunities.find((o) => o.id === overId);
      if (targetOpportunity) {
        newStatus = targetOpportunity.status;
      }
    }

    if (!newStatus) return;

    // Find the opportunity being dragged
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity) return;

    // If status didn't change, do nothing
    if (opportunity.status === newStatus) return;

    // Update status
    try {
      await onStatusChange(opportunityId, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDragOver = () => {
    // Optional: Add visual feedback during drag
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div
          className="flex gap-2 overflow-x-auto pb-6 items-stretch"
          style={{ minHeight: "calc(100vh - 260px)" }}
        >
          {JOB_STATUSES.map((status) => {
            const statusOpportunities = opportunitiesByStatus[status];
            return (
              <PipelineColumn
                key={status}
                status={status}
                opportunities={statusOpportunities}
                onView={onView}
                onCreate={onCreate}
                searchTerm={searchTerm}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

