import { useState, useMemo } from "react";
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
import {
  JOB_STATUSES,
  STATUS_COLORS,
  STATUS_BG_COLORS,
} from "../types";
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
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
  onView?: (opportunity: JobOpportunityData) => void;
  searchTerm?: string;
}

interface PipelineColumnProps {
  status: JobStatus;
  opportunities: JobOpportunityData[];
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
  onView?: (opportunity: JobOpportunityData) => void;
  searchTerm?: string;
}

interface PipelineCardProps {
  opportunity: JobOpportunityData;
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
  onView?: (opportunity: JobOpportunityData) => void;
  searchTerm?: string;
}

// Pipeline Card Component
function PipelineCard({
  opportunity,
  onEdit,
  onDelete,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const formatSalary = () => {
    if (opportunity.salaryMin && opportunity.salaryMax) {
      return `$${opportunity.salaryMin.toLocaleString()} - $${opportunity.salaryMax.toLocaleString()}`;
    } else if (opportunity.salaryMin) {
      return `$${opportunity.salaryMin.toLocaleString()}+`;
    } else if (opportunity.salaryMax) {
      return `Up to $${opportunity.salaryMax.toLocaleString()}`;
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-slate-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
        isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-2">
        <div 
          className="flex-1 min-w-0"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onView && onView(opportunity);
          }}
          style={{ cursor: onView ? 'pointer' : 'default' }}
        >
          <h4 className="font-semibold text-slate-900 truncate text-sm">
            {highlightSearchTerm(opportunity.title, searchTerm)}
          </h4>
          <p className="text-xs text-slate-600 truncate">
            {highlightSearchTerm(opportunity.company, searchTerm)}
          </p>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(opportunity);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Icon icon="mingcute:edit-line" width={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(opportunity);
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Icon icon="mingcute:delete-line" width={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <Icon icon="mingcute:location-line" width={12} />
          <span className="truncate">{opportunity.location}</span>
        </div>
        {formatSalary() && (
          <div className="flex items-center gap-1">
            <Icon icon="mingcute:currency-dollar-line" width={12} />
            <span>{formatSalary()}</span>
          </div>
        )}
        {opportunity.applicationDeadline && (
          <div className="mt-2">
            <div
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: getDeadlineBgColor(
                  getDeadlineUrgency(getDaysRemaining(opportunity.applicationDeadline))
                ),
                color: getDeadlineColor(
                  getDeadlineUrgency(getDaysRemaining(opportunity.applicationDeadline))
                ),
              }}
            >
              <Icon icon="mingcute:calendar-line" width={12} />
              <span>
                {formatDeadlineText(getDaysRemaining(opportunity.applicationDeadline))}
              </span>
            </div>
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
  onEdit,
  onDelete,
  onView,
  searchTerm,
}: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColor = STATUS_COLORS[status];
  const statusBgColor = STATUS_BG_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] bg-slate-50 rounded-lg p-4"
    >
      <div
        className="flex items-center justify-between mb-4 p-2 rounded-lg"
        style={{ backgroundColor: statusBgColor }}
      >
        <div className="flex items-center gap-2">
          <h3
            className="font-semibold text-sm"
            style={{ color: statusColor }}
          >
            {status}
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: statusColor,
              color: "white",
            }}
          >
            {opportunities.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {opportunities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
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
                      onEdit={onEdit}
                      onDelete={onDelete}
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
  onEdit,
  onDelete,
  onView,
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {JOB_STATUSES.map((status) => {
            const statusOpportunities = opportunitiesByStatus[status];
            return (
                  <PipelineColumn
                    key={status}
                    status={status}
                    opportunities={statusOpportunities}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    searchTerm={searchTerm}
                  />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

