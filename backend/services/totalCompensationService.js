class TotalCompensationService {
  // Calculate total compensation
  calculateTotalCompensation(compensationData) {
    const {
      baseSalary = 0,
      bonus = 0,
      equity = 0,
      benefitsValue = 0,
      other = 0,
    } = compensationData;

    return baseSalary + bonus + equity + benefitsValue + other;
  }

  // Compare two compensation packages
  compareCompensationPackages(offer1, offer2) {
    const total1 = this.calculateTotalCompensation(offer1);
    const total2 = this.calculateTotalCompensation(offer2);

    const difference = total2 - total1;
    const percentDifference = total1 > 0 ? ((difference / total1) * 100).toFixed(1) : 0;

    const breakdown = {
      baseSalary: {
        offer1: offer1.baseSalary || 0,
        offer2: offer2.baseSalary || 0,
        difference: (offer2.baseSalary || 0) - (offer1.baseSalary || 0),
      },
      bonus: {
        offer1: offer1.bonus || 0,
        offer2: offer2.bonus || 0,
        difference: (offer2.bonus || 0) - (offer1.bonus || 0),
      },
      equity: {
        offer1: offer1.equity || 0,
        offer2: offer2.equity || 0,
        difference: (offer2.equity || 0) - (offer1.equity || 0),
      },
      benefitsValue: {
        offer1: offer1.benefitsValue || 0,
        offer2: offer2.benefitsValue || 0,
        difference: (offer2.benefitsValue || 0) - (offer1.benefitsValue || 0),
      },
    };

    return {
      total1,
      total2,
      difference,
      percentDifference: parseFloat(percentDifference),
      breakdown,
      recommendation:
        total2 > total1
          ? `Offer 2 is ${Math.abs(percentDifference)}% higher in total compensation`
          : total2 < total1
          ? `Offer 1 is ${Math.abs(percentDifference)}% higher in total compensation`
          : "Both offers have the same total compensation",
    };
  }

  // Estimate benefits value
  evaluateBenefitsValue(benefitsData, location = "US") {
    const {
      healthInsurance = 0,
      retirement401k = 0,
      ptoDays = 0,
      stockOptions = 0,
      otherBenefits = 0,
    } = benefitsData;

    // Rough estimates (can be customized)
    const healthInsuranceValue = healthInsurance || 12000; // Annual estimate
    const retirementValue = retirement401k || 0; // Usually employer match
    const ptoValue = ptoDays * 400; // Rough daily rate estimate
    const stockOptionsValue = stockOptions || 0;
    const otherBenefitsValue = otherBenefits || 0;

    const total = healthInsuranceValue + retirementValue + ptoValue + stockOptionsValue + otherBenefitsValue;

    return {
      healthInsurance: healthInsuranceValue,
      retirement401k: retirementValue,
      pto: ptoValue,
      stockOptions: stockOptionsValue,
      other: otherBenefitsValue,
      total,
      breakdown: {
        healthInsurance: healthInsuranceValue,
        retirement401k: retirementValue,
        pto: ptoValue,
        stockOptions: stockOptionsValue,
        other: otherBenefitsValue,
      },
    };
  }

  // Create compensation breakdown for UI
  createCompensationBreakdown(compensationData) {
    const {
      baseSalary = 0,
      bonus = 0,
      equity = 0,
      benefitsValue = 0,
      other = 0,
    } = compensationData;

    const total = this.calculateTotalCompensation(compensationData);

    const breakdown = [
      {
        label: "Base Salary",
        value: baseSalary,
        percentage: total > 0 ? ((baseSalary / total) * 100).toFixed(1) : 0,
        color: "#3B82F6", // Blue
      },
      {
        label: "Bonus",
        value: bonus,
        percentage: total > 0 ? ((bonus / total) * 100).toFixed(1) : 0,
        color: "#10B981", // Green
      },
      {
        label: "Equity",
        value: equity,
        percentage: total > 0 ? ((equity / total) * 100).toFixed(1) : 0,
        color: "#F59E0B", // Amber
      },
      {
        label: "Benefits",
        value: benefitsValue,
        percentage: total > 0 ? ((benefitsValue / total) * 100).toFixed(1) : 0,
        color: "#8B5CF6", // Purple
      },
    ];

    if (other > 0) {
      breakdown.push({
        label: "Other",
        value: other,
        percentage: total > 0 ? ((other / total) * 100).toFixed(1) : 0,
        color: "#6B7280", // Gray
      });
    }

    return {
      total,
      breakdown: breakdown.filter((item) => item.value > 0),
      summary: {
        baseSalary,
        bonus,
        equity,
        benefitsValue,
        other,
        total,
      },
    };
  }

  // Format compensation for display
  formatCompensation(amount, currency = "USD") {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return formatter.format(amount);
  }

  // Calculate annual value from different payment frequencies
  annualizeCompensation(amount, frequency) {
    const multipliers = {
      hourly: 2080, // 40 hours/week * 52 weeks
      daily: 260, // ~260 working days/year
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12,
      quarterly: 4,
      annually: 1,
    };

    const multiplier = multipliers[frequency.toLowerCase()] || 1;
    return amount * multiplier;
  }
}

export default new TotalCompensationService();

