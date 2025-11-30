import { useState } from "react";
import { Icon } from "@iconify/react";

export function SupportGroups() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Support Groups</h1>
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Icon icon="mingcute:community-line" width={64} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-slate-600">
          Support groups and peer networking features will be available soon.
        </p>
      </div>
    </div>
  );
}

