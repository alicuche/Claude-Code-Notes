/* ============================================
   CONTEXT AI — Navigation & Shared Components
   Loads sidebar, header, footer into each page
   ============================================ */

const PAGES = [
  { id: 'page-01', file: 'page-01-title.html', title: 'Title', section: 'foundation', num: 1 },
  { id: 'page-02', file: 'page-02-agenda.html', title: 'Agenda', section: 'foundation', num: 2 },
  { id: 'page-03', file: 'page-03-problem.html', title: 'The Problem', section: 'foundation', num: 3 },
  { id: 'page-04', file: 'page-04-tool-use.html', title: 'Tool Use', section: 'foundation', num: 4 },
  { id: 'page-05', file: 'page-05-mcp-skills.html', title: 'MCP & Skills', section: 'foundation', num: 5 },
  { id: 'page-06', file: 'page-06-tokens.html', title: 'Tokens', section: 'optimization', num: 6 },
  { id: 'page-07', file: 'page-07-cost.html', title: 'Cost', section: 'optimization', num: 7 },
  { id: 'page-08', file: 'page-08-context-opt.html', title: 'Context Optimization', section: 'optimization', num: 8 },
  { id: 'page-09', file: 'page-09-claude-md.html', title: 'CLAUDE.md', section: 'optimization', num: 9 },
  { id: 'page-10', file: 'page-10-subagent.html', title: 'SubAgent', section: 'scale', num: 10 },
  { id: 'page-11', file: 'page-11-skill-loading.html', title: 'Skill Loading', section: 'scale', num: 11 },
  { id: 'page-12', file: 'page-12-10k-skills.html', title: '10K Skills', section: 'scale', num: 12 },
  { id: 'page-13', file: 'page-13-best-practices.html', title: 'Best Practices', section: 'scale', num: 13 },
];

const SECTIONS = {
  foundation: { label: 'Foundation', color: '#3b82f6' },
  optimization: { label: 'Optimization', color: '#8b5cf6' },
  scale: { label: 'Scale', color: '#06b6d4' },
};

/**
 * Get the current page ID from the filename
 */
function getCurrentPageId() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  const page = PAGES.find(p => p.file === filename);
  return page ? page.id : null;
}

/**
 * Navigate to a page
 */
function navigateTo(pageFile) {
  window.location.href = pageFile;
}

/**
 * Load shared component HTML via fetch
 */
async function loadComponent(elementId, filePath) {
  try {
    const resp = await fetch(filePath);
    if (!resp.ok) return;
    const html = await resp.text();
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = html;
  } catch (e) {
    console.warn(`Failed to load component: ${filePath}`, e);
  }
}

/**
 * Initialize all shared components
 */
async function initPresentation() {
  // Load shared components
  await Promise.all([
    loadComponent('sidebar-root', '../shared/sidebar.html'),
    loadComponent('header-root', '../shared/header.html'),
    loadComponent('footer-root', '../shared/footer.html'),
  ]);

  // Highlight current page in sidebar
  const currentId = getCurrentPageId();
  if (currentId) {
    const activeLink = document.querySelector(`[data-page="${currentId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      // Scroll sidebar to active item
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Update header with current page info
  const currentPage = PAGES.find(p => p.id === currentId);
  if (currentPage) {
    const headerTitle = document.getElementById('header-page-title');
    if (headerTitle) headerTitle.textContent = currentPage.title;

    const headerNum = document.getElementById('header-page-num');
    if (headerNum) headerNum.textContent = `${currentPage.num} / ${PAGES.length}`;

    // Update progress bar
    const progressBar = document.getElementById('header-progress-fill');
    if (progressBar) {
      const pct = (currentPage.num / PAGES.length) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Update footer
    const footerCurrent = document.getElementById('footer-current');
    if (footerCurrent) footerCurrent.textContent = `${currentPage.num} / ${PAGES.length}`;
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!currentId) return;
    const idx = PAGES.findIndex(p => p.id === currentId);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < PAGES.length - 1) navigateTo(PAGES[idx + 1].file);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) navigateTo(PAGES[idx - 1].file);
    }
  });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initPresentation);
