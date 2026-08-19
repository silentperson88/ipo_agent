const config = require('../config');

/**
 * Calculates Percentage-Based Transition Trend & Momentum
 * Evaluates whether GMP % is gaining or losing momentum relative to its lifecycle range
 */
function evaluateGmpPercentTransition(gmpObj, status) {
  const currentP = gmpObj?.percent || 0;
  const price = gmpObj?.price || 1;
  const lowAmount = gmpObj?.lowGmp !== undefined ? gmpObj.lowGmp : (gmpObj?.amount || 0);
  const highAmount = gmpObj?.highGmp !== undefined ? gmpObj.highGmp : (gmpObj?.amount || 0);

  // Convert Low and High to percentages relative to price cap
  const lowPercent = price > 0 ? parseFloat(((lowAmount / price) * 100).toFixed(1)) : currentP;
  const highPercent = price > 0 ? parseFloat(((highAmount / price) * 100).toFixed(1)) : currentP;

  let trendDirection = 'STABLE';
  let trendIcon = '➡️';
  let trendLabel = `GMP Steady at +${currentP}%`;
  let isDroppingNearClose = false;
  let isSurgingAtClose = false;

  if (highPercent > lowPercent) {
    const rangePercent = highPercent - lowPercent;
    const positionInRange = rangePercent > 0 ? (currentP - lowPercent) / rangePercent : 1;

    if (positionInRange >= 0.85 && currentP > 0) {
      trendDirection = 'SURGING';
      trendIcon = '📈';
      const gainDelta = parseFloat((currentP - lowPercent).toFixed(1));
      if (gainDelta > 0) {
        trendLabel = `GMP Gained +${gainDelta}% (${lowPercent}% ➔ ${currentP}%)`;
      } else {
        trendLabel = `GMP at Peak: +${currentP}%`;
      }
      if (status === 'Closing Today' || status === 'Open') {
        isSurgingAtClose = true;
      }
    } else if (positionInRange <= 0.35 && highPercent > currentP) {
      trendDirection = 'COOLING_DOWN';
      trendIcon = '📉';
      const dropDelta = parseFloat((highPercent - currentP).toFixed(1));
      trendLabel = `GMP Fell -${dropDelta}% (${highPercent}% ➔ ${currentP}%)`;
      if (status === 'Closing Today') {
        isDroppingNearClose = true;
      }
    } else {
      trendDirection = 'CONSOLIDATING';
      trendIcon = '⚖️';
      trendLabel = `Range: ${lowPercent}% ➔ ${highPercent}% (Now: +${currentP}%)`;
    }
  } else if (currentP > 0) {
    trendLabel = `GMP Steady at +${currentP}%`;
  } else {
    trendLabel = status === 'Upcoming' ? 'Quotes yet to start' : 'No grey market demand';
  }

  return {
    trendDirection,
    trendIcon,
    trendLabel,
    isDroppingNearClose,
    isSurgingAtClose,
    lowPercent,
    highPercent
  };
}

/**
 * Percentage-Based Master Analysis Engine
 */
function analyzeIpo(ipo) {
  const gmpPercent = ipo.gmp?.percent || 0;
  const gmpAmount = ipo.gmp?.amount || 0;
  const lotSize = ipo.priceBand?.lotSize || 0;
  const price = ipo.priceBand?.price || 0;
  const isSme = ipo.category === 'SME';
  const status = ipo.status || 'Upcoming';

  const gmpWithPrice = { ...ipo.gmp, price };
  const transition = evaluateGmpPercentTransition(gmpWithPrice, status);
  const expectedProfitPerLot = (lotSize && gmpAmount) ? Math.round(lotSize * gmpAmount) : 0;

  let rating = 3;
  let verdict = 'WAIT & WATCH';
  let riskLevel = 'Moderate';
  let strategy = 'Track bidding demand.';

  // =========================================================================
  // SCENARIO 1: UPCOMING / PRE-APPLY (1-15 DAYS BEFORE OPEN)
  // RULE: NEVER SAY AVOID ON UPCOMING IPOS (QUOTES ARE NASCENT)
  // =========================================================================
  if (status === 'Upcoming') {
    if (gmpPercent >= config.thresholds.blockbusterPercent) {
      rating = 5.0;
      verdict = '🚀 BLOCKBUSTER PIPELINE';
      riskLevel = 'Low-Moderate';
      strategy = `Extraordinary anticipation (+${gmpPercent}%). Keep funds ready for opening day.`;
    } else if (gmpPercent >= config.thresholds.strongApplyPercent) {
      rating = 4.5;
      verdict = '🔥 HIGH DEMAND PIPELINE';
      riskLevel = 'Moderate';
      strategy = `Strong buyer demand (+${gmpPercent}%). High probability of strong opening.`;
    } else if (gmpPercent >= config.thresholds.applyGainPercent) {
      rating = 3.5;
      verdict = '🟢 PROMISING PIPELINE';
      riskLevel = 'Moderate';
      strategy = `Promising early quotes (+${gmpPercent}%). Track Anchor book release before open.`;
    } else if (gmpPercent >= config.thresholds.cautionPercent) {
      rating = 3.0;
      verdict = '👀 MONITOR CLOSELY';
      riskLevel = 'Moderate';
      strategy = `Early quotes forming (+${gmpPercent}%). Monitor as opening date approaches.`;
    } else {
      rating = 2.5;
      verdict = '⏳ WAIT & WATCH (NASCENT)';
      riskLevel = 'Low Risk (Not Open)';
      strategy = `Grey market quotes are nascent or yet to start. Wait for official opening day.`;
    }
  }

  // =========================================================================
  // SCENARIO 2: OPEN FOR BIDDING (DAY 1 / DAY 2)
  // =========================================================================
  else if (status === 'Open') {
    if (gmpPercent >= config.thresholds.blockbusterPercent) {
      rating = 5;
      verdict = '🔥 STRONG APPLY (BLOCKBUSTER)';
      riskLevel = isSme ? 'Moderate' : 'Low';
      strategy = `Huge listing interest (+${gmpPercent}%). Keep funds ready and apply at cut-off price.`;
    } else if (gmpPercent >= config.thresholds.strongApplyPercent) {
      rating = 4.5;
      verdict = '🔥 STRONG APPLY';
      riskLevel = isSme ? 'Moderate' : 'Low-Moderate';
      strategy = `Robust listing demand (+${gmpPercent}%). Favorable risk-reward profile.`;
    } else if (gmpPercent >= config.thresholds.applyGainPercent) {
      rating = 4.0;
      verdict = '🟢 APPLY FOR LISTING GAIN';
      riskLevel = 'Moderate';
      strategy = `Solid demand (${transition.trendLabel}). Track Day 2 QIB numbers before bidding.`;
    } else if (gmpPercent >= config.thresholds.cautionPercent) {
      rating = 3.0;
      verdict = '⏳ WAIT FOR DAY 3 (QIB)';
      riskLevel = 'Moderate-High';
      strategy = `Moderate sentiment. Don't rush on Day 1; wait for final day institutional bidding numbers.`;
    } else if (gmpPercent >= config.thresholds.thinBufferPercent) {
      rating = 2.0;
      verdict = '⚠️ CAUTION (THIN BUFFER)';
      riskLevel = 'High';
      strategy = `Subdued early GMP. Only consider if institutional bidding unexpectedly explodes on Day 3.`;
    } else {
      rating = 1.5;
      verdict = '🛑 WEAK INTEREST';
      riskLevel = 'High';
      strategy = `Negligible buyer interest in grey market. Caution advised.`;
    }
  }

  // =========================================================================
  // SCENARIO 3: CLOSING TODAY (DAY 3 — FINAL ACTION WINDOW)
  // =========================================================================
  else if (status === 'Closing Today') {
    if (transition.isDroppingNearClose && gmpPercent < 20) {
      rating = 2;
      verdict = '⚠️ CAUTION (GMP COOLING DOWN)';
      riskLevel = 'Very High';
      strategy = `Grey market demand is cooling down (${transition.trendLabel}). STT and listing volatility pose loss risk. Skip or place low-exposure bids.`;
    } else if (gmpPercent >= config.thresholds.blockbusterPercent) {
      rating = 5;
      verdict = '🔥 STRONG APPLY (BLOCKBUSTER)';
      riskLevel = isSme ? 'Moderate (SME Lot Size)' : 'Low';
      strategy = `Blockbuster listing gain expected (~₹${expectedProfitPerLot.toLocaleString('en-IN')}/lot). Apply across all demat accounts at cut-off price.`;
    } else if (gmpPercent >= config.thresholds.strongApplyPercent) {
      rating = 4.8;
      verdict = '🔥 STRONG APPLY';
      riskLevel = isSme ? 'Moderate' : 'Low-Moderate';
      strategy = `Strong listing buffer (+${gmpPercent}%). High probability of handsome listing returns (~₹${expectedProfitPerLot.toLocaleString('en-IN')}/lot).`;
    } else if (gmpPercent >= config.thresholds.applyGainPercent) {
      rating = 4.0;
      verdict = '🟢 APPLY FOR LISTING GAIN';
      riskLevel = 'Moderate';
      strategy = `Healthy listing gain potential. Check final QIB subscription to ensure institutional demand remains positive.`;
    } else if (gmpPercent >= config.thresholds.cautionPercent) {
      rating = 3.0;
      verdict = '⚠️ APPLY WITH CAUTION (QIB>10x)';
      riskLevel = 'High';
      strategy = `Moderate cushion (10-20%). Only apply if QIB subscription crosses 10x by 3:00 PM.`;
    } else if (gmpPercent >= config.thresholds.thinBufferPercent) {
      rating = 2.0;
      verdict = '🛑 AVOID (THIN BUFFER)';
      riskLevel = 'Very High';
      strategy = `Very thin buffer (${gmpPercent}%). STT, brokerage, and day-1 swings are likely to wipe out returns. Avoid.`;
    } else {
      rating = 1.0;
      verdict = '❌ AVOID (DISCOUNT RISK)';
      riskLevel = 'Extreme';
      strategy = `Flat or negative grey market premium. High probability of listing at discount. Protect capital and skip.`;
    }
  }

  // =========================================================================
  // SCENARIO 4: CLOSED / ALLOTTED / LISTED
  // =========================================================================
  else {
    if (status === 'Listed') {
      verdict = gmpPercent >= 20 ? '🎉 LISTED WITH GAIN' : '⚪ LISTED';
    } else if (status === 'Allotted') {
      verdict = gmpPercent >= 35 ? '🔵 ALLOTTED (BUMPER EXPECTED)' : gmpPercent >= 20 ? '🔵 ALLOTTED (HEALTHY GAIN)' : '🔵 ALLOTMENT OUT';
    } else {
      verdict = gmpPercent >= 35 ? '💰 STRONG LISTING EXPECTED' : gmpPercent >= 20 ? '🟢 MODERATE GAIN EXPECTED' : '🟡 MILD GAIN / FLAT';
    }
    strategy = `Bidding closed. Momentum: ${transition.trendLabel}.`;
  }

  const institutionalBacking = ipo.hasAnchor ? 'Strong (Anchor Investors Onboard)' : 'Standard';

  return {
    ...ipo,
    analysis: {
      rating,
      stars: '⭐'.repeat(Math.floor(rating)),
      verdict,
      riskLevel,
      expectedProfitPerLot,
      strategy,
      institutionalBacking,
      transition,
      isStrongApply: gmpPercent >= config.thresholds.strongApplyPercent,
      isBlockbuster: gmpPercent >= config.thresholds.blockbusterPercent,
      isApply: gmpPercent >= config.thresholds.applyGainPercent
    }
  };
}

/**
 * Analyze all IPOs and sort by priority & GMP %
 */
function analyzeAllIpos(ipos) {
  return ipos
    .map(analyzeIpo)
    .sort((a, b) => (b.gmp?.percent || 0) - (a.gmp?.percent || 0));
}

module.exports = {
  analyzeIpo,
  analyzeAllIpos,
  evaluateGmpPercentTransition
};
