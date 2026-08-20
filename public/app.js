// Run4Dream IPO Intelligence Matrix - Client Application
// 100% MongoDB-Driven: Fetches live IPOs directly via /api/latest

let allIpos = [];
let filteredIpos = [];
let currentFilter = 'all';
let currentSort = 'status-priority'; // Default: Upcoming ➔ Open ➔ Closed ➔ Allotted ➔ Listed
let currentSearch = '';
let currentView = 'table'; // Default: 'table'

// DOM Elements
const ipoGrid = document.getElementById('ipoGrid');
const tableBody = document.getElementById('tableBody');
const tableContainer = document.getElementById('tableContainer');
const tableRowCount = document.getElementById('tableRowCount');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const filterTabs = document.getElementById('filterTabs');
const refreshBtn = document.getElementById('refreshBtn');
const openDigestBtn = document.getElementById('openDigestBtn');
const viewGridBtn = document.getElementById('viewGridBtn');
const viewTableBtn = document.getElementById('viewTableBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');
const matrixTable = document.getElementById('matrixTable');

// Footer Summary Elements
const sumAvgGmp = document.getElementById('sumAvgGmp');
const sumMaxProfit = document.getElementById('sumMaxProfit');
const sumStrongPicks = document.getElementById('sumStrongPicks');

// Modal Elements
const whatsappModal = document.getElementById('whatsappModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyWhatsappBtn = document.getElementById('copyWhatsappBtn');
const whatsappTextPreview = document.getElementById('whatsappTextPreview');
const modalTitle = document.getElementById('modalTitle');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Stats Elements
const statTotalIpos = document.getElementById('statTotalIpos');
const statStrongApply = document.getElementById('statStrongApply');
const statOpen = document.getElementById('statOpen');
const statClosingToday = document.getElementById('statClosingToday');

// Tab Badges
const badgeAll = document.getElementById('badgeAll');
const badgeUpcoming = document.getElementById('badgeUpcoming');
const badgeOpen = document.getElementById('badgeOpen');
const badgeClosingToday = document.getElementById('badgeClosingToday');
const badgeClosed = document.getElementById('badgeClosed');
const badgeAllotted = document.getElementById('badgeAllotted');
const badgeListed = document.getElementById('badgeListed');
const badgeStrongApply = document.getElementById('badgeStrongApply');
const badgeMainboard = document.getElementById('badgeMainboard');
const badgeSme = document.getElementById('badgeSme');

/**
 * Format Indian Rupees
 */
function formatInr(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return '₹' + Number(val).toLocaleString('en-IN');
}

/**
 * Show Toast Notification
 */
function showToast(msg = 'Copied to clipboard!') {
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

/**
 * Status Priority Rank Helper:
 * 1. Upcoming (within 15d)
 * 2. Open / Closing Today
 * 3. Closed
 * 4. Allotted
 * 5. Listed (within 7d)
 */
function getStatusPriorityRank(status) {
  switch (status) {
    case 'Upcoming': return 1;
    case 'Open': return 2;
    case 'Closing Today': return 2;
    case 'Closed': return 3;
    case 'Allotted': return 4;
    case 'Listed': return 5;
    default: return 6;
  }
}

/**
 * Fetch IPO Data from backend or fallback to static JSON dump
 */
async function loadIpoData() {
  try {
    let data = null;
    try {
      const res = await fetch('/api/latest');
      if (res.ok) {
        data = await res.json();
      }
    } catch (e) {
      console.warn('API endpoint /api/latest error:', e);
    }

    if (data && Array.isArray(data.ipos)) {
      allIpos = data.ipos;
      if (data.scrapedAt) {
        const dateObj = new Date(data.scrapedAt);
        lastUpdatedEl.textContent = 'Synced: ' + dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      }

      // Handle Community Link Button
      const joinCommunityBtn = document.getElementById('joinCommunityBtn');
      if (joinCommunityBtn && data.communityInviteLink) {
        joinCommunityBtn.href = data.communityInviteLink;
        joinCommunityBtn.classList.remove('hidden');
      }

      updateStats();
      applyFiltersAndRender();
    } else {
      console.error('Invalid IPO data format received');
    }
  } catch (err) {
    console.error('Failed to load IPO data:', err);
  }
}

/**
 * Update Top Stats and Tab Counters
 */
function updateStats() {
  const total = allIpos.length;
  const upcoming = allIpos.filter(i => i.status === 'Upcoming').length;
  const open = allIpos.filter(i => i.status === 'Open').length;
  const closing = allIpos.filter(i => i.status === 'Closing Today').length;
  const closed = allIpos.filter(i => i.status === 'Closed').length;
  const allotted = allIpos.filter(i => i.status === 'Allotted').length;
  const listed = allIpos.filter(i => i.status === 'Listed').length;
  const strongApply = allIpos.filter(i => (i.gmp?.percent || 0) >= 35 || i.analysis?.verdict?.includes('STRONG APPLY')).length;
  const mainboard = allIpos.filter(i => i.category === 'Mainboard').length;
  const sme = allIpos.filter(i => i.category === 'SME').length;

  statTotalIpos.textContent = total;
  statStrongApply.textContent = strongApply;
  statOpen.textContent = open;
  statClosingToday.textContent = closing;

  badgeAll.textContent = total;
  badgeUpcoming.textContent = upcoming;
  badgeOpen.textContent = open;
  badgeClosingToday.textContent = closing;
  badgeClosed.textContent = closed;
  badgeAllotted.textContent = allotted;
  badgeListed.textContent = listed;
  badgeStrongApply.textContent = strongApply;
  badgeMainboard.textContent = mainboard;
  badgeSme.textContent = sme;
}

/**
 * Update Table Footer Summaries
 */
function updateTableFooterSummary() {
  if (filteredIpos.length === 0) {
    sumAvgGmp.textContent = '0%';
    sumMaxProfit.textContent = '₹0';
    sumStrongPicks.textContent = '0';
    return;
  }

  const validGmpIpos = filteredIpos.filter(i => (i.gmp?.percent || 0) > 0);
  const avgGmp = validGmpIpos.length > 0 
    ? (validGmpIpos.reduce((acc, i) => acc + (i.gmp?.percent || 0), 0) / validGmpIpos.length).toFixed(1)
    : 0;

  const maxProfit = Math.max(...filteredIpos.map(i => i.analysis?.expectedProfitPerLot || 0));
  const strongPicks = filteredIpos.filter(i => (i.gmp?.percent || 0) >= 35 || i.analysis?.verdict?.includes('STRONG APPLY')).length;

  sumAvgGmp.textContent = `+${avgGmp}%`;
  sumMaxProfit.textContent = formatInr(maxProfit) + ' / lot';
  sumStrongPicks.textContent = `${strongPicks} IPOs`;
  tableRowCount.textContent = `Showing ${filteredIpos.length} of ${allIpos.length} IPOs`;
}

/**
 * Apply Active Filters, Search, and Status-Priority Sorting
 */
function applyFiltersAndRender() {
  filteredIpos = allIpos.filter(ipo => {
    const gmpP = ipo.gmp?.percent || 0;

    // 1. Tab Filters
    if (currentFilter === 'upcoming' && ipo.status !== 'Upcoming') return false;
    if (currentFilter === 'open' && ipo.status !== 'Open') return false;
    if (currentFilter === 'closing-today' && ipo.status !== 'Closing Today') return false;
    if (currentFilter === 'closed' && ipo.status !== 'Closed') return false;
    if (currentFilter === 'allotted' && ipo.status !== 'Allotted') return false;
    if (currentFilter === 'listed' && ipo.status !== 'Listed') return false;
    if (currentFilter === 'mainboard' && ipo.category !== 'Mainboard') return false;
    if (currentFilter === 'sme' && ipo.category !== 'SME') return false;
    if (currentFilter === 'strong-apply' && (gmpP < 35 && !ipo.analysis?.verdict?.includes('STRONG APPLY'))) return false;

    // 2. Search Filter
    if (currentSearch.trim()) {
      const q = currentSearch.toLowerCase();
      const matchName = ipo.name?.toLowerCase().includes(q);
      const matchSector = ipo.sector?.toLowerCase().includes(q);
      const matchCategory = ipo.category?.toLowerCase().includes(q);
      if (!matchName && !matchSector && !matchCategory) return false;
    }

    return true;
  });

  // 3. Sorting Logic (Default: Status Priority Sequence: Upcoming ➔ Open ➔ Closed ➔ Allotted ➔ Listed)
  filteredIpos.sort((a, b) => {
    if (currentSort === 'status-priority') {
      const rankA = getStatusPriorityRank(a.status);
      const rankB = getStatusPriorityRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      // Secondary sort within status bucket:
      if (rankA === 1) { // Upcoming: Sort by Open Date asc, then GMP% desc
        const dateA = a.dates?.rawOpen ? new Date(a.dates.rawOpen).getTime() : 9999999999999;
        const dateB = b.dates?.rawOpen ? new Date(b.dates.rawOpen).getTime() : 9999999999999;
        if (dateA !== dateB) return dateA - dateB;
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      if (rankA === 2) { // Open / Closing: Sort by GMP% desc
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      if (rankA === 4 || rankA === 5) { // Allotted / Listed: Sort by Listing date desc
        const dateA = a.dates?.rawListing ? new Date(a.dates.rawListing).getTime() : 0;
        const dateB = b.dates?.rawListing ? new Date(b.dates.rawListing).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
    }

    if (currentSort === 'gmp-desc') {
      return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
    }
    if (currentSort === 'profit-desc') {
      return (b.analysis?.expectedProfitPerLot || 0) - (a.analysis?.expectedProfitPerLot || 0);
    }
    if (currentSort === 'sub-desc') {
      return (b.subscription?.total || 0) - (a.subscription?.total || 0);
    }
    if (currentSort === 'open-asc') {
      const dateA = a.dates?.rawOpen ? new Date(a.dates.rawOpen).getTime() : 9999999999999;
      const dateB = b.dates?.rawOpen ? new Date(b.dates.rawOpen).getTime() : 9999999999999;
      return dateA - dateB;
    }
    if (currentSort === 'closing-asc') {
      const dateA = a.dates?.rawClose ? new Date(a.dates.rawClose).getTime() : 9999999999999;
      const dateB = b.dates?.rawClose ? new Date(b.dates.rawClose).getTime() : 9999999999999;
      return dateA - dateB;
    }
    if (currentSort === 'price-desc') {
      return (b.priceBand?.price || 0) - (a.priceBand?.price || 0);
    }
    if (currentSort === 'name-asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0;
  });

  updateTableFooterSummary();
  renderView();
}

/**
 * Render Cards or Table based on view mode
 */
function renderView() {
  if (filteredIpos.length === 0) {
    ipoGrid.classList.add('hidden');
    tableContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  if (currentView === 'grid') {
    tableContainer.classList.add('hidden');
    ipoGrid.classList.remove('hidden');
    renderGrid();
  } else {
    ipoGrid.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    renderTable();
  }
}

/**
 * Render Streamlined 7-Column Table Matrix
 */
function renderTable() {
  tableBody.innerHTML = filteredIpos.map(ipo => {
    const a = ipo.analysis || {};
    const t = a.transition || {};
    const gmpPercent = ipo.gmp?.percent || 0;
    const isBlockbuster = gmpPercent >= 50;
    const isStrong = gmpPercent >= 35;
    const isClosing = ipo.status === 'Closing Today';
    const isUpcoming = ipo.status === 'Upcoming';

    let rowHighlightClass = '';
    if (isBlockbuster || isStrong) rowHighlightClass = 'row-highlight-blockbuster';
    else if (isClosing) rowHighlightClass = 'row-highlight-closing';
    else if (isUpcoming) rowHighlightClass = 'row-highlight-upcoming';

    let dotStatusClass = 'dot-status-upcoming';
    if (ipo.status === 'Open') dotStatusClass = 'dot-status-open';
    else if (isClosing) dotStatusClass = 'dot-status-closing';
    else if (ipo.status === 'Closed') dotStatusClass = 'dot-status-closed';
    else if (ipo.status === 'Allotted') dotStatusClass = 'dot-status-allotted';
    else if (ipo.status === 'Listed') dotStatusClass = 'dot-status-listed';

    let gmpTagClass = gmpPercent >= 35 ? 'gmp-positive' : gmpPercent >= 20 ? 'gmp-positive' : 'gmp-neutral';

    let verdictClass = 'verdict-avoid';
    if (a.verdict?.includes('STRONG APPLY') || isStrong) verdictClass = 'verdict-strong';
    else if (a.verdict?.includes('APPLY') || gmpPercent >= 20) verdictClass = 'verdict-apply';
    else if (a.verdict?.includes('CAUTION') || a.verdict?.includes('WAIT')) verdictClass = 'verdict-caution';

    let trendClass = 'trend-consolidating';
    if (t.trendDirection === 'SURGING') trendClass = 'trend-surging';
    else if (t.trendDirection === 'COOLING_DOWN') trendClass = 'trend-cooling';

    const subNum = ipo.subscription?.total || 0;
    const meterPercent = Math.min(100, Math.max(5, subNum * 2));
    const isHotSub = subNum >= 10;

    const lowGmp = ipo.gmp?.lowGmp !== undefined ? ipo.gmp.lowGmp : (ipo.gmp?.amount || 0);
    const highGmp = ipo.gmp?.highGmp !== undefined ? ipo.gmp.highGmp : (ipo.gmp?.amount || 0);

    return `
      <tr class="${rowHighlightClass}">
        <!-- Col 1: Merged Company, Type, Status & Sector -->
        <td>
          <div class="company-cell">
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <span class="company-title">${ipo.name}</span>
              <span class="badge-pill ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}" style="font-size:0.65rem; padding:1px 6px;">
                ${ipo.category}
              </span>
            </div>
            <div class="company-subline">
              <span class="status-indicator">
                <span class="status-dot ${dotStatusClass}"></span>
                <span style="color:${isClosing ? 'var(--accent-amber)' : ipo.status === 'Open' ? 'var(--accent-emerald)' : ipo.status === 'Upcoming' ? 'var(--accent-purple)' : ipo.status === 'Allotted' ? 'var(--accent-blue)' : 'var(--text-secondary)'}; font-weight:600;">
                  ${ipo.status}
                </span>
              </span>
              <span>&bull;</span>
              <span>${ipo.sector || 'General'}</span>
              ${ipo.hasAnchor ? '<span class="anchor-tick" title="Anchor Investors Onboard">✓ Anchor</span>' : ''}
            </div>
          </div>
        </td>

        <!-- Col 2: Merged Price, Lot & Expected Profit -->
        <td class="text-right">
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.15rem;">
            <div style="display:flex; align-items:baseline; gap:0.35rem;">
              <strong style="font-family:var(--font-mono); color:#ffffff; font-size:0.875rem;">${formatInr(ipo.priceBand?.price)}</strong>
              <span style="font-size:0.68rem; color:var(--text-muted); font-family:var(--font-mono);">(${ipo.priceBand?.lotSize ? `${ipo.priceBand.lotSize} sh` : '-'})</span>
            </div>
            <span class="profit-cell-val" style="color: ${a.expectedProfitPerLot > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-size:0.8rem;">
              ${a.expectedProfitPerLot > 0 ? `+${formatInr(a.expectedProfitPerLot)} / lot` : '₹0 / lot'}
            </span>
          </div>
        </td>

        <!-- Col 3: Merged Live GMP, %, Range & Updated-On -->
        <td class="text-right">
          <div class="gmp-cell-val">
            <div style="display:flex; align-items:baseline; gap:0.35rem;">
              <span class="gmp-main">${formatInr(ipo.gmp?.amount)}</span>
              <span class="gmp-tag ${gmpTagClass}">+${gmpPercent}%</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.65rem; font-family:var(--font-mono);">
              ${highGmp > 0 ? `<span class="gmp-range-sub">${formatInr(lowGmp)} ↓ / ${formatInr(highGmp)} ↑</span>` : ''}
              <span class="updated-on-tag" style="padding:1px 4px; font-size:0.62rem;">${ipo.gmp?.updatedOn || 'Live'}</span>
            </div>
          </div>
        </td>

        <!-- Col 4: Subscription Meter -->
        <td class="text-right">
          <div class="sub-meter-cell">
            <span class="sub-text" style="color:${isHotSub ? 'var(--accent-emerald)' : 'inherit'};">
              ${ipo.subscription?.raw || '-'}
            </span>
            ${subNum > 0 ? `
              <div class="meter-track">
                <div class="meter-fill ${isHotSub ? 'meter-fill-hot' : ''}" style="width: ${meterPercent}%;"></div>
              </div>
            ` : ''}
          </div>
        </td>

        <!-- Col 5: Merged Bidding Window (Open - Close) -->
        <td>
          <div style="display:flex; flex-direction:column; gap:0.15rem; font-family:var(--font-mono); font-size:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.3rem;">
              <span style="color:var(--accent-emerald); font-weight:600;">${ipo.dates?.open || 'TBA'}</span>
              <span style="color:var(--text-muted);">➔</span>
              <span style="color:${isClosing ? 'var(--accent-amber)' : '#ffffff'}; font-weight:${isClosing ? '700' : '600'};">${ipo.dates?.close || 'TBA'}</span>
            </div>
            <span style="font-size:0.65rem; color:var(--text-muted);">${isClosing ? '⏳ Closes Today 5 PM' : isUpcoming ? '🟣 Opens soon' : '🟢 Bidding open'}</span>
          </div>
        </td>

        <!-- Col 6: Merged Allotment & Listing Dates -->
        <td>
          <div style="display:flex; flex-direction:column; gap:0.15rem; font-family:var(--font-mono); font-size:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.3rem;">
              <span style="color:var(--text-secondary); font-size:0.68rem;">BoA:</span>
              <span style="color:var(--text-primary); font-weight:500;">${ipo.dates?.allotment || 'TBA'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.3rem;">
              <span style="color:var(--text-secondary); font-size:0.68rem;">Listing:</span>
              <span style="color:var(--accent-blue); font-weight:700;">${ipo.dates?.listing || 'TBA'}</span>
            </div>
          </div>
        </td>

        <!-- Col 7: Merged AI Verdict & 1-Click WhatsApp Letter Export -->
        <td>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
              <span class="verdict-tag ${verdictClass}" style="font-size:0.7rem;">
                ${a.verdict || 'ANALYZING'}
              </span>
              ${t.trendLabel ? `<span class="trend-pill ${trendClass}" style="font-size:0.65rem; padding:1px 5px;">${t.trendIcon || '📈'} ${t.trendLabel}</span>` : ''}
            </div>
            <button class="btn btn-secondary" style="padding:0.3rem 0.55rem; font-size:0.7rem;" onclick="openSingleIpoModal('${encodeURIComponent(ipo.name)}')">
              <span>📱</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Grid Cards
 */
function renderGrid() {
  ipoGrid.innerHTML = filteredIpos.map(ipo => {
    const a = ipo.analysis || {};
    const t = a.transition || {};
    const gmpPercent = ipo.gmp?.percent || 0;
    const isStrong = gmpPercent >= 35;
    const gmpPercentClass = gmpPercent >= 20 ? 'gmp-positive' : 'gmp-neutral';

    let statusBadgeClass = 'badge-upcoming';
    if (ipo.status === 'Open') statusBadgeClass = 'badge-open';
    else if (ipo.status === 'Closing Today') statusBadgeClass = 'badge-closing';
    else if (ipo.status === 'Closed') statusBadgeClass = 'badge-closed';
    else if (ipo.status === 'Allotted') statusBadgeClass = 'badge-allotted';
    else if (ipo.status === 'Listed') statusBadgeClass = 'badge-listed';

    let verdictClass = 'verdict-avoid';
    if (a.verdict?.includes('STRONG APPLY') || isStrong) verdictClass = 'verdict-strong';
    else if (a.verdict?.includes('APPLY') || gmpPercent >= 20) verdictClass = 'verdict-apply';
    else if (a.verdict?.includes('CAUTION') || a.verdict?.includes('WAIT')) verdictClass = 'verdict-caution';

    let trendClass = 'trend-consolidating';
    if (t.trendDirection === 'SURGING') trendClass = 'trend-surging';
    else if (t.trendDirection === 'COOLING_DOWN') trendClass = 'trend-cooling';

    const lowGmp = ipo.gmp?.lowGmp !== undefined ? ipo.gmp.lowGmp : (ipo.gmp?.amount || 0);
    const highGmp = ipo.gmp?.highGmp !== undefined ? ipo.gmp.highGmp : (ipo.gmp?.amount || 0);

    return `
      <div class="ipo-card">
        <div class="card-top">
          <div class="card-title-group">
            <h3 class="company-name">${ipo.name}</h3>
            <span class="company-sector">${ipo.sector || 'General Business'}</span>
          </div>
          <div class="badges-group">
            <span class="badge-pill ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${ipo.category}</span>
            <span class="badge-pill ${statusBadgeClass}">${ipo.status}</span>
          </div>
        </div>

        <div class="gmp-highlight-box">
          <div class="gmp-data-left">
            <span class="gmp-label">Grey Market Premium</span>
            <div class="gmp-amount">
              ${formatInr(ipo.gmp?.amount)}
              <span class="gmp-percent ${gmpPercentClass}">+${gmpPercent}%</span>
            </div>
            ${highGmp > 0 ? `<span style="font-size:0.7rem; color:var(--accent-blue); font-family:var(--font-mono); margin-top:2px;">Range: ${formatInr(lowGmp)} ↓ ➔ ${formatInr(highGmp)} ↑</span>` : ''}
          </div>
          <div class="gmp-data-right">
            <span class="profit-label">Est. Profit / Lot</span>
            <span class="profit-amount">${formatInr(a.expectedProfitPerLot)}</span>
          </div>
        </div>

        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">Price Band</span>
            <span class="spec-val">${formatInr(ipo.priceBand?.price)} (${ipo.priceBand?.lotSize || '-'} sh)</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Subscription</span>
            <span class="spec-val" style="color: ${ipo.subscription?.total >= 5 ? 'var(--accent-emerald)' : 'inherit'}">${ipo.subscription?.raw || 'N/A'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Bidding Window</span>
            <span class="spec-val" style="color:var(--accent-emerald);">${ipo.dates?.open} ➔ ${ipo.dates?.close}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">BoA / Listing</span>
            <span class="spec-val">${ipo.dates?.allotment} / ${ipo.dates?.listing}</span>
          </div>
        </div>

        <div class="card-verdict">
          <div class="verdict-header">
            <span class="verdict-tag ${verdictClass}">Verdict: ${a.verdict || 'ANALYZING'}</span>
            <span class="updated-on-tag">${ipo.gmp?.updatedOn || 'Live'}</span>
          </div>
          ${t.trendLabel ? `<div style="margin:2px 0;"><span class="trend-pill ${trendClass}">${t.trendIcon || '📈'} ${t.trendLabel}</span></div>` : ''}
          <p class="strategy-text">${a.strategy || 'Monitor institutional bidding.'}</p>
        </div>

        <div class="card-actions">
          <button class="card-btn" onclick="openSingleIpoModal('${encodeURIComponent(ipo.name)}')">
            <span>📱</span> WhatsApp Letter
          </button>
          ${ipo.detailUrl ? `
            <a href="${ipo.detailUrl}" target="_blank" class="card-btn" style="text-decoration:none;">
              <span>🔗</span> Research Link
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Open Single IPO Letter Modal
 */
window.openSingleIpoModal = function(encodedName) {
  const name = decodeURIComponent(encodedName);
  const ipo = allIpos.find(i => i.name === name);
  if (!ipo) return;

  const a = ipo.analysis || {};
  const t = a.transition || {};
  const statusEmoji = ipo.status === 'Closing Today' ? '⏳ *CLOSING TODAY*' : ipo.status === 'Open' ? '🟢 *OPEN FOR BIDDING*' : ipo.status === 'Upcoming' ? '🟣 *UPCOMING*' : ipo.status === 'Allotted' ? '🔵 *ALLOTTED*' : '⚪ *LISTED*';

  const letter = `🚀 *RUN4DREAM IPO INTELLIGENCE REPORT*
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
${statusEmoji}

📊 *Key Financials & GMP:*
• *Price Band:* ${formatInr(ipo.priceBand?.price)}
• *Lot Size:* ${ipo.priceBand?.lotSize || 'N/A'} Shares (~${formatInr(ipo.priceBand?.minInvestment)})
• *Live GMP:* ${formatInr(ipo.gmp?.amount)} (*+${ipo.gmp?.percent}%* Gain) 🔥
• *GMP Transition Range:* ${formatInr(ipo.gmp?.lowGmp || ipo.gmp?.amount)} (Low) ↓ ➔ ${formatInr(ipo.gmp?.highGmp || ipo.gmp?.amount)} (High) ↑
• *Trend Momentum:* ${t.trendIcon || '📈'} *${t.trendLabel || 'Active quotes'}*
• *Est. Listing Price:* ${formatInr(ipo.gmp?.estListingPrice)}
• *Est. Profit per Lot:* ${formatInr(a.expectedProfitPerLot)}
• *Subscription:* ${ipo.subscription?.raw || 'N/A'}
• *Issue Size:* ${ipo.issueSize || 'N/A'} | *P/E:* ${ipo.peRatio || 'N/A'}

🗓️ *Important Dates:*
• *Open Date:* ${ipo.dates?.open || 'TBA'}
• *Close Date:* ${ipo.dates?.close || 'TBA'}
• *BoA (Allotment):* ${ipo.dates?.allotment || 'TBA'}
• *Listing Date:* ${ipo.dates?.listing || 'TBA'}
• *Updated On:* ${ipo.gmp?.updatedOn || 'Live'}

💡 *Agent Verdict & Strategy:*
• *Rating:* ${a.stars || '⭐⭐⭐'} (*${a.rating || '3.5'} / 5*)
• *Verdict:* *${a.verdict || 'APPLY'}*
• *Risk Level:* ${a.riskLevel || 'Moderate'}
• *Strategy:* ${a.strategy || 'Monitor Day 3 subscription numbers.'}
━━━━━━━━━━━━━━━━━━━━━
_Powered by Run4Dream IPO Agent_`;

  modalTitle.textContent = `WhatsApp Letter: ${ipo.name}`;
  whatsappTextPreview.textContent = letter;
  whatsappModal.classList.remove('hidden');
};

/**
 * Open Daily Digest Modal
 */
function openDailyDigestModal() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const closingToday = allIpos.filter(i => i.status === 'Closing Today');
  const highGmpIpos = allIpos.filter(i => (i.gmp?.percent || 0) >= 20);

  let digest = `🌅 *RUN4DREAM DAILY IPO DIGEST — ${today}*
━━━━━━━━━━━━━━━━━━━━━\n`;

  if (closingToday.length > 0) {
    digest += `\n⏰ *CLOSING TODAY (Bid before 5 PM):*\n`;
    closingToday.forEach(i => {
      const t = i.analysis?.transition || {};
      digest += `• *${i.name}* (${i.category})\n  GMP: *${formatInr(i.gmp?.amount)} (+${i.gmp?.percent}%)* | Range: ${formatInr(i.gmp?.lowGmp || 0)} ↓ / ${formatInr(i.gmp?.highGmp || 0)} ↑\n  Sub: ${i.subscription?.raw || 'N/A'} | Verdict: *${i.analysis?.verdict || 'N/A'}*\n\n`;
    });
  }

  digest += `🔥 *TOP HIGH-GMP OPPORTUNITIES:*\n`;
  highGmpIpos.slice(0, 5).forEach((i, idx) => {
    const t = i.analysis?.transition || {};
    digest += `${idx + 1}. *${i.name}* (${i.category})\n   • GMP: *${formatInr(i.gmp?.amount)} (+${i.gmp?.percent}%)* ${t.trendIcon || '🚀'} (${t.trendLabel || 'Active'})\n   • Range: ${formatInr(i.gmp?.lowGmp || 0)} ↓ ➔ ${formatInr(i.gmp?.highGmp || 0)} ↑ | Profit/Lot: ~${formatInr(i.analysis?.expectedProfitPerLot)}\n   • Status: ${i.status} (Closes: ${i.dates?.close})\n\n`;
  });

  digest += `━━━━━━━━━━━━━━━━━━━━━\n💬 _Reply with IPO name for full report._`;

  modalTitle.textContent = `Run4Dream Daily IPO Digest`;
  whatsappTextPreview.textContent = digest;
  whatsappModal.classList.remove('hidden');
}

// Clickable Column Header Sorting for Table
if (matrixTable) {
  matrixTable.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.getAttribute('data-sort-key');
      if (sortKey === 'name') {
        currentSort = currentSort === 'name-asc' ? 'status-priority' : 'name-asc';
      } else if (sortKey === 'price') {
        currentSort = currentSort === 'price-desc' ? 'price-asc' : 'price-desc';
      } else if (sortKey === 'gmp') {
        currentSort = currentSort === 'gmp-desc' ? 'gmp-asc' : 'gmp-desc';
      } else if (sortKey === 'profit') {
        currentSort = currentSort === 'profit-desc' ? 'profit-asc' : 'profit-desc';
      } else if (sortKey === 'sub') {
        currentSort = currentSort === 'sub-desc' ? 'sub-asc' : 'sub-desc';
      } else if (sortKey === 'open') {
        currentSort = currentSort === 'open-asc' ? 'status-priority' : 'open-asc';
      } else if (sortKey === 'listing') {
        currentSort = currentSort === 'listing-desc' ? 'status-priority' : 'listing-desc';
      }
      sortSelect.value = currentSort;
      applyFiltersAndRender();
    });
  });
}

// Event Listeners
filterTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentFilter = tab.getAttribute('data-filter');
  applyFiltersAndRender();
});

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  applyFiltersAndRender();
});

sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  applyFiltersAndRender();
});

viewGridBtn.addEventListener('click', () => {
  currentView = 'grid';
  viewGridBtn.classList.add('active');
  viewTableBtn.classList.remove('active');
  renderView();
});

viewTableBtn.addEventListener('click', () => {
  currentView = 'table';
  viewTableBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  renderView();
});

clearFiltersBtn.addEventListener('click', () => {
  currentFilter = 'all';
  currentSearch = '';
  searchInput.value = '';
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  applyFiltersAndRender();
});

openDigestBtn.addEventListener('click', openDailyDigestModal);
closeModalBtn.addEventListener('click', () => whatsappModal.classList.add('hidden'));
whatsappModal.addEventListener('click', (e) => {
  if (e.target === whatsappModal) whatsappModal.classList.add('hidden');
});

copyWhatsappBtn.addEventListener('click', () => {
  const text = whatsappTextPreview.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('WhatsApp Letter copied to clipboard!');
  });
});

refreshBtn.addEventListener('click', async () => {
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '↻ Fetching Live...';
  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    if (res.ok) {
      await loadIpoData();
      showToast('Live GMP Data Refreshed!');
    } else {
      await loadIpoData();
    }
  } catch (e) {
    await loadIpoData();
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<span class="btn-icon">↻</span> Refresh Live GMP';
  }
});

// Initial Load
loadIpoData();
