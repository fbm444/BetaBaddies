import { wrapApiCall } from "./apiCallWrapper.js";

/**
 * Wraps OpenAI API calls with monitoring
 * 
 * @param {Object} openaiClient - The OpenAI client instance
 * @param {Function} apiCall - The OpenAI API call function
 * @param {Object} options - Options for monitoring
 * @param {string} options.endpoint - Endpoint name for logging
 * @param {number} options.userId - User ID for tracking
 * @param {Function} options.fallback - Fallback function if API call fails
 * 
 * @returns {Promise} The result of the API call
 */
export async function wrapOpenAICall(openaiClient, apiCall, options = {}) {
  const { endpoint = "chat.completions.create", userId = null, fallback = null } = options;

  // OpenAI cost calculator based on model and tokens
  const calculateCost = (result, tokensUsed) => {
    if (!result || !tokensUsed) return 0;

    const model = result.model || options.model || "gpt-4o-mini";
    const promptTokens = result.usage?.prompt_tokens || 0;
    const completionTokens = result.usage?.completion_tokens || 0;

    // Pricing per 1M tokens (as of 2024)
    const pricing = {
      "gpt-4o": { input: 2.50, output: 10.00 },
      "gpt-4o-mini": { input: 0.15, output: 0.60 },
      "gpt-4": { input: 30.00, output: 60.00 },
      "gpt-4-turbo": { input: 10.00, output: 30.00 },
      "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
    };

    const modelPricing = pricing[model] || pricing["gpt-4o-mini"];
    const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
    const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  };

  // Token calculator
  const getTokens = (result) => {
    return result?.usage?.total_tokens || null;
  };

  return wrapApiCall({
    serviceName: "openai",
    apiCall,
    endpoint,
    userId,
    fallback,
    costCalculator: calculateCost,
    tokenCalculator: getTokens,
  });
}

/**
 * Helper to create a monitored OpenAI chat completion
 */
export async function createMonitoredChatCompletion(openaiClient, options, monitoringOptions = {}) {
  return wrapOpenAICall(
    openaiClient,
    () => openaiClient.chat.completions.create(options),
    {
      endpoint: monitoringOptions.endpoint || "chat.completions.create",
      userId: monitoringOptions.userId || null,
      fallback: monitoringOptions.fallback || null,
      model: options.model,
    }
  );
}

