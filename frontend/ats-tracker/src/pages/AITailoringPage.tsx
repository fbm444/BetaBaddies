import { useSearchParams } from "react-router-dom";
import { AITailoringLoader } from "../components/resume/AITailoringLoader";

export function AITailoringPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId");
  const jobId = searchParams.get("jobId");

  if (!templateId || !jobId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Missing Parameters</h2>
          <p className="text-gray-600">Template ID and Job ID are required.</p>
        </div>
      </div>
    );
  }

  return <AITailoringLoader templateId={templateId} jobId={jobId} />;
}

