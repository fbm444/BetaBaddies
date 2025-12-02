import { useState } from "react";
import { Icon } from "@iconify/react";
import type { SalaryNegotiation } from "../../../types";

interface ConfidenceExercisesTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: () => void;
}

const exerciseTypes = [
  {
    id: "role_play",
    title: "Role-Play Scenarios",
    description: "Practice negotiation conversations with different scenarios",
    icon: "mingcute:user-2-line",
    color: "blue",
  },
  {
    id: "script_practice",
    title: "Script Practice",
    description: "Practice delivering your negotiation scripts",
    icon: "mingcute:play-line",
    color: "green",
  },
  {
    id: "value_articulation",
    title: "Value Articulation",
    description: "Practice explaining your value and achievements",
    icon: "mingcute:star-line",
    color: "purple",
  },
  {
    id: "objection_handling",
    title: "Objection Handling",
    description: "Practice responding to common objections",
    icon: "mingcute:question-line",
    color: "orange",
  },
];

// Role-play scenarios
const rolePlayScenarios = [
  {
    id: "initial_offer",
    title: "Initial Offer Response",
    scenario: "You've just received an offer. The recruiter says: 'We're excited to offer you $X. What do you think?'",
    yourRole: "You are the candidate receiving the offer",
    theirRole: "Recruiter/Hiring Manager",
    tips: [
      "Express gratitude and enthusiasm first",
      "Ask for time to consider (24-48 hours)",
      "Don't accept or reject immediately",
      "Mention you'd like to discuss the full compensation package"
    ],
    practicePrompt: "How would you respond to receiving the initial offer? Practice your response out loud."
  },
  {
    id: "salary_discussion",
    title: "Salary Discussion",
    scenario: "The hiring manager asks: 'What are your salary expectations?'",
    yourRole: "You are the candidate",
    theirRole: "Hiring Manager",
    tips: [
      "Avoid giving a specific number first if possible",
      "Reference market research if you have it",
      "Focus on the total compensation package",
      "Express flexibility while maintaining your value"
    ],
    practicePrompt: "How would you handle this salary question? Practice articulating your expectations."
  },
  {
    id: "counteroffer_response",
    title: "Responding to Counteroffer",
    scenario: "You've made a counteroffer. The recruiter responds: 'I understand, but our budget is limited. The best we can do is $Y.'",
    yourRole: "You are the candidate",
    theirRole: "Recruiter",
    tips: [
      "Acknowledge their constraints",
      "Explore non-salary benefits (equity, PTO, professional development)",
      "Ask about future salary review timelines",
      "Consider the full package value"
    ],
    practicePrompt: "How would you respond to a lower counteroffer? Practice negotiating for other benefits."
  },
  {
    id: "final_decision",
    title: "Final Decision Time",
    scenario: "The recruiter says: 'This is our final offer. We need your decision by end of week.'",
    yourRole: "You are the candidate",
    theirRole: "Recruiter",
    tips: [
      "Take the time you need (don't be rushed)",
      "Ask clarifying questions about the offer",
      "Consider all factors: salary, benefits, growth, culture",
      "Be respectful but firm about your timeline"
    ],
    practicePrompt: "How would you handle the pressure of a deadline? Practice maintaining your boundaries."
  }
];

// Common objections
const commonObjections = [
  {
    id: "budget_constraint",
    objection: "We don't have budget for that salary. Our offer is already at the top of our range.",
    suggestedResponse: "I understand budget constraints. Could we explore other ways to increase the total compensation value? For example, additional equity, a signing bonus, accelerated salary reviews, or enhanced benefits?",
    tips: [
      "Acknowledge their constraint",
      "Shift focus to total compensation",
      "Propose creative alternatives",
      "Maintain collaborative tone"
    ]
  },
  {
    id: "market_rate",
    objection: "Your requested salary is above market rate for this role.",
    suggestedResponse: "I appreciate that perspective. Based on my research for [role] in [location] with [experience] years of experience, the market range is $X-$Y. My request of $Z falls within this range and reflects my [specific value/achievements]. Could we discuss how my experience aligns with the role requirements?",
    tips: [
      "Reference your market research",
      "Connect salary to your value",
      "Be specific about your contributions",
      "Stay data-driven"
    ]
  },
  {
    id: "experience_level",
    objection: "You don't have enough experience for that salary level.",
    suggestedResponse: "I understand the concern. While I may have [X] years of experience, I've delivered [specific achievements/results] that demonstrate impact beyond typical experience levels. For example, [concrete example]. I'm confident I can bring this level of value to your team.",
    tips: [
      "Don't get defensive",
      "Focus on achievements, not just years",
      "Provide concrete examples",
      "Emphasize impact and results"
    ]
  },
  {
    id: "internal_equity",
    objection: "We need to maintain internal equity. Paying you more would upset our current team.",
    suggestedResponse: "I respect the importance of internal equity. I'd like to understand the compensation structure better. Perhaps we could discuss a different approach, such as a title adjustment, additional responsibilities, or a faster path to the next level that would justify the compensation?",
    tips: [
      "Show respect for their process",
      "Ask for more information",
      "Propose alternative solutions",
      "Focus on role scope, not just salary"
    ]
  },
  {
    id: "take_it_or_leave",
    objection: "This is our best and final offer. Take it or leave it.",
    suggestedResponse: "I appreciate you being direct. This is an important decision for me, and I'd like to take [24-48 hours] to consider the full offer, including all aspects of the compensation package and the opportunity. I'll get back to you by [specific date].",
    tips: [
      "Don't make a decision under pressure",
      "Request time to consider",
      "Stay professional and respectful",
      "Evaluate the full opportunity, not just salary"
    ]
  }
];

export function ConfidenceExercisesTab({
  negotiation,
  onUpdate,
}: ConfidenceExercisesTabProps) {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState(3);
  const [notes, setNotes] = useState("");
  
  // Exercise-specific state
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [valuePoints, setValuePoints] = useState<string[]>([]);
  const [currentValuePoint, setCurrentValuePoint] = useState("");

  const handleStartExercise = (exerciseId: string) => {
    setActiveExercise(exerciseId);
    setSelfRating(3);
    setNotes("");
    setSelectedScenario(null);
    setSelectedObjection(null);
    setUserResponse("");
    setShowTips(false);
    setCurrentScriptIndex(0);
    setValuePoints([]);
    setCurrentValuePoint("");
  };

  const handleCompleteExercise = async () => {
    // TODO: Save exercise completion to backend
    // For now, just reset state
    setActiveExercise(null);
    setSelfRating(3);
    setNotes("");
    setSelectedScenario(null);
    setSelectedObjection(null);
    setUserResponse("");
    setShowTips(false);
    setCurrentScriptIndex(0);
    setValuePoints([]);
    setCurrentValuePoint("");
    onUpdate();
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "green":
        return "bg-green-50 border-green-200 text-green-700";
      case "purple":
        return "bg-purple-50 border-purple-200 text-purple-700";
      case "orange":
        return "bg-orange-50 border-orange-200 text-orange-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  // Render Role-Play Exercise
  const renderRolePlayExercise = () => {
    if (!selectedScenario) {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Select a Scenario</h4>
            <p className="text-sm text-slate-600 mb-4">
              Choose a negotiation scenario to practice. Each scenario represents a common situation you might encounter.
            </p>
          </div>
          <div className="space-y-3">
            {rolePlayScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-900 mb-1">{scenario.title}</h5>
                    <p className="text-sm text-slate-600">{scenario.scenario}</p>
                  </div>
                  <Icon icon="mingcute:arrow-right-line" width={20} className="text-blue-500 ml-2 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const scenario = rolePlayScenarios.find(s => s.id === selectedScenario);
    if (!scenario) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedScenario(null)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
            >
              <Icon icon="mingcute:arrow-left-line" width={16} />
              Back to Scenarios
            </button>
            <h4 className="font-semibold text-slate-900 text-lg">{scenario.title}</h4>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="mb-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Scenario:</p>
            <p className="text-slate-800 leading-relaxed">
              {scenario.scenario.replace('$X', `$${negotiation.initialOffer?.baseSalary?.toLocaleString() || 'XXX,XXX'}`)}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-2">Your Role</p>
              <p className="text-sm text-slate-700">{scenario.yourRole}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-2">Their Role</p>
              <p className="text-sm text-slate-700">{scenario.theirRole}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="mb-4">
            <h5 className="font-semibold text-slate-900 mb-2">Practice Your Response</h5>
            <p className="text-sm text-slate-600 mb-4">{scenario.practicePrompt}</p>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
              placeholder="Write out your response here, then practice saying it out loud..."
            />
          </div>

          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium mb-4 flex items-center justify-center gap-2"
          >
            <Icon icon={showTips ? "mingcute:eye-close-line" : "mingcute:eye-line"} width={18} />
            {showTips ? "Hide Tips" : "Show Tips"}
          </button>

          {showTips && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Tips for this scenario:</p>
              <ul className="space-y-2">
                {scenario.tips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                    <Icon icon="mingcute:check-circle-line" width={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Script Practice Exercise
  const renderScriptPracticeExercise = () => {
    const scripts = negotiation.scripts ? Object.values(negotiation.scripts) : [];
    
    if (scripts.length === 0) {
      return (
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-start gap-3">
            <Icon icon="mingcute:information-line" width={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-yellow-900 mb-2">No Scripts Available</h5>
              <p className="text-sm text-yellow-800 mb-4">
                You need to generate negotiation scripts first. Go to the "Scripts" tab to create scripts for this negotiation.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentScript = scripts[currentScriptIndex];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 text-lg mb-2">Script Practice</h4>
            <p className="text-sm text-slate-600">
              Practice {currentScriptIndex + 1} of {scripts.length}
            </p>
          </div>
          {scripts.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentScriptIndex(Math.max(0, currentScriptIndex - 1))}
                disabled={currentScriptIndex === 0}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mingcute:arrow-left-line" width={18} />
              </button>
              <button
                onClick={() => setCurrentScriptIndex(Math.min(scripts.length - 1, currentScriptIndex + 1))}
                disabled={currentScriptIndex === scripts.length - 1}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mingcute:arrow-right-line" width={18} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="mb-4">
            <p className="text-sm font-semibold text-green-900 mb-2">Scenario:</p>
            <p className="text-slate-800 font-medium">{currentScript.scenario}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-green-200">
            <p className="text-sm font-semibold text-green-700 mb-3">Your Script:</p>
            <div className="prose prose-sm max-w-none">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{currentScript.script}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
          <div>
            <h5 className="font-semibold text-slate-900 mb-2">Practice Instructions</h5>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
              <li>Read through the script once silently</li>
              <li>Practice saying it out loud 2-3 times</li>
              <li>Focus on natural delivery, not memorization</li>
              <li>Pay attention to your tone and pace</li>
              <li>Record yourself if possible to review</li>
            </ol>
          </div>

          {currentScript.keyPhrases && currentScript.keyPhrases.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">Key Phrases to Emphasize:</p>
              <div className="flex flex-wrap gap-2">
                {currentScript.keyPhrases.map((phrase, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Practice Notes
            </label>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={4}
              placeholder="Note how it felt, what you'd change, areas that need work..."
            />
          </div>
        </div>
      </div>
    );
  };

  // Render Value Articulation Exercise
  const renderValueArticulationExercise = () => {
    const talkingPoints = negotiation.talkingPoints || [];
    const initialSalary = negotiation.initialOffer?.baseSalary || 0;
    const targetSalary = negotiation.targetCompensation?.baseSalary || 0;
    const salaryGap = targetSalary - initialSalary;

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-slate-900 text-lg mb-2">Value Articulation Practice</h4>
          <p className="text-sm text-slate-600">
            Practice explaining why you're worth the compensation you're requesting. Connect your achievements to your value.
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="mb-4">
            <p className="text-sm font-semibold text-purple-900 mb-2">Your Negotiation Context:</p>
            <div className="bg-white rounded-lg p-4 border border-purple-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Initial Offer:</span>
                <span className="text-sm font-semibold text-slate-900">
                  ${initialSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Target Salary:</span>
                <span className="text-sm font-semibold text-green-600">
                  ${targetSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-700">Difference:</span>
                <span className="text-sm font-bold text-purple-600">
                  +${salaryGap.toLocaleString()} ({salaryGap > 0 && initialSalary > 0 ? ((salaryGap / initialSalary) * 100).toFixed(1) : '0'}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {talkingPoints.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h5 className="font-semibold text-slate-900 mb-3">Your Talking Points:</h5>
            <div className="space-y-3">
              {talkingPoints.map((point) => (
                <div key={point.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                      {point.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-2">{point.point}</p>
                  <p className="text-xs text-slate-600">{point.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
          <div>
            <h5 className="font-semibold text-slate-900 mb-2">Practice Articulating Your Value</h5>
            <p className="text-sm text-slate-600 mb-4">
              Write out how you would explain your value. Use the STAR method (Situation, Task, Action, Result).
            </p>
            
            <div className="space-y-3 mb-4">
              {valuePoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{point}</p>
                  </div>
                  <button
                    onClick={() => setValuePoints(valuePoints.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Icon icon="mingcute:close-line" width={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentValuePoint}
                onChange={(e) => setCurrentValuePoint(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentValuePoint.trim()) {
                    setValuePoints([...valuePoints, currentValuePoint.trim()]);
                    setCurrentValuePoint("");
                  }
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add a value point (e.g., 'Led team that increased revenue by 30%')"
              />
              <button
                onClick={() => {
                  if (currentValuePoint.trim()) {
                    setValuePoints([...valuePoints, currentValuePoint.trim()]);
                    setCurrentValuePoint("");
                  }
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                <Icon icon="mingcute:add-line" width={20} />
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">Practice Framework:</p>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Situation:</strong> Set the context</p>
              <p><strong>Task:</strong> What needed to be done</p>
              <p><strong>Action:</strong> What you did specifically</p>
              <p><strong>Result:</strong> Quantifiable outcome/impact</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Practice Your Value Pitch
            </label>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={6}
              placeholder="Write out how you would explain your value. Practice connecting your achievements to the compensation you're requesting..."
            />
          </div>
        </div>
      </div>
    );
  };

  // Render Objection Handling Exercise
  const renderObjectionHandlingExercise = () => {
    if (!selectedObjection) {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Select an Objection to Practice</h4>
            <p className="text-sm text-slate-600 mb-4">
              Choose a common objection you might face. Practice your response to build confidence.
            </p>
          </div>
          <div className="space-y-3">
            {commonObjections.map((obj) => (
              <button
                key={obj.id}
                onClick={() => setSelectedObjection(obj.id)}
                className="w-full text-left p-4 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 mb-1">"They say:"</p>
                    <p className="text-sm text-slate-700 italic mb-3">"{obj.objection}"</p>
                    <p className="text-xs text-orange-600">Click to practice your response →</p>
                  </div>
                  <Icon icon="mingcute:arrow-right-line" width={20} className="text-orange-500 ml-2 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const objection = commonObjections.find(o => o.id === selectedObjection);
    if (!objection) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedObjection(null)}
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mb-2"
            >
              <Icon icon="mingcute:arrow-left-line" width={16} />
              Back to Objections
            </button>
            <h4 className="font-semibold text-slate-900 text-lg">Practice Your Response</h4>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
          <div className="mb-4">
            <p className="text-sm font-semibold text-orange-900 mb-2">The Objection:</p>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-slate-800 italic">"{objection.objection}"</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
          <div>
            <h5 className="font-semibold text-slate-900 mb-2">Your Response</h5>
            <p className="text-sm text-slate-600 mb-4">
              Write out how you would respond to this objection. Be respectful, data-driven, and solution-oriented.
            </p>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={6}
              placeholder="Write your response here..."
            />
          </div>

          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium flex items-center justify-center gap-2"
          >
            <Icon icon={showTips ? "mingcute:eye-close-line" : "mingcute:eye-line"} width={18} />
            {showTips ? "Hide Suggested Response" : "Show Suggested Response"}
          </button>

          {showTips && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-4">
              <div>
                <p className="text-sm font-semibold text-green-900 mb-2">Suggested Response:</p>
                <p className="text-sm text-green-800 leading-relaxed">{objection.suggestedResponse}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 mb-2">Key Tips:</p>
                <ul className="space-y-2">
                  {objection.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                      <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main exercise renderer
  if (activeExercise) {
    const exercise = exerciseTypes.find((e) => e.id === activeExercise);
    
    let exerciseContent;
    switch (activeExercise) {
      case "role_play":
        exerciseContent = renderRolePlayExercise();
        break;
      case "script_practice":
        exerciseContent = renderScriptPracticeExercise();
        break;
      case "value_articulation":
        exerciseContent = renderValueArticulationExercise();
        break;
      case "objection_handling":
        exerciseContent = renderObjectionHandlingExercise();
        break;
      default:
        exerciseContent = null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{exercise?.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{exercise?.description}</p>
          </div>
          <button
            onClick={() => setActiveExercise(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {exerciseContent}

        {/* Self-Rating and Notes Section - shown after user has interacted */}
        {(userResponse || selectedScenario || selectedObjection || valuePoints.length > 0) && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Self-Rating (1-5)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelfRating(rating)}
                    className={`w-12 h-12 rounded-lg font-semibold transition-colors ${
                      selfRating >= rating
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Rate your confidence level after completing this exercise
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reflection Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Write down what went well, what you learned, or areas to improve..."
              />
            </div>

            <button
              onClick={handleCompleteExercise}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Complete Exercise
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Confidence Building Exercises</h3>
        <p className="text-sm text-slate-600 mt-1">
          Practice your negotiation skills with interactive exercises
        </p>
      </div>

      {/* Exercise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exerciseTypes.map((exercise) => (
          <div
            key={exercise.id}
            className={`bg-white rounded-xl p-6 border-2 ${getColorClasses(exercise.color)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <Icon icon={exercise.icon} width={32} height={32} className="text-current flex-shrink-0" style={{ display: 'inline-block' }} />
            </div>
            <h4 className="text-lg font-semibold mb-2">{exercise.title}</h4>
            <p className="text-sm mb-4 opacity-80">{exercise.description}</p>
            <button
              onClick={() => handleStartExercise(exercise.id)}
              className="w-full px-4 py-2 bg-white text-current rounded-lg hover:bg-opacity-80 font-medium transition-colors"
            >
              Start Exercise
            </button>
          </div>
        ))}
      </div>

      {/* Completed Exercises */}
      {negotiation.practiceSessionsCompleted > 0 && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600" />
            <p className="text-sm font-medium text-green-900">
              {negotiation.practiceSessionsCompleted} practice session
              {negotiation.practiceSessionsCompleted !== 1 ? "s" : ""} completed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
