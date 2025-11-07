import { useState } from "react";
import { Icon } from "@iconify/react";

interface ResumeAIGeneratorProps {
  resumeId: string;
  onGenerate: (type: 'content' | 'skills' | 'experience', jobId?: string) => void;
}

export function ResumeAIGenerator({ resumeId, onGenerate }: ResumeAIGeneratorProps) {
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [generationType, setGenerationType] = useState<'content' | 'skills' | 'experience'>('content');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock jobs for preview
  const mockJobs = [
    { id: "1", title: "Senior Software Engineer", company: "Tech Corp" },
    { id: "2", title: "Full Stack Developer", company: "Startup Inc" },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      onGenerate(generationType, selectedJob || undefined);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Icon icon="mingcute:ai-fill" className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Content Generator</h3>
          <p className="text-sm text-gray-600">Generate tailored content for your resume</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Generation Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Generation Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setGenerationType('content')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                generationType === 'content'
                  ? 'bg-[#3351FD] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setGenerationType('skills')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                generationType === 'skills'
                  ? 'bg-[#3351FD] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setGenerationType('experience')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                generationType === 'experience'
                  ? 'bg-[#3351FD] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Experience
            </button>
          </div>
        </div>

        {/* Job Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Job Posting (Optional)</label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
          >
            <option value="">No specific job</option>
            {mockJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} at {job.company}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Icon icon="mingcute:ai-fill" className="w-5 h-5" />
              <span>Generate Content</span>
            </>
          )}
        </button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon icon="mingcute:information-line" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>AI analyzes job requirements and your profile</li>
                <li>Generates tailored bullet points</li>
                <li>Optimizes keywords for ATS compatibility</li>
                <li>Provides multiple variations to choose from</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

