import salaryBenchmarkService from "../services/salaryBenchmarkService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class SalaryBenchmarkController {
  /**
   * GET /api/v1/salary-benchmarks
   * Get salary benchmark for a job title and location
   * Query params: jobTitle, location
   */
  getSalaryBenchmark = asyncHandler(async (req, res) => {
    const { jobTitle, location } = req.query;

    if (!jobTitle || !location) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "jobTitle and location query parameters are required",
        },
      });
    }

    try {
      const benchmark = await salaryBenchmarkService.getSalaryBenchmark(
        jobTitle,
        location
      );

      if (!benchmark) {
        return res.status(200).json({
          ok: true,
          data: {
            benchmark: null,
            message: "Salary benchmark data not available for this position and location",
          },
        });
      }

      res.status(200).json({
        ok: true,
        data: {
          benchmark: {
            percentile25: benchmark.percentile25,
            percentile50: benchmark.percentile50,
            percentile75: benchmark.percentile75,
            source: benchmark.source,
            dataYear: benchmark.dataYear,
            lastUpdated: benchmark.lastUpdated,
            cached: benchmark.cached || false,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in getSalaryBenchmark controller:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch salary benchmark",
        },
      });
    }
  });
}

export default new SalaryBenchmarkController();

