/**
 * Run4Dream IPO Radar — Customer Portal Frontend Engine
 * 100% Identical Visual Matrix to Admin with internal WhatsApp modals omitted
 */

let allIpos = [];
let filteredIpos = [];
let currentFilter = 'all';
let currentSort = 'status-priority';
let currentSearch = '';
let currentView = 'table'; // 'table' or 'grid'

// DOM Element Selectors
const matrixTable = document.getElementById('matrixTable');
const tableBody = document.getElementById('tableBody');
const ipoGrid = document.getElementById('ipoGrid');
const tableContainer = document.getElementById('tableContainer');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const viewTableBtn = document.getElementById('viewTableBtn');
const viewGridBtn = document.getElementById('viewGridBtn');
const filterTabs = document.getElementById('filterTabs');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const joinCommunityBtn = document.getElementById('joinCommunityBtn');

// Stat Counters
const statTotalIpos = document.getElementById('statTotalIpos');
const statStrongApply = document.getElementById('statStrongApply');
const statOpen = document.getElementById('statOpen');
const statClosingToday = document.getElementById('statClosingToday');

// Filter Tab Badges
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

// Table Summary
const sumAvgGmp = document.getElementById('sumAvgGmp');
const sumMaxProfit = document.getElementById('sumMaxProfit');
const sumStrongPicks = document.getElementById('sumStrongPicks');
const tableRowCount = document.getElementById('tableRowCount');

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadIpoData();
});

function setupEventListeners() {
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('loading');
    refreshBtn.innerHTML = '<span class="btn-icon">↻</span> Refreshing...';
    triggerLiveRefresh();
  });

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    applyFiltersAndRender();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndRender();
  });

  clearFiltersBtn.addEventListener('click', () => {
    currentSearch = '';
    searchInput.value = '';
    currentFilter = 'all';
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tab[data-filter="all"]').classList.add('active');
    applyFiltersAndRender();
  });

  viewTableBtn.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    renderView();
  });

  viewGridBtn.addEventListener('click', () => {
    currentView = 'grid';
    viewGridBtn.classList.add('active');
    viewTableBtn.classList.remove('active');
    renderView();
  });

  filterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    applyFiltersAndRender();
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      handleTableSortHeaderClick(key);
    });
  });
}

function handleTableSortHeaderClick(key) {
  if (key === 'name') currentSort = currentSort === 'name-asc' ? 'status-priority' : 'name-asc';
  else if (key === 'price') currentSort = currentSort === 'price-desc' ? 'status-priority' : 'price-desc';
  else if (key === 'gmp') currentSort = currentSort === 'gmp-desc' ? 'status-priority' : 'gmp-desc';
  else if (key === 'sub') currentSort = currentSort === 'sub-desc' ? 'status-priority' : 'sub-desc';
  else if (key === 'open') currentSort = currentSort === 'open-asc' ? 'status-priority' : 'open-asc';
  else if (key === 'listing') currentSort = currentSort === 'closing-asc' ? 'status-priority' : 'closing-asc';

  sortSelect.value = currentSort;
  applyFiltersAndRender();
}

async function loadIpoData() {
  try {
    const res = await fetch('/api/latest');
    if (!res.ok) throw new Error('Failed to load IPO data');
    const data = await res.json();
    allIpos = data.ipos || [];

    if (data.communityInviteLink) {
      joinCommunityBtn.href = data.communityInviteLink;
      joinCommunityBtn.classList.remove('hidden');
    }

    updateHeaderStats();
    updateFilterBadges();
    applyFiltersAndRender();
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Failed to load live data', true);
  }
}

async function triggerLiveRefresh() {
  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const result = await res.json();
    if (result.success && result.data?.ipos) {
      allIpos = result.data.ipos;
      updateHeaderStats();
      updateFilterBadges();
      applyFiltersAndRender();
      showToast('Live IPO quotes updated successfully!');
    }
  } catch (err) {
    console.error('Refresh error:', err);
    showToast('Refresh failed', true);
  } finally {
    refreshBtn.classList.remove('loading');
    refreshBtn.innerHTML = '<span class="btn-icon">↻</span> Refresh Live GMP';
  }
}

function updateHeaderStats() {
  statTotalIpos.textContent = allIpos.length;
  statStrongApply.textContent = allIpos.filter(i => (i.gmp?.percent || 0) >= 35 || i.analysis?.verdict?.includes('STRONG APPLY')).length;
  statOpen.textContent = allIpos.filter(i => i.status === 'Open').length;
  statClosingToday.textContent = allIpos.filter(i => i.status === 'Closing Today').length;
}

function updateFilterBadges() {
  badgeAll.textContent = allIpos.length;
  badgeUpcoming.textContent = allIpos.filter(i => i.status === 'Upcoming').length;
  badgeOpen.textContent = allIpos.filter(i => i.status === 'Open').length;
  badgeClosingToday.textContent = allIpos.filter(i => i.status === 'Closing Today').length;
  badgeClosed.textContent = allIpos.filter(i => i.status === 'Closed').length;
  badgeAllotted.textContent = allIpos.filter(i => i.status === 'Allotted').length;
  badgeListed.textContent = allIpos.filter(i => i.status === 'Listed').length;
  badgeStrongApply.textContent = allIpos.filter(i => (i.gmp?.percent || 0) >= 35 || i.analysis?.verdict?.includes('STRONG APPLY')).length;
  badgeMainboard.textContent = allIpos.filter(i => i.category === 'Mainboard').length;
  badgeSme.textContent = allIpos.filter(i => i.category === 'SME').length;
}

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

function applyFiltersAndRender() {
  filteredIpos = allIpos.filter(ipo => {
    const gmpP = ipo.gmp?.percent || 0;

    if (currentFilter === 'upcoming' && ipo.status !== 'Upcoming') return false;
    if (currentFilter === 'open' && ipo.status !== 'Open') return false;
    if (currentFilter === 'closing-today' && ipo.status !== 'Closing Today') return false;
    if (currentFilter === 'closed' && ipo.status !== 'Closed') return false;
    if (currentFilter === 'allotted' && ipo.status !== 'Allotted') return false;
    if (currentFilter === 'listed' && ipo.status !== 'Listed') return false;
    if (currentFilter === 'mainboard' && ipo.category !== 'Mainboard') return false;
    if (currentFilter === 'sme' && ipo.category !== 'SME') return false;
    if (currentFilter === 'strong-apply' && (gmpP < 35 && !ipo.analysis?.verdict?.includes('STRONG APPLY'))) return false;

    if (currentSearch.trim()) {
      const q = currentSearch.toLowerCase();
      const matchName = ipo.name?.toLowerCase().includes(q);
      const matchSector = ipo.sector?.toLowerCase().includes(q);
      const matchCategory = ipo.category?.toLowerCase().includes(q);
      if (!matchName && !matchSector && !matchCategory) return false;
    }

    return true;
  });

  filteredIpos.sort((a, b) => {
    if (currentSort === 'status-priority') {
      const rankA = getStatusPriorityRank(a.status);
      const rankB = getStatusPriorityRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      if (rankA === 1) {
        const dateA = a.dates?.rawOpen ? new Date(a.dates.rawOpen).getTime() : 9999999999999;
        const dateB = b.dates?.rawOpen ? new Date(b.dates.rawOpen).getTime() : 9999999999999;
        if (dateA !== dateB) return dateA - dateB;
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      if (rankA === 2) {
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      if (rankA === 4 || rankA === 5) {
        const dateA = a.dates?.rawListing ? new Date(a.dates.rawListing).getTime() : 0;
        const dateB = b.dates?.rawListing ? new Date(b.dates.rawListing).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
      }
      return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
    }

    if (currentSort === 'gmp-desc') return (b.gmp?.percent || 0) - (a.gmp?.percent || 0);
    if (currentSort === 'profit-desc') return (b.analysis?.expectedProfitPerLot || 0) - (a.analysis?.expectedProfitPerLot || 0);
    if (currentSort === 'sub-desc') return (b.subscription?.total || 0) - (a.subscription?.total || 0);
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
    if (currentSort === 'price-desc') return (b.priceBand?.price || 0) - (a.priceBand?.price || 0);
    if (currentSort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  updateTableFooterSummary();
  renderView();
}

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

        <!-- Col 7: Clean AI Verdict & Momentum (Zero Modal Export for Customer) -->
        <td>
          <div style="display:flex; flex-direction:column; gap:0.25rem;">
            <span class="verdict-tag ${verdictClass}" style="font-size:0.75rem;">
              ${a.verdict || 'ANALYZING'}
            </span>
            ${t.trendLabel ? `<span class="trend-pill ${trendClass}" style="font-size:0.68rem; padding:2px 6px;">${t.trendIcon || '📈'} ${t.trendLabel}</span>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGrid() {
  ipoGrid.innerHTML = filteredIpos.map(ipo => {
    const a = ipo.analysis || {};
    const t = a.transition || {};
    const gmpPercent = ipo.gmp?.percent || 0;
    const isClosing = ipo.status === 'Closing Today';

    let dotStatusClass = 'dot-status-upcoming';
    if (ipo.status === 'Open') dotStatusClass = 'dot-status-open';
    else if (isClosing) dotStatusClass = 'dot-status-closing';
    else if (ipo.status === 'Closed') dotStatusClass = 'dot-status-closed';
    else if (ipo.status === 'Allotted') dotStatusClass = 'dot-status-allotted';
    else if (ipo.status === 'Listed') dotStatusClass = 'dot-status-listed';

    let verdictClass = 'verdict-avoid';
    if (a.verdict?.includes('STRONG APPLY')) verdictClass = 'verdict-strong';
    else if (a.verdict?.includes('APPLY')) verdictClass = 'verdict-apply';
    else if (a.verdict?.includes('CAUTION') || a.verdict?.includes('WAIT')) verdictClass = 'verdict-caution';

    return `
      <div class="ipo-card">
        <div class="card-top">
          <div>
            <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.25rem;">
              <span class="status-dot ${dotStatusClass}"></span>
              <span class="badge-pill ${ipo.category === 'Mainboard' ? 'badge-mainboard' : 'badge-sme'}">${ipo.category}</span>
              <span style="font-size:0.75rem; color:var(--text-secondary);">${ipo.status}</span>
            </div>
            <h3 class="card-name">${ipo.name}</h3>
            <span class="card-sector">${ipo.sector || 'General'}</span>
          </div>
          <div class="card-gmp-box">
            <span class="gmp-val-large">+${gmpPercent}%</span>
            <span class="gmp-amt-sub">${formatInr(ipo.gmp?.amount)}</span>
          </div>
        </div>

        <div class="card-metrics-grid">
          <div class="c-metric">
            <span class="c-lbl">Price Band</span>
            <span class="c-val">${formatInr(ipo.priceBand?.price)}</span>
          </div>
          <div class="c-metric">
            <span class="c-lbl">Lot Size</span>
            <span class="c-val">${ipo.priceBand?.lotSize || '-'} sh</span>
          </div>
          <div class="c-metric">
            <span class="c-lbl">Profit / Lot</span>
            <span class="c-val" style="color:var(--accent-emerald); font-weight:700;">+${formatInr(a.expectedProfitPerLot)}</span>
          </div>
          <div class="c-metric">
            <span class="c-lbl">Subscription</span>
            <span class="c-val" style="color:var(--accent-primary);">${ipo.subscription?.raw || '-'}</span>
          </div>
        </div>

        <div class="card-timeline">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Bidding:</span>
            <strong>${ipo.dates?.open || 'TBA'} ➔ ${ipo.dates?.close || 'TBA'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Allotment / List:</span>
            <span>BoA: <strong>${ipo.dates?.allotment || 'TBA'}</strong> | List: <strong style="color:var(--accent-blue);">${ipo.dates?.listing || 'TBA'}</strong></span>
          </div>
        </div>

        <div class="card-footer">
          <span class="verdict-tag ${verdictClass}" style="width:100%; text-align:center;">
            ${a.verdict || 'ANALYZING'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function formatInr(val) {
  if (!val && val !== 0) return 'N/A';
  return '₹' + Number(val).toLocaleString('en-IN');
}

function showToast(msg, isError = false) {
  toastMsg.textContent = msg;
  toast.className = isError ? 'toast toast-error' : 'toast toast-success';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
