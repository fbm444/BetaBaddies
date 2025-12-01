import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import type { ButtonHTMLAttributes } from "react";

interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function BackButton({ label = "Back", className = "", ...rest }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors ${className}`}
      {...rest}
    >
      <Icon icon="mingcute:arrow-left-line" width={18} height={18} />
      <span className="font-medium">{label}</span>
    </button>
  );
}


