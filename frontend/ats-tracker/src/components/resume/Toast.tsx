import { Icon } from "@iconify/react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] animate-slide-in ${
        type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : type === "error"
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-blue-50 border border-blue-200 text-blue-800"
      }`}
    >
      <Icon
        icon={
          type === "success"
            ? "mingcute:check-circle-line"
            : type === "error"
            ? "mingcute:alert-circle-line"
            : "mingcute:information-line"
        }
        className={`w-5 h-5 flex-shrink-0 ${
          type === "success"
            ? "text-green-600"
            : type === "error"
            ? "text-red-600"
            : "text-blue-600"
        }`}
      />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <Icon
          icon="mingcute:close-line"
          className={`w-4 h-4 ${
            type === "success"
              ? "text-green-600"
              : type === "error"
              ? "text-red-600"
              : "text-blue-600"
          }`}
        />
      </button>
    </div>
  );
}

