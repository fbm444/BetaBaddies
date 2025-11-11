import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Navbar } from "./Navbar";

export function Layout() {
  const [rateLimitMessage, setRateLimitMessage] = useState<
    { headline: string; body: string } | null
  >(null);
  const softWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleSoftWarning = (event: Event) => {
      const customEvent = event as CustomEvent<{ endpoint?: string; method?: string }>;
      if (softWarningTimerRef.current) {
        clearTimeout(softWarningTimerRef.current);
      }

      const method = customEvent.detail?.method || "Request";
      const endpoint = customEvent.detail?.endpoint || "";

      let headline = "Heads up!";
      let body =
        "Looks like you're moving fast—give it a moment and everything will keep flowing.";

      if (endpoint && endpoint !== "/health") {
        const formattedMethod = method.toUpperCase();
        const trimmedEndpoint = endpoint.replace(/\?.*$/, "");
        const displayName = trimmedEndpoint
          .replace(/^\/api\/v1\//, "")
          .replace(/[-_/]+/g, " ")
          .trim();

        headline = "Taking a quick breather";
        body = `We’re pacing requests to keep things smooth while ${formattedMethod} ${displayName ||
          "the app"} updates. Try again in a few seconds.`;
      }

      setRateLimitMessage({ headline, body });

      softWarningTimerRef.current = setTimeout(() => {
      setRateLimitMessage(null);
        softWarningTimerRef.current = null;
      }, 4000);
    };

    window.addEventListener("app:rate-limit-warning", handleSoftWarning);
    return () => {
      window.removeEventListener("app:rate-limit-warning", handleSoftWarning);
      if (softWarningTimerRef.current) {
        clearTimeout(softWarningTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {rateLimitMessage && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-amber-200 bg-white/95 px-5 py-4 text-sm text-amber-900 shadow-lg shadow-amber-100/80 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Icon icon="mingcute:dashboard-2-line" width={20} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">{rateLimitMessage.headline}</p>
              <p className="text-sm text-amber-800">{rateLimitMessage.body}</p>
            </div>
            <button
              onClick={() => setRateLimitMessage(null)}
              className="rounded-full p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-600"
              aria-label="Dismiss rate limit notice"
            >
              <Icon icon="mingcute:close-line" width={18} />
            </button>
          </div>
        </div>
      )}
      <main className="min-h-[calc(100vh-80px)]">
        <Outlet />
      </main>
    </div>
  );
}
