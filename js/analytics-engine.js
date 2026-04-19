// TABOOST Analytics Engine - Backend Algorithms
// All calculations derive from actual CSV data patterns

class TaboostAnalytics {
  constructor(creators) {
    this.creators = creators;
    this.cache = {};
  }

  // ═══════════════════════════════════════════════════════════
  // 1. ARCHETYPE CLUSTERING ALGORITHM
  // ═══════════════════════════════════════════════════════════
  calculateArchetypes() {
    if (this.cache.archetypes) return this.cache.archetypes;
    
    const archetypes = {
      grinders: { creators: [], avgDiamonds: 0, avgHours: 0, avgScore: 0, count: 0 },
      sprinters: { creators: [], avgDiamonds: 0, avgHours: 0, avgScore: 0, count: 0 },
      casuals: { creators: [], avgDiamonds: 0, avgHours: 0, avgScore: 0, count: 0 },
      sleepers: { creators: [], avgDiamonds: 0, avgHours: 0, avgScore: 0, count: 0 }
    };

    this.creators.forEach(c => {
      const hours = c.hours || 0;
      const score = c.score || 0;
      const diamonds = c.diamonds || 0;
      const lastMonth = c.diamondsLastMonth || 0;
      const twoMonthsAgo = c.diamondsTwoMonthsAgo || 0;
      
      // Calculate volatility (coefficient of variation)
      const values = [diamonds, lastMonth, twoMonthsAgo].filter(v => v > 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;
      
      // Classification logic
      let archetype;
      if (hours >= 20 && score >= 60 && volatility < 0.5) {
        archetype = 'grinders';
      } else if (volatility > 0.7 && hours > 10) {
        archetype = 'sprinters';
      } else if (hours >= 5 && hours <= 15 && score < 50) {
        archetype = 'casuals';
      } else if (diamonds < 10000 || hours === 0) {
        archetype = 'sleepers';
      } else {
        archetype = 'casuals'; // default
      }
      
      archetypes[archetype].creators.push({
        ...c,
        volatility: Math.round(volatility * 100)
      });
      archetypes[archetype].count++;
    });

    // Calculate averages for each archetype
    Object.keys(archetypes).forEach(key => {
      const group = archetypes[key];
      if (group.count > 0) {
        group.avgDiamonds = Math.round(group.creators.reduce((a, c) => a + (c.diamonds || 0), 0) / group.count);
        group.avgHours = Math.round(group.creators.reduce((a, c) => a + (c.hours || 0), 0) / group.count);
        group.avgScore = Math.round(group.creators.reduce((a, c) => a + (c.score || 0), 0) / group.count);
      }
    });

    this.cache.archetypes = archetypes;
    return archetypes;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. EFFICIENCY FRONTIER (Linear Regression)
  // ═══════════════════════════════════════════════════════════
  calculateEfficiencyFrontier() {
    if (this.cache.efficiency) return this.cache.efficiency;
    
    // Get creators with both hours and diamonds
    const active = this.creators.filter(c => (c.hours || 0) > 0 && (c.diamonds || 0) > 0);
    
    // Calculate linear regression: diamonds = m * hours + b
    const n = active.length;
    const sumX = active.reduce((a, c) => a + (c.hours || 0), 0);
    const sumY = active.reduce((a, c) => a + (c.diamonds || 0), 0);
    const sumXY = active.reduce((a, c) => a + ((c.hours || 0) * (c.diamonds || 0)), 0);
    const sumXX = active.reduce((a, c) => a + ((c.hours || 0) ** 2), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX ** 2);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = active.reduce((a, c) => a + ((c.diamonds || 0) - yMean) ** 2, 0);
    const ssResidual = active.reduce((a, c) => {
      const predicted = slope * (c.hours || 0) + intercept;
      return a + ((c.diamonds || 0) - predicted) ** 2;
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    // Calculate residuals (actual - predicted) for each creator
    const creatorsWithEfficiency = active.map(c => {
      const predicted = slope * (c.hours || 0) + intercept;
      const actual = c.diamonds || 0;
      const gap = actual - predicted;
      const gapPercent = predicted > 0 ? (gap / predicted) * 100 : 0;
      
      return {
        ...c,
        predictedDiamonds: Math.round(predicted),
        gap: Math.round(gap),
        gapPercent: Math.round(gapPercent),
        efficiency: gapPercent > 20 ? 'over' : gapPercent < -20 ? 'under' : 'on-track'
      };
    });
    
    const result = {
      slope: Math.round(slope),
      intercept: Math.round(intercept),
      rSquared: Math.round(rSquared * 100) / 100,
      creators: creatorsWithEfficiency.sort((a, b) => b.gap - a.gap),
      underperformers: creatorsWithEfficiency.filter(c => c.efficiency === 'under').sort((a, b) => a.gap - b.gap)
    };
    
    this.cache.efficiency = result;
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 3. CHURN PROBABILITY MODEL (Weighted Algorithm)
  // ═══════════════════════════════════════════════════════════
  calculateChurnRisk() {
    if (this.cache.churn) return this.cache.churn;
    
    const creatorsWithRisk = this.creators.map(c => {
      const diamonds = c.diamonds || 0;
      const lastMonth = c.diamondsLastMonth || 0;
      const twoMonthsAgo = c.diamondsTwoMonthsAgo || 0;
      const score = c.score || 0;
      const hours = c.hours || 0;
      
      // Factor 1: 7-day activity drop (38% weight) - using month trend as proxy
      const monthTrend = lastMonth > 0 ? (diamonds - lastMonth) / lastMonth : 0;
      const activityDrop = Math.max(0, -monthTrend * 100); // Convert decline to positive score
      
      // Factor 2: Engagement decline (27% weight) - score drop
      const scoreComponent = Math.max(0, 100 - score);
      
      // Factor 3: Reward stagnation (22% weight) - hours vs previous pattern
      const hoursStagnation = hours < 5 ? 50 : hours < 10 ? 25 : 0;
      
      // Factor 4: Peer comparison (13% weight) - diamonds vs tier average
      const tierPeers = this.creators.filter(p => p.tier === c.tier && p.tier > 0);
      const tierAvg = tierPeers.reduce((a, p) => a + (p.diamonds || 0), 0) / tierPeers.length;
      const peerComparison = tierAvg > 0 ? Math.max(0, (1 - diamonds / tierAvg) * 100) : 0;
      
      // Weighted calculation
      const riskScore = Math.min(100, Math.round(
        (activityDrop * 0.38) +
        (scoreComponent * 0.27) +
        (hoursStagnation * 0.22) +
        (peerComparison * 0.13)
      ));
      
      // Revenue at risk (estimated monthly based on current run rate)
      const dailyRate = diamonds / 30;
      const monthlyRevenue = dailyRate * 30 * 0.005; // $0.005 per diamond
      
      return {
        ...c,
        churnRisk: riskScore,
        riskBand: riskScore >= 81 ? 'critical' : riskScore >= 61 ? 'high' : riskScore >= 41 ? 'medium' : riskScore >= 21 ? 'low' : 'safe',
        factors: {
          activityDrop: Math.round(activityDrop),
          scoreComponent: Math.round(scoreComponent),
          hoursStagnation: Math.round(hoursStagnation),
          peerComparison: Math.round(peerComparison)
        },
        revenueAtRisk: Math.round(monthlyRevenue)
      };
    });
    
    // Risk distribution histogram
    const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    creatorsWithRisk.forEach(c => {
      if (c.churnRisk <= 20) distribution['0-20']++;
      else if (c.churnRisk <= 40) distribution['21-40']++;
      else if (c.churnRisk <= 60) distribution['41-60']++;
      else if (c.churnRisk <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    });
    
    const result = {
      creators: creatorsWithRisk,
      atRisk: creatorsWithRisk.filter(c => c.churnRisk > 40).sort((a, b) => b.churnRisk - a.churnRisk),
      distribution,
      totalRevenueAtRisk: creatorsWithRisk.filter(c => c.churnRisk > 40).reduce((a, c) => a + c.revenueAtRisk, 0)
    };
    
    this.cache.churn = result;
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 4. VOLATILITY VS AVERAGE SCATTER (4 Quadrants)
  // ═══════════════════════════════════════════════════════════
  calculateVolatilityQuadrants() {
    if (this.cache.volatility) return this.cache.volatility;
    
    const creatorsWithMetrics = this.creators.map(c => {
      const diamonds = c.diamonds || 0;
      const lastMonth = c.diamondsLastMonth || 0;
      const twoMonthsAgo = c.diamondsTwoMonthsAgo || 0;
      
      // Calculate average monthly diamonds
      const values = [diamonds, lastMonth, twoMonthsAgo].filter(v => v > 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Calculate volatility (coefficient of variation)
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      const volatility = avg > 0 ? (Math.sqrt(variance) / avg) * 100 : 0;
      
      return {
        ...c,
        avgMonthly: Math.round(avg),
        volatility: Math.round(volatility)
      };
    }).filter(c => c.avgMonthly > 0);
    
    // Calculate medians for quadrant lines
    const avgMedian = this.median(creatorsWithMetrics.map(c => c.avgMonthly));
    const volMedian = this.median(creatorsWithMetrics.map(c => c.volatility));
    
    // Assign quadrants
    creatorsWithMetrics.forEach(c => {
      if (c.avgMonthly >= avgMedian && c.volatility >= volMedian) {
        c.quadrant = 'high-reward-high-risk';
        c.quadrantLabel = 'High Reward / High Risk';
      } else if (c.avgMonthly < avgMedian && c.volatility >= volMedian) {
        c.quadrant = 'low-reward-high-risk';
        c.quadrantLabel = 'Low Reward / High Risk';
      } else if (c.avgMonthly >= avgMedian && c.volatility < volMedian) {
        c.quadrant = 'high-reward-low-risk';
        c.quadrantLabel = 'High Reward / Low Risk';
      } else {
        c.quadrant = 'low-reward-low-risk';
        c.quadrantLabel = 'Low Reward / Low Risk';
      }
    });
    
    const result = {
      creators: creatorsWithMetrics,
      avgMedian,
      volMedian,
      quadrants: {
        'high-reward-high-risk': creatorsWithMetrics.filter(c => c.quadrant === 'high-reward-high-risk'),
        'low-reward-high-risk': creatorsWithMetrics.filter(c => c.quadrant === 'low-reward-high-risk'),
        'high-reward-low-risk': creatorsWithMetrics.filter(c => c.quadrant === 'high-reward-low-risk'),
        'low-reward-low-risk': creatorsWithMetrics.filter(c => c.quadrant === 'low-reward-low-risk')
      }
    };
    
    this.cache.volatility = result;
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 5. MANAGER CONCENTRATION (HHI Index)
  // ═══════════════════════════════════════════════════════════
  calculateManagerConcentration() {
    if (this.cache.concentration) return this.cache.concentration;
    
    // Group by manager
    const byManager = {};
    let totalDiamonds = 0;
    
    this.creators.forEach(c => {
      const mgr = c.agent || 'Unassigned';
      if (!byManager[mgr]) byManager[mgr] = { name: mgr, diamonds: 0, creators: 0 };
      byManager[mgr].diamonds += (c.diamonds || 0);
      byManager[mgr].creators++;
      totalDiamonds += (c.diamonds || 0);
    });
    
    const managers = Object.values(byManager).sort((a, b) => b.diamonds - a.diamonds);
    
    // Calculate market shares
    managers.forEach(m => {
      m.share = totalDiamonds > 0 ? (m.diamonds / totalDiamonds) * 100 : 0;
    });
    
    // Calculate HHI: sum of squared market shares
    const hhi = managers.reduce((a, m) => a + Math.pow(m.share, 2), 0);
    
    // What if top manager left?
    const topMgr = managers[0];
    const withoutTop = managers.slice(1);
    const newTotal = withoutTop.reduce((a, m) => a + m.diamonds, 0);
    const newShares = withoutTop.map(m => newTotal > 0 ? (m.diamonds / newTotal) * 100 : 0);
    const hhiWithoutTop = newShares.reduce((a, s) => a + Math.pow(s, 2), 0);
    
    const result = {
      hhi: Math.round(hhi),
      status: hhi > 2500 ? 'dangerous' : hhi > 1500 ? 'concentrated' : 'healthy',
      statusColor: hhi > 2500 ? 'red' : hhi > 1500 ? 'amber' : 'green',
      managers,
      topManager: topMgr,
      hhiWithoutTop: Math.round(hhiWithoutTop),
      concentrationRisk: hhi > 2500 ? 'Monopoly concentration - diversify immediately' : 
                        hhi > 1500 ? 'Moderate concentration - monitor closely' : 
                        'Healthy distribution'
    };
    
    this.cache.concentration = result;
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 6. MOMENTUM LEADERBOARD (Weighted rolling average)
  // ═══════════════════════════════════════════════════════════
  calculateMomentum() {
    if (this.cache.momentum) return this.cache.momentum;
    
    const creatorsWithMomentum = this.creators.map(c => {
      const current = c.diamonds || 0;
      const lastMonth = c.diamondsLastMonth || 0;
      const twoMonthsAgo = c.diamondsTwoMonthsAgo || 0;
      
      // Weighted formula: (current × 4 + lastMonth × 2 + twoMonthsAgo × 1) / 7
      const momentum = (current * 4 + lastMonth * 2 + twoMonthsAgo * 1) / 7;
      
      // Find diamond rank
      const diamondRank = this.creators.filter(x => (x.diamonds || 0) > current).length + 1;
      
      return {
        ...c,
        momentum: Math.round(momentum),
        momentumRank: 0, // Will be set after sort
        diamondRank,
        rankDifference: 0 // Will be calculated
      };
    });
    
    // Sort by momentum and assign ranks
    creatorsWithMomentum.sort((a, b) => b.momentum - a.momentum);
    creatorsWithMomentum.forEach((c, i) => {
      c.momentumRank = i + 1;
      c.rankDifference = c.diamondRank - c.momentumRank; // Positive = climbing on momentum
    });
    
    this.cache.momentum = creatorsWithMomentum;
    return creatorsWithMomentum;
  }

  // ═══════════════════════════════════════════════════════════
  // 7. HOURS TRAP DETECTION
  // ═══════════════════════════════════════════════════════════
  calculateHoursTraps() {
    if (this.cache.hoursTraps) return this.cache.hoursTraps;
    
    // Calculate tier averages for diamonds per hour
    const tierStats = {};
    this.creators.forEach(c => {
      const tier = c.tier || 1;
      if (!tierStats[tier]) tierStats[tier] = { totalDph: 0, count: 0 };
      const dph = (c.hours || 0) > 0 ? (c.diamonds || 0) / c.hours : 0;
      tierStats[tier].totalDph += dph;
      tierStats[tier].count++;
    });
    
    Object.keys(tierStats).forEach(tier => {
      tierStats[tier].avgDph = tierStats[tier].count > 0 ? 
        tierStats[tier].totalDph / tierStats[tier].count : 0;
    });
    
    // Find traps: 25+ hours, score < 50
    const traps = this.creators
      .filter(c => (c.hours || 0) >= 25 && (c.score || 0) < 50)
      .map(c => {
        const tier = c.tier || 1;
        const dph = (c.hours || 0) > 0 ? (c.diamonds || 0) / c.hours : 0;
        const tierAvg = tierStats[tier]?.avgDph || 0;
        const dphGap = tierAvg > 0 ? ((dph - tierAvg) / tierAvg) * 100 : 0;
        
        // Intervention recommendation
        let intervention;
        if (dphGap < -30) {
          intervention = 'Reduce hours by 5-10h, focus on content quality over quantity';
        } else if ((c.hours || 0) > 35) {
          intervention = 'Immediate burnout risk - mandatory break recommended';
        } else {
          intervention = 'Change stream times to peak audience hours';
        }
        
        return {
          ...c,
          diamondsPerHour: Math.round(dph),
          tierAvgDph: Math.round(tierAvg),
          dphGap: Math.round(dphGap),
          intervention
        };
      })
      .sort((a, b) => a.dphGap - b.dphGap);
    
    this.cache.hoursTraps = traps;
    return traps;
  }

  // ═══════════════════════════════════════════════════════════
  // 8. REWARD TO DIAMOND RATIO
  // ═══════════════════════════════════════════════════════════
  calculateRewardRatios() {
    if (this.cache.rewardRatios) return this.cache.rewardRatios;
    
    const creatorsWithRatio = this.creators
      .filter(c => (c.diamonds || 0) > 0)
      .map(c => {
        const ratio = (c.earned || 0) / (c.diamonds || 0);
        
        return {
          ...c,
          rewardRatio: Math.round(ratio * 100) / 100,
          ratioCategory: ratio >= 3 ? 'gold' : ratio >= 1 ? 'silver' : 'fragile',
          ratioLabel: ratio >= 3 ? 'High Loyalty' : ratio >= 1 ? 'Moderate' : 'Fragile - At Risk'
        };
      })
      .sort((a, b) => b.rewardRatio - a.rewardRatio);
    
    this.cache.rewardRatios = creatorsWithRatio;
    return creatorsWithRatio;
  }

  // ═══════════════════════════════════════════════════════════
  // 9. GOAL PACING WITH CONFIDENCE
  // ═══════════════════════════════════════════════════════════
  calculateGoalConfidence() {
    if (this.cache.goalConfidence) return this.cache.goalConfidence;
    
    const dayOfMonth = new Date().getDate();
    const daysInMonth = 30; // Approximation
    const remainingDays = daysInMonth - dayOfMonth;
    
    const creatorsWithConfidence = this.creators.map(c => {
      const goal = c.tierGoal || 1000000 * (c.tier || 1);
      const current = c.diamonds || 0;
      const left = Math.max(0, goal - current);
      const percentComplete = goal > 0 ? (current / goal) * 100 : 0;
      const timeElapsed = dayOfMonth / daysInMonth;
      
      // Calculate daily run rate
      const dailyRate = dayOfMonth > 0 ? current / dayOfMonth : 0;
      const projectedTotal = dailyRate * daysInMonth;
      
      // Calculate variability from previous months
      const lastMonth = c.diamondsLastMonth || 0;
      const twoMonthsAgo = c.diamondsTwoMonthsAgo || 0;
      const values = [current, lastMonth, twoMonthsAgo].filter(v => v > 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // Coefficient of variation
      
      // Confidence calculation
      let confidence;
      if (projectedTotal >= goal * 1.1) {
        confidence = Math.round(95 - (cv * 20)); // High achiever, penalize for variability
      } else if (projectedTotal >= goal) {
        confidence = Math.round(75 - (cv * 15));
      } else if (projectedTotal >= goal * 0.8) {
        confidence = Math.round(50 - (cv * 10));
      } else {
        confidence = Math.round(Math.max(5, (projectedTotal / goal) * 50));
      }
      
      confidence = Math.max(5, Math.min(95, confidence));
      
      return {
        ...c,
        goal,
        percentComplete: Math.round(percentComplete * 10) / 10,
        dailyRate: Math.round(dailyRate),
        projectedTotal: Math.round(projectedTotal),
        confidence,
        confidenceColor: confidence >= 70 ? 'green' : confidence >= 50 ? 'amber' : 'red',
        remainingDays,
        diamondsNeeded: Math.round(left),
        explanation: `At ${Math.round(dailyRate)} 💎/day, projecting ${f(Math.round(projectedTotal))} by month end. Need ${f(Math.round(left))} more with ${remainingDays} days left.`
      };
    });
    
    this.cache.goalConfidence = creatorsWithConfidence;
    return creatorsWithConfidence;
  }

  // ═══════════════════════════════════════════════════════════
  // 10. GENRE PORTFOLIO ANALYSIS
  // ═══════════════════════════════════════════════════════════
  calculateGenreAnalysis() {
    if (this.cache.genre) return this.cache.genre;
    
    const byGenre = {};
    
    this.creators.forEach(c => {
      // Extract genre from badge or default to 'Other'
      const badge = c.badge || 'Other';
      const genres = badge.split(/[,/]/).map(g => g.trim()).filter(g => g);
      
      genres.forEach(genre => {
        if (!byGenre[genre]) {
          byGenre[genre] = { 
            name: genre, 
            creators: [], 
            totalDiamonds: 0, 
            totalHours: 0,
            totalScore: 0,
            totalRatio: 0 
          };
        }
        byGenre[genre].creators.push(c);
        byGenre[genre].totalDiamonds += (c.diamonds || 0);
        byGenre[genre].totalHours += (c.hours || 0);
        byGenre[genre].totalScore += (c.score || 0);
        const ratio = (c.diamonds || 0) > 0 ? (c.earned || 0) / (c.diamonds || 0) : 0;
        byGenre[genre].totalRatio += ratio;
      });
    });
    
    const genres = Object.values(byGenre).map(g => ({
      name: g.name,
      creatorCount: g.creators.length,
      avgDiamonds: Math.round(g.totalDiamonds / g.creators.length),
      avgHours: Math.round(g.totalHours / g.creators.length),
      avgScore: Math.round(g.totalScore / g.creators.length),
      avgRewardRatio: Math.round((g.totalRatio / g.creators.length) * 100) / 100,
      totalDiamonds: g.totalDiamonds
    })).sort((a, b) => b.avgDiamonds - a.avgDiamonds);
    
    this.cache.genre = genres;
    return genres;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════
  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaboostAnalytics;
}
