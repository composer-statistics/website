const THEME_KEY = 'cdr-theme';
const PDF_PATH = '../report/archive/composer_representation_report.pdf';

const GRAPH_CREDIT_TEXT = '';

const palette = {
  women: {
    primary: '#5a4e8c',
    light: '#8a3cff',
    mid: '#6a00ff',
    dark: '#4a00b8',
  },
  poc: {
    primary: '#c6a14a',
    light: '#ffd166',
    mid: '#f5b300',
    dark: '#c99700',
  },
  grid: '#2a2a2a',
};

const chartInstances = [];

function getThemeTokens() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--chart-text').trim(),
    muted: styles.getPropertyValue('--chart-muted').trim(),
    grid: styles.getPropertyValue('--chart-grid').trim(),
    gridSoft: styles.getPropertyValue('--chart-grid-soft').trim(),
    tooltipBg: styles.getPropertyValue('--tooltip-bg').trim(),
  };
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function buildChartExportCanvas(chart, titleText, subtitleLines = []) {
  if (!chart || !chart.canvas) return null;
  const chartCanvas = chart.canvas;
  const scale = window.devicePixelRatio || 1;
  const padding = 24 * scale;
  const gap = 12 * scale;
  const titleSize = 20 * scale;
  const subtitleSize = 14 * scale;
  const footerSize = 14 * scale;
  const maxTextWidth = chartCanvas.width;

  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');

  ctx.font = `600 ${titleSize}px "Source Sans 3", "Segoe UI", sans-serif`;
  const titleLines = wrapText(ctx, titleText || '', maxTextWidth);
  const titleHeight = titleLines.length * titleSize * 1.25;
  const subtitleHeight = subtitleLines.length * subtitleSize * 1.4;
  const footerHeight = footerSize * 1.4;

  exportCanvas.width = chartCanvas.width + padding * 2;
  exportCanvas.height =
    padding + titleHeight + (subtitleHeight ? gap + subtitleHeight : 0) + gap + chartCanvas.height + gap + footerHeight + padding;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  ctx.fillStyle = '#111111';
  ctx.font = `600 ${titleSize}px "Source Sans 3", "Segoe UI", sans-serif`;
  ctx.textBaseline = 'top';
  titleLines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * titleSize * 1.25);
  });

  if (subtitleLines.length) {
    ctx.fillStyle = '#555555';
    ctx.font = `500 ${subtitleSize}px "Source Sans 3", "Segoe UI", sans-serif`;
    subtitleLines.forEach((line, index) => {
      ctx.fillText(line, padding, padding + titleHeight + gap + index * subtitleSize * 1.4);
    });
  }

  const chartY = padding + titleHeight + (subtitleHeight ? gap + subtitleHeight : 0) + gap;
  ctx.drawImage(chartCanvas, padding, chartY, chartCanvas.width, chartCanvas.height);

  ctx.fillStyle = '#555555';
  ctx.font = `500 ${footerSize}px "Source Sans 3", "Segoe UI", sans-serif`;
  ctx.fillText(GRAPH_CREDIT_TEXT, padding, chartY + chartCanvas.height + gap);

  return exportCanvas;
}

function getChartTitle(bar) {
  if (!bar) return '';
  const panel = bar.closest('.panel') || bar.closest('section') || bar.parentElement;
  const title = panel?.querySelector('.panel__header h2, h2');
  return title?.textContent?.trim() || '';
}

function getChartContextLines(bar) {
  if (!bar) return [];
  const panel = bar.closest('.panel') || bar.closest('section') || bar.parentElement;
  if (!panel) return [];
  const lines = [];
  const headerSubtitle = panel.querySelector('.panel__header p:not(.sr-only)');
  if (headerSubtitle?.textContent?.trim()) {
    lines.push(headerSubtitle.textContent.trim());
  }
  const controls = Array.from(panel.querySelectorAll('.chart-controls'));
  controls.forEach((control) => {
    const labelText = control.querySelector('.control-label')?.textContent?.trim();
    const select = control.querySelector('select');
    if (select) {
      const option = select.options[select.selectedIndex];
      if (option && labelText) {
        lines.push(`${labelText} ${option.textContent.trim()}`);
      } else if (option) {
        lines.push(option.textContent.trim());
      }
    }
    const checkboxes = Array.from(control.querySelectorAll('input[type="checkbox"]:checked'));
    if (checkboxes.length) {
      const checkedLabels = checkboxes
        .map((input) => input.closest('label')?.textContent?.trim())
        .filter(Boolean);
      if (checkedLabels.length) {
        const lineLabel = labelText || 'Selected';
        lines.push(`${lineLabel} ${checkedLabels.join(', ')}`);
      }
    }
  });
  return lines;
}

function appendGraphCredit(target) {
  if (!GRAPH_CREDIT_TEXT || !target || target.querySelector('.graph-credit')) return;
  const credit = document.createElement('p');
  credit.className = 'graph-credit';
  credit.textContent = GRAPH_CREDIT_TEXT;
  target.appendChild(credit);
}

function initGraphCredits() {
  document.querySelectorAll('.carousel__fact-block').forEach((block) => {
    appendGraphCredit(block);
  });

  document.querySelectorAll('.share-bar').forEach((bar) => {
    if (GRAPH_CREDIT_TEXT && !bar.querySelector('.graph-credit')) {
      const credit = document.createElement('p');
      credit.className = 'graph-credit';
      credit.textContent = GRAPH_CREDIT_TEXT;
      bar.appendChild(credit);
    }
  });
}

function initLinks() {
  const pdfLinks = document.querySelectorAll('[data-pdf-link]');
  pdfLinks.forEach((link) => {
    link.setAttribute('href', new URL(PDF_PATH, window.location.href).toString());
  });

  const navLinks = document.querySelectorAll('[data-nav-link]');
  navLinks.forEach((link) => {
    const target = link.getAttribute('data-nav-link');
    const file = target === 'facts' ? 'facts.html' : target === 'about' ? 'about.html' : 'index.html';
    link.setAttribute('href', new URL(file, window.location.href).toString());
  });
}

function getStickyOffset() {
  const header = document.querySelector('.site-header');
  return header ? header.offsetHeight + 12 : 0;
}

function smoothScrollTo(target, duration = 1100) {
  if (!target) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startY = window.scrollY;
  const targetY = target.getBoundingClientRect().top + window.scrollY - getStickyOffset();
  if (prefersReducedMotion) {
    window.scrollTo(0, targetY);
    return;
  }
  const distance = targetY - startY;
  const startTime = performance.now();

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const tick = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  window.requestAnimationFrame(tick);
}

function initHeroScrollHint() {
  const scrollHint = document.querySelector('[data-scroll-target]');
  if (!scrollHint) return;
  scrollHint.addEventListener('click', (event) => {
    const targetId = scrollHint.getAttribute('data-scroll-target');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    event.preventDefault();
    smoothScrollTo(target);
  });
}

function setTheme(theme, persist) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.warn('Unable to persist theme preference.', err);
    }
  }

  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.setAttribute('aria-pressed', theme === 'dark');
    const label = toggle.querySelector('[data-theme-value]');
    if (label) {
      label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
  }

  applyChartTheme();
}

function initThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (err) {
    console.warn('Unable to read theme preference.', err);
  }

  const initialTheme = saved || 'light';

  setTheme(initialTheme, Boolean(saved));

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next, true);
  });
}

function initMobileNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (!header || !toggle) return;

  const setOpen = (open) => {
    header.classList.toggle('site-header--open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('site-header--open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  header.querySelectorAll('.site-nav a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) {
      setOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) {
      setOpen(false);
    }
  });
}

function initChartSharing(chartMap) {
  const bars = document.querySelectorAll('[data-share-chart]');
  bars.forEach((bar) => {
    const key = bar.getAttribute('data-share-chart');
    const filename = bar.getAttribute('data-share-filename') || `${key}.png`;
    const chart = chartMap[key];
    const chartContainer =
      bar.closest('.chart-block')?.querySelector('.chart') ||
      bar.parentElement?.querySelector('.chart') ||
      bar.previousElementSibling;

    bar.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.getAttribute('data-share-action');
      if (action === 'download') {
        if (!chart) return;
        const titleText = getChartTitle(bar);
        const contextLines = getChartContextLines(bar);
        const exportCanvas = buildChartExportCanvas(chart, titleText, contextLines);
        if (!exportCanvas) return;
        const link = document.createElement('a');
        link.href = exportCanvas.toDataURL('image/png', 1);
        link.download = filename;
        link.click();
        showToast('Download started');
      }
      if (action === 'fullscreen') {
        const target = chartContainer;
        if (!target) return;
        if (target.requestFullscreen) {
          try {
            await target.requestFullscreen();
          } catch (err) {
            console.warn(err);
            showToast('Fullscreen unavailable');
          }
        } else if (target.webkitRequestFullscreen) {
          target.webkitRequestFullscreen();
        } else {
          showToast('Fullscreen unavailable');
        }
      }
    });
  });
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function loadData() {
  const [
    womenShare,
    pocShare,
    womenBudget,
    pocBudget,
    awardsShare,
    rolesShare,
  ] = await Promise.all([
    loadJSON('data/female_share.json'),
    loadJSON('data/poc_share.json'),
    loadJSON('data/female_budget_share.json'),
    loadJSON('data/poc_budget_share.json'),
    loadJSON('data/awards_share.json'),
    loadJSON('data/roles_share.json'),
  ]);

  const sortByYear = (arr) => arr.slice().sort((a, b) => a.year - b.year);

  return {
    womenShare: sortByYear(womenShare),
    pocShare: sortByYear(pocShare),
    womenBudget: sortByYear(womenBudget),
    pocBudget: sortByYear(pocBudget),
    awardsShare: Object.fromEntries(
      Object.entries(awardsShare).map(([key, rows]) => [key, sortByYear(rows)])
    ),
    rolesShare: Object.fromEntries(
      Object.entries(rolesShare).map(([role, rows]) => [role, sortByYear(rows)])
    ),
  };
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function describePiePath(value, centerX, centerY, radius) {
  const angle = (value / 100) * Math.PI * 2;
  const startX = centerX;
  const startY = centerY - radius;
  const endX = centerX + Math.sin(angle) * radius;
  const endY = centerY - Math.cos(angle) * radius;
  const largeArc = value > 50 ? 1 : 0;
  return [
    `M ${centerX} ${centerY}`,
    `L ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
    'Z',
  ].join(' ');
}

function updatePie(sliceKey, value) {
  const slice = document.querySelector(`[data-pie-slice="${sliceKey}"]`);
  const rest = document.querySelector(`[data-pie-rest="${sliceKey}"]`);
  const titleSlice = document.querySelector(`[data-pie-title="${sliceKey}"]`);
  const titleRest = document.querySelector(`[data-pie-title="${sliceKey}-rest"]`);
  const centerX = 60;
  const centerY = 60;
  const radius = 46;
  const safeValue = Math.max(0, Math.min(100, value));
  if (slice) slice.setAttribute('d', describePiePath(safeValue, centerX, centerY, radius));
  if (titleSlice) titleSlice.textContent = `${safeValue.toFixed(1)}%`;
  if (titleRest) titleRest.textContent = `${(100 - safeValue).toFixed(1)}%`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function formatTableValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return formatPercent(value);
}

function fillTable(tbodyId, rows) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function setTableCaption(captionId, text) {
  const caption = document.getElementById(captionId);
  if (caption) {
    caption.textContent = text;
  }
}

function setSummaryText(summaryId, text) {
  const summary = document.getElementById(summaryId);
  if (summary) {
    summary.textContent = text;
  }
}

function wireSeriesToggles(chart, targetId) {
  const wrap = document.querySelector(`.chart-controls[data-target="${targetId}"]`);
  if (!wrap) return;
  wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const seriesKey = cb.dataset.series;
      const ds = chart.data.datasets.find((d) => d.metaKey === seriesKey);
      if (!ds) return;
      ds.hidden = !cb.checked;
      chart.update();
    });
  });
}

function deltaText(latest, baseline) {
  const delta = latest - baseline;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} pts vs ${baseline.toFixed(1)}% in 2000`;
}

function buildLineChart(ctx, labels, datasets, title) {
  const theme = getThemeTokens();
  const lineStyles = {
    women: { pointStyle: 'circle', pointRadius: 2 },
    poc: { pointStyle: 'rectRot', pointRadius: 2 },
    all_films: { pointStyle: 'circle', pointRadius: 2 },
    under_10m: { pointStyle: 'triangle', pointRadius: 2 },
    between_10m_50m: { pointStyle: 'rect', pointRadius: 2 },
    over_50m: { pointStyle: 'crossRot', pointRadius: 2 },
    top_300: { pointStyle: 'circle', pointRadius: 2 },
    top_100: { pointStyle: 'rectRot', pointRadius: 2 },
    top_30: { pointStyle: 'triangle', pointRadius: 2 },
  };
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d) => ({
        ...lineStyles[d.metaKey],
        fill: false,
        spanGaps: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 2,
        hoverRadius: 5,
        ...d,
      })),
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `${v}%`,
            color: theme.muted,
          },
          grid: {
            color: theme.grid,
            lineWidth: 1,
          },
        },
        x: {
          ticks: {
            maxTicksLimit: 8,
            color: theme.muted,
          },
          grid: { color: theme.gridSoft, lineWidth: 1 },
        },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: theme.text } },
        title: title
          ? {
              display: true,
              text: title,
            }
          : undefined,
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.text,
          bodyColor: theme.text,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
    },
  });
}

function alignSeries(years, series, key) {
  const lookup = new Map(series.map((d) => [d.year, d[key]]));
  return years.map((y) => (lookup.has(y) ? lookup.get(y) : null));
}

function updateChartData(chart, labels, datasetMap) {
  chart.data.labels = labels;
  chart.data.datasets.forEach((ds) => {
    if (datasetMap[ds.metaKey] !== undefined) {
      ds.data = datasetMap[ds.metaKey];
    }
  });
  chart.update();
}

function prepCharts() {
  const theme = getThemeTokens();
  Chart.defaults.color = theme.text;
  Chart.defaults.font.family = "'Source Sans 3', 'Segoe UI', sans-serif";
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.plugins.legend.labels.color = theme.text;
  Chart.defaults.plugins.tooltip.backgroundColor = theme.tooltipBg;
  Chart.defaults.plugins.tooltip.titleColor = theme.text;
  Chart.defaults.plugins.tooltip.bodyColor = theme.text;
}

function applyChartTheme() {
  if (!window.Chart || chartInstances.length === 0) return;

  const theme = getThemeTokens();
  Chart.defaults.color = theme.text;
  Chart.defaults.plugins.legend.labels.color = theme.text;
  Chart.defaults.plugins.tooltip.backgroundColor = theme.tooltipBg;
  Chart.defaults.plugins.tooltip.titleColor = theme.text;
  Chart.defaults.plugins.tooltip.bodyColor = theme.text;

  chartInstances.forEach((chart) => {
    if (chart?.options?.scales?.y) {
      chart.options.scales.y.grid.color = theme.grid;
      chart.options.scales.y.ticks.color = theme.muted;
    }
    if (chart?.options?.scales?.x) {
      chart.options.scales.x.grid.color = theme.gridSoft;
      chart.options.scales.x.ticks.color = theme.muted;
    }
    if (chart?.options?.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = theme.text;
    }
    if (chart?.options?.plugins?.tooltip) {
      chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
      chart.options.plugins.tooltip.titleColor = theme.text;
      chart.options.plugins.tooltip.bodyColor = theme.text;
    }
    chart.update('none');
  });
}

async function initCharts() {
  if (!window.Chart) return;
  const hasCharts = document.querySelector(
    '#chart-overall, #chart-budget, #chart-top, #chart-roles, #chart-awards, #chart-home-roles'
  );
  if (!hasCharts) return;

  prepCharts();

  let allData;
  try {
    allData = await loadData();
  } catch (err) {
    console.error(err);
    const errorBlock = document.getElementById('data-error');
    if (errorBlock) {
      errorBlock.hidden = false;
    }
    return;
  }

  const overallCanvas = document.getElementById('chart-overall');
  const chartOverall = overallCanvas
    ? buildLineChart(overallCanvas, [], [
        {
          label: 'Women composers',
          borderColor: palette.women.primary,
          backgroundColor: palette.women.primary,
          metaKey: 'women',
          data: [],
        },
        {
          label: 'Composers of color',
          borderColor: palette.poc.primary,
          backgroundColor: palette.poc.primary,
          metaKey: 'poc',
          data: [],
        },
      ])
    : null;

  const budgetCanvas = document.getElementById('chart-budget');
  const chartBudget = budgetCanvas
    ? buildLineChart(budgetCanvas, [], [
        {
          label: 'All films',
          borderColor: palette.women.primary,
          metaKey: 'all_films',
          hidden: false,
          data: [],
        },
        {
          label: 'Under $10M',
          borderColor: '#646B73',
          metaKey: 'under_10m',
          hidden: true,
          data: [],
        },
        {
          label: '$10M - $50M',
          borderColor: '#2F6F73',
          metaKey: 'between_10m_50m',
          hidden: true,
          data: [],
        },
        {
          label: 'Over $50M',
          borderColor: '#9BA2A9',
          metaKey: 'over_50m',
          hidden: false,
          data: [],
        },
      ])
    : null;

  const awardsCanvas = document.getElementById('chart-awards');
  const chartAwards = awardsCanvas
    ? buildLineChart(awardsCanvas, [], [
        { label: 'Women award share', data: [], borderColor: palette.women.primary, metaKey: 'women' },
        { label: 'Composers of color award share', data: [], borderColor: palette.poc.primary, metaKey: 'poc' },
      ])
    : null;

  const rolesCanvas = document.getElementById('chart-roles');
  const homeRolesCanvas = document.getElementById('chart-home-roles');

  const chartRoles = rolesCanvas
    ? buildLineChart(rolesCanvas, [], [
        { label: 'Women share', data: [], borderColor: palette.women.primary, metaKey: 'women' },
        { label: 'People of Color (PoC) share', data: [], borderColor: palette.poc.primary, metaKey: 'poc' },
      ])
    : null;

  const chartHomeRoles = homeRolesCanvas
    ? buildLineChart(homeRolesCanvas, [], [
        { label: 'Women share', data: [], borderColor: palette.women.primary, metaKey: 'women' },
        { label: 'People of Color (PoC) share', data: [], borderColor: palette.poc.primary, metaKey: 'poc' },
      ])
    : null;

  [chartOverall, chartBudget, chartAwards, chartRoles, chartHomeRoles]
    .filter(Boolean)
    .forEach((chart) => chartInstances.push(chart));

  const shareMap = {
    overall: chartOverall,
    budget: chartBudget,
    roles: chartRoles,
    awards: chartAwards,
    'home-roles': chartHomeRoles,
  };
  initChartSharing(shareMap);

  if (chartBudget) {
    wireSeriesToggles(chartBudget, 'budget');
  }

  const overallYears = allData.womenShare.map((d) => d.year);
  const womenSeries = allData.womenShare.map((d) => d.female ?? d.women ?? 0);
  const pocSeries = alignSeries(overallYears, allData.pocShare, 'poc');

  const baselineWomen = allData.womenShare[0]?.female ?? allData.womenShare[0]?.women ?? 0;
  const baselinePoc = allData.pocShare[0]?.poc ?? 0;
  const latestWomen = womenSeries[womenSeries.length - 1] ?? 0;
  const latestPoc = pocSeries[pocSeries.length - 1] ?? 0;
  const awardsSeriesDefault = allData.awardsShare?.all || [];
  const latestAwards = awardsSeriesDefault[awardsSeriesDefault.length - 1] || { women: 0, poc: 0 };
  const latestYear = overallYears[overallYears.length - 1] || '';

  setStat('stat-women-change', deltaText(latestWomen, baselineWomen));
  setStat('stat-poc-change', deltaText(latestPoc, baselinePoc));
  setStat('stat-awards-women', `Awards: ${formatPercent(latestAwards.women || latestAwards.female || 0)}`);
  setStat('stat-awards-poc', `PoC: ${formatPercent(latestAwards.poc || 0)}`);
  const pieYearSelect = document.getElementById('pie-year-select');
  const defaultPieYear = overallYears.includes(2025) ? 2025 : latestYear;
  const updatePieYear = (year) => {
    const idx = overallYears.indexOf(year);
    if (idx < 0) return;
    const womenValue = womenSeries[idx] ?? 0;
    const pocValue = pocSeries[idx] ?? 0;
    setStat('stat-women-latest', formatPercent(womenValue));
    setStat('stat-poc-latest', formatPercent(pocValue));
    setStat('stat-women-year', year || '');
    setStat('stat-poc-year', year || '');
    updatePie('women', womenValue);
    updatePie('poc', pocValue);
  };
  if (pieYearSelect) {
    const years = overallYears.slice().sort((a, b) => b - a);
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = year;
      pieYearSelect.appendChild(option);
    });
    const initialYear = defaultPieYear || years[0];
    if (initialYear) {
      pieYearSelect.value = String(initialYear);
      updatePieYear(initialYear);
    }
    pieYearSelect.addEventListener('change', () => {
      updatePieYear(Number(pieYearSelect.value));
    });
  } else {
    updatePieYear(latestYear);
  }

  const countAwards = Math.round(((latestAwards.women || latestAwards.female || 0) / 100) * 300);
  setStat('stat-awards-count', `≈ ${countAwards} of 300 awards (${awardsSeriesDefault[awardsSeriesDefault.length - 1]?.year || ''})`);

  if (chartOverall) {
    updateChartData(chartOverall, overallYears, {
      women: womenSeries,
      poc: pocSeries,
    });
  }

  const updateBudgetChart = (metric) => {
    if (!chartBudget) return;
    const series = metric === 'poc' ? allData.pocBudget : allData.womenBudget;
    const theme = getThemeTokens();
    const colors =
      metric === 'poc'
        ? { all: palette.poc.primary, under: '#646B73', between: '#2F6F73', over: '#9BA2A9' }
        : { all: palette.women.primary, under: '#646B73', between: '#2F6F73', over: '#9BA2A9' };
    chartBudget.data.datasets.forEach((dataset) => {
      if (dataset.metaKey === 'all_films') dataset.borderDash = [];
      if (dataset.metaKey === 'under_10m') dataset.borderDash = [];
      if (dataset.metaKey === 'between_10m_50m') dataset.borderDash = [];
      if (dataset.metaKey === 'over_50m') dataset.borderDash = [];
      if (dataset.metaKey === 'all_films') dataset.borderColor = colors.all;
      if (dataset.metaKey === 'under_10m') dataset.borderColor = colors.under;
      if (dataset.metaKey === 'between_10m_50m') dataset.borderColor = colors.between;
      if (dataset.metaKey === 'over_50m') dataset.borderColor = colors.over;
    });
    updateChartData(
      chartBudget,
      series.map((d) => d.year),
      {
        all_films: series.map((d) => d.all_films),
        under_10m: series.map((d) => d.under_10m),
        between_10m_50m: series.map((d) => d.between_10m_50m),
        over_50m: series.map((d) => d.over_50m),
      }
    );
  };

  const updateBudgetTable = (metric) => {
    const series = metric === 'poc' ? allData.pocBudget : allData.womenBudget;
    const label = metric === 'poc' ? 'Composers of color' : 'Women composers';
    const rows = series.map((row) => [
      String(row.year),
      formatTableValue(row.all_films),
      formatTableValue(row.under_10m),
      formatTableValue(row.between_10m_50m),
      formatTableValue(row.over_50m),
    ]);
    fillTable('table-budget', rows);
    setTableCaption('budget-table-caption', `${label} share by budget and year.`);
    setSummaryText('budget-summary', `Line chart showing yearly ${label.toLowerCase()} share by production budget.`);
  };

  updateBudgetChart('women');
  updateBudgetTable('women');

  const budgetSelect = document.getElementById('budget-metric');
  if (budgetSelect) {
    budgetSelect.addEventListener('change', () => {
      updateBudgetChart(budgetSelect.value);
      updateBudgetTable(budgetSelect.value);
    });
  }

  const updateAwardsChart = (key) => {
    if (!chartAwards) return;
    const seriesRaw = allData.awardsShare?.[key] || [];
    const series = seriesRaw.filter((row) => row.women !== null || row.female !== null || row.poc !== null);
    updateChartData(
      chartAwards,
      series.map((d) => d.year),
      {
        women: series.map((d) => d.women ?? d.female ?? null),
        poc: series.map((d) => d.poc ?? null),
      }
    );
  };

  const updateAwardsTable = (key) => {
    const series = allData.awardsShare?.[key] || [];
    const select = document.getElementById('awards-select');
    const label = select?.selectedOptions?.[0]?.textContent || 'All awards';
    const rows = series.map((row) => [
      String(row.year),
      formatTableValue(row.women ?? row.female),
      formatTableValue(row.poc),
    ]);
    fillTable('table-awards', rows);
    setTableCaption('awards-table-caption', `${label} award share by year.`);
    setSummaryText(
      'awards-summary',
      `Line chart showing yearly award share for women composers and composers of color (${label.toLowerCase()}).`
    );
  };

  updateAwardsChart('all');
  updateAwardsTable('all');

  const awardsSelect = document.getElementById('awards-select');
  if (awardsSelect) {
    awardsSelect.addEventListener('change', () => {
      updateAwardsChart(awardsSelect.value);
      updateAwardsTable(awardsSelect.value);
    });
  }

  const roleSeries = (role) => {
    if (role === 'composer') {
      return {
        labels: overallYears,
        women: womenSeries,
        poc: pocSeries,
      };
    }
    const rows = allData.rolesShare[role] || [];
    return {
      labels: rows.map((d) => d.year),
      women: rows.map((d) => d.female ?? d.women ?? d.value ?? 0),
      poc: rows.map((d) => d.poc),
    };
  };

  const setupRoleChart = (selectId, chart, fallbackRole, onUpdate) => {
    if (!chart) return;
    const select = document.getElementById(selectId);
    const role = select?.value || fallbackRole;
    const series = roleSeries(role);
    updateChartData(chart, series.labels, {
      women: series.women,
      poc: series.poc,
    });
    select?.addEventListener('change', () => {
      const next = select.value;
      const nextSeries = roleSeries(next);
      updateChartData(chart, nextSeries.labels, {
        women: nextSeries.women,
        poc: nextSeries.poc,
      });
      if (onUpdate) onUpdate(select.value);
    });
  };

  const updateOverallTable = () => {
    const rows = overallYears.map((year, idx) => [
      String(year),
      formatTableValue(womenSeries[idx]),
      formatTableValue(pocSeries[idx]),
    ]);
    fillTable('table-overall', rows);
  };

  const updateRolesTable = (selectId, tableId, summaryId, captionId, fallbackRole) => {
    const select = document.getElementById(selectId);
    const role = select?.value || fallbackRole;
    const label = select?.selectedOptions?.[0]?.textContent || role;
    const series = roleSeries(role);
    const rows = series.labels.map((year, idx) => [
      String(year),
      formatTableValue(series.women[idx]),
      formatTableValue(series.poc[idx]),
    ]);
    fillTable(tableId, rows);
    setTableCaption(captionId, `${label} share by year.`);
    setSummaryText(
      summaryId,
      `Line chart showing yearly share of women composers and People of Color (PoC) for ${label.toLowerCase()} roles.`
    );
  };

  updateOverallTable();
  updateRolesTable('role-select', 'table-roles', 'roles-summary', 'roles-table-caption', 'orchestrator');
  updateRolesTable('home-role-select', 'table-home-roles', 'home-roles-summary', 'home-roles-table-caption', 'composer');

  setupRoleChart('role-select', chartRoles, 'orchestrator', () => {
    updateRolesTable('role-select', 'table-roles', 'roles-summary', 'roles-table-caption', 'orchestrator');
  });
  setupRoleChart('home-role-select', chartHomeRoles, 'composer', () => {
    updateRolesTable('home-role-select', 'table-home-roles', 'home-roles-summary', 'home-roles-table-caption', 'composer');
  });

  applyChartTheme();
}

function initCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
  const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
  const prevButton = carousel.querySelector('[data-carousel-prev]');
  const nextButton = carousel.querySelector('[data-carousel-next]');
  const toggleButton = carousel.querySelector('[data-carousel-toggle]');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timerId = null;
  let autoplayEnabled = !prefersReduced;

  const update = (index, shouldFocus) => {
    const nextIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === nextIndex);
      slide.setAttribute('aria-hidden', i === nextIndex ? 'false' : 'true');
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === nextIndex);
      dot.setAttribute('aria-selected', i === nextIndex ? 'true' : 'false');
      dot.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
    });
    current = nextIndex;
    const hash = slides[nextIndex]?.id;
    if (hash) {
      history.replaceState(null, '', `#${hash}`);
    }
    if (shouldFocus && slides[nextIndex]) {
      slides[nextIndex].focus?.();
    }
  };

  const setAutoplay = (enabled) => {
    autoplayEnabled = enabled;
    if (toggleButton) {
      const icon = toggleButton.querySelector('.carousel__icon');
      if (icon) {
        icon.textContent = enabled ? '❚❚' : '▶';
      } else {
        toggleButton.textContent = enabled ? '❚❚' : '▶';
      }
      toggleButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
    if (timerId) window.clearInterval(timerId);
    if (!enabled) return;
    timerId = window.setInterval(() => {
      update(current + 1);
    }, 10000);
  };

  prevButton?.addEventListener('click', () => {
    update(current - 1, true);
  });
  nextButton?.addEventListener('click', () => {
    update(current + 1, true);
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      update(index, true);
    });
  });

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      update(current - 1, true);
    }
    if (event.key === 'ArrowRight') {
      update(current + 1, true);
    }
  });

  toggleButton?.addEventListener('click', () => {
    setAutoplay(!autoplayEnabled);
  });

  slides.forEach((slide, idx) => {
    slide.id = `fact-${idx + 1}`;
    slide.setAttribute('tabindex', '-1');
  });

  dots.forEach((dot, idx) => {
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-controls', slides[idx]?.id || '');
  });

  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('fact-')) {
    const index = slides.findIndex((slide) => slide.id === hash);
    if (index >= 0) {
      update(index, true);
    }
  }

  setAutoplay(autoplayEnabled);
}


const awardsTimelineData = [
  { year: 1935, academy: false, globes: null, grammys: null },
  { year: 1936, academy: false, globes: null, grammys: null },
  { year: 1937, academy: false, globes: null, grammys: null },
  { year: 1938, academy: false, globes: null, grammys: null },
  { year: 1939, academy: false, globes: null, grammys: null },
  { year: 1940, academy: false, globes: null, grammys: null },
  { year: 1941, academy: false, globes: null, grammys: null },
  { year: 1942, academy: false, globes: null, grammys: null },
  { year: 1943, academy: false, globes: null, grammys: null },
  { year: 1944, academy: false, globes: null, grammys: null },
  { year: 1945, academy: false, globes: null, grammys: null },
  { year: 1946, academy: true, globes: null, grammys: null },
  { year: 1947, academy: false, globes: null, grammys: null },
  { year: 1948, academy: false, globes: false, grammys: null },
  { year: 1949, academy: false, globes: false, grammys: null },
  { year: 1950, academy: false, globes: false, grammys: null },
  { year: 1951, academy: false, globes: false, grammys: null },
  { year: 1952, academy: false, globes: false, grammys: null },
  { year: 1953, academy: false, globes: false, grammys: null },
  { year: 1954, academy: false, globes: false, grammys: null },
  { year: 1955, academy: false, globes: false, grammys: null },
  { year: 1956, academy: false, globes: false, grammys: null },
  { year: 1957, academy: false, globes: false, grammys: null },
  { year: 1958, academy: false, globes: false, grammys: null },
  { year: 1959, academy: false, globes: false, grammys: null },
  { year: 1960, academy: false, globes: false, grammys: null },
  { year: 1961, academy: false, globes: false, grammys: false },
  { year: 1962, academy: false, globes: false, grammys: false },
  { year: 1963, academy: false, globes: false, grammys: false },
  { year: 1964, academy: false, globes: false, grammys: false },
  { year: 1965, academy: false, globes: false, grammys: false },
  { year: 1966, academy: false, globes: false, grammys: false },
  { year: 1967, academy: false, globes: false, grammys: false },
  { year: 1968, academy: false, globes: false, grammys: false },
  { year: 1969, academy: false, globes: false, grammys: false },
  { year: 1970, academy: false, globes: false, grammys: false },
  { year: 1971, academy: false, globes: false, grammys: false },
  { year: 1972, academy: false, globes: false, grammys: false },
  { year: 1973, academy: false, globes: false, grammys: false },
  { year: 1974, academy: false, globes: false, grammys: true },
  { year: 1975, academy: true, globes: false, grammys: false },
  { year: 1976, academy: false, globes: false, grammys: true },
  { year: 1977, academy: false, globes: false, grammys: false },
  { year: 1978, academy: true, globes: true, grammys: true },
  { year: 1979, academy: false, globes: false, grammys: true },
  { year: 1980, academy: false, globes: false, grammys: true },
  { year: 1981, academy: false, globes: false, grammys: true },
  { year: 1982, academy: false, globes: false, grammys: true },
  { year: 1983, academy: false, globes: false, grammys: false },
  { year: 1984, academy: true, globes: true, grammys: true },
  { year: 1985, academy: false, globes: false, grammys: true },
  { year: 1986, academy: false, globes: false, grammys: true },
  { year: 1987, academy: false, globes: false, grammys: false },
  { year: 1988, academy: false, globes: false, grammys: false },
  { year: 1989, academy: false, globes: false, grammys: false },
  { year: 1990, academy: false, globes: false, grammys: false },
  { year: 1991, academy: false, globes: false, grammys: false },
  { year: 1992, academy: false, globes: false, grammys: false },
  { year: 1993, academy: false, globes: false, grammys: false },
  { year: 1994, academy: false, globes: false, grammys: false },
  { year: 1995, academy: false, globes: false, grammys: false },
  { year: 1996, academy: false, globes: false, grammys: false },
  { year: 1997, academy: true, globes: false, grammys: false },
  { year: 1998, academy: true, globes: false, grammys: false },
  { year: 1999, academy: false, globes: false, grammys: false },
  { year: 2000, academy: true, globes: true, grammys: false },
  { year: 2001, academy: true, globes: true, grammys: true },
  { year: 2002, academy: false, globes: true, grammys: true },
  { year: 2003, academy: false, globes: false, grammys: false },
  { year: 2004, academy: false, globes: false, grammys: false },
  { year: 2005, academy: false, globes: false, grammys: false },
  { year: 2006, academy: false, globes: false, grammys: false },
  { year: 2007, academy: false, globes: false, grammys: false },
  { year: 2008, academy: false, globes: true, grammys: false },
  { year: 2009, academy: false, globes: false, grammys: false },
  { year: 2010, academy: false, globes: true, grammys: false },
  { year: 2011, academy: false, globes: false, grammys: false },
  { year: 2012, academy: false, globes: false, grammys: false },
  { year: 2013, academy: false, globes: false, grammys: false },
  { year: 2014, academy: false, globes: false, grammys: false },
  { year: 2015, academy: false, globes: false, grammys: false },
  { year: 2016, academy: false, globes: false, grammys: false },
  { year: 2017, academy: true, globes: false, grammys: false },
  { year: 2018, academy: false, globes: false, grammys: false },
  { year: 2019, academy: false, globes: false, grammys: false },
  { year: 2020, academy: true, globes: true, grammys: true },
  { year: 2021, academy: false, globes: false, grammys: true },
  { year: 2022, academy: true, globes: true, grammys: false },
  { year: 2023, academy: false, globes: true, grammys: true },
  { year: 2024, academy: true, globes: true, grammys: false },
  { year: 2025, academy: true, globes: true, grammys: true },
  { year: 2026, academy: false, globes: false, grammys: false },
];

function buildDotMatrixSVG() {
  const cols = 20;
  const rows = 5;
  const iconWidth = 2.5;
  const iconHeight = 2.5;
  const gap = 0.25;
  const width = cols * iconWidth + (cols - 1) * gap;
  const height = rows * iconHeight + (rows - 1) * gap;
  const dots = [];
  const totalDots = cols * rows;
  const accentCount = 4;
  const indices = Array.from({ length: totalDots }, (_, i) => i);
  let seed = 4173;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const accentSet = new Set(indices.slice(0, accentCount));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const idx = r * cols + c;
      const isAccent = accentSet.has(idx);
      const x = c * (iconWidth + gap);
      const y = r * (iconHeight + gap);
      const symbolId = 'icon-clapper';
      dots.push(
        `<use href="#${symbolId}" class="${isAccent ? 'dot-accent' : 'dot-muted'}" x="${x}" y="${y}" width="${iconWidth}" height="${iconHeight}" />`
      );
    }
  }
  return `
    <svg role="img" aria-label="Dot matrix showing about four of one hundred credits" viewBox="0 0 ${width} ${height}">
      <title>Women composer share, 2000-2025</title>
      <desc>Four highlighted icons out of one hundred show the approximate share of women composers.</desc>
      <defs>
        <symbol id="icon-film-camera-filled" viewBox="-41 -41 2129 2111">
          <g fill="currentColor" stroke="none">
            <path d="M 211 1627 L 211 1632 L 210 1633 L 205 1633 L 205 1728 L 204 1729 L 109 1729 L 109 1734 L 108 1735 L 103 1735 L 103 1831 L 102 1832 L 0 1832 L 0 1933 L 102 1933 L 103 1934 L 103 2029 L 204 2029 L 204 1934 L 205 1933 L 307 1933 L 308 1934 L 308 2029 L 403 2029 L 403 1934 L 308 1934 L 307 1933 L 307 1832 L 308 1831 L 403 1831 L 403 1729 L 308 1729 L 308 1831 L 307 1832 L 205 1832 L 204 1831 L 204 1729 L 205 1728 L 301 1728 L 301 1717 L 302 1716 L 307 1716 L 307 1699 L 302 1699 L 301 1698 L 301 1687 L 302 1686 L 307 1686 L 307 1639 L 302 1639 L 301 1638 L 301 1627 Z"/>
            <path d="M 217 1422 L 217 1427 L 216 1428 L 205 1428 L 205 1523 L 204 1524 L 115 1524 L 115 1529 L 114 1530 L 103 1530 L 103 1626 L 102 1627 L 0 1627 L 0 1728 L 96 1728 L 96 1723 L 97 1722 L 102 1722 L 102 1627 L 103 1626 L 198 1626 L 198 1597 L 199 1596 L 204 1596 L 204 1524 L 205 1523 L 307 1523 L 307 1506 L 302 1506 L 301 1505 L 301 1494 L 302 1493 L 307 1493 L 307 1440 L 302 1440 L 301 1439 L 301 1422 L 290 1422 L 290 1427 L 289 1428 L 241 1428 L 240 1427 L 240 1422 Z"/>
            <path d="M 1326 1326 L 1326 1421 L 1421 1421 L 1422 1422 L 1422 1445 L 1427 1445 L 1428 1446 L 1428 1493 L 1427 1494 L 1422 1494 L 1422 1511 L 1427 1511 L 1428 1512 L 1428 1523 L 1523 1523 L 1524 1524 L 1524 1590 L 1529 1590 L 1530 1591 L 1530 1614 L 1529 1615 L 1524 1615 L 1524 1626 L 1523 1627 L 1422 1627 L 1421 1626 L 1421 1524 L 1332 1524 L 1332 1529 L 1331 1530 L 1326 1530 L 1326 1626 L 1421 1626 L 1422 1627 L 1422 1638 L 1427 1638 L 1428 1639 L 1428 1686 L 1427 1687 L 1422 1687 L 1422 1698 L 1427 1698 L 1428 1699 L 1428 1710 L 1427 1711 L 1422 1711 L 1422 1728 L 1421 1729 L 1326 1729 L 1326 1831 L 1421 1831 L 1421 1729 L 1422 1728 L 1523 1728 L 1524 1729 L 1524 1831 L 1523 1832 L 1428 1832 L 1428 1933 L 1523 1933 L 1523 1832 L 1524 1831 L 1626 1831 L 1627 1832 L 1627 1933 L 1626 1934 L 1530 1934 L 1530 1945 L 1529 1946 L 1524 1946 L 1524 2029 L 1626 2029 L 1626 1934 L 1627 1933 L 1728 1933 L 1729 1934 L 1729 2029 L 1831 2029 L 1831 1934 L 1832 1933 L 1933 1933 L 1934 1934 L 1934 2029 L 2035 2029 L 2035 1976 L 2030 1976 L 2029 1975 L 2029 1946 L 2030 1945 L 2035 1945 L 2035 1934 L 2036 1933 L 2047 1933 L 2047 1832 L 2036 1832 L 2035 1831 L 2035 1729 L 2036 1728 L 2047 1728 L 2047 1627 L 2042 1627 L 2042 1632 L 2041 1633 L 2036 1633 L 2036 1728 L 2035 1729 L 1940 1729 L 1940 1734 L 1939 1735 L 1934 1735 L 1934 1831 L 1933 1832 L 1832 1832 L 1831 1831 L 1831 1729 L 1832 1728 L 1927 1728 L 1927 1723 L 1928 1722 L 1933 1722 L 1933 1627 L 1934 1626 L 2029 1626 L 2029 1591 L 2030 1590 L 2035 1590 L 2035 1543 L 2030 1543 L 2029 1542 L 2029 1524 L 1946 1524 L 1946 1529 L 1945 1530 L 1934 1530 L 1934 1626 L 1933 1627 L 1832 1627 L 1831 1626 L 1831 1524 L 1832 1523 L 1933 1523 L 1933 1428 L 1832 1428 L 1832 1523 L 1831 1524 L 1729 1524 L 1728 1523 L 1728 1428 L 1639 1428 L 1638 1427 L 1638 1422 L 1627 1422 L 1626 1421 L 1626 1326 L 1524 1326 L 1524 1415 L 1529 1415 L 1530 1416 L 1530 1421 L 1626 1421 L 1627 1422 L 1627 1523 L 1626 1524 L 1524 1524 L 1523 1523 L 1523 1428 L 1446 1428 L 1445 1427 L 1445 1422 L 1422 1422 L 1421 1421 L 1421 1326 Z"/>
            <path d="M 0 1018 L 0 1120 L 102 1120 L 103 1121 L 103 1216 L 114 1216 L 115 1217 L 115 1222 L 126 1222 L 126 1217 L 127 1216 L 198 1216 L 198 1205 L 199 1204 L 204 1204 L 204 1157 L 199 1157 L 198 1156 L 198 1121 L 103 1121 L 102 1120 L 102 1024 L 97 1024 L 96 1023 L 96 1018 Z"/>
            <path d="M 103 512 L 103 608 L 102 609 L 0 609 L 0 710 L 102 710 L 103 711 L 103 813 L 102 814 L 0 814 L 0 915 L 102 915 L 103 916 L 103 1011 L 108 1011 L 109 1012 L 109 1017 L 204 1017 L 205 1018 L 205 1114 L 240 1114 L 241 1115 L 241 1120 L 301 1120 L 301 1109 L 302 1108 L 307 1108 L 307 1049 L 302 1049 L 301 1048 L 301 1018 L 205 1018 L 204 1017 L 204 916 L 205 915 L 301 915 L 301 892 L 302 891 L 307 891 L 307 880 L 302 880 L 301 879 L 301 868 L 302 867 L 307 867 L 307 814 L 308 813 L 403 813 L 403 711 L 308 711 L 307 710 L 307 699 L 302 699 L 301 698 L 301 675 L 302 674 L 307 674 L 307 621 L 302 621 L 301 620 L 301 609 L 241 609 L 241 614 L 240 615 L 205 615 L 205 710 L 307 710 L 308 711 L 308 813 L 307 814 L 205 814 L 204 813 L 204 717 L 193 717 L 192 716 L 192 711 L 103 711 L 102 710 L 102 609 L 103 608 L 204 608 L 204 512 Z"/>
            <path d="M 1832 0 L 1832 102 L 1831 103 L 1735 103 L 1735 108 L 1734 109 L 1729 109 L 1729 204 L 1728 205 L 1627 205 L 1627 301 L 1638 301 L 1639 302 L 1639 307 L 1686 307 L 1686 302 L 1687 301 L 1698 301 L 1699 302 L 1699 307 L 1728 307 L 1729 308 L 1729 403 L 1831 403 L 1831 308 L 1832 307 L 1933 307 L 1934 308 L 1934 403 L 2029 403 L 2029 386 L 2030 385 L 2035 385 L 2035 332 L 2030 332 L 2029 331 L 2029 320 L 2030 319 L 2035 319 L 2035 308 L 1934 308 L 1933 307 L 1933 205 L 1934 204 L 2023 204 L 2023 199 L 2024 198 L 2029 198 L 2029 193 L 2030 192 L 2035 192 L 2035 145 L 2030 145 L 2029 144 L 2029 103 L 1934 103 L 1933 102 L 1933 0 Z"/>
            <path d="M 1627 0 L 1627 102 L 1626 103 L 1530 103 L 1530 114 L 1529 115 L 1524 115 L 1524 126 L 1529 126 L 1530 127 L 1530 144 L 1529 145 L 1524 145 L 1524 204 L 1523 205 L 1422 205 L 1421 204 L 1421 103 L 1326 103 L 1326 204 L 1421 204 L 1422 205 L 1422 216 L 1427 216 L 1428 217 L 1428 289 L 1427 290 L 1422 290 L 1422 301 L 1439 301 L 1440 302 L 1440 307 L 1511 307 L 1511 302 L 1512 301 L 1523 301 L 1523 205 L 1524 204 L 1590 204 L 1590 199 L 1591 198 L 1626 198 L 1626 103 L 1627 102 L 1722 102 L 1722 97 L 1723 96 L 1728 96 L 1728 0 Z"/>
            <path d="M 609 0 L 609 102 L 608 103 L 512 103 L 512 204 L 608 204 L 609 205 L 609 283 L 608 284 L 597 284 L 597 289 L 596 290 L 585 290 L 585 295 L 584 296 L 579 296 L 579 301 L 578 302 L 567 302 L 567 307 L 566 308 L 561 308 L 561 313 L 560 314 L 549 314 L 549 319 L 548 320 L 537 320 L 536 319 L 536 308 L 512 308 L 512 343 L 518 343 L 519 344 L 519 355 L 518 356 L 512 356 L 512 361 L 511 362 L 506 362 L 506 373 L 505 374 L 500 374 L 500 379 L 499 380 L 494 380 L 494 391 L 493 392 L 488 392 L 488 403 L 487 404 L 482 404 L 482 409 L 481 410 L 410 410 L 410 505 L 463 505 L 464 506 L 464 524 L 469 524 L 470 525 L 470 554 L 475 554 L 476 555 L 476 572 L 481 572 L 482 573 L 482 590 L 487 590 L 488 591 L 488 608 L 487 609 L 416 609 L 416 614 L 415 615 L 410 615 L 410 710 L 505 710 L 505 651 L 506 650 L 511 650 L 511 639 L 512 638 L 518 638 L 519 639 L 519 644 L 524 644 L 525 645 L 525 656 L 530 656 L 531 657 L 531 662 L 536 662 L 537 663 L 537 668 L 542 668 L 543 669 L 543 674 L 554 674 L 555 675 L 555 680 L 560 680 L 561 681 L 561 686 L 566 686 L 567 687 L 567 692 L 572 692 L 573 693 L 573 704 L 572 705 L 567 705 L 567 716 L 566 717 L 543 717 L 542 716 L 542 711 L 512 711 L 512 813 L 560 813 L 561 814 L 561 915 L 560 916 L 512 916 L 512 1017 L 560 1017 L 561 1018 L 561 1120 L 560 1121 L 512 1121 L 512 1216 L 536 1216 L 537 1217 L 537 1222 L 566 1222 L 567 1223 L 567 1234 L 572 1234 L 573 1235 L 573 1240 L 578 1240 L 579 1241 L 579 1246 L 608 1246 L 609 1247 L 609 1319 L 710 1319 L 710 1253 L 711 1252 L 716 1252 L 716 1247 L 717 1246 L 807 1246 L 808 1247 L 808 1252 L 819 1252 L 820 1253 L 820 1264 L 819 1265 L 814 1265 L 814 1283 L 813 1284 L 808 1284 L 808 1295 L 807 1296 L 802 1296 L 802 1307 L 801 1308 L 796 1308 L 796 1325 L 795 1326 L 711 1326 L 711 1421 L 710 1422 L 693 1422 L 693 1427 L 692 1428 L 627 1428 L 626 1427 L 626 1422 L 609 1422 L 608 1421 L 608 1326 L 506 1326 L 506 1337 L 511 1337 L 512 1338 L 512 1421 L 608 1421 L 609 1422 L 609 1493 L 614 1493 L 615 1494 L 615 1505 L 614 1506 L 609 1506 L 609 1523 L 608 1524 L 506 1524 L 505 1523 L 505 1422 L 482 1422 L 482 1427 L 481 1428 L 434 1428 L 433 1427 L 433 1422 L 410 1422 L 410 1523 L 505 1523 L 506 1524 L 506 1542 L 511 1542 L 512 1543 L 512 1626 L 608 1626 L 609 1627 L 609 1686 L 614 1686 L 615 1687 L 615 1698 L 614 1699 L 609 1699 L 609 1716 L 614 1716 L 615 1717 L 615 1728 L 710 1728 L 711 1729 L 711 1831 L 710 1832 L 609 1832 L 608 1831 L 608 1729 L 512 1729 L 512 1831 L 608 1831 L 609 1832 L 609 1933 L 608 1934 L 506 1934 L 505 1933 L 505 1832 L 410 1832 L 410 1927 L 415 1927 L 416 1928 L 416 1933 L 505 1933 L 506 1934 L 506 1945 L 511 1945 L 512 1946 L 512 1963 L 511 1964 L 506 1964 L 506 1975 L 511 1975 L 512 1976 L 512 2029 L 608 2029 L 608 1934 L 609 1933 L 710 1933 L 711 1934 L 711 2029 L 813 2029 L 813 1934 L 814 1933 L 915 1933 L 916 1934 L 916 2029 L 1017 2029 L 1017 1940 L 1012 1940 L 1011 1939 L 1011 1934 L 916 1934 L 915 1933 L 915 1832 L 916 1831 L 1017 1831 L 1018 1832 L 1018 1927 L 1023 1927 L 1024 1928 L 1024 1933 L 1120 1933 L 1121 1934 L 1121 2029 L 1216 2029 L 1216 1934 L 1121 1934 L 1120 1933 L 1120 1832 L 1121 1831 L 1216 1831 L 1216 1729 L 1121 1729 L 1120 1728 L 1120 1657 L 1121 1656 L 1132 1656 L 1133 1657 L 1133 1668 L 1222 1668 L 1223 1669 L 1223 1728 L 1319 1728 L 1319 1627 L 1241 1627 L 1240 1626 L 1240 1615 L 1235 1615 L 1234 1614 L 1234 1603 L 1229 1603 L 1228 1602 L 1228 1591 L 1223 1591 L 1222 1590 L 1222 1573 L 1217 1573 L 1216 1572 L 1216 1561 L 1211 1561 L 1210 1560 L 1210 1543 L 1211 1542 L 1222 1542 L 1222 1524 L 1223 1523 L 1319 1523 L 1319 1422 L 1302 1422 L 1302 1427 L 1301 1428 L 1253 1428 L 1252 1427 L 1252 1422 L 1241 1422 L 1241 1427 L 1240 1428 L 1223 1428 L 1223 1523 L 1222 1524 L 1199 1524 L 1198 1523 L 1198 1518 L 1193 1518 L 1192 1517 L 1192 1506 L 1187 1506 L 1186 1505 L 1186 1488 L 1181 1488 L 1180 1487 L 1180 1476 L 1175 1476 L 1174 1475 L 1174 1458 L 1169 1458 L 1168 1457 L 1168 1446 L 1163 1446 L 1162 1445 L 1162 1434 L 1157 1434 L 1156 1433 L 1156 1422 L 1157 1421 L 1216 1421 L 1216 1326 L 1115 1326 L 1114 1325 L 1114 1308 L 1115 1307 L 1120 1307 L 1120 1247 L 1121 1246 L 1216 1246 L 1217 1247 L 1217 1252 L 1222 1252 L 1223 1253 L 1223 1319 L 1319 1319 L 1319 1223 L 1284 1223 L 1283 1222 L 1283 1115 L 1284 1114 L 1301 1114 L 1302 1115 L 1302 1120 L 1319 1120 L 1320 1121 L 1320 1138 L 1325 1138 L 1326 1139 L 1326 1216 L 1421 1216 L 1421 1151 L 1422 1150 L 1439 1150 L 1440 1151 L 1440 1156 L 1451 1156 L 1452 1157 L 1452 1162 L 1463 1162 L 1464 1163 L 1464 1168 L 1475 1168 L 1476 1169 L 1476 1174 L 1487 1174 L 1488 1175 L 1488 1180 L 1493 1180 L 1494 1181 L 1494 1186 L 1505 1186 L 1506 1187 L 1506 1192 L 1523 1192 L 1524 1193 L 1524 1222 L 1523 1223 L 1428 1223 L 1428 1228 L 1427 1229 L 1422 1229 L 1422 1252 L 1427 1252 L 1428 1253 L 1428 1301 L 1427 1302 L 1422 1302 L 1422 1319 L 1523 1319 L 1523 1223 L 1524 1222 L 1542 1222 L 1542 1217 L 1543 1216 L 1626 1216 L 1626 1121 L 1627 1120 L 1728 1120 L 1729 1121 L 1729 1216 L 1831 1216 L 1831 1121 L 1832 1120 L 1933 1120 L 1934 1121 L 1934 1216 L 2029 1216 L 2029 1205 L 2030 1204 L 2035 1204 L 2035 1157 L 2030 1157 L 2029 1156 L 2029 1121 L 1934 1121 L 1933 1120 L 1933 1024 L 1928 1024 L 1927 1023 L 1927 1018 L 1832 1018 L 1831 1017 L 1831 916 L 1832 915 L 1933 915 L 1934 916 L 1934 1011 L 1939 1011 L 1940 1012 L 1940 1017 L 2035 1017 L 2036 1018 L 2036 1120 L 2047 1120 L 2047 1018 L 2036 1018 L 2035 1017 L 2035 916 L 2036 915 L 2047 915 L 2047 814 L 2036 814 L 2035 813 L 2035 802 L 2030 802 L 2029 801 L 2029 772 L 2030 771 L 2035 771 L 2035 717 L 2024 717 L 2023 716 L 2023 711 L 1934 711 L 1933 710 L 1933 615 L 1880 615 L 1879 614 L 1879 609 L 1832 609 L 1831 608 L 1831 512 L 1729 512 L 1729 608 L 1831 608 L 1832 609 L 1832 710 L 1831 711 L 1729 711 L 1728 710 L 1728 615 L 1717 615 L 1716 614 L 1716 609 L 1699 609 L 1699 614 L 1698 615 L 1687 615 L 1686 614 L 1686 609 L 1639 609 L 1639 614 L 1638 615 L 1627 615 L 1627 710 L 1626 711 L 1561 711 L 1560 710 L 1560 675 L 1555 675 L 1554 674 L 1554 663 L 1549 663 L 1548 662 L 1548 657 L 1536 657 L 1535 656 L 1535 651 L 1524 651 L 1523 650 L 1523 615 L 1512 615 L 1511 614 L 1511 609 L 1422 609 L 1421 608 L 1421 506 L 1422 505 L 1523 505 L 1523 410 L 1422 410 L 1422 433 L 1427 433 L 1428 434 L 1428 481 L 1427 482 L 1422 482 L 1422 505 L 1421 506 L 1410 506 L 1410 511 L 1409 512 L 1326 512 L 1325 511 L 1325 488 L 1320 488 L 1319 487 L 1319 476 L 1314 476 L 1313 475 L 1313 458 L 1314 457 L 1319 457 L 1319 410 L 1296 410 L 1296 421 L 1295 422 L 1277 422 L 1276 421 L 1276 416 L 1271 416 L 1270 415 L 1270 410 L 1259 410 L 1258 409 L 1258 404 L 1253 404 L 1252 403 L 1252 398 L 1247 398 L 1246 397 L 1246 392 L 1235 392 L 1234 391 L 1234 386 L 1223 386 L 1222 385 L 1222 380 L 1217 380 L 1216 379 L 1216 368 L 1217 367 L 1222 367 L 1222 356 L 1217 356 L 1216 355 L 1216 326 L 1217 325 L 1222 325 L 1222 308 L 1121 308 L 1120 307 L 1120 241 L 1115 241 L 1114 240 L 1114 223 L 1115 222 L 1120 222 L 1120 205 L 1121 204 L 1138 204 L 1138 199 L 1139 198 L 1156 198 L 1157 199 L 1157 204 L 1216 204 L 1216 127 L 1217 126 L 1222 126 L 1222 115 L 1217 115 L 1216 114 L 1216 103 L 1121 103 L 1120 102 L 1120 0 L 1018 0 L 1018 96 L 1023 96 L 1024 97 L 1024 102 L 1120 102 L 1121 103 L 1121 204 L 1120 205 L 1018 205 L 1017 204 L 1017 109 L 1012 109 L 1011 108 L 1011 103 L 916 103 L 915 102 L 915 0 L 814 0 L 814 102 L 813 103 L 711 103 L 710 102 L 710 0 Z"/>
            <path d="M 0 0 L 0 102 L 102 102 L 103 103 L 103 204 L 102 205 L 0 205 L 0 307 L 102 307 L 103 308 L 103 403 L 204 403 L 204 308 L 103 308 L 102 307 L 102 205 L 103 204 L 192 204 L 192 199 L 193 198 L 204 198 L 204 103 L 205 102 L 307 102 L 308 103 L 308 204 L 307 205 L 205 205 L 205 301 L 240 301 L 241 302 L 241 307 L 301 307 L 301 296 L 302 295 L 307 295 L 307 241 L 302 241 L 301 240 L 301 229 L 302 228 L 307 228 L 307 205 L 308 204 L 403 204 L 403 103 L 308 103 L 307 102 L 307 0 L 205 0 L 205 102 L 204 103 L 103 103 L 102 102 L 102 0 Z"/>
          </g>
        </symbol>
        <symbol id="icon-film-camera-empty" viewBox="-41 -41 2129 2111">
          <g fill="none" stroke="currentColor" stroke-width="149" stroke-linejoin="round" stroke-linecap="round">
            <path d="M 211 1627 L 211 1632 L 210 1633 L 205 1633 L 205 1728 L 204 1729 L 109 1729 L 109 1734 L 108 1735 L 103 1735 L 103 1831 L 102 1832 L 0 1832 L 0 1933 L 102 1933 L 103 1934 L 103 2029 L 204 2029 L 204 1934 L 205 1933 L 307 1933 L 308 1934 L 308 2029 L 403 2029 L 403 1934 L 308 1934 L 307 1933 L 307 1832 L 308 1831 L 403 1831 L 403 1729 L 308 1729 L 308 1831 L 307 1832 L 205 1832 L 204 1831 L 204 1729 L 205 1728 L 301 1728 L 301 1717 L 302 1716 L 307 1716 L 307 1699 L 302 1699 L 301 1698 L 301 1687 L 302 1686 L 307 1686 L 307 1639 L 302 1639 L 301 1638 L 301 1627 Z"/>
            <path d="M 217 1422 L 217 1427 L 216 1428 L 205 1428 L 205 1523 L 204 1524 L 115 1524 L 115 1529 L 114 1530 L 103 1530 L 103 1626 L 102 1627 L 0 1627 L 0 1728 L 96 1728 L 96 1723 L 97 1722 L 102 1722 L 102 1627 L 103 1626 L 198 1626 L 198 1597 L 199 1596 L 204 1596 L 204 1524 L 205 1523 L 307 1523 L 307 1506 L 302 1506 L 301 1505 L 301 1494 L 302 1493 L 307 1493 L 307 1440 L 302 1440 L 301 1439 L 301 1422 L 290 1422 L 290 1427 L 289 1428 L 241 1428 L 240 1427 L 240 1422 Z"/>
            <path d="M 1326 1326 L 1326 1421 L 1421 1421 L 1422 1422 L 1422 1445 L 1427 1445 L 1428 1446 L 1428 1493 L 1427 1494 L 1422 1494 L 1422 1511 L 1427 1511 L 1428 1512 L 1428 1523 L 1523 1523 L 1524 1524 L 1524 1590 L 1529 1590 L 1530 1591 L 1530 1614 L 1529 1615 L 1524 1615 L 1524 1626 L 1523 1627 L 1422 1627 L 1421 1626 L 1421 1524 L 1332 1524 L 1332 1529 L 1331 1530 L 1326 1530 L 1326 1626 L 1421 1626 L 1422 1627 L 1422 1638 L 1427 1638 L 1428 1639 L 1428 1686 L 1427 1687 L 1422 1687 L 1422 1698 L 1427 1698 L 1428 1699 L 1428 1710 L 1427 1711 L 1422 1711 L 1422 1728 L 1421 1729 L 1326 1729 L 1326 1831 L 1421 1831 L 1421 1729 L 1422 1728 L 1523 1728 L 1524 1729 L 1524 1831 L 1523 1832 L 1428 1832 L 1428 1933 L 1523 1933 L 1523 1832 L 1524 1831 L 1626 1831 L 1627 1832 L 1627 1933 L 1626 1934 L 1530 1934 L 1530 1945 L 1529 1946 L 1524 1946 L 1524 2029 L 1626 2029 L 1626 1934 L 1627 1933 L 1728 1933 L 1729 1934 L 1729 2029 L 1831 2029 L 1831 1934 L 1832 1933 L 1933 1933 L 1934 1934 L 1934 2029 L 2035 2029 L 2035 1976 L 2030 1976 L 2029 1975 L 2029 1946 L 2030 1945 L 2035 1945 L 2035 1934 L 2036 1933 L 2047 1933 L 2047 1832 L 2036 1832 L 2035 1831 L 2035 1729 L 2036 1728 L 2047 1728 L 2047 1627 L 2042 1627 L 2042 1632 L 2041 1633 L 2036 1633 L 2036 1728 L 2035 1729 L 1940 1729 L 1940 1734 L 1939 1735 L 1934 1735 L 1934 1831 L 1933 1832 L 1832 1832 L 1831 1831 L 1831 1729 L 1832 1728 L 1927 1728 L 1927 1723 L 1928 1722 L 1933 1722 L 1933 1627 L 1934 1626 L 2029 1626 L 2029 1591 L 2030 1590 L 2035 1590 L 2035 1543 L 2030 1543 L 2029 1542 L 2029 1524 L 1946 1524 L 1946 1529 L 1945 1530 L 1934 1530 L 1934 1626 L 1933 1627 L 1832 1627 L 1831 1626 L 1831 1524 L 1832 1523 L 1933 1523 L 1933 1428 L 1832 1428 L 1832 1523 L 1831 1524 L 1729 1524 L 1728 1523 L 1728 1428 L 1639 1428 L 1638 1427 L 1638 1422 L 1627 1422 L 1626 1421 L 1626 1326 L 1524 1326 L 1524 1415 L 1529 1415 L 1530 1416 L 1530 1421 L 1626 1421 L 1627 1422 L 1627 1523 L 1626 1524 L 1524 1524 L 1523 1523 L 1523 1428 L 1446 1428 L 1445 1427 L 1445 1422 L 1422 1422 L 1421 1421 L 1421 1326 Z"/>
            <path d="M 0 1018 L 0 1120 L 102 1120 L 103 1121 L 103 1216 L 114 1216 L 115 1217 L 115 1222 L 126 1222 L 126 1217 L 127 1216 L 198 1216 L 198 1205 L 199 1204 L 204 1204 L 204 1157 L 199 1157 L 198 1156 L 198 1121 L 103 1121 L 102 1120 L 102 1024 L 97 1024 L 96 1023 L 96 1018 Z"/>
            <path d="M 103 512 L 103 608 L 102 609 L 0 609 L 0 710 L 102 710 L 103 711 L 103 813 L 102 814 L 0 814 L 0 915 L 102 915 L 103 916 L 103 1011 L 108 1011 L 109 1012 L 109 1017 L 204 1017 L 205 1018 L 205 1114 L 240 1114 L 241 1115 L 241 1120 L 301 1120 L 301 1109 L 302 1108 L 307 1108 L 307 1049 L 302 1049 L 301 1048 L 301 1018 L 205 1018 L 204 1017 L 204 916 L 205 915 L 301 915 L 301 892 L 302 891 L 307 891 L 307 880 L 302 880 L 301 879 L 301 868 L 302 867 L 307 867 L 307 814 L 308 813 L 403 813 L 403 711 L 308 711 L 307 710 L 307 699 L 302 699 L 301 698 L 301 675 L 302 674 L 307 674 L 307 621 L 302 621 L 301 620 L 301 609 L 241 609 L 241 614 L 240 615 L 205 615 L 205 710 L 307 710 L 308 711 L 308 813 L 307 814 L 205 814 L 204 813 L 204 717 L 193 717 L 192 716 L 192 711 L 103 711 L 102 710 L 102 609 L 103 608 L 204 608 L 204 512 Z"/>
            <path d="M 1832 0 L 1832 102 L 1831 103 L 1735 103 L 1735 108 L 1734 109 L 1729 109 L 1729 204 L 1728 205 L 1627 205 L 1627 301 L 1638 301 L 1639 302 L 1639 307 L 1686 307 L 1686 302 L 1687 301 L 1698 301 L 1699 302 L 1699 307 L 1728 307 L 1729 308 L 1729 403 L 1831 403 L 1831 308 L 1832 307 L 1933 307 L 1934 308 L 1934 403 L 2029 403 L 2029 386 L 2030 385 L 2035 385 L 2035 332 L 2030 332 L 2029 331 L 2029 320 L 2030 319 L 2035 319 L 2035 308 L 1934 308 L 1933 307 L 1933 205 L 1934 204 L 2023 204 L 2023 199 L 2024 198 L 2029 198 L 2029 193 L 2030 192 L 2035 192 L 2035 145 L 2030 145 L 2029 144 L 2029 103 L 1934 103 L 1933 102 L 1933 0 Z"/>
            <path d="M 1627 0 L 1627 102 L 1626 103 L 1530 103 L 1530 114 L 1529 115 L 1524 115 L 1524 126 L 1529 126 L 1530 127 L 1530 144 L 1529 145 L 1524 145 L 1524 204 L 1523 205 L 1422 205 L 1421 204 L 1421 103 L 1326 103 L 1326 204 L 1421 204 L 1422 205 L 1422 216 L 1427 216 L 1428 217 L 1428 289 L 1427 290 L 1422 290 L 1422 301 L 1439 301 L 1440 302 L 1440 307 L 1511 307 L 1511 302 L 1512 301 L 1523 301 L 1523 205 L 1524 204 L 1590 204 L 1590 199 L 1591 198 L 1626 198 L 1626 103 L 1627 102 L 1722 102 L 1722 97 L 1723 96 L 1728 96 L 1728 0 Z"/>
            <path d="M 609 0 L 609 102 L 608 103 L 512 103 L 512 204 L 608 204 L 609 205 L 609 283 L 608 284 L 597 284 L 597 289 L 596 290 L 585 290 L 585 295 L 584 296 L 579 296 L 579 301 L 578 302 L 567 302 L 567 307 L 566 308 L 561 308 L 561 313 L 560 314 L 549 314 L 549 319 L 548 320 L 537 320 L 536 319 L 536 308 L 512 308 L 512 343 L 518 343 L 519 344 L 519 355 L 518 356 L 512 356 L 512 361 L 511 362 L 506 362 L 506 373 L 505 374 L 500 374 L 500 379 L 499 380 L 494 380 L 494 391 L 493 392 L 488 392 L 488 403 L 487 404 L 482 404 L 482 409 L 481 410 L 410 410 L 410 505 L 463 505 L 464 506 L 464 524 L 469 524 L 470 525 L 470 554 L 475 554 L 476 555 L 476 572 L 481 572 L 482 573 L 482 590 L 487 590 L 488 591 L 488 608 L 487 609 L 416 609 L 416 614 L 415 615 L 410 615 L 410 710 L 505 710 L 505 651 L 506 650 L 511 650 L 511 639 L 512 638 L 518 638 L 519 639 L 519 644 L 524 644 L 525 645 L 525 656 L 530 656 L 531 657 L 531 662 L 536 662 L 537 663 L 537 668 L 542 668 L 543 669 L 543 674 L 554 674 L 555 675 L 555 680 L 560 680 L 561 681 L 561 686 L 566 686 L 567 687 L 567 692 L 572 692 L 573 693 L 573 704 L 572 705 L 567 705 L 567 716 L 566 717 L 543 717 L 542 716 L 542 711 L 512 711 L 512 813 L 560 813 L 561 814 L 561 915 L 560 916 L 512 916 L 512 1017 L 560 1017 L 561 1018 L 561 1120 L 560 1121 L 512 1121 L 512 1216 L 536 1216 L 537 1217 L 537 1222 L 566 1222 L 567 1223 L 567 1234 L 572 1234 L 573 1235 L 573 1240 L 578 1240 L 579 1241 L 579 1246 L 608 1246 L 609 1247 L 609 1319 L 710 1319 L 710 1253 L 711 1252 L 716 1252 L 716 1247 L 717 1246 L 807 1246 L 808 1247 L 808 1252 L 819 1252 L 820 1253 L 820 1264 L 819 1265 L 814 1265 L 814 1283 L 813 1284 L 808 1284 L 808 1295 L 807 1296 L 802 1296 L 802 1307 L 801 1308 L 796 1308 L 796 1325 L 795 1326 L 711 1326 L 711 1421 L 710 1422 L 693 1422 L 693 1427 L 692 1428 L 627 1428 L 626 1427 L 626 1422 L 609 1422 L 608 1421 L 608 1326 L 506 1326 L 506 1337 L 511 1337 L 512 1338 L 512 1421 L 608 1421 L 609 1422 L 609 1493 L 614 1493 L 615 1494 L 615 1505 L 614 1506 L 609 1506 L 609 1523 L 608 1524 L 506 1524 L 505 1523 L 505 1422 L 482 1422 L 482 1427 L 481 1428 L 434 1428 L 433 1427 L 433 1422 L 410 1422 L 410 1523 L 505 1523 L 506 1524 L 506 1542 L 511 1542 L 512 1543 L 512 1626 L 608 1626 L 609 1627 L 609 1686 L 614 1686 L 615 1687 L 615 1698 L 614 1699 L 609 1699 L 609 1716 L 614 1716 L 615 1717 L 615 1728 L 710 1728 L 711 1729 L 711 1831 L 710 1832 L 609 1832 L 608 1831 L 608 1729 L 512 1729 L 512 1831 L 608 1831 L 609 1832 L 609 1933 L 608 1934 L 506 1934 L 505 1933 L 505 1832 L 410 1832 L 410 1927 L 415 1927 L 416 1928 L 416 1933 L 505 1933 L 506 1934 L 506 1945 L 511 1945 L 512 1946 L 512 1963 L 511 1964 L 506 1964 L 506 1975 L 511 1975 L 512 1976 L 512 2029 L 608 2029 L 608 1934 L 609 1933 L 710 1933 L 711 1934 L 711 2029 L 813 2029 L 813 1934 L 814 1933 L 915 1933 L 916 1934 L 916 2029 L 1017 2029 L 1017 1940 L 1012 1940 L 1011 1939 L 1011 1934 L 916 1934 L 915 1933 L 915 1832 L 916 1831 L 1017 1831 L 1018 1832 L 1018 1927 L 1023 1927 L 1024 1928 L 1024 1933 L 1120 1933 L 1121 1934 L 1121 2029 L 1216 2029 L 1216 1934 L 1121 1934 L 1120 1933 L 1120 1832 L 1121 1831 L 1216 1831 L 1216 1729 L 1121 1729 L 1120 1728 L 1120 1657 L 1121 1656 L 1132 1656 L 1133 1657 L 1133 1668 L 1222 1668 L 1223 1669 L 1223 1728 L 1319 1728 L 1319 1627 L 1241 1627 L 1240 1626 L 1240 1615 L 1235 1615 L 1234 1614 L 1234 1603 L 1229 1603 L 1228 1602 L 1228 1591 L 1223 1591 L 1222 1590 L 1222 1573 L 1217 1573 L 1216 1572 L 1216 1561 L 1211 1561 L 1210 1560 L 1210 1543 L 1211 1542 L 1222 1542 L 1222 1524 L 1223 1523 L 1319 1523 L 1319 1422 L 1302 1422 L 1302 1427 L 1301 1428 L 1253 1428 L 1252 1427 L 1252 1422 L 1241 1422 L 1241 1427 L 1240 1428 L 1223 1428 L 1223 1523 L 1222 1524 L 1199 1524 L 1198 1523 L 1198 1518 L 1193 1518 L 1192 1517 L 1192 1506 L 1187 1506 L 1186 1505 L 1186 1488 L 1181 1488 L 1180 1487 L 1180 1476 L 1175 1476 L 1174 1475 L 1174 1458 L 1169 1458 L 1168 1457 L 1168 1446 L 1163 1446 L 1162 1445 L 1162 1434 L 1157 1434 L 1156 1433 L 1156 1422 L 1157 1421 L 1216 1421 L 1216 1326 L 1115 1326 L 1114 1325 L 1114 1308 L 1115 1307 L 1120 1307 L 1120 1247 L 1121 1246 L 1216 1246 L 1217 1247 L 1217 1252 L 1222 1252 L 1223 1253 L 1223 1319 L 1319 1319 L 1319 1223 L 1284 1223 L 1283 1222 L 1283 1115 L 1284 1114 L 1301 1114 L 1302 1115 L 1302 1120 L 1319 1120 L 1320 1121 L 1320 1138 L 1325 1138 L 1326 1139 L 1326 1216 L 1421 1216 L 1421 1151 L 1422 1150 L 1439 1150 L 1440 1151 L 1440 1156 L 1451 1156 L 1452 1157 L 1452 1162 L 1463 1162 L 1464 1163 L 1464 1168 L 1475 1168 L 1476 1169 L 1476 1174 L 1487 1174 L 1488 1175 L 1488 1180 L 1493 1180 L 1494 1181 L 1494 1186 L 1505 1186 L 1506 1187 L 1506 1192 L 1523 1192 L 1524 1193 L 1524 1222 L 1523 1223 L 1428 1223 L 1428 1228 L 1427 1229 L 1422 1229 L 1422 1252 L 1427 1252 L 1428 1253 L 1428 1301 L 1427 1302 L 1422 1302 L 1422 1319 L 1523 1319 L 1523 1223 L 1524 1222 L 1542 1222 L 1542 1217 L 1543 1216 L 1626 1216 L 1626 1121 L 1627 1120 L 1728 1120 L 1729 1121 L 1729 1216 L 1831 1216 L 1831 1121 L 1832 1120 L 1933 1120 L 1934 1121 L 1934 1216 L 2029 1216 L 2029 1205 L 2030 1204 L 2035 1204 L 2035 1157 L 2030 1157 L 2029 1156 L 2029 1121 L 1934 1121 L 1933 1120 L 1933 1024 L 1928 1024 L 1927 1023 L 1927 1018 L 1832 1018 L 1831 1017 L 1831 916 L 1832 915 L 1933 915 L 1934 916 L 1934 1011 L 1939 1011 L 1940 1012 L 1940 1017 L 2035 1017 L 2036 1018 L 2036 1120 L 2047 1120 L 2047 1018 L 2036 1018 L 2035 1017 L 2035 916 L 2036 915 L 2047 915 L 2047 814 L 2036 814 L 2035 813 L 2035 802 L 2030 802 L 2029 801 L 2029 772 L 2030 771 L 2035 771 L 2035 717 L 2024 717 L 2023 716 L 2023 711 L 1934 711 L 1933 710 L 1933 615 L 1880 615 L 1879 614 L 1879 609 L 1832 609 L 1831 608 L 1831 512 L 1729 512 L 1729 608 L 1831 608 L 1832 609 L 1832 710 L 1831 711 L 1729 711 L 1728 710 L 1728 615 L 1717 615 L 1716 614 L 1716 609 L 1699 609 L 1699 614 L 1698 615 L 1687 615 L 1686 614 L 1686 609 L 1639 609 L 1639 614 L 1638 615 L 1627 615 L 1627 710 L 1626 711 L 1561 711 L 1560 710 L 1560 675 L 1555 675 L 1554 674 L 1554 663 L 1549 663 L 1548 662 L 1548 657 L 1536 657 L 1535 656 L 1535 651 L 1524 651 L 1523 650 L 1523 615 L 1512 615 L 1511 614 L 1511 609 L 1422 609 L 1421 608 L 1421 506 L 1422 505 L 1523 505 L 1523 410 L 1422 410 L 1422 433 L 1427 433 L 1428 434 L 1428 481 L 1427 482 L 1422 482 L 1422 505 L 1421 506 L 1410 506 L 1410 511 L 1409 512 L 1326 512 L 1325 511 L 1325 488 L 1320 488 L 1319 487 L 1319 476 L 1314 476 L 1313 475 L 1313 458 L 1314 457 L 1319 457 L 1319 410 L 1296 410 L 1296 421 L 1295 422 L 1277 422 L 1276 421 L 1276 416 L 1271 416 L 1270 415 L 1270 410 L 1259 410 L 1258 409 L 1258 404 L 1253 404 L 1252 403 L 1252 398 L 1247 398 L 1246 397 L 1246 392 L 1235 392 L 1234 391 L 1234 386 L 1223 386 L 1222 385 L 1222 380 L 1217 380 L 1216 379 L 1216 368 L 1217 367 L 1222 367 L 1222 356 L 1217 356 L 1216 355 L 1216 326 L 1217 325 L 1222 325 L 1222 308 L 1121 308 L 1120 307 L 1120 241 L 1115 241 L 1114 240 L 1114 223 L 1115 222 L 1120 222 L 1120 205 L 1121 204 L 1138 204 L 1138 199 L 1139 198 L 1156 198 L 1157 199 L 1157 204 L 1216 204 L 1216 127 L 1217 126 L 1222 126 L 1222 115 L 1217 115 L 1216 114 L 1216 103 L 1121 103 L 1120 102 L 1120 0 L 1018 0 L 1018 96 L 1023 96 L 1024 97 L 1024 102 L 1120 102 L 1121 103 L 1121 204 L 1120 205 L 1018 205 L 1017 204 L 1017 109 L 1012 109 L 1011 108 L 1011 103 L 916 103 L 915 102 L 915 0 L 814 0 L 814 102 L 813 103 L 711 103 L 710 102 L 710 0 Z"/>
            <path d="M 0 0 L 0 102 L 102 102 L 103 103 L 103 204 L 102 205 L 0 205 L 0 307 L 102 307 L 103 308 L 103 403 L 204 403 L 204 308 L 103 308 L 102 307 L 102 205 L 103 204 L 192 204 L 192 199 L 193 198 L 204 198 L 204 103 L 205 102 L 307 102 L 308 103 L 308 204 L 307 205 L 205 205 L 205 301 L 240 301 L 241 302 L 241 307 L 301 307 L 301 296 L 302 295 L 307 295 L 307 241 L 302 241 L 301 240 L 301 229 L 302 228 L 307 228 L 307 205 L 308 204 L 403 204 L 403 103 L 308 103 L 307 102 L 307 0 L 205 0 L 205 102 L 204 103 L 103 103 L 102 102 L 102 0 Z"/>
          </g>
        </symbol>
        <symbol id="icon-clapper" viewBox="0 0 16 16">
          <rect x="1.5" y="6.2" width="13" height="7.8" rx="1.4" fill="currentColor" />
          <rect x="1.5" y="5.6" width="2.2" height="1.2" fill="#1F2328" />
          <polygon points="2.2,4.2 13.6,1.8 14.6,3.8 3.2,6.2" fill="currentColor" />
          <rect x="4.1" y="3.6" width="2" height="1.1" fill="#1F2328" />
          <rect x="7.1" y="3.0" width="2" height="1.1" fill="#1F2328" />
          <rect x="10.1" y="2.4" width="2" height="1.1" fill="#1F2328" />
        </symbol>
      </defs>
      ${dots.join('')}
    </svg>
  `;
}

function buildBarComparisonSVG() {
  const values = [
    { label: 'All films', value: 5.9 },
    { label: 'Over $50MM', value: 2.2 },
  ];
  const radius = 32;
  const gap = 90;
  const centerY = 50;
  const chartWidth = 2 * radius * 2 + gap;
  const chartHeight = 110;
  const pies = values.map((item, idx) => {
    const centerX = radius + idx * (radius * 2 + gap);
    const slice = describePiePath(item.value, centerX, centerY, radius);
    return `
      <circle class="pie-rest" cx="${centerX}" cy="${centerY}" r="${radius}" />
      <path class="pie-accent" d="${slice}" />
      <text class="pie-value" x="${centerX}" y="${centerY + 10}" text-anchor="middle">${item.value.toFixed(1)}%</text>
      <text class="label-text" x="${centerX}" y="${centerY + radius + 18}" text-anchor="middle">${item.label}</text>
    `;
  });

  return `
    <svg role="img" aria-label="Pie charts comparing women composer share" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <title>Women composer share by budget</title>
      <desc>Two pie charts compare the average women composer share for all films versus films over fifty million dollars.</desc>
      ${pies.join('')}
    </svg>
  `;
}

function buildExperienceBarsSVG() {
  const maxValue = 35;
  const womenYears = 27;
  const menYears = 14;
  const pocYears = 19;
  const width = 1000;
  const height = 220;
  const margin = { top: 34, right: 30, bottom: 50, left: 40 };
  const plotWidth = width - margin.left - margin.right;
  const axisY = 110;
  const scaleX = (v) => margin.left + (v / maxValue) * plotWidth;
  const ticks = [0, 5, 10, 15, 20, 25, 30, 35];

  const marker = (x, colorClass, label, years) => {
    const labelLines = label.includes('\n') ? label.split('\n') : label.split(' ');
    const lineHeight = 12;
    const labelStartY = axisY + 14;
    const labelBlockHeight = labelLines.length * lineHeight;
    const valueY = labelStartY + labelBlockHeight + 8;
    const tspans = labelLines
      .map((word, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : lineHeight}">${word}</tspan>`)
      .join('');
    return `
      <g class="${colorClass}">
        <use href="#icon-oscars" x="${x - 14}" y="${axisY - 38}" width="28" height="44" />
        <text x="${x}" y="${labelStartY}" text-anchor="middle" class="label">${tspans}</text>
        <text x="${x}" y="${valueY}" text-anchor="middle" class="value">${years} years</text>
      </g>
    `;
  };

  const grid = ticks
    .map((tick) => {
      const x = scaleX(tick);
      return `
        <line x1="${x}" x2="${x}" y1="${axisY - 6}" y2="${axisY + 6}" class="tick-line" />
        <text x="${x}" y="${axisY + 18}" text-anchor="middle" class="tick">${tick}</text>
      `;
    })
    .join('');

  return `
    <svg role="img" aria-label="Time to first Oscar nomination from first IMDb credit" viewBox="0 0 ${width} ${height}">
      <title>Time to First Oscar Nomination from First IMDb Credit</title>
      <desc>Women: ${womenYears} years. Men: ${menYears} years. Timeline spans 0 to 35 years from first IMDb credit.</desc>
      <style>
        .axis-line { stroke: rgba(255,255,255,0.5); stroke-width: 2; }
        .tick-line { stroke: rgba(255,255,255,0.35); stroke-width: 1; }
        .tick { font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: rgba(255,255,255,0.7); }
        .label { font: 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: rgba(255,255,255,0.9); }
        .value { font: 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: rgba(255,255,255,0.75); }
        .title { font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; font-weight: 700; fill: rgba(255,255,255,0.65); }
        .subtitle { font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: rgba(255,255,255,0.7); }
        .men { color: #ffffff; }
        .women { color: var(--accent); }
        .poc { color: var(--poc-accent); }
        .men use, .women use { fill: currentColor; }
        .poc use { fill: currentColor; }
      </style>
      <defs>
        <symbol id="icon-oscars" viewBox="0 0 1024 1024">
          <path d="M 492 32 L 492 35 L 491 36 L 480 36 L 480 39 L 479 40 L 476 40 L 476 51 L 475 52 L 472 52 L 472 99 L 475 99 L 476 100 L 476 107 L 479 107 L 480 108 L 480 127 L 483 127 L 484 128 L 484 143 L 483 144 L 480 144 L 480 155 L 479 156 L 476 156 L 476 159 L 475 160 L 468 160 L 468 163 L 467 164 L 464 164 L 464 167 L 463 168 L 456 168 L 456 171 L 455 172 L 448 172 L 448 175 L 447 176 L 440 176 L 440 179 L 439 180 L 432 180 L 432 183 L 431 184 L 420 184 L 420 187 L 419 188 L 412 188 L 412 191 L 411 192 L 408 192 L 408 195 L 407 196 L 404 196 L 404 199 L 403 200 L 400 200 L 400 207 L 399 208 L 396 208 L 396 239 L 399 239 L 400 240 L 400 251 L 403 251 L 404 252 L 404 287 L 407 287 L 408 288 L 408 303 L 411 303 L 412 304 L 412 315 L 415 315 L 416 316 L 416 331 L 419 331 L 420 332 L 420 355 L 423 355 L 424 356 L 424 359 L 427 359 L 428 360 L 428 363 L 431 363 L 432 364 L 432 367 L 443 367 L 444 368 L 444 371 L 447 371 L 448 372 L 448 379 L 451 379 L 452 380 L 452 415 L 451 416 L 448 416 L 448 467 L 447 468 L 444 468 L 444 487 L 447 487 L 448 488 L 448 523 L 451 523 L 452 524 L 452 543 L 455 543 L 456 544 L 456 555 L 459 555 L 460 556 L 460 571 L 463 571 L 464 572 L 464 627 L 463 628 L 460 628 L 460 655 L 459 656 L 456 656 L 456 659 L 459 659 L 460 660 L 460 695 L 463 695 L 464 696 L 464 707 L 467 707 L 468 708 L 468 719 L 471 719 L 472 720 L 472 735 L 475 735 L 476 736 L 476 751 L 479 751 L 480 752 L 480 767 L 479 768 L 476 768 L 476 779 L 475 780 L 472 780 L 472 787 L 471 788 L 468 788 L 468 795 L 467 796 L 464 796 L 464 799 L 463 800 L 460 800 L 460 807 L 459 808 L 416 808 L 416 811 L 415 812 L 408 812 L 408 839 L 407 840 L 400 840 L 400 843 L 399 844 L 396 844 L 396 847 L 395 848 L 392 848 L 392 851 L 395 851 L 396 852 L 396 855 L 403 855 L 404 856 L 404 927 L 403 928 L 388 928 L 388 931 L 387 932 L 372 932 L 372 935 L 371 936 L 364 936 L 364 955 L 363 956 L 360 956 L 360 979 L 371 979 L 372 980 L 372 983 L 391 983 L 392 984 L 392 987 L 439 987 L 440 988 L 440 991 L 583 991 L 583 988 L 584 987 L 631 987 L 631 984 L 632 983 L 651 983 L 651 980 L 652 979 L 663 979 L 663 956 L 660 956 L 659 955 L 659 936 L 652 936 L 651 935 L 651 932 L 636 932 L 635 931 L 635 928 L 620 928 L 619 927 L 619 856 L 620 855 L 627 855 L 627 852 L 628 851 L 631 851 L 631 848 L 628 848 L 627 847 L 627 844 L 624 844 L 623 843 L 623 840 L 616 840 L 615 839 L 615 836 L 612 836 L 611 835 L 611 820 L 612 819 L 615 819 L 615 812 L 608 812 L 607 811 L 607 808 L 564 808 L 563 807 L 563 800 L 560 800 L 559 799 L 559 796 L 556 796 L 555 795 L 555 788 L 552 788 L 551 787 L 551 780 L 548 780 L 547 779 L 547 736 L 548 735 L 551 735 L 551 720 L 552 719 L 555 719 L 555 708 L 556 707 L 559 707 L 559 696 L 560 695 L 563 695 L 563 672 L 564 671 L 567 671 L 567 648 L 564 648 L 563 647 L 563 620 L 560 620 L 559 619 L 559 572 L 560 571 L 563 571 L 563 556 L 564 555 L 567 555 L 567 544 L 568 543 L 571 543 L 571 528 L 572 527 L 575 527 L 575 496 L 576 495 L 579 495 L 579 456 L 576 456 L 575 455 L 575 412 L 572 412 L 571 411 L 571 376 L 572 375 L 575 375 L 575 372 L 576 371 L 579 371 L 579 368 L 580 367 L 591 367 L 591 364 L 592 363 L 595 363 L 595 360 L 596 359 L 599 359 L 599 356 L 600 355 L 603 355 L 603 336 L 604 335 L 607 335 L 607 316 L 608 315 L 611 315 L 611 304 L 612 303 L 615 303 L 615 288 L 616 287 L 619 287 L 619 252 L 620 251 L 623 251 L 623 240 L 624 239 L 627 239 L 627 204 L 624 204 L 623 203 L 623 200 L 620 200 L 619 199 L 619 196 L 616 196 L 615 195 L 615 192 L 612 192 L 611 191 L 611 188 L 604 188 L 603 187 L 603 184 L 596 184 L 595 183 L 595 180 L 584 180 L 583 179 L 583 176 L 576 176 L 575 175 L 575 172 L 568 172 L 567 171 L 567 168 L 560 168 L 559 167 L 559 164 L 556 164 L 555 163 L 555 160 L 552 160 L 551 159 L 551 156 L 548 156 L 547 155 L 547 152 L 544 152 L 543 151 L 543 112 L 544 111 L 547 111 L 547 100 L 548 99 L 551 99 L 551 48 L 548 48 L 547 47 L 547 40 L 544 40 L 543 39 L 543 36 L 532 36 L 531 35 L 531 32 Z"/>
        </symbol>
      </defs>
      <line x1="${margin.left}" x2="${width - margin.right}" y1="${axisY}" y2="${axisY}" class="axis-line" />
      ${grid}
      <text x="${margin.left}" y="${axisY - 18}" text-anchor="start" class="subtitle">First IMDb</text>
      <text x="${margin.left}" y="${axisY - 6}" text-anchor="start" class="subtitle">credit</text>
      <text x="${width - margin.right}" y="${axisY - 18}" text-anchor="end" class="subtitle">Years since first</text>
      <text x="${width - margin.right}" y="${axisY - 6}" text-anchor="end" class="subtitle">IMDb credit</text>

      ${marker(scaleX(menYears), 'men', 'Other composers', menYears)}
      ${marker(scaleX(pocYears), 'poc', 'Composers\nof color', pocYears)}
      ${marker(scaleX(womenYears), 'women', 'Women composer', womenYears)}

    </svg>
  `;
}

function buildAwardsTimelineSVG(data) {
  const oscarPaths = `<path d="M 492 32 L 492 35 L 491 36 L 480 36 L 480 39 L 479 40 L 476 40 L 476 51 L 475 52 L 472 52 L 472 99 L 475 99 L 476 100 L 476 107 L 479 107 L 480 108 L 480 127 L 483 127 L 484 128 L 484 143 L 483 144 L 480 144 L 480 155 L 479 156 L 476 156 L 476 159 L 475 160 L 468 160 L 468 163 L 467 164 L 464 164 L 464 167 L 463 168 L 456 168 L 456 171 L 455 172 L 448 172 L 448 175 L 447 176 L 440 176 L 440 179 L 439 180 L 432 180 L 432 183 L 431 184 L 420 184 L 420 187 L 419 188 L 412 188 L 412 191 L 411 192 L 408 192 L 408 195 L 407 196 L 404 196 L 404 199 L 403 200 L 400 200 L 400 207 L 399 208 L 396 208 L 396 239 L 399 239 L 400 240 L 400 251 L 403 251 L 404 252 L 404 287 L 407 287 L 408 288 L 408 303 L 411 303 L 412 304 L 412 315 L 415 315 L 416 316 L 416 331 L 419 331 L 420 332 L 420 355 L 423 355 L 424 356 L 424 359 L 427 359 L 428 360 L 428 363 L 431 363 L 432 364 L 432 367 L 443 367 L 444 368 L 444 371 L 447 371 L 448 372 L 448 379 L 451 379 L 452 380 L 452 415 L 451 416 L 448 416 L 448 467 L 447 468 L 444 468 L 444 487 L 447 487 L 448 488 L 448 523 L 451 523 L 452 524 L 452 543 L 455 543 L 456 544 L 456 555 L 459 555 L 460 556 L 460 571 L 463 571 L 464 572 L 464 627 L 463 628 L 460 628 L 460 655 L 459 656 L 456 656 L 456 659 L 459 659 L 460 660 L 460 695 L 463 695 L 464 696 L 464 707 L 467 707 L 468 708 L 468 719 L 471 719 L 472 720 L 472 735 L 475 735 L 476 736 L 476 751 L 479 751 L 480 752 L 480 767 L 479 768 L 476 768 L 476 779 L 475 780 L 472 780 L 472 787 L 471 788 L 468 788 L 468 795 L 467 796 L 464 796 L 464 799 L 463 800 L 460 800 L 460 807 L 459 808 L 416 808 L 416 811 L 415 812 L 408 812 L 408 839 L 407 840 L 400 840 L 400 843 L 399 844 L 396 844 L 396 847 L 395 848 L 392 848 L 392 851 L 395 851 L 396 852 L 396 855 L 403 855 L 404 856 L 404 927 L 403 928 L 388 928 L 388 931 L 387 932 L 372 932 L 372 935 L 371 936 L 364 936 L 364 955 L 363 956 L 360 956 L 360 979 L 371 979 L 372 980 L 372 983 L 391 983 L 392 984 L 392 987 L 439 987 L 440 988 L 440 991 L 583 991 L 583 988 L 584 987 L 631 987 L 631 984 L 632 983 L 651 983 L 651 980 L 652 979 L 663 979 L 663 956 L 660 956 L 659 955 L 659 936 L 652 936 L 651 935 L 651 932 L 636 932 L 635 931 L 635 928 L 620 928 L 619 927 L 619 856 L 620 855 L 627 855 L 627 852 L 628 851 L 631 851 L 631 848 L 628 848 L 627 847 L 627 844 L 624 844 L 623 843 L 623 840 L 616 840 L 615 839 L 615 836 L 612 836 L 611 835 L 611 820 L 612 819 L 615 819 L 615 812 L 608 812 L 607 811 L 607 808 L 564 808 L 563 807 L 563 800 L 560 800 L 559 799 L 559 796 L 556 796 L 555 795 L 555 788 L 552 788 L 551 787 L 551 780 L 548 780 L 547 779 L 547 736 L 548 735 L 551 735 L 551 720 L 552 719 L 555 719 L 555 708 L 556 707 L 559 707 L 559 696 L 560 695 L 563 695 L 563 672 L 564 671 L 567 671 L 567 648 L 564 648 L 563 647 L 563 620 L 560 620 L 559 619 L 559 572 L 560 571 L 563 571 L 563 556 L 564 555 L 567 555 L 567 544 L 568 543 L 571 543 L 571 528 L 572 527 L 575 527 L 575 496 L 576 495 L 579 495 L 579 456 L 576 456 L 575 455 L 575 412 L 572 412 L 571 411 L 571 376 L 572 375 L 575 375 L 575 372 L 576 371 L 579 371 L 579 368 L 580 367 L 591 367 L 591 364 L 592 363 L 595 363 L 595 360 L 596 359 L 599 359 L 599 356 L 600 355 L 603 355 L 603 336 L 604 335 L 607 335 L 607 316 L 608 315 L 611 315 L 611 304 L 612 303 L 615 303 L 615 288 L 616 287 L 619 287 L 619 252 L 620 251 L 623 251 L 623 240 L 624 239 L 627 239 L 627 204 L 624 204 L 623 203 L 623 200 L 620 200 L 619 199 L 619 196 L 616 196 L 615 195 L 615 192 L 612 192 L 611 191 L 611 188 L 604 188 L 603 187 L 603 184 L 596 184 L 595 183 L 595 180 L 584 180 L 583 179 L 583 176 L 576 176 L 575 175 L 575 172 L 568 172 L 567 171 L 567 168 L 560 168 L 559 167 L 559 164 L 556 164 L 555 163 L 555 160 L 552 160 L 551 159 L 551 156 L 548 156 L 547 155 L 547 152 L 544 152 L 543 151 L 543 112 L 544 111 L 547 111 L 547 100 L 548 99 L 551 99 L 551 48 L 548 48 L 547 47 L 547 40 L 544 40 L 543 39 L 543 36 L 532 36 L 531 35 L 531 32 Z"/>`;
  const globePaths = `<path d="M 456 4 L 456 7 L 455 8 L 428 8 L 428 11 L 427 12 L 416 12 L 416 15 L 415 16 L 412 16 L 412 23 L 411 24 L 408 24 L 408 27 L 407 28 L 404 28 L 404 39 L 403 40 L 400 40 L 400 47 L 399 48 L 396 48 L 396 63 L 395 64 L 392 64 L 392 79 L 391 80 L 388 80 L 388 83 L 387 84 L 384 84 L 384 87 L 383 88 L 380 88 L 380 95 L 379 96 L 376 96 L 376 99 L 375 100 L 372 100 L 372 107 L 371 108 L 368 108 L 368 119 L 367 120 L 364 120 L 364 127 L 363 128 L 360 128 L 360 139 L 359 140 L 356 140 L 356 155 L 355 156 L 352 156 L 352 159 L 351 160 L 348 160 L 348 167 L 347 168 L 344 168 L 344 191 L 347 191 L 348 192 L 348 199 L 351 199 L 352 200 L 352 207 L 355 207 L 356 208 L 356 211 L 359 211 L 360 212 L 360 215 L 363 215 L 364 216 L 364 219 L 367 219 L 368 220 L 368 227 L 371 227 L 372 228 L 372 231 L 375 231 L 376 232 L 376 235 L 379 235 L 380 236 L 380 239 L 383 239 L 384 240 L 384 243 L 387 243 L 388 244 L 388 247 L 391 247 L 392 248 L 392 251 L 399 251 L 400 252 L 400 255 L 403 255 L 404 256 L 404 259 L 407 259 L 408 260 L 408 263 L 411 263 L 412 264 L 412 267 L 419 267 L 420 268 L 420 271 L 423 271 L 424 272 L 424 275 L 431 275 L 432 276 L 432 279 L 439 279 L 440 280 L 440 283 L 447 283 L 448 284 L 448 287 L 455 287 L 456 288 L 456 291 L 459 291 L 460 292 L 460 315 L 459 316 L 456 316 L 456 331 L 455 332 L 452 332 L 452 339 L 451 340 L 444 340 L 444 343 L 443 344 L 440 344 L 440 355 L 439 356 L 380 356 L 380 395 L 383 395 L 384 396 L 384 399 L 387 399 L 388 400 L 388 403 L 391 403 L 392 404 L 392 407 L 395 407 L 396 408 L 396 411 L 399 411 L 400 412 L 400 415 L 407 415 L 408 416 L 408 419 L 415 419 L 416 420 L 416 423 L 423 423 L 424 424 L 424 427 L 427 427 L 428 428 L 428 431 L 435 431 L 436 432 L 436 435 L 443 435 L 444 436 L 444 439 L 451 439 L 452 440 L 452 443 L 455 443 L 456 444 L 456 451 L 455 452 L 452 452 L 452 455 L 451 456 L 448 456 L 448 459 L 447 460 L 444 460 L 444 463 L 443 464 L 440 464 L 440 467 L 439 468 L 436 468 L 436 475 L 435 476 L 432 476 L 432 479 L 431 480 L 428 480 L 428 487 L 427 488 L 424 488 L 424 491 L 423 492 L 420 492 L 420 495 L 419 496 L 416 496 L 416 499 L 415 500 L 404 500 L 404 503 L 403 504 L 400 504 L 400 507 L 399 508 L 392 508 L 392 951 L 391 952 L 384 952 L 384 955 L 383 956 L 380 956 L 380 959 L 379 960 L 372 960 L 372 963 L 371 964 L 364 964 L 364 967 L 363 968 L 356 968 L 356 971 L 355 972 L 348 972 L 348 975 L 347 976 L 340 976 L 340 979 L 339 980 L 332 980 L 332 983 L 331 984 L 328 984 L 328 1023 L 695 1023 L 695 984 L 692 984 L 691 983 L 691 980 L 688 980 L 687 979 L 687 976 L 676 976 L 675 975 L 675 972 L 672 972 L 671 971 L 671 968 L 664 968 L 663 967 L 663 964 L 656 964 L 655 963 L 655 960 L 648 960 L 647 959 L 647 956 L 640 956 L 639 955 L 639 952 L 632 952 L 631 951 L 631 508 L 628 508 L 627 507 L 627 504 L 620 504 L 619 503 L 619 500 L 612 500 L 611 499 L 611 496 L 608 496 L 607 495 L 607 492 L 604 492 L 603 491 L 603 488 L 600 488 L 599 487 L 599 480 L 596 480 L 595 479 L 595 476 L 592 476 L 591 475 L 591 472 L 588 472 L 587 471 L 587 468 L 584 468 L 583 467 L 583 464 L 580 464 L 579 463 L 579 460 L 576 460 L 575 459 L 575 452 L 572 452 L 571 451 L 571 444 L 572 443 L 579 443 L 579 440 L 580 439 L 583 439 L 583 436 L 584 435 L 591 435 L 591 432 L 592 431 L 595 431 L 595 428 L 596 427 L 603 427 L 603 424 L 604 423 L 611 423 L 611 420 L 612 419 L 619 419 L 619 416 L 620 415 L 623 415 L 623 412 L 624 411 L 631 411 L 631 408 L 632 407 L 635 407 L 635 404 L 636 403 L 639 403 L 639 396 L 640 395 L 643 395 L 643 388 L 644 387 L 647 387 L 647 368 L 648 367 L 651 367 L 651 360 L 648 360 L 647 359 L 647 356 L 592 356 L 591 355 L 591 352 L 588 352 L 587 351 L 587 344 L 584 344 L 583 343 L 583 340 L 576 340 L 575 339 L 575 332 L 572 332 L 571 331 L 571 288 L 572 287 L 583 287 L 583 284 L 584 283 L 591 283 L 591 280 L 592 279 L 599 279 L 599 276 L 600 275 L 603 275 L 603 272 L 604 271 L 611 271 L 611 268 L 612 267 L 619 267 L 619 264 L 620 263 L 639 263 L 639 260 L 640 259 L 643 259 L 643 256 L 644 255 L 647 255 L 647 252 L 648 251 L 651 251 L 651 248 L 652 247 L 655 247 L 655 244 L 656 243 L 659 243 L 659 240 L 660 239 L 663 239 L 663 236 L 664 235 L 667 235 L 667 232 L 668 231 L 671 231 L 671 224 L 672 223 L 675 223 L 675 200 L 672 200 L 671 199 L 671 128 L 672 127 L 675 127 L 675 108 L 672 108 L 671 107 L 671 100 L 668 100 L 667 99 L 667 92 L 664 92 L 663 91 L 663 84 L 660 84 L 659 83 L 659 76 L 656 76 L 655 75 L 655 68 L 652 68 L 651 67 L 651 60 L 648 60 L 647 59 L 647 56 L 644 56 L 643 55 L 643 52 L 640 52 L 639 51 L 639 48 L 632 48 L 631 47 L 631 44 L 628 44 L 627 43 L 627 40 L 620 40 L 619 39 L 619 36 L 616 36 L 615 35 L 615 32 L 604 32 L 603 31 L 603 28 L 596 28 L 595 27 L 595 24 L 584 24 L 583 23 L 583 20 L 572 20 L 571 19 L 571 16 L 556 16 L 555 15 L 555 12 L 540 12 L 539 11 L 539 8 L 508 8 L 507 7 L 507 4 Z"/>`;
  const grammyPaths = `<path d="M 256 720 L 256 723 L 255 724 L 252 724 L 252 731 L 251 732 L 248 732 L 248 739 L 247 740 L 244 740 L 244 747 L 243 748 L 240 748 L 240 755 L 239 756 L 236 756 L 236 759 L 235 760 L 232 760 L 232 767 L 231 768 L 228 768 L 228 775 L 227 776 L 224 776 L 224 783 L 223 784 L 220 784 L 220 791 L 219 792 L 216 792 L 216 795 L 215 796 L 212 796 L 212 803 L 211 804 L 208 804 L 208 811 L 207 812 L 204 812 L 204 819 L 203 820 L 200 820 L 200 827 L 199 828 L 196 828 L 196 831 L 195 832 L 192 832 L 192 839 L 191 840 L 188 840 L 188 847 L 187 848 L 184 848 L 184 855 L 183 856 L 180 856 L 180 863 L 179 864 L 176 864 L 176 871 L 175 872 L 172 872 L 172 875 L 171 876 L 168 876 L 168 883 L 167 884 L 164 884 L 164 891 L 163 892 L 160 892 L 160 899 L 159 900 L 156 900 L 156 907 L 155 908 L 152 908 L 152 911 L 151 912 L 148 912 L 148 919 L 147 920 L 144 920 L 144 927 L 143 928 L 140 928 L 140 935 L 139 936 L 136 936 L 136 943 L 147 943 L 148 944 L 148 947 L 175 947 L 176 948 L 176 951 L 203 951 L 204 952 L 204 955 L 235 955 L 236 956 L 236 959 L 263 959 L 264 960 L 264 963 L 291 963 L 292 964 L 292 967 L 319 967 L 320 968 L 320 971 L 351 971 L 352 972 L 352 975 L 383 975 L 384 976 L 384 979 L 407 979 L 408 980 L 408 983 L 435 983 L 436 984 L 436 987 L 467 987 L 468 988 L 468 991 L 495 991 L 496 992 L 496 995 L 527 995 L 528 996 L 528 999 L 563 999 L 563 996 L 564 995 L 591 995 L 591 992 L 592 991 L 623 991 L 623 988 L 624 987 L 651 987 L 651 984 L 652 983 L 679 983 L 679 980 L 680 979 L 707 979 L 707 976 L 708 975 L 739 975 L 739 972 L 740 971 L 771 971 L 771 968 L 772 967 L 799 967 L 799 964 L 800 963 L 823 963 L 823 960 L 824 959 L 855 959 L 855 956 L 856 955 L 883 955 L 883 952 L 884 951 L 915 951 L 915 948 L 916 947 L 943 947 L 943 944 L 944 943 L 955 943 L 955 936 L 952 936 L 951 935 L 951 932 L 948 932 L 947 931 L 947 924 L 944 924 L 943 923 L 943 916 L 940 916 L 939 915 L 939 908 L 936 908 L 935 907 L 935 900 L 932 900 L 931 899 L 931 892 L 928 892 L 927 891 L 927 888 L 924 888 L 923 887 L 923 880 L 920 880 L 919 879 L 919 872 L 916 872 L 915 871 L 915 864 L 912 864 L 911 863 L 911 856 L 908 856 L 907 855 L 907 852 L 904 852 L 903 851 L 903 844 L 900 844 L 899 843 L 899 836 L 896 836 L 895 835 L 895 828 L 892 828 L 891 827 L 891 820 L 888 820 L 887 819 L 887 812 L 884 812 L 883 811 L 883 808 L 880 808 L 879 807 L 879 800 L 876 800 L 875 799 L 875 792 L 872 792 L 871 791 L 871 784 L 868 784 L 867 783 L 867 776 L 864 776 L 863 775 L 863 772 L 860 772 L 859 771 L 859 764 L 856 764 L 855 763 L 855 756 L 852 756 L 851 755 L 851 748 L 848 748 L 847 747 L 847 740 L 844 740 L 843 739 L 843 736 L 840 736 L 839 735 L 839 728 L 836 728 L 835 727 L 835 720 L 824 720 L 824 723 L 823 724 L 792 724 L 792 727 L 791 728 L 760 728 L 760 731 L 759 732 L 732 732 L 732 735 L 731 736 L 704 736 L 704 739 L 703 740 L 676 740 L 676 743 L 675 744 L 644 744 L 644 747 L 643 748 L 616 748 L 616 751 L 615 752 L 588 752 L 588 755 L 587 756 L 560 756 L 560 759 L 559 760 L 532 760 L 531 759 L 531 756 L 504 756 L 503 755 L 503 752 L 476 752 L 475 751 L 475 748 L 444 748 L 443 747 L 443 744 L 416 744 L 415 743 L 415 740 L 388 740 L 387 739 L 387 736 L 360 736 L 359 735 L 359 732 L 328 732 L 327 731 L 327 728 L 300 728 L 299 727 L 299 724 L 268 724 L 267 723 L 267 720 Z"/><path d="M 328 540 L 328 543 L 327 544 L 324 544 L 324 547 L 327 547 L 328 548 L 328 707 L 339 707 L 340 708 L 340 711 L 367 711 L 368 712 L 368 715 L 399 715 L 400 716 L 400 719 L 427 719 L 428 720 L 428 723 L 455 723 L 456 724 L 456 727 L 483 727 L 484 728 L 484 731 L 511 731 L 512 732 L 512 735 L 539 735 L 540 736 L 540 739 L 547 739 L 547 736 L 548 735 L 579 735 L 579 732 L 580 731 L 607 731 L 607 728 L 608 727 L 635 727 L 635 724 L 636 723 L 663 723 L 663 720 L 664 719 L 691 719 L 691 716 L 692 715 L 723 715 L 723 712 L 724 711 L 751 711 L 751 708 L 752 707 L 763 707 L 763 540 L 736 540 L 736 543 L 735 544 L 704 544 L 704 547 L 703 548 L 676 548 L 676 551 L 675 552 L 648 552 L 648 555 L 647 556 L 620 556 L 620 559 L 619 560 L 592 560 L 592 563 L 591 564 L 560 564 L 560 567 L 559 568 L 532 568 L 531 567 L 531 564 L 500 564 L 499 563 L 499 560 L 468 560 L 467 559 L 467 556 L 444 556 L 443 555 L 443 552 L 416 552 L 415 551 L 415 548 L 384 548 L 383 547 L 383 544 L 356 544 L 355 543 L 355 540 Z"/><path d="M 544 148 L 544 155 L 543 156 L 540 156 L 540 159 L 539 160 L 536 160 L 536 167 L 535 168 L 532 168 L 532 171 L 531 172 L 528 172 L 528 175 L 527 176 L 524 176 L 524 183 L 523 184 L 520 184 L 520 187 L 519 188 L 516 188 L 516 191 L 515 192 L 512 192 L 512 199 L 511 200 L 508 200 L 508 203 L 507 204 L 504 204 L 504 207 L 503 208 L 500 208 L 500 211 L 499 212 L 496 212 L 496 215 L 495 216 L 492 216 L 492 219 L 491 220 L 488 220 L 488 223 L 487 224 L 484 224 L 484 227 L 483 228 L 480 228 L 480 231 L 479 232 L 476 232 L 476 239 L 475 240 L 472 240 L 472 243 L 471 244 L 468 244 L 468 247 L 467 248 L 464 248 L 464 251 L 463 252 L 460 252 L 460 255 L 459 256 L 452 256 L 452 259 L 451 260 L 448 260 L 448 263 L 447 264 L 444 264 L 444 267 L 443 268 L 440 268 L 440 271 L 439 272 L 436 272 L 436 275 L 435 276 L 432 276 L 432 279 L 431 280 L 428 280 L 428 283 L 427 284 L 424 284 L 424 287 L 423 288 L 416 288 L 416 291 L 415 292 L 412 292 L 412 295 L 411 296 L 408 296 L 408 299 L 407 300 L 404 300 L 404 303 L 403 304 L 396 304 L 396 307 L 395 308 L 392 308 L 392 311 L 391 312 L 388 312 L 388 315 L 387 316 L 384 316 L 384 319 L 383 320 L 376 320 L 376 323 L 375 324 L 372 324 L 372 327 L 371 328 L 368 328 L 368 331 L 367 332 L 360 332 L 360 335 L 359 336 L 356 336 L 356 339 L 355 340 L 352 340 L 352 343 L 351 344 L 348 344 L 348 347 L 347 348 L 344 348 L 344 351 L 343 352 L 340 352 L 340 355 L 339 356 L 336 356 L 336 363 L 335 364 L 332 364 L 332 367 L 331 368 L 328 368 L 328 371 L 327 372 L 324 372 L 324 379 L 323 380 L 320 380 L 320 387 L 319 388 L 316 388 L 316 399 L 315 400 L 312 400 L 312 415 L 311 416 L 308 416 L 308 475 L 311 475 L 312 476 L 312 491 L 315 491 L 316 492 L 316 499 L 319 499 L 320 500 L 320 507 L 323 507 L 324 508 L 324 511 L 347 511 L 347 508 L 348 507 L 375 507 L 375 504 L 376 503 L 387 503 L 387 496 L 380 496 L 379 495 L 379 488 L 376 488 L 375 487 L 375 480 L 372 480 L 371 479 L 371 468 L 368 468 L 367 467 L 367 432 L 368 431 L 371 431 L 372 432 L 372 435 L 399 435 L 400 436 L 400 439 L 427 439 L 428 440 L 428 443 L 459 443 L 460 444 L 460 447 L 487 447 L 488 448 L 488 451 L 515 451 L 516 452 L 516 455 L 523 455 L 524 456 L 524 463 L 527 463 L 528 464 L 528 467 L 535 467 L 536 468 L 536 471 L 555 471 L 556 472 L 556 475 L 555 476 L 532 476 L 531 475 L 531 472 L 520 472 L 520 475 L 519 476 L 452 476 L 452 479 L 451 480 L 428 480 L 428 483 L 427 484 L 412 484 L 412 487 L 411 488 L 404 488 L 404 527 L 407 527 L 408 528 L 408 531 L 419 531 L 420 532 L 420 535 L 443 535 L 444 536 L 444 539 L 495 539 L 496 540 L 496 543 L 595 543 L 595 540 L 596 539 L 643 539 L 643 536 L 644 535 L 667 535 L 667 532 L 668 531 L 683 531 L 683 528 L 684 527 L 687 527 L 687 488 L 680 488 L 679 487 L 679 484 L 664 484 L 663 483 L 663 480 L 636 480 L 635 479 L 635 476 L 576 476 L 575 475 L 575 472 L 556 472 L 555 471 L 555 468 L 556 467 L 559 467 L 559 464 L 560 463 L 563 463 L 563 460 L 564 459 L 567 459 L 567 456 L 568 455 L 571 455 L 571 424 L 568 424 L 567 423 L 567 416 L 564 416 L 563 415 L 563 412 L 560 412 L 559 411 L 559 408 L 548 408 L 547 407 L 547 404 L 544 404 L 544 407 L 543 408 L 532 408 L 532 411 L 531 412 L 528 412 L 528 415 L 527 416 L 524 416 L 524 419 L 523 420 L 520 420 L 519 419 L 519 416 L 488 416 L 487 415 L 487 412 L 460 412 L 459 411 L 459 408 L 432 408 L 431 407 L 431 404 L 404 404 L 403 403 L 403 400 L 388 400 L 387 399 L 387 396 L 388 395 L 391 395 L 391 392 L 392 391 L 395 391 L 395 388 L 396 387 L 399 387 L 399 384 L 400 383 L 407 383 L 407 380 L 408 379 L 415 379 L 415 376 L 416 375 L 423 375 L 423 372 L 424 371 L 435 371 L 435 368 L 436 367 L 451 367 L 451 364 L 452 363 L 467 363 L 467 360 L 468 359 L 483 359 L 483 356 L 484 355 L 507 355 L 507 352 L 508 351 L 535 351 L 535 348 L 536 347 L 567 347 L 567 344 L 568 343 L 627 343 L 627 340 L 628 339 L 639 339 L 640 340 L 640 343 L 651 343 L 651 332 L 648 332 L 647 331 L 647 328 L 644 328 L 643 327 L 643 324 L 640 324 L 639 323 L 639 316 L 636 316 L 635 315 L 635 312 L 632 312 L 631 311 L 631 308 L 628 308 L 627 307 L 627 300 L 624 300 L 623 299 L 623 296 L 620 296 L 619 295 L 619 292 L 616 292 L 615 291 L 615 284 L 612 284 L 611 283 L 611 280 L 608 280 L 607 279 L 607 272 L 604 272 L 603 271 L 603 264 L 600 264 L 599 263 L 599 260 L 596 260 L 595 259 L 595 252 L 592 252 L 591 251 L 591 244 L 588 244 L 587 243 L 587 236 L 584 236 L 583 235 L 583 228 L 580 228 L 579 227 L 579 220 L 576 220 L 575 219 L 575 212 L 572 212 L 571 211 L 571 204 L 568 204 L 567 203 L 567 192 L 564 192 L 563 191 L 563 184 L 560 184 L 559 183 L 559 172 L 556 172 L 555 171 L 555 160 L 552 160 L 551 159 L 551 148 Z"/><path d="M 584 0 L 584 3 L 583 4 L 580 4 L 580 7 L 579 8 L 576 8 L 576 11 L 575 12 L 572 12 L 572 15 L 571 16 L 568 16 L 568 23 L 567 24 L 564 24 L 564 31 L 563 32 L 560 32 L 560 107 L 563 107 L 564 108 L 564 123 L 567 123 L 568 124 L 568 139 L 571 139 L 572 140 L 572 155 L 575 155 L 576 156 L 576 167 L 579 167 L 580 168 L 580 175 L 583 175 L 584 176 L 584 187 L 587 187 L 588 188 L 588 195 L 591 195 L 592 196 L 592 203 L 595 203 L 596 204 L 596 211 L 599 211 L 600 212 L 600 219 L 603 219 L 604 220 L 604 227 L 607 227 L 608 228 L 608 235 L 611 235 L 612 236 L 612 243 L 615 243 L 616 244 L 616 251 L 619 251 L 620 252 L 620 255 L 623 255 L 624 256 L 624 263 L 627 263 L 628 264 L 628 267 L 631 267 L 632 268 L 632 275 L 635 275 L 636 276 L 636 279 L 639 279 L 640 280 L 640 287 L 643 287 L 644 288 L 644 291 L 647 291 L 648 292 L 648 295 L 651 295 L 652 296 L 652 303 L 655 303 L 656 304 L 656 307 L 659 307 L 660 308 L 660 311 L 663 311 L 664 312 L 664 315 L 667 315 L 668 316 L 668 323 L 671 323 L 672 324 L 672 327 L 675 327 L 676 328 L 676 331 L 679 331 L 680 332 L 680 335 L 683 335 L 684 336 L 684 339 L 687 339 L 688 340 L 688 343 L 691 343 L 692 344 L 692 347 L 695 347 L 696 348 L 696 351 L 699 351 L 700 352 L 700 355 L 703 355 L 704 356 L 704 359 L 711 359 L 712 360 L 712 363 L 715 363 L 716 364 L 716 367 L 719 367 L 720 368 L 720 371 L 727 371 L 728 372 L 728 375 L 735 375 L 736 376 L 736 379 L 739 379 L 740 380 L 740 383 L 751 383 L 752 384 L 752 387 L 763 387 L 764 388 L 764 391 L 791 391 L 791 388 L 792 387 L 799 387 L 799 384 L 800 383 L 803 383 L 803 380 L 804 379 L 807 379 L 807 376 L 808 375 L 811 375 L 811 372 L 812 371 L 815 371 L 815 364 L 816 363 L 819 363 L 819 352 L 820 351 L 823 351 L 823 288 L 820 288 L 819 287 L 819 268 L 816 268 L 815 267 L 815 252 L 812 252 L 811 251 L 811 240 L 808 240 L 807 239 L 807 228 L 804 228 L 803 227 L 803 216 L 800 216 L 799 215 L 799 204 L 796 204 L 795 203 L 795 196 L 792 196 L 791 195 L 791 188 L 788 188 L 787 187 L 787 180 L 784 180 L 783 179 L 783 172 L 780 172 L 779 171 L 779 164 L 776 164 L 775 163 L 775 156 L 772 156 L 771 155 L 771 148 L 768 148 L 767 147 L 767 140 L 764 140 L 763 139 L 763 136 L 760 136 L 759 135 L 759 128 L 756 128 L 755 127 L 755 120 L 752 120 L 751 119 L 751 116 L 748 116 L 747 115 L 747 108 L 744 108 L 743 107 L 743 104 L 740 104 L 739 103 L 739 100 L 736 100 L 735 99 L 735 92 L 732 92 L 731 91 L 731 88 L 728 88 L 727 87 L 727 84 L 724 84 L 723 83 L 723 76 L 720 76 L 719 75 L 719 72 L 716 72 L 715 71 L 715 68 L 712 68 L 711 67 L 711 64 L 708 64 L 707 63 L 707 60 L 704 60 L 703 59 L 703 56 L 700 56 L 699 55 L 699 52 L 696 52 L 695 51 L 695 48 L 692 48 L 691 47 L 691 44 L 688 44 L 687 43 L 687 40 L 684 40 L 683 39 L 683 36 L 680 36 L 679 35 L 679 32 L 676 32 L 675 31 L 675 28 L 668 28 L 667 27 L 667 24 L 664 24 L 663 23 L 663 20 L 660 20 L 659 19 L 659 16 L 652 16 L 651 15 L 651 12 L 644 12 L 643 11 L 643 8 L 636 8 L 635 7 L 635 4 L 628 4 L 627 3 L 627 0 Z"/>`;
  const minYear = data[0].year;
  const maxYear = data[data.length - 1].year;
  const labelWidth = 150;
  const gridWidth = 820;
  const height = 220;
  const rows = [
    { key: 'academy', label: 'Oscars', y: 52, symbol: 'icon-oscars', iconSize: 22 },
    { key: 'globes', label: 'Golden Globes', y: 112, symbol: 'icon-globes', iconSize: 22 },
    { key: 'grammys', label: 'Grammys', y: 172, symbol: 'icon-grammys', iconSize: 16 },
  ];

  const ticks = new Set([minYear, maxYear]);
  for (let y = 1940; y <= 2020; y += 10) {
    ticks.add(y);
  }
  if (maxYear % 10 !== 0) {
    ticks.delete(Math.floor(maxYear / 10) * 10);
  }

  const tickLabels = Array.from(ticks)
    .sort((a, b) => a - b)
    .map((year) => {
      let x = labelWidth + ((year - minYear) / (maxYear - minYear)) * gridWidth;
      let anchor = 'middle';
      if (year === minYear) {
        anchor = 'start';
      }
      if (year === maxYear) {
        anchor = 'end';
      }
      return `<text class="axis-text" x="${x}" y="${height - 8}" text-anchor="${anchor}">${year}</text>`;
    });

  const dots = [];
  rows.forEach((row) => {
    dots.push(`<text class="label-text" x="0" y="${row.y + 4}">${row.label}</text>`);
    data.forEach((point) => {
      const value = point[row.key];
      if (value === null) return;
      const x = labelWidth + ((point.year - minYear) / (maxYear - minYear)) * gridWidth;
      const cls = value === true ? 'icon-full' : value === false ? 'icon-empty' : 'icon-na';
      const iconSize = row.iconSize || 22;
      dots.push(
        `<use href="#${row.symbol}" class="${cls}" x="${x - iconSize / 2}" y="${row.y - iconSize / 2}" width="${iconSize}" height="${iconSize}" />`
      );
    });
  });

  return `
    <svg role="img" aria-label="Timeline of women nominees across major awards" viewBox="0 0 1000 ${height}">
      <title>Women nominees across major awards</title>
      <desc>Each row shows award years with at least one woman nominee highlighted in accent.</desc>
      <defs>
        <symbol id="icon-oscars" viewBox="0 0 1024 1024">
          <g fill="currentColor">${oscarPaths}</g>
        </symbol>
        <symbol id="icon-globes" viewBox="0 0 1024 1024">
          <g fill="currentColor">${globePaths}</g>
        </symbol>
        <symbol id="icon-grammys" viewBox="0 0 1024 1024">
          <g fill="currentColor">${grammyPaths}</g>
        </symbol>
      </defs>
      ${dots.join('')}
      ${tickLabels.join('')}
    </svg>
  `;
}

function buildAwardsScatterSVG(data) {
  const oscarPaths = `<path d="M 492 32 L 492 35 L 491 36 L 480 36 L 480 39 L 479 40 L 476 40 L 476 51 L 475 52 L 472 52 L 472 99 L 475 99 L 476 100 L 476 107 L 479 107 L 480 108 L 480 127 L 483 127 L 484 128 L 484 143 L 483 144 L 480 144 L 480 155 L 479 156 L 476 156 L 476 159 L 475 160 L 468 160 L 468 163 L 467 164 L 464 164 L 464 167 L 463 168 L 456 168 L 456 171 L 455 172 L 448 172 L 448 175 L 447 176 L 440 176 L 440 179 L 439 180 L 432 180 L 432 183 L 431 184 L 420 184 L 420 187 L 419 188 L 412 188 L 412 191 L 411 192 L 408 192 L 408 195 L 407 196 L 404 196 L 404 199 L 403 200 L 400 200 L 400 207 L 399 208 L 396 208 L 396 239 L 399 239 L 400 240 L 400 251 L 403 251 L 404 252 L 404 287 L 407 287 L 408 288 L 408 303 L 411 303 L 412 304 L 412 315 L 415 315 L 416 316 L 416 331 L 419 331 L 420 332 L 420 355 L 423 355 L 424 356 L 424 359 L 427 359 L 428 360 L 428 363 L 431 363 L 432 364 L 432 367 L 443 367 L 444 368 L 444 371 L 447 371 L 448 372 L 448 379 L 451 379 L 452 380 L 452 415 L 451 416 L 448 416 L 448 467 L 447 468 L 444 468 L 444 487 L 447 487 L 448 488 L 448 523 L 451 523 L 452 524 L 452 543 L 455 543 L 456 544 L 456 555 L 459 555 L 460 556 L 460 571 L 463 571 L 464 572 L 464 627 L 463 628 L 460 628 L 460 655 L 459 656 L 456 656 L 456 659 L 459 659 L 460 660 L 460 695 L 463 695 L 464 696 L 464 707 L 467 707 L 468 708 L 468 719 L 471 719 L 472 720 L 472 735 L 475 735 L 476 736 L 476 751 L 479 751 L 480 752 L 480 767 L 479 768 L 476 768 L 476 779 L 475 780 L 472 780 L 472 787 L 471 788 L 468 788 L 468 795 L 467 796 L 464 796 L 464 799 L 463 800 L 460 800 L 460 807 L 459 808 L 416 808 L 416 811 L 415 812 L 408 812 L 408 839 L 407 840 L 400 840 L 400 843 L 399 844 L 396 844 L 396 847 L 395 848 L 392 848 L 392 851 L 395 851 L 396 852 L 396 855 L 403 855 L 404 856 L 404 927 L 403 928 L 388 928 L 388 931 L 387 932 L 372 932 L 372 935 L 371 936 L 364 936 L 364 955 L 363 956 L 360 956 L 360 979 L 371 979 L 372 980 L 372 983 L 391 983 L 392 984 L 392 987 L 439 987 L 440 988 L 440 991 L 583 991 L 583 988 L 584 987 L 631 987 L 631 984 L 632 983 L 651 983 L 651 980 L 652 979 L 663 979 L 663 956 L 660 956 L 659 955 L 659 936 L 652 936 L 651 935 L 651 932 L 636 932 L 635 931 L 635 928 L 620 928 L 619 927 L 619 856 L 620 855 L 627 855 L 627 852 L 628 851 L 631 851 L 631 848 L 628 848 L 627 847 L 627 844 L 624 844 L 623 843 L 623 840 L 616 840 L 615 839 L 615 836 L 612 836 L 611 835 L 611 820 L 612 819 L 615 819 L 615 812 L 608 812 L 607 811 L 607 808 L 564 808 L 563 807 L 563 800 L 560 800 L 559 799 L 559 796 L 556 796 L 555 795 L 555 788 L 552 788 L 551 787 L 551 780 L 548 780 L 547 779 L 547 736 L 548 735 L 551 735 L 551 720 L 552 719 L 555 719 L 555 708 L 556 707 L 559 707 L 559 696 L 560 695 L 563 695 L 563 672 L 564 671 L 567 671 L 567 648 L 564 648 L 563 647 L 563 620 L 560 620 L 559 619 L 559 572 L 560 571 L 563 571 L 563 556 L 564 555 L 567 555 L 567 544 L 568 543 L 571 543 L 571 528 L 572 527 L 575 527 L 575 496 L 576 495 L 579 495 L 579 456 L 576 456 L 575 455 L 575 412 L 572 412 L 571 411 L 571 376 L 572 375 L 575 375 L 575 372 L 576 371 L 579 371 L 579 368 L 580 367 L 591 367 L 591 364 L 592 363 L 595 363 L 595 360 L 596 359 L 599 359 L 599 356 L 600 355 L 603 355 L 603 336 L 604 335 L 607 335 L 607 316 L 608 315 L 611 315 L 611 304 L 612 303 L 615 303 L 615 288 L 616 287 L 619 287 L 619 252 L 620 251 L 623 251 L 623 240 L 624 239 L 627 239 L 627 204 L 624 204 L 623 203 L 623 200 L 620 200 L 619 199 L 619 196 L 616 196 L 615 195 L 615 192 L 612 192 L 611 191 L 611 188 L 604 188 L 603 187 L 603 184 L 596 184 L 595 183 L 595 180 L 584 180 L 583 179 L 583 176 L 576 176 L 575 175 L 575 172 L 568 172 L 567 171 L 567 168 L 560 168 L 559 167 L 559 164 L 556 164 L 555 163 L 555 160 L 552 160 L 551 159 L 551 156 L 548 156 L 547 155 L 547 152 L 544 152 L 543 151 L 543 112 L 544 111 L 547 111 L 547 100 L 548 99 L 551 99 L 551 48 L 548 48 L 547 47 L 547 40 L 544 40 L 543 39 L 543 36 L 532 36 L 531 35 L 531 32 Z"/>`;
  const globePaths = `<path d="M 456 4 L 456 7 L 455 8 L 428 8 L 428 11 L 427 12 L 416 12 L 416 15 L 415 16 L 412 16 L 412 23 L 411 24 L 408 24 L 408 27 L 407 28 L 404 28 L 404 39 L 403 40 L 400 40 L 400 47 L 399 48 L 396 48 L 396 63 L 395 64 L 392 64 L 392 79 L 391 80 L 388 80 L 388 83 L 387 84 L 384 84 L 384 87 L 383 88 L 380 88 L 380 95 L 379 96 L 376 96 L 376 99 L 375 100 L 372 100 L 372 107 L 371 108 L 368 108 L 368 119 L 367 120 L 364 120 L 364 127 L 363 128 L 360 128 L 360 139 L 359 140 L 356 140 L 356 155 L 355 156 L 352 156 L 352 159 L 351 160 L 348 160 L 348 167 L 347 168 L 344 168 L 344 191 L 347 191 L 348 192 L 348 199 L 351 199 L 352 200 L 352 207 L 355 207 L 356 208 L 356 211 L 359 211 L 360 212 L 360 215 L 363 215 L 364 216 L 364 219 L 367 219 L 368 220 L 368 227 L 371 227 L 372 228 L 372 231 L 375 231 L 376 232 L 376 235 L 379 235 L 380 236 L 380 239 L 383 239 L 384 240 L 384 243 L 387 243 L 388 244 L 388 247 L 391 247 L 392 248 L 392 251 L 399 251 L 400 252 L 400 255 L 403 255 L 404 256 L 404 259 L 407 259 L 408 260 L 408 263 L 411 263 L 412 264 L 412 267 L 419 267 L 420 268 L 420 271 L 423 271 L 424 272 L 424 275 L 431 275 L 432 276 L 432 279 L 439 279 L 440 280 L 440 283 L 447 283 L 448 284 L 448 287 L 455 287 L 456 288 L 456 291 L 459 291 L 460 292 L 460 315 L 459 316 L 456 316 L 456 331 L 455 332 L 452 332 L 452 339 L 451 340 L 444 340 L 444 343 L 443 344 L 440 344 L 440 355 L 439 356 L 380 356 L 380 395 L 383 395 L 384 396 L 384 399 L 387 399 L 388 400 L 388 403 L 391 403 L 392 404 L 392 407 L 395 407 L 396 408 L 396 411 L 399 411 L 400 412 L 400 415 L 407 415 L 408 416 L 408 419 L 415 419 L 416 420 L 416 423 L 423 423 L 424 424 L 424 427 L 427 427 L 428 428 L 428 431 L 435 431 L 436 432 L 436 435 L 443 435 L 444 436 L 444 439 L 451 439 L 452 440 L 452 443 L 455 443 L 456 444 L 456 451 L 455 452 L 452 452 L 452 455 L 451 456 L 448 456 L 448 459 L 447 460 L 444 460 L 444 463 L 443 464 L 440 464 L 440 467 L 439 468 L 436 468 L 436 475 L 435 476 L 432 476 L 432 479 L 431 480 L 428 480 L 428 487 L 427 488 L 424 488 L 424 491 L 423 492 L 420 492 L 420 495 L 419 496 L 416 496 L 416 499 L 415 500 L 404 500 L 404 503 L 403 504 L 400 504 L 400 507 L 399 508 L 392 508 L 392 951 L 391 952 L 384 952 L 384 955 L 383 956 L 380 956 L 380 959 L 379 960 L 372 960 L 372 963 L 371 964 L 364 964 L 364 967 L 363 968 L 356 968 L 356 971 L 355 972 L 348 972 L 348 975 L 347 976 L 340 976 L 340 979 L 339 980 L 332 980 L 332 983 L 331 984 L 328 984 L 328 1023 L 695 1023 L 695 984 L 692 984 L 691 983 L 691 980 L 688 980 L 687 979 L 687 976 L 676 976 L 675 975 L 675 972 L 672 972 L 671 971 L 671 968 L 664 968 L 663 967 L 663 964 L 656 964 L 655 963 L 655 960 L 648 960 L 647 959 L 647 956 L 640 956 L 639 955 L 639 952 L 632 952 L 631 951 L 631 508 L 628 508 L 627 507 L 627 504 L 620 504 L 619 503 L 619 500 L 612 500 L 611 499 L 611 496 L 608 496 L 607 495 L 607 492 L 604 492 L 603 491 L 603 488 L 600 488 L 599 487 L 599 480 L 596 480 L 595 479 L 595 476 L 592 476 L 591 475 L 591 472 L 588 472 L 587 471 L 587 468 L 584 468 L 583 467 L 583 464 L 580 464 L 579 463 L 579 460 L 576 460 L 575 459 L 575 452 L 572 452 L 571 451 L 571 444 L 572 443 L 579 443 L 579 440 L 580 439 L 583 439 L 583 436 L 584 435 L 591 435 L 591 432 L 592 431 L 595 431 L 595 428 L 596 427 L 603 427 L 603 424 L 604 423 L 611 423 L 611 420 L 612 419 L 619 419 L 619 416 L 620 415 L 623 415 L 623 412 L 624 411 L 631 411 L 631 408 L 632 407 L 635 407 L 635 404 L 636 403 L 639 403 L 639 396 L 640 395 L 643 395 L 643 388 L 644 387 L 647 387 L 647 368 L 648 367 L 651 367 L 651 360 L 648 360 L 647 359 L 647 356 L 592 356 L 591 355 L 591 352 L 588 352 L 587 351 L 587 344 L 584 344 L 583 343 L 583 340 L 576 340 L 575 339 L 575 332 L 572 332 L 571 331 L 571 288 L 572 287 L 583 287 L 583 284 L 584 283 L 591 283 L 591 280 L 592 279 L 599 279 L 599 276 L 600 275 L 603 275 L 603 272 L 604 271 L 611 271 L 611 268 L 612 267 L 619 267 L 619 264 L 620 263 L 639 263 L 639 260 L 640 259 L 643 259 L 643 256 L 644 255 L 647 255 L 647 252 L 648 251 L 651 251 L 651 248 L 652 247 L 655 247 L 655 244 L 656 243 L 659 243 L 659 240 L 660 239 L 663 239 L 663 236 L 664 235 L 667 235 L 667 232 L 668 231 L 671 231 L 671 224 L 672 223 L 675 223 L 675 200 L 672 200 L 671 199 L 671 128 L 672 127 L 675 127 L 675 108 L 672 108 L 671 107 L 671 100 L 668 100 L 667 99 L 667 92 L 664 92 L 663 91 L 663 84 L 660 84 L 659 83 L 659 76 L 656 76 L 655 75 L 655 68 L 652 68 L 651 67 L 651 60 L 648 60 L 647 59 L 647 56 L 644 56 L 643 55 L 643 52 L 640 52 L 639 51 L 639 48 L 632 48 L 631 47 L 631 44 L 628 44 L 627 43 L 627 40 L 620 40 L 619 39 L 619 36 L 616 36 L 615 35 L 615 32 L 604 32 L 603 31 L 603 28 L 596 28 L 595 27 L 595 24 L 584 24 L 583 23 L 583 20 L 572 20 L 571 19 L 571 16 L 556 16 L 555 15 L 555 12 L 540 12 L 539 11 L 539 8 L 508 8 L 507 7 L 507 4 Z"/>`;
  const grammyPaths = `<path d="M 256 720 L 256 723 L 255 724 L 252 724 L 252 731 L 251 732 L 248 732 L 248 739 L 247 740 L 244 740 L 244 747 L 243 748 L 240 748 L 240 755 L 239 756 L 236 756 L 236 759 L 235 760 L 232 760 L 232 767 L 231 768 L 228 768 L 228 775 L 227 776 L 224 776 L 224 783 L 223 784 L 220 784 L 220 791 L 219 792 L 216 792 L 216 795 L 215 796 L 212 796 L 212 803 L 211 804 L 208 804 L 208 811 L 207 812 L 204 812 L 204 819 L 203 820 L 200 820 L 200 827 L 199 828 L 196 828 L 196 831 L 195 832 L 192 832 L 192 839 L 191 840 L 188 840 L 188 847 L 187 848 L 184 848 L 184 855 L 183 856 L 180 856 L 180 863 L 179 864 L 176 864 L 176 871 L 175 872 L 172 872 L 172 875 L 171 876 L 168 876 L 168 883 L 167 884 L 164 884 L 164 891 L 163 892 L 160 892 L 160 899 L 159 900 L 156 900 L 156 907 L 155 908 L 152 908 L 152 911 L 151 912 L 148 912 L 148 919 L 147 920 L 144 920 L 144 927 L 143 928 L 140 928 L 140 935 L 139 936 L 136 936 L 136 943 L 147 943 L 148 944 L 148 947 L 175 947 L 176 948 L 176 951 L 203 951 L 204 952 L 204 955 L 235 955 L 236 956 L 236 959 L 263 959 L 264 960 L 264 963 L 291 963 L 292 964 L 292 967 L 319 967 L 320 968 L 320 971 L 351 971 L 352 972 L 352 975 L 383 975 L 384 976 L 384 979 L 407 979 L 408 980 L 408 983 L 435 983 L 436 984 L 436 987 L 467 987 L 468 988 L 468 991 L 495 991 L 496 992 L 496 995 L 527 995 L 528 996 L 528 999 L 563 999 L 563 996 L 564 995 L 591 995 L 591 992 L 592 991 L 623 991 L 623 988 L 624 987 L 651 987 L 651 984 L 652 983 L 679 983 L 679 980 L 680 979 L 707 979 L 707 976 L 708 975 L 739 975 L 739 972 L 740 971 L 771 971 L 771 968 L 772 967 L 799 967 L 799 964 L 800 963 L 823 963 L 823 960 L 824 959 L 855 959 L 855 956 L 856 955 L 883 955 L 883 952 L 884 951 L 915 951 L 915 948 L 916 947 L 943 947 L 943 944 L 944 943 L 955 943 L 955 936 L 952 936 L 951 935 L 951 932 L 948 932 L 947 931 L 947 924 L 944 924 L 943 923 L 943 916 L 940 916 L 939 915 L 939 908 L 936 908 L 935 907 L 935 900 L 932 900 L 931 899 L 931 892 L 928 892 L 927 891 L 927 888 L 924 888 L 923 887 L 923 880 L 920 880 L 919 879 L 919 872 L 916 872 L 915 871 L 915 864 L 912 864 L 911 863 L 911 856 L 908 856 L 907 855 L 907 852 L 904 852 L 903 851 L 903 844 L 900 844 L 899 843 L 899 836 L 896 836 L 895 835 L 895 828 L 892 828 L 891 827 L 891 820 L 888 820 L 887 819 L 887 812 L 884 812 L 883 811 L 883 808 L 880 808 L 879 807 L 879 800 L 876 800 L 875 799 L 875 792 L 872 792 L 871 791 L 871 784 L 868 784 L 867 783 L 867 776 L 864 776 L 863 775 L 863 772 L 860 772 L 859 771 L 859 764 L 856 764 L 855 763 L 855 756 L 852 756 L 851 755 L 851 748 L 848 748 L 847 747 L 847 740 L 844 740 L 843 739 L 843 736 L 840 736 L 839 735 L 839 728 L 836 728 L 835 727 L 835 720 L 824 720 L 824 723 L 823 724 L 792 724 L 792 727 L 791 728 L 760 728 L 760 731 L 759 732 L 732 732 L 732 735 L 731 736 L 704 736 L 704 739 L 703 740 L 676 740 L 676 743 L 675 744 L 644 744 L 644 747 L 643 748 L 616 748 L 616 751 L 615 752 L 588 752 L 588 755 L 587 756 L 560 756 L 560 759 L 559 760 L 532 760 L 531 759 L 531 756 L 504 756 L 503 755 L 503 752 L 476 752 L 475 751 L 475 748 L 444 748 L 443 747 L 443 744 L 416 744 L 415 743 L 415 740 L 388 740 L 387 739 L 387 736 L 360 736 L 359 735 L 359 732 L 328 732 L 327 731 L 327 728 L 300 728 L 299 727 L 299 724 L 268 724 L 267 723 L 267 720 Z"/><path d="M 328 540 L 328 543 L 327 544 L 324 544 L 324 547 L 327 547 L 328 548 L 328 707 L 339 707 L 340 708 L 340 711 L 367 711 L 368 712 L 368 715 L 399 715 L 400 716 L 400 719 L 427 719 L 428 720 L 428 723 L 455 723 L 456 724 L 456 727 L 483 727 L 484 728 L 484 731 L 511 731 L 512 732 L 512 735 L 539 735 L 540 736 L 540 739 L 547 739 L 547 736 L 548 735 L 579 735 L 579 732 L 580 731 L 607 731 L 607 728 L 608 727 L 635 727 L 635 724 L 636 723 L 663 723 L 663 720 L 664 719 L 691 719 L 691 716 L 692 715 L 723 715 L 723 712 L 724 711 L 751 711 L 751 708 L 752 707 L 763 707 L 763 540 L 736 540 L 736 543 L 735 544 L 704 544 L 704 547 L 703 548 L 676 548 L 676 551 L 675 552 L 648 552 L 648 555 L 647 556 L 620 556 L 620 559 L 619 560 L 592 560 L 592 563 L 591 564 L 560 564 L 560 567 L 559 568 L 532 568 L 531 567 L 531 564 L 500 564 L 499 563 L 499 560 L 468 560 L 467 559 L 467 556 L 444 556 L 443 555 L 443 552 L 416 552 L 415 551 L 415 548 L 384 548 L 383 547 L 383 544 L 356 544 L 355 543 L 355 540 Z"/><path d="M 544 148 L 544 155 L 543 156 L 540 156 L 540 159 L 539 160 L 536 160 L 536 167 L 535 168 L 532 168 L 532 171 L 531 172 L 528 172 L 528 175 L 527 176 L 524 176 L 524 183 L 523 184 L 520 184 L 520 187 L 519 188 L 516 188 L 516 191 L 515 192 L 512 192 L 512 199 L 511 200 L 508 200 L 508 203 L 507 204 L 504 204 L 504 207 L 503 208 L 500 208 L 500 211 L 499 212 L 496 212 L 496 215 L 495 216 L 492 216 L 492 219 L 491 220 L 488 220 L 488 223 L 487 224 L 484 224 L 484 227 L 483 228 L 480 228 L 480 231 L 479 232 L 476 232 L 476 239 L 475 240 L 472 240 L 472 243 L 471 244 L 468 244 L 468 247 L 467 248 L 464 248 L 464 251 L 463 252 L 460 252 L 460 255 L 459 256 L 452 256 L 452 259 L 451 260 L 448 260 L 448 263 L 447 264 L 444 264 L 444 267 L 443 268 L 440 268 L 440 271 L 439 272 L 436 272 L 436 275 L 435 276 L 432 276 L 432 279 L 431 280 L 428 280 L 428 283 L 427 284 L 424 284 L 424 287 L 423 288 L 416 288 L 416 291 L 415 292 L 412 292 L 412 295 L 411 296 L 408 296 L 408 299 L 407 300 L 404 300 L 404 303 L 403 304 L 396 304 L 396 307 L 395 308 L 392 308 L 392 311 L 391 312 L 388 312 L 388 315 L 387 316 L 384 316 L 384 319 L 383 320 L 376 320 L 376 323 L 375 324 L 372 324 L 372 327 L 371 328 L 368 328 L 368 331 L 367 332 L 360 332 L 360 335 L 359 336 L 356 336 L 356 339 L 355 340 L 352 340 L 352 343 L 351 344 L 348 344 L 348 347 L 347 348 L 344 348 L 344 351 L 343 352 L 340 352 L 340 355 L 339 356 L 336 356 L 336 363 L 335 364 L 332 364 L 332 367 L 331 368 L 328 368 L 328 371 L 327 372 L 324 372 L 324 379 L 323 380 L 320 380 L 320 387 L 319 388 L 316 388 L 316 399 L 315 400 L 312 400 L 312 415 L 311 416 L 308 416 L 308 475 L 311 475 L 312 476 L 312 491 L 315 491 L 316 492 L 316 499 L 319 499 L 320 500 L 320 507 L 323 507 L 324 508 L 324 511 L 347 511 L 347 508 L 348 507 L 375 507 L 375 504 L 376 503 L 387 503 L 387 496 L 380 496 L 379 495 L 379 488 L 376 488 L 375 487 L 375 480 L 372 480 L 371 479 L 371 468 L 368 468 L 367 467 L 367 432 L 368 431 L 371 431 L 372 432 L 372 435 L 399 435 L 400 436 L 400 439 L 427 439 L 428 440 L 428 443 L 459 443 L 460 444 L 460 447 L 487 447 L 488 448 L 488 451 L 515 451 L 516 452 L 516 455 L 523 455 L 524 456 L 524 463 L 527 463 L 528 464 L 528 467 L 535 467 L 536 468 L 536 471 L 555 471 L 556 472 L 556 475 L 555 476 L 532 476 L 531 475 L 531 472 L 520 472 L 520 475 L 519 476 L 452 476 L 452 479 L 451 480 L 428 480 L 428 483 L 427 484 L 412 484 L 412 487 L 411 488 L 404 488 L 404 527 L 407 527 L 408 528 L 408 531 L 419 531 L 420 532 L 420 535 L 443 535 L 444 536 L 444 539 L 495 539 L 496 540 L 496 543 L 595 543 L 595 540 L 596 539 L 643 539 L 643 536 L 644 535 L 667 535 L 667 532 L 668 531 L 683 531 L 683 528 L 684 527 L 687 527 L 687 488 L 680 488 L 679 487 L 679 484 L 664 484 L 663 483 L 663 480 L 636 480 L 635 479 L 635 476 L 576 476 L 575 475 L 575 472 L 556 472 L 555 471 L 555 468 L 556 467 L 559 467 L 559 464 L 560 463 L 563 463 L 563 460 L 564 459 L 567 459 L 567 456 L 568 455 L 571 455 L 571 424 L 568 424 L 567 423 L 567 416 L 564 416 L 563 415 L 563 412 L 560 412 L 559 411 L 559 408 L 548 408 L 547 407 L 547 404 L 544 404 L 544 407 L 543 408 L 532 408 L 532 411 L 531 412 L 528 412 L 528 415 L 527 416 L 524 416 L 524 419 L 523 420 L 520 420 L 519 419 L 519 416 L 488 416 L 487 415 L 487 412 L 460 412 L 459 411 L 459 408 L 432 408 L 431 407 L 431 404 L 404 404 L 403 403 L 403 400 L 388 400 L 387 399 L 387 396 L 388 395 L 391 395 L 391 392 L 392 391 L 395 391 L 395 388 L 396 387 L 399 387 L 399 384 L 400 383 L 407 383 L 407 380 L 408 379 L 415 379 L 415 376 L 416 375 L 423 375 L 423 372 L 424 371 L 435 371 L 435 368 L 436 367 L 451 367 L 451 364 L 452 363 L 467 363 L 467 360 L 468 359 L 483 359 L 483 356 L 484 355 L 507 355 L 507 352 L 508 351 L 535 351 L 535 348 L 536 347 L 567 347 L 567 344 L 568 343 L 627 343 L 627 340 L 628 339 L 639 339 L 640 340 L 640 343 L 651 343 L 651 332 L 648 332 L 647 331 L 647 328 L 644 328 L 643 327 L 643 324 L 640 324 L 639 323 L 639 316 L 636 316 L 635 315 L 635 312 L 632 312 L 631 311 L 631 308 L 628 308 L 627 307 L 627 300 L 624 300 L 623 299 L 623 296 L 620 296 L 619 295 L 619 292 L 616 292 L 615 291 L 615 284 L 612 284 L 611 283 L 611 280 L 608 280 L 607 279 L 607 272 L 604 272 L 603 271 L 603 264 L 600 264 L 599 263 L 599 260 L 596 260 L 595 259 L 595 252 L 592 252 L 591 251 L 591 244 L 588 244 L 587 243 L 587 236 L 584 236 L 583 235 L 583 228 L 580 228 L 579 227 L 579 220 L 576 220 L 575 219 L 575 212 L 572 212 L 571 211 L 571 204 L 568 204 L 567 203 L 567 192 L 564 192 L 563 191 L 563 184 L 560 184 L 559 183 L 559 172 L 556 172 L 555 171 L 555 160 L 552 160 L 551 159 L 551 148 Z"/><path d="M 584 0 L 584 3 L 583 4 L 580 4 L 580 7 L 579 8 L 576 8 L 576 11 L 575 12 L 572 12 L 572 15 L 571 16 L 568 16 L 568 23 L 567 24 L 564 24 L 564 31 L 563 32 L 560 32 L 560 107 L 563 107 L 564 108 L 564 123 L 567 123 L 568 124 L 568 139 L 571 139 L 572 140 L 572 155 L 575 155 L 576 156 L 576 167 L 579 167 L 580 168 L 580 175 L 583 175 L 584 176 L 584 187 L 587 187 L 588 188 L 588 195 L 591 195 L 592 196 L 592 203 L 595 203 L 596 204 L 596 211 L 599 211 L 600 212 L 600 219 L 603 219 L 604 220 L 604 227 L 607 227 L 608 228 L 608 235 L 611 235 L 612 236 L 612 243 L 615 243 L 616 244 L 616 251 L 619 251 L 620 252 L 620 255 L 623 255 L 624 256 L 624 263 L 627 263 L 628 264 L 628 267 L 631 267 L 632 268 L 632 275 L 635 275 L 636 276 L 636 279 L 639 279 L 640 280 L 640 287 L 643 287 L 644 288 L 644 291 L 647 291 L 648 292 L 648 295 L 651 295 L 652 296 L 652 303 L 655 303 L 656 304 L 656 307 L 659 307 L 660 308 L 660 311 L 663 311 L 664 312 L 664 315 L 667 315 L 668 316 L 668 323 L 671 323 L 672 324 L 672 327 L 675 327 L 676 328 L 676 331 L 679 331 L 680 332 L 680 335 L 683 335 L 684 336 L 684 339 L 687 339 L 688 340 L 688 343 L 691 343 L 692 344 L 692 347 L 695 347 L 696 348 L 696 351 L 699 351 L 700 352 L 700 355 L 703 355 L 704 356 L 704 359 L 711 359 L 712 360 L 712 363 L 715 363 L 716 364 L 716 367 L 719 367 L 720 368 L 720 371 L 727 371 L 728 372 L 728 375 L 735 375 L 736 376 L 736 379 L 739 379 L 740 380 L 740 383 L 751 383 L 752 384 L 752 387 L 763 387 L 764 388 L 764 391 L 791 391 L 791 388 L 792 387 L 799 387 L 799 384 L 800 383 L 803 383 L 803 380 L 804 379 L 807 379 L 807 376 L 808 375 L 811 375 L 811 372 L 812 371 L 815 371 L 815 364 L 816 363 L 819 363 L 819 352 L 820 351 L 823 351 L 823 288 L 820 288 L 819 287 L 819 268 L 816 268 L 815 267 L 815 252 L 812 252 L 811 251 L 811 240 L 808 240 L 807 239 L 807 228 L 804 228 L 803 227 L 803 216 L 800 216 L 799 215 L 799 204 L 796 204 L 795 203 L 795 196 L 792 196 L 791 195 L 791 188 L 788 188 L 787 187 L 787 180 L 784 180 L 783 179 L 783 172 L 780 172 L 779 171 L 779 164 L 776 164 L 775 163 L 775 156 L 772 156 L 771 155 L 771 148 L 768 148 L 767 147 L 767 140 L 764 140 L 763 139 L 763 136 L 760 136 L 759 135 L 759 128 L 756 128 L 755 127 L 755 120 L 752 120 L 751 119 L 751 116 L 748 116 L 747 115 L 747 108 L 744 108 L 743 107 L 743 104 L 740 104 L 739 103 L 739 100 L 736 100 L 735 99 L 735 92 L 732 92 L 731 91 L 731 88 L 728 88 L 727 87 L 727 84 L 724 84 L 723 83 L 723 76 L 720 76 L 719 75 L 719 72 L 716 72 L 715 71 L 715 68 L 712 68 L 711 67 L 711 64 L 708 64 L 707 63 L 707 60 L 704 60 L 703 59 L 703 56 L 700 56 L 699 55 L 699 52 L 696 52 L 695 51 L 695 48 L 692 48 L 691 47 L 691 44 L 688 44 L 687 43 L 687 40 L 684 40 L 683 39 L 683 36 L 680 36 L 679 35 L 679 32 L 676 32 L 675 31 L 675 28 L 668 28 L 667 27 L 667 24 L 664 24 L 663 23 L 663 20 L 660 20 L 659 19 L 659 16 L 652 16 L 651 15 L 651 12 L 644 12 L 643 11 L 643 8 L 636 8 L 635 7 L 635 4 L 628 4 L 627 3 L 627 0 Z"/>`;

  const rows = [
    { key: 'academy', symbol: 'icon-oscars', iconSize: 22 },
    { key: 'globes', symbol: 'icon-globes', iconSize: 22 },
    { key: 'grammys', symbol: 'icon-grammys', iconSize: 16 },
  ];

  const items = [];
  data.forEach((point) => {
    rows.forEach((row) => {
      const value = point[row.key];
      if (value === null) return;
      const cls = value === true ? 'icon-full' : value === false ? 'icon-empty' : 'icon-na';
      items.push({ symbol: row.symbol, size: row.iconSize, cls });
    });
  });

  let seed = 4823;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const padding = 24;
  const cell = 26;
  const cols = Math.max(1, Math.round(Math.sqrt(items.length)));
  const width = padding * 2 + cols * cell;
  const rowsCount = Math.ceil(items.length / cols);
  const height = padding * 2 + rowsCount * cell;

  const positions = [];
  for (let i = 0; i < items.length; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = padding + col * cell + cell / 2;
    const baseY = padding + row * cell + cell / 2;
    positions.push({ x: baseX, y: baseY });
  }

  const icons = items.map((item, idx) => {
    const pos = positions[idx];
    const size = item.size;
    return `<use href="#${item.symbol}" class="${item.cls}" x="${pos.x - size / 2}" y="${pos.y - size / 2}" width="${size}" height="${size}" />`;
  });

  return `
    <svg role="img" aria-label="Grid of award statuettes" viewBox="0 0 ${width} ${height}">
      <title>Awards distribution (grid)</title>
      <desc>Each statuette represents an award year, aligned on a grid while preserving award counts.</desc>
      <defs>
        <symbol id="icon-oscars" viewBox="0 0 1024 1024">
          <g fill="currentColor">${oscarPaths}</g>
        </symbol>
        <symbol id="icon-globes" viewBox="0 0 1024 1024">
          <g fill="currentColor">${globePaths}</g>
        </symbol>
        <symbol id="icon-grammys" viewBox="0 0 1024 1024">
          <g fill="currentColor">${grammyPaths}</g>
        </symbol>
      </defs>
      ${icons.join('')}
    </svg>
  `;
}

function buildOscarsGridSVG() {
  const oscarPaths = `<path d="M 492 32 L 492 35 L 491 36 L 480 36 L 480 39 L 479 40 L 476 40 L 476 51 L 475 52 L 472 52 L 472 99 L 475 99 L 476 100 L 476 107 L 479 107 L 480 108 L 480 127 L 483 127 L 484 128 L 484 143 L 483 144 L 480 144 L 480 155 L 479 156 L 476 156 L 476 159 L 475 160 L 468 160 L 468 163 L 467 164 L 464 164 L 464 167 L 463 168 L 456 168 L 456 171 L 455 172 L 448 172 L 448 175 L 447 176 L 440 176 L 440 179 L 439 180 L 432 180 L 432 183 L 431 184 L 420 184 L 420 187 L 419 188 L 412 188 L 412 191 L 411 192 L 408 192 L 408 195 L 407 196 L 404 196 L 404 199 L 403 200 L 400 200 L 400 207 L 399 208 L 396 208 L 396 239 L 399 239 L 400 240 L 400 251 L 403 251 L 404 252 L 404 287 L 407 287 L 408 288 L 408 303 L 411 303 L 412 304 L 412 315 L 415 315 L 416 316 L 416 331 L 419 331 L 420 332 L 420 355 L 423 355 L 424 356 L 424 359 L 427 359 L 428 360 L 428 363 L 431 363 L 432 364 L 432 367 L 443 367 L 444 368 L 444 371 L 447 371 L 448 372 L 448 379 L 451 379 L 452 380 L 452 415 L 451 416 L 448 416 L 448 467 L 447 468 L 444 468 L 444 487 L 447 487 L 448 488 L 448 523 L 451 523 L 452 524 L 452 543 L 455 543 L 456 544 L 456 555 L 459 555 L 460 556 L 460 571 L 463 571 L 464 572 L 464 627 L 463 628 L 460 628 L 460 655 L 459 656 L 456 656 L 456 659 L 459 659 L 460 660 L 460 695 L 463 695 L 464 696 L 464 707 L 467 707 L 468 708 L 468 719 L 471 719 L 472 720 L 472 735 L 475 735 L 476 736 L 476 751 L 479 751 L 480 752 L 480 767 L 479 768 L 476 768 L 476 779 L 475 780 L 472 780 L 472 787 L 471 788 L 468 788 L 468 795 L 467 796 L 464 796 L 464 799 L 463 800 L 460 800 L 460 807 L 459 808 L 416 808 L 416 811 L 415 812 L 408 812 L 408 839 L 407 840 L 400 840 L 400 843 L 399 844 L 396 844 L 396 847 L 395 848 L 392 848 L 392 851 L 395 851 L 396 852 L 396 855 L 403 855 L 404 856 L 404 927 L 403 928 L 388 928 L 388 931 L 387 932 L 372 932 L 372 935 L 371 936 L 364 936 L 364 955 L 363 956 L 360 956 L 360 979 L 371 979 L 372 980 L 372 983 L 391 983 L 392 984 L 392 987 L 439 987 L 440 988 L 440 991 L 583 991 L 583 988 L 584 987 L 631 987 L 631 984 L 632 983 L 651 983 L 651 980 L 652 979 L 663 979 L 663 956 L 660 956 L 659 955 L 659 936 L 652 936 L 651 935 L 651 932 L 636 932 L 635 931 L 635 928 L 620 928 L 619 927 L 619 856 L 620 855 L 627 855 L 627 852 L 628 851 L 631 851 L 631 848 L 628 848 L 627 847 L 627 844 L 624 844 L 623 843 L 623 840 L 616 840 L 615 839 L 615 836 L 612 836 L 611 835 L 611 820 L 612 819 L 615 819 L 615 812 L 608 812 L 607 811 L 607 808 L 564 808 L 563 807 L 563 800 L 560 800 L 559 799 L 559 796 L 556 796 L 555 795 L 555 788 L 552 788 L 551 787 L 551 780 L 548 780 L 547 779 L 547 736 L 548 735 L 551 735 L 551 720 L 552 719 L 555 719 L 555 708 L 556 707 L 559 707 L 559 696 L 560 695 L 563 695 L 563 672 L 564 671 L 567 671 L 567 648 L 564 648 L 563 647 L 563 620 L 560 620 L 559 619 L 559 572 L 560 571 L 563 571 L 563 556 L 564 555 L 567 555 L 567 544 L 568 543 L 571 543 L 571 528 L 572 527 L 575 527 L 575 496 L 576 495 L 579 495 L 579 456 L 576 456 L 575 455 L 575 412 L 572 412 L 571 411 L 571 376 L 572 375 L 575 375 L 575 372 L 576 371 L 579 371 L 579 368 L 580 367 L 591 367 L 591 364 L 592 363 L 595 363 L 595 360 L 596 359 L 599 359 L 599 356 L 600 355 L 603 355 L 603 336 L 604 335 L 607 335 L 607 316 L 608 315 L 611 315 L 611 304 L 612 303 L 615 303 L 615 288 L 616 287 L 619 287 L 619 252 L 620 251 L 623 251 L 623 240 L 624 239 L 627 239 L 627 204 L 624 204 L 623 203 L 623 200 L 620 200 L 619 199 L 619 196 L 616 196 L 615 195 L 615 192 L 612 192 L 611 191 L 611 188 L 604 188 L 603 187 L 603 184 L 596 184 L 595 183 L 595 180 L 584 180 L 583 179 L 583 176 L 576 176 L 575 175 L 575 172 L 568 172 L 567 171 L 567 168 L 560 168 L 559 167 L 559 164 L 556 164 L 555 163 L 555 160 L 552 160 L 551 159 L 551 156 L 548 156 L 547 155 L 547 152 L 544 152 L 543 151 L 543 112 L 544 111 L 547 111 L 547 100 L 548 99 L 551 99 L 551 48 L 548 48 L 547 47 L 547 40 L 544 40 L 543 39 L 543 36 L 532 36 L 531 35 L 531 32 Z"/>`;

  const total = 982;
  const accentCount = 14;
  const size = 22;
  const padding = 24;
  const cell = 26;
  const cols = 28;
  const width = padding * 2 + cols * cell;
  const rowsCount = Math.ceil(total / cols);
  const height = padding * 2 + rowsCount * cell;

  const indices = Array.from({ length: total }, (_, i) => i);
  let seed = 6721;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const accentSet = new Set(indices.slice(0, accentCount));

  const icons = [];
  for (let i = 0; i < total; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * cell + cell / 2;
    const y = padding + row * cell + cell / 2;
    const cls = accentSet.has(i) ? 'icon-full' : 'icon-empty';
    icons.push(
      `<use href="#icon-oscars" class="${cls}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" />`
    );
  }

  return `
    <svg role="img" aria-label="Grid of Oscar statuettes" viewBox="0 0 ${width} ${height}">
      <title>Oscar nominations (grid)</title>
      <desc>982 Oscar statuettes aligned on a grid, with 14 highlighted in purple.</desc>
      <defs>
        <symbol id="icon-oscars" viewBox="0 0 1024 1024">
          <g fill="currentColor">${oscarPaths}</g>
        </symbol>
      </defs>
      ${icons.join('')}
    </svg>
  `;
}

function initFactVisuals() {
  const dotContainer = document.querySelector('[data-fact-viz="dots"]');
  if (dotContainer) {
    dotContainer.innerHTML = buildDotMatrixSVG();
  }

  const barContainer = document.querySelector('[data-fact-viz="bars"]');
  if (barContainer) {
    barContainer.innerHTML = buildBarComparisonSVG();
  }

  const experienceContainer = document.querySelector('[data-fact-viz="experience"]');
  if (experienceContainer) {
    experienceContainer.innerHTML = buildExperienceBarsSVG();
  }

  const timelineContainer = document.querySelector('[data-fact-viz="timeline"]');
  if (timelineContainer) {
    timelineContainer.innerHTML = buildAwardsTimelineSVG(awardsTimelineData);
  }

  const scatterContainer = document.querySelector('[data-fact-viz="awards-scatter"]');
  if (scatterContainer) {
    scatterContainer.innerHTML = buildAwardsScatterSVG(awardsTimelineData);
  }

  const oscarsGridContainer = document.querySelector('[data-fact-viz="oscars-grid"]');
  if (oscarsGridContainer) {
    oscarsGridContainer.innerHTML = buildOscarsGridSVG();
  }

  const percentEl = document.querySelector('[data-awards-percent]');
  if (percentEl) {
    let total = 0;
    let zeroYears = 0;
    awardsTimelineData.forEach((row) => {
      const values = [row.academy, row.globes, row.grammys];
      const hasData = values.some((v) => v !== null);
      if (!hasData) return;
      total += 1;
      const hasAny = values.some((v) => v === true);
      if (!hasAny) zeroYears += 1;
    });
    const percent = total ? Math.round((zeroYears / total) * 100) : 0;
    percentEl.textContent = `${percent}% of years had zero women nominees across all three awards (based on available years).`;
  }
}

function initToc() {
  const select = document.querySelector('[data-toc-select]');
  if (!select) return;
  select.addEventListener('change', () => {
    const value = select.value;
    if (value) {
      window.location.hash = value;
    }
  });
}

function initCitation() {
  const citation = document.getElementById('citation-text');
  const copyButton = document.querySelector('[data-copy-citation]');
  if (!citation || !copyButton) return;
  const year = new Date().getFullYear();
  const title = document.querySelector('.brand')?.textContent?.trim() || 'Composer Representation Report';
  const url = window.location.origin;
  citation.textContent = `${title}. (${year}). Retrieved from ${url}`;

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(citation.textContent);
      showToast('Citation copied');
    } catch (err) {
      console.error(err);
      showToast('Unable to copy citation');
    }
  });
}

function init() {
  initLinks();
  initHeroScrollHint();
  initThemeToggle();
  initMobileNav();
  initCarousel();
  initFactVisuals();
  initGraphCredits();
  initToc();
  initCitation();
  initCharts().catch((err) => {
    console.error(err);
    const errorBlock = document.getElementById('data-error');
    if (errorBlock) {
      errorBlock.hidden = false;
    }
    showToast('Data temporarily unavailable');
  });
}

init();
