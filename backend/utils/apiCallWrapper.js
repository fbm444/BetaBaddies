import apiMonitoringService from "../services/apiMonitoringService.js";

/**
 * Wraps an API call with monitoring, error handling, and fallback support
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Name of the API service (e.g., 'openai', 'abstract_api')
 * @param {Function} options.apiCall - The actual API call function (async)
 * @param {string} options.endpoint - Endpoint or method name for logging
 * @param {Object} options.fallback - Fallback function if API call fails
 * @param {number} options.userId - Optional user ID for tracking
 * @param {Function} options.onError - Optional error handler
 * @param {Function} options.costCalculator - Optional function to calculate cost from response
 * @param {Function} options.tokenCalculator - Optional function to extract tokens from response
 * 
 * @returns {Promise} The result of the API call or fallback
 */
export async function wrapApiCall({
  serviceName,
  apiCall,
  endpoint = "unknown",
  fallback = null,
  userId = null,
  onError = null,
  costCalculator = null,
  tokenCalculator = null,
}) {
  const startTime = Date.now();
  let responseTimeMs = null;
  let success = false;
  let responseStatus = null;
  let tokensUsed = null;
  let costUsd = null;
  let errorCode = null;
  let errorMessage = null;

  try {
    // Execute the API call
    const result = await apiCall();
    responseTimeMs = Date.now() - startTime;
    success = true;
    responseStatus = 200; // Assume success if no error

    // Extract tokens and cost if calculators provided
    if (tokenCalculator && typeof tokenCalculator === "function") {
      tokensUsed = tokenCalculator(result);
    } else if (result?.usage?.total_tokens) {
      tokensUsed = result.usage.total_tokens;
    }

    if (costCalculator && typeof costCalculator === "function") {
      costUsd = costCalculator(result, tokensUsed);
    }

    // Log successful usage
    await apiMonitoringService.logUsage({
      serviceName,
      endpoint,
      userId,
      responseStatus,
      responseTimeMs,
      tokensUsed,
      costUsd,
      success: true,
    });

    return result;
  } catch (error) {
    responseTimeMs = Date.now() - startTime;
    success = false;

    // Determine error code and message
    // Handle OpenAI API errors (they have a different structure)
    if (error.status) {
      responseStatus = error.status;
      
      if (responseStatus === 429) {
        errorCode = "RATE_LIMIT";
        errorMessage = error.message || "Rate limit exceeded";
      } else if (responseStatus === 401 || responseStatus === 403) {
        errorCode = "AUTH_ERROR";
        errorMessage = error.message || "Authentication failed";
      } else if (responseStatus >= 500) {
        errorCode = "SERVER_ERROR";
        errorMessage = error.message || "API server error";
      } else {
        errorCode = "API_ERROR";
        errorMessage = error.message || "API call failed";
      }
    } else if (error.response) {
      responseStatus = error.response.status;
      
      if (responseStatus === 429) {
        errorCode = "RATE_LIMIT";
        errorMessage = "Rate limit exceeded";
      } else if (responseStatus === 401 || responseStatus === 403) {
        errorCode = "AUTH_ERROR";
        errorMessage = "Authentication failed";
      } else if (responseStatus >= 500) {
        errorCode = "SERVER_ERROR";
        errorMessage = "API server error";
      } else {
        errorCode = "API_ERROR";
        errorMessage = error.response.data?.message || error.message || "API call failed";
      }
    } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      errorCode = "TIMEOUT";
      errorMessage = "Request timeout";
      responseStatus = 408;
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network connection failed";
      responseStatus = 0;
    } else {
      errorCode = "UNKNOWN_ERROR";
      errorMessage = error.message || "Unknown error occurred";
    }

    // Log the error
    await apiMonitoringService.logError({
      serviceName,
      endpoint,
      userId,
      errorCode,
      errorMessage,
      errorDetails: {
        status: responseStatus,
        code: error.code,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      responseStatus,
    });

    // Call custom error handler if provided
    if (onError && typeof onError === "function") {
      try {
        onError(error, { serviceName, endpoint, errorCode, errorMessage });
      } catch (handlerError) {
        console.error("Error in custom error handler:", handlerError);
      }
    }

    // Log failed usage
    await apiMonitoringService.logUsage({
      serviceName,
      endpoint,
      userId,
      requestMethod: "POST", // Default, can be overridden
      responseStatus,
      responseTimeMs,
      success: false,
    });

    // Try fallback if available
    if (fallback && typeof fallback === "function") {
      try {
        console.log(`🔄 Using fallback for ${serviceName}/${endpoint}`);
        const fallbackResult = await fallback(error);
        
        // Log fallback usage
        await apiMonitoringService.logUsage({
          serviceName: `${serviceName}_fallback`,
          endpoint,
          userId,
          responseStatus: 200,
          responseTimeMs: Date.now() - startTime,
          success: true,
        });

        return fallbackResult;
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed for ${serviceName}/${endpoint}:`, fallbackError);
        throw fallbackError;
      }
    }

    // Re-throw if no fallback
    throw error;
  }
}

/**
 * Helper to create a monitored API client
 */
export function createMonitoredApiClient(serviceName, defaultOptions = {}) {
  return {
    async call(apiCall, options = {}) {
      return wrapApiCall({
        serviceName,
        ...defaultOptions,
        ...options,
        apiCall,
      });
    },
  };
}

