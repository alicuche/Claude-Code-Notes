/* ============================================
   CONTEXT AI — Shared Navigation Logic
   Handles sidebar, header, footer, transitions
   ============================================ */

const SLIDES = [
  { id: 'slide-01', file: 'slide-01-title.html', title: 'Context AI', section: 'INTRO', label: 'Home' },
  { id: 'slide-02', file: 'slide-02-agenda.html', title: 'Overview', section: 'INTRO', label: 'Overview' },
  { id: 'slide-03', file: 'slide-03-problem.html', title: 'The Problem', section: 'FOUNDATION', label: '\u2460 The Problem' },
  { id: 'slide-04', file: 'slide-04-tool-use.html', title: 'Tool Use', section: 'FOUNDATION', label: '\u2461 Tool Use' },
  { id: 'slide-05', file: 'slide-05-mcp-skills.html', title: 'MCP / Skills / Agents', section: 'FOUNDATION', label: '\u2462 MCP / Skills / Agents' },
  { id: 'slide-06', file: 'slide-06-tokens.html', title: 'Tokens', section: 'FOUNDATION', label: '\u2463 Tokens' },
  { id: 'slide-07', file: 'slide-07-cost.html', title: 'Cost', section: 'FOUNDATION', label: '\u2464 Cost' },
  { id: 'slide-08', file: 'slide-08-compact.html', title: 'Compact', section: 'FOUNDATION', label: '\u2465 Compact' },
  { id: 'slide-09', file: 'slide-09-context-optimization.html', title: 'Context Optimization', section: 'OPTIMIZATION', label: '\u2466 Context Optimization' },
  { id: 'slide-10', file: 'slide-10-claude-md.html', title: 'CLAUDE.md Inheritance', section: 'OPTIMIZATION', label: '\u2467 CLAUDE.md Inheritance' },
  { id: 'slide-11', file: 'slide-11-subagent.html', title: 'SubAgent', section: 'OPTIMIZATION', label: '\u2468 SubAgent' },
  { id: 'slide-13', file: 'slide-13-scale.html', title: 'Skill Explosion', section: 'SCALE', label: '\u2469 Skill Explosion' },
  { id: 'slide-14', file: 'slide-14-best-practices.html', title: 'Best Practices', section: 'SCALE', label: '\u246A Best Practices' }
];

const SECTIONS = {
  INTRO: { label: '', slides: [0, 1] },
  FOUNDATION: { label: 'Foundation', slides: [2, 3, 4, 5, 6, 7] },
  OPTIMIZATION: { label: 'Optimization', slides: [8, 9, 10] },
  SCALE: { label: 'Advanced', slides: [11, 12] }
};

/**
 * Get current slide index from filename
 */
function getCurrentSlideIndex() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  const idx = SLIDES.findIndex(s => s.file === filename);
  return idx >= 0 ? idx : 0;
}

/**
 * Build sidebar HTML
 */
function buildSidebar() {
  const currentIdx = getCurrentSlideIndex();
  const currentSlide = SLIDES[currentIdx];

  let html = `
    <div class="sidebar-brand">
      <h1>CONTEXT AI</h1>
      <span>AI Context Window</span>
    </div>
    <nav>
      <ul class="sidebar-nav">
  `;

  let lastSection = '';
  SLIDES.forEach((slide, i) => {
    if (slide.section !== lastSection) {
      lastSection = slide.section;
      const sectionLabel = SECTIONS[slide.section].label;
      if (sectionLabel) {
        html += `
          <li class="sidebar-section">
            <span class="sidebar-section-title">${sectionLabel}</span>
          </li>
        `;
      }
    }
    const activeClass = i === currentIdx ? ' active' : '';
    html += `
      <li>
        <a class="sidebar-nav-item${activeClass}"
           href="${slide.file}"
           data-slide="${i}"
           aria-current="${i === currentIdx ? 'page' : 'false'}">
          ${slide.label}
        </a>
      </li>
    `;
  });

  html += '</ul></nav>';
  return html;
}

/**
 * Build header HTML
 */
function buildHeader() {
  const currentIdx = getCurrentSlideIndex();
  const slide = SLIDES[currentIdx];
  const progress = ((currentIdx + 1) / SLIDES.length) * 100;

  const sectionLabel = SECTIONS[slide.section].label || slide.title;
  return `
    <div class="header-section-badge">
      <span class="badge-dot"></span>
      ${sectionLabel}
    </div>
    <span class="header-title">${slide.title}</span>
    <div class="header-progress">
      <div class="header-progress-bar">
        <div class="header-progress-fill" style="width: ${progress}%"></div>
      </div>
      <span class="header-progress-text">${currentIdx + 1} / ${SLIDES.length}</span>
    </div>
  `;
}

/**
 * Build footer HTML
 */
function buildFooter() {
  const currentIdx = getCurrentSlideIndex();
  const prevDisabled = currentIdx === 0 ? ' disabled' : '';
  const nextDisabled = currentIdx === SLIDES.length - 1 ? ' disabled' : '';

  return `
    <span class="footer-brand">Context AI</span>
    <div class="footer-nav">
      <button class="footer-nav-btn" id="btn-prev"${prevDisabled}
              aria-label="Previous slide" title="Previous (←)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="footer-page">
        <span class="current">${currentIdx + 1}</span> / ${SLIDES.length}
      </span>
      <button class="footer-nav-btn" id="btn-next"${nextDisabled}
              aria-label="Next slide" title="Next (→)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <span class="footer-page" style="min-width: 80px; text-align: right;">
      ${SLIDES[currentIdx].section}
    </span>
  `;
}

/**
 * Navigate to slide
 */
function navigateTo(index) {
  if (index >= 0 && index < SLIDES.length) {
    window.location.href = SLIDES[index].file;
  }
}

/**
 * Initialize shared components
 */
function initPresentation() {
  // Inject sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.innerHTML = buildSidebar();

  // Inject header
  const header = document.querySelector('.header');
  if (header) header.innerHTML = buildHeader();

  // Inject footer
  const footer = document.querySelector('.footer');
  if (footer) footer.innerHTML = buildFooter();

  // Navigation buttons
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const currentIdx = getCurrentSlideIndex();

  if (btnPrev) {
    btnPrev.addEventListener('click', () => navigateTo(currentIdx - 1));
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => navigateTo(currentIdx + 1));
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      navigateTo(currentIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateTo(currentIdx - 1);
    }
  });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initPresentation);
