const config = require('../config');

/**
 * Utility to strip HTML tags from raw string values
 */
function cleanText(raw) {
  if (!raw) return '';
  if (typeof raw !== 'string') return String(raw);
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#8377;/g, '₹')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean date text (e.g. "17-Aug GMP: 30" -> "17-Aug" or converts "2026-08-17" to "17-Aug")
 */
function formatDisplayDate(rawDate, rawIsoDate) {
  if (rawIsoDate && rawIsoDate.includes('-')) {
    const parts = rawIsoDate.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(parts[2], 10);
      const monthName = months[parseInt(parts[1], 10) - 1];
      if (monthName && !isNaN(day)) {
        return `${day}-${monthName}`;
      }
    }
  }
  if (!rawDate) return 'TBA';
  const match = cleanText(rawDate).match(/^(\d{1,2}-[A-Za-z]{3})/);
  if (match) return match[1];
  return cleanText(rawDate).split(' ')[0] || 'TBA';
}

/**
 * Parse GMP value, percentage, and the Low/High transition range
 */
function parseGmp(rawGmp, rawGmpPercent) {
  let gmpAmount = 0;
  let gmpPercent = 0;
  let lowGmp = 0;
  let highGmp = 0;
  let hasRange = false;

  if (rawGmpPercent && !isNaN(parseFloat(rawGmpPercent))) {
    gmpPercent = parseFloat(rawGmpPercent);
  }

  if (rawGmp) {
    const cleaned = cleanText(rawGmp);
    
    // Extract current GMP Amount
    const amountMatch = cleaned.match(/₹?\s*([\d.]+)/);
    if (amountMatch) {
      gmpAmount = parseFloat(amountMatch[1]);
    }
    
    if (gmpPercent === 0) {
      const percentMatch = cleaned.match(/\(([\d.]+)%\)/);
      if (percentMatch) {
        gmpPercent = parseFloat(percentMatch[1]);
      }
    }

    // Extract Low/High Transition Range: e.g. "25 ↓ / 121 ↑"
    const rangeMatch = cleaned.match(/([\d.]+)\s*[↓]\s*\/\s*([\d.]+)\s*[↑]/);
    if (rangeMatch) {
      lowGmp = parseFloat(rangeMatch[1]);
      highGmp = parseFloat(rangeMatch[2]);
      hasRange = true;
    } else {
      lowGmp = gmpAmount;
      highGmp = gmpAmount;
    }
  }

  return { gmpAmount, gmpPercent, lowGmp, highGmp, hasRange };
}

/**
 * Parse numeric values safely
 */
function parseNumber(val) {
  if (val === null || val === undefined || val === '' || val === '-' || val === '--') return null;
  if (typeof val === 'number') return val;
  const cleaned = cleanText(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Calculates current month, year, and Indian Financial Year string
 */
function getApiDateParams() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const financialYear = currentMonth < 4 
    ? `${currentYear - 1}-${String(currentYear).slice(-2)}` 
    : `${currentYear}-${String(currentYear + 1).slice(-2)}`;

  return { currentMonth, currentYear, financialYear };
}

/**
 * Fetch IPOs by specific sub-report filter
 */
async function fetchIpoSubReport(filter = 'all') {
  const { currentMonth, currentYear, financialYear } = getApiDateParams();
  const url = `${config.api.baseUrl}/cloud/v2/report/data-read/${config.api.reportId}/1/${currentMonth}/${currentYear}/${financialYear}/0/${filter}?search=`;

  const headers = {
    'User-Agent': config.api.userAgent,
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.investorgain.com/report/ipo-gmp-live/331/'
  };

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.msg !== 1) {
      throw new Error(data.error || 'Failed to fetch report table data');
    }
    return data.reportTableData || [];
  } catch (err) {
    console.error(`[Fetcher] Error fetching filter '${filter}':`, err.message);
    return [];
  }
}

/**
 * Fetch enriched company master list
 */
async function fetchCompanyMasterList() {
  const url = `${config.api.baseUrl}/cloud/v2/ipo/list-read`;
  const headers = {
    'User-Agent': config.api.userAgent,
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.investorgain.com/'
  };

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.msg === 1 && Array.isArray(data.ipoList)) {
      return data.ipoList;
    }
    return [];
  } catch (err) {
    console.error('[Fetcher] Error fetching company master list:', err.message);
    return [];
  }
}

/**
 * Main Fetcher function with strict Status Parsing and Retention Rules:
 * 1. Listed IPOs shown for at most 7 days post-listing.
 * 2. Upcoming IPOs rendered only if opening within 15 days (or TBA).
 * 3. All Open, Closing Today, Closed, Allotted IPOs always rendered.
 */
async function getLiveIpos() {
  console.log('[Fetcher] Fetching live IPOs and GMP data from API...');

  const [allRawIpos, openRawIpos, closingTodayRawIpos, companyMasterList] = await Promise.all([
    fetchIpoSubReport('all'),
    fetchIpoSubReport('open'),
    fetchIpoSubReport('closing-today'),
    fetchCompanyMasterList()
  ]);

  const openIpoNames = new Set(openRawIpos.map(item => item['~ipo_name']?.toLowerCase().trim()));
  const closingTodayNames = new Set(closingTodayRawIpos.map(item => item['~ipo_name']?.toLowerCase().trim()));

  const masterMap = new Map();
  for (const item of companyMasterList) {
    if (item.company_short_name) {
      masterMap.set(item.company_short_name.toLowerCase().trim(), item);
    }
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = now.toISOString().split('T')[0];

  const processedIpos = [];

  for (const raw of allRawIpos) {
    const name = cleanText(raw['~ipo_name'] || raw.Name);
    const nameKey = name.toLowerCase().trim();
    const rawNameHtml = raw.Name || '';
    const { gmpAmount, gmpPercent, lowGmp, highGmp, hasRange } = parseGmp(raw.GMP, raw['~gmp_percent_calc']);
    const price = parseNumber(raw['Price (₹)']);
    const lotSize = parseNumber(raw.Lot);
    const subscription = parseNumber(raw.Sub);
    const issueSize = cleanText(raw['IPO Size']);
    const peRatio = parseNumber(raw['~P/E']);
    const category = raw['~IPO_Category'] === 'SME' ? 'SME' : (raw['~IPO_Category']?.includes('SME') ? 'SME' : 'Mainboard');
    const detailUrl = raw['~urlrewrite_folder_name'] ? `https://www.investorgain.com${raw['~urlrewrite_folder_name']}` : '';

    const openDateStr = raw['~Srt_Open'] || '';
    const closeDateStr = raw['~Srt_Close'] || '';
    const boaDateStr = raw['~Srt_BoA_Dt'] || '';
    const listingDateStr = raw['~Str_Listing'] || '';

    const openDate = openDateStr ? new Date(openDateStr) : null;
    const closeDate = closeDateStr ? new Date(closeDateStr) : null;
    const boaDate = boaDateStr ? new Date(boaDateStr) : null;
    const listingDate = listingDateStr ? new Date(listingDateStr) : null;

    // Accurate Status Determination
    let status = 'Upcoming';

    if (rawNameHtml.includes('Listed') || (listingDate && listingDate <= todayStart)) {
      status = 'Listed';
    } else if (rawNameHtml.includes('Allotted') || (boaDate && boaDate <= todayStart)) {
      status = 'Allotted';
    } else if (closingTodayNames.has(nameKey) || closeDateStr === todayStr) {
      status = 'Closing Today';
    } else if (openRawIpos.some(o => o['~id'] === raw['~id']) || openIpoNames.has(nameKey) || (openDate && openDate <= todayStart && closeDate && closeDate >= todayStart)) {
      status = 'Open';
    } else if (closeDate && closeDate < todayStart) {
      status = 'Closed';
    }

    // =======================================================================
    // RETENTION RULE 1: Listed IPOs shown at most 7 days after listing
    // =======================================================================
    if (status === 'Listed' && listingDate) {
      const daysSinceListing = Math.floor((todayStart - listingDate) / (1000 * 60 * 60 * 24));
      if (daysSinceListing > 7) {
        continue; // Skip IPOs listed more than 7 days ago
      }
    }

    // =======================================================================
    // RETENTION RULE 2: Upcoming IPOs shown only if opening within 15 days
    // =======================================================================
    if (status === 'Upcoming' && openDate) {
      const daysUntilOpen = Math.floor((openDate - todayStart) / (1000 * 60 * 60 * 24));
      if (daysUntilOpen > 15) {
        continue; // Skip upcoming IPOs opening after 15 days
      }
    }

    const minInvestment = (price && lotSize) ? price * lotSize : null;
    const estListingPrice = price && gmpAmount ? price + gmpAmount : null;

    const masterInfo = masterMap.get(nameKey) || {};
    const sector = masterInfo.company_sector || 'General';

    processedIpos.push({
      id: raw['~id'] || null,
      name,
      category,
      sector,
      status,
      priceBand: {
        price,
        lotSize,
        minInvestment
      },
      gmp: {
        amount: gmpAmount,
        percent: gmpPercent,
        lowGmp,
        highGmp,
        hasRange,
        estListingPrice,
        updatedOn: cleanText(raw['Updated-On']) || 'Live'
      },
      subscription: {
        total: subscription,
        raw: cleanText(raw.Sub) || '-'
      },
      issueSize,
      peRatio,
      hasAnchor: raw.Anchor?.includes('✅') || masterInfo.anchor_investor_status === 1,
      dates: {
        open: formatDisplayDate(raw.Open, openDateStr),
        close: formatDisplayDate(raw.Close, closeDateStr),
        allotment: formatDisplayDate(raw['BoA Dt'], boaDateStr),
        listing: formatDisplayDate(raw.Listing, listingDateStr),
        rawOpen: openDateStr,
        rawClose: closeDateStr,
        rawBoA: boaDateStr,
        rawListing: listingDateStr
      },
      detailUrl,
      rawRating: cleanText(raw.Rating)
    });
  }

  console.log(`[Fetcher] Filtered & Processed ${processedIpos.length} eligible IPOs (Rules: Listed <= 7d, Upcoming <= 15d applied).`);

  return {
    scrapedAt: new Date().toISOString(),
    totalCount: processedIpos.length,
    openCount: processedIpos.filter(i => i.status === 'Open' || i.status === 'Closing Today').length,
    ipos: processedIpos
  };
}

module.exports = {
  getLiveIpos,
  fetchIpoSubReport,
  fetchCompanyMasterList
};
