import { useState } from "react";
import { Icon } from "@iconify/react";
import { SectionConfig } from "../types";

interface ResumeSectionManagerProps {
  sections: { id: string; label: string; icon: string }[];
  sectionConfig: SectionConfig;
  onToggleSection: (sectionId: string, enabled: boolean) => void;
  onReorderSections: (newOrder: string[]) => void;
}

export function ResumeSectionManager({
  sections,
  sectionConfig,
  onToggleSection,
  onReorderSections,
}: ResumeSectionManagerProps) {
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  const sortedSections = [...sections].sort((a, b) => {
    const orderA = sectionConfig[a.id]?.order ?? 999;
    const orderB = sectionConfig[b.id]?.order ?? 999;
    return orderA - orderB;
  });

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetSectionId: string) => {
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    const newOrder = [...sortedSections.map((s) => s.id)];
    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);

    onReorderSections(newOrder);
    setDraggedSection(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Section Manager</h3>
        <button className="text-xs text-[#3351FD] hover:underline">Save Preset</button>
      </div>

      <div className="space-y-2">
        {sortedSections.map((section) => {
          const isEnabled = sectionConfig[section.id]?.enabled ?? true;
          const isDragging = draggedSection === section.id;

          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(section.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                isDragging
                  ? "opacity-50 border-[#3351FD] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <Icon
                icon="mingcute:menu-line"
                className="w-4 h-4 text-gray-400 cursor-move"
                title="Drag to reorder"
              />
              <Icon icon={section.icon} className="w-5 h-5 text-gray-600" />
              <span className="flex-1 text-sm font-medium text-gray-700">{section.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => onToggleSection(section.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3351FD] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3351FD]"></div>
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <Icon icon="mingcute:information-line" className="w-4 h-4 inline mr-1" />
          Drag sections to reorder. Toggle to show/hide sections.
        </p>
      </div>
    </div>
  );
}

