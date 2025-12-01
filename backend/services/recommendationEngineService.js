class RecommendationEngineService {
  /**
   * Generate prioritized recommendations to improve success probability
   */
  async generateRecommendations(predictionData) {
    const { probability, confidence, factors } = predictionData;
    const recommendations = [];

    // Analyze each factor and generate recommendations
    Object.entries(factors).forEach(([factorName, factorData]) => {
      const score = factorData.score;
      const breakdown = factorData.breakdown || {};

      // Low preparation score
      if (factorName === "preparation" && score < 70) {
        if (breakdown.resume?.score < 100) {
          recommendations.push({
            id: `prep-resume-${Date.now()}`,
            title: "Attach Resume to Application",
            description: "Ensure your resume is attached to this job application for better preparation score.",
            priority: "high",
            impact: 15,
            category: "preparation",
            actionUrl: "/job-opportunities",
            completed: false,
          });
        }

        if (breakdown.coverLetter?.score < 100) {
          recommendations.push({
            id: `prep-coverletter-${Date.now()}`,
            title: "Add Cover Letter",
            description: "Write and attach a personalized cover letter to improve your application.",
            priority: breakdown.coverLetter?.score === 0 ? "high" : "medium",
            impact: 10,
            category: "preparation",
            actionUrl: "/job-opportunities",
            completed: false,
          });
        }
      }

      // Low role match
      if (factorName === "roleMatch" && score < 60) {
        recommendations.push({
          id: `role-match-${Date.now()}`,
          title: "Review Role Requirements",
          description: "Analyze the job description and identify skills gaps. Consider highlighting relevant experience.",
          priority: "high",
          impact: 20,
          category: "role-match",
          actionUrl: "/job-opportunities",
          completed: false,
        });
      }

      // Low company research
      if (factorName === "companyResearch" && score < 60) {
        if (breakdown.notes?.score < 50) {
          recommendations.push({
            id: `research-notes-${Date.now()}`,
            title: "Add Company Research Notes",
            description: "Research the company and add notes about culture, values, and recent news.",
            priority: "medium",
            impact: 12,
            category: "research",
            actionUrl: "/job-opportunities",
            completed: false,
          });
        }

        if (breakdown.companyInfo?.score < 100) {
          recommendations.push({
            id: `research-info-${Date.now()}`,
            title: "Complete Company Information",
            description: "Fill in missing company details like location, website, and salary range.",
            priority: "medium",
            impact: 8,
            category: "research",
            actionUrl: "/job-opportunities",
            completed: false,
          });
        }
      }

      // Low practice hours
      if (factorName === "practiceHours" && score < 50) {
        if (breakdown.writingPractice?.sessions < 5) {
          recommendations.push({
            id: `practice-writing-${Date.now()}`,
            title: "Complete Writing Practice Sessions",
            description: `Complete at least 5 writing practice sessions. You've done ${breakdown.writingPractice?.sessions || 0} so far.`,
            priority: "high",
            impact: 18,
            category: "practice",
            actionUrl: "/writing-practice",
            completed: false,
          });
        }

        if (breakdown.nervesExercises?.exercises < 3) {
          recommendations.push({
            id: `practice-nerves-${Date.now()}`,
            title: "Complete Nerves Management Exercises",
            description: "Practice breathing and visualization exercises to manage interview anxiety.",
            priority: "medium",
            impact: 10,
            category: "practice",
            actionUrl: "/writing-practice?tab=exercises",
            completed: false,
          });
        }

        if (!breakdown.recentActivity?.score || breakdown.recentActivity.score === 0) {
          recommendations.push({
            id: `practice-recent-${Date.now()}`,
            title: "Practice This Week",
            description: "Complete at least one practice session this week to maintain momentum.",
            priority: "high",
            impact: 15,
            category: "practice",
            actionUrl: "/writing-practice",
            completed: false,
          });
        }
      }
    }

    // Overall probability recommendations
    if (probability < 50) {
      recommendations.push({
        id: `overall-low-${Date.now()}`,
        title: "Focus on High-Impact Improvements",
        description: "Your success probability is below 50%. Focus on completing high-priority recommendations above.",
        priority: "high",
        impact: 25,
        category: "overall",
        completed: false,
      });
    }

    if (confidence < 60) {
      recommendations.push({
        id: `confidence-low-${Date.now()}`,
        title: "Complete Missing Information",
        description: "Your prediction confidence is low due to missing data. Complete your profile and job applications for more accurate predictions.",
        priority: "medium",
        impact: 10,
        category: "overall",
        completed: false,
      });
    }

    // Sort by priority and impact
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact - a.impact;
    });

    // Limit to top 10 recommendations
    return recommendations.slice(0, 10);
  }
}

export default new RecommendationEngineService();

