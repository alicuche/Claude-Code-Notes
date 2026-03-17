const puppeteer = require('puppeteer-core');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const SLIDES = [
  { file: 'slide-01-title.html', title: 'Home' },
  { file: 'slide-02-agenda.html', title: 'Overview' },
  { file: 'slide-03-problem.html', title: 'The Problem' },
  { file: 'slide-04-tool-use.html', title: 'Tool Use' },
  { file: 'slide-05-mcp-skills.html', title: 'MCP / Skills / Agents' },
  { file: 'slide-06-tokens.html', title: 'Tokens' },
  { file: 'slide-07-cost.html', title: 'Cost' },
  { file: 'slide-08-compact.html', title: 'Compact' },
  { file: 'slide-09-context-optimization.html', title: 'Context Optimization' },
  { file: 'slide-10-claude-md.html', title: 'CLAUDE.md Inheritance' },
  { file: 'slide-11-subagent.html', title: 'SubAgent' },
  { file: 'slide-13-scale.html', title: 'Skill Explosion' },
  { file: 'slide-14-best-practices.html', title: 'Best Practices' },
  { file: 'slide-15-debug.html', title: 'Debug' },
  { file: 'slide-16-cheatsheet.html', title: 'Cheatsheet' },
  { file: 'slide-17-multi-account.html', title: 'Multiple Accounts' },
];

const SECTIONS = {
  'slide-01': 'INTRO',
  'slide-02': 'INTRO',
  'slide-03': 'Foundation',
  'slide-04': 'Foundation',
  'slide-05': 'Foundation',
  'slide-06': 'Foundation',
  'slide-07': 'Foundation',
  'slide-08': 'Foundation',
  'slide-09': 'Optimization',
  'slide-10': 'Optimization',
  'slide-11': 'Optimization',
  'slide-13': 'Advanced',
  'slide-14': 'Advanced',
  'slide-15': 'Tips',
  'slide-16': 'Tips',
  'slide-17': 'Tips',
};

const PAGE_WIDTH = 1440;
const MIN_HEIGHT = 900;
const SCALE = 2; // Retina quality

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  const slidesDir = path.join(__dirname, 'context-presentation');
  const mergedPdf = await PDFDocument.create();

  const page = await browser.newPage();
  await page.setViewport({ width: PAGE_WIDTH, height: MIN_HEIGHT, deviceScaleFactor: SCALE });

  for (let i = 0; i < SLIDES.length; i++) {
    const slide = SLIDES[i];
    const slideId = slide.file.match(/slide-\d+/)[0];
    const section = SECTIONS[slideId] || '';
    const pageLabel = section ? `${section} — ${slide.title}` : slide.title;

    console.log(`[${i + 1}/${SLIDES.length}] ${pageLabel}`);

    const filePath = `file://${path.join(slidesDir, slide.file)}`;
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });

    // Manipulate DOM: hide nav, inject banner, expand layout
    await page.evaluate((label) => {
      const sidebar = document.querySelector('.sidebar');
      const header = document.querySelector('.header');
      const footer = document.querySelector('.footer');
      const layout = document.querySelector('.presentation-layout');
      const content = document.querySelector('.content');

      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (footer) footer.style.display = 'none';

      if (layout) {
        layout.style.gridTemplateColumns = '1fr';
        layout.style.gridTemplateRows = 'auto auto';
        layout.style.gridTemplateAreas = '"banner" "content"';
        layout.style.height = 'auto';
        layout.style.minHeight = '0';
        layout.style.overflow = 'visible';
      }

      if (content) {
        content.style.overflow = 'visible';
        content.style.height = 'auto';
      }

      document.documentElement.style.height = 'auto';
      document.documentElement.style.overflow = 'visible';
      document.body.style.height = 'auto';
      document.body.style.overflow = 'visible';

      // Inject banner
      const banner = document.createElement('div');
      banner.style.cssText = `
        grid-area: banner;
        background: linear-gradient(135deg, #7C3AED, #6D28D9);
        color: white;
        padding: 10px 32px;
        font-family: Inter, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.03em;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      banner.innerHTML = `<span style="opacity:0.7">CONTEXT AI</span><span style="opacity:0.4">|</span>${label}`;
      layout.prepend(banner);

      // Complete all animations
      document.querySelectorAll('.animate-in, .slide-container').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.animation = 'none';
      });
    }, pageLabel);

    // Wait for fonts
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    // Measure full content height and resize viewport
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const pageHeight = Math.max(bodyHeight, MIN_HEIGHT);
    await page.setViewport({ width: PAGE_WIDTH, height: pageHeight, deviceScaleFactor: SCALE });
    await new Promise(r => setTimeout(r, 200));

    // Screenshot captures exactly what's visible — no print re-render
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    // Embed screenshot as a PDF page (use logical size, not pixel size)
    const pngImage = await mergedPdf.embedPng(screenshotBuffer);
    const pdfPage = mergedPdf.addPage([pngImage.width / SCALE, pngImage.height / SCALE]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pngImage.width / SCALE,
      height: pngImage.height / SCALE,
    });

    // Reset viewport for next slide
    await page.setViewport({ width: PAGE_WIDTH, height: MIN_HEIGHT, deviceScaleFactor: SCALE });
  }

  const outputPath = path.join(__dirname, 'context-ai-slides.pdf');
  const pdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`\nPDF saved: ${outputPath} (${(pdfBytes.length / 1024).toFixed(0)} KB)`);

  await browser.close();
})();
