const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { cleanExtractedText } = require('../utils/sanitize');
const env = require('../config/env');
const logger = require('../utils/logger');

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; FundedCobraBot/1.0; +https://www.fundedcobra.com)',
  'Accept': 'text/html,application/xhtml+xml',
};

/**
 * Checks if a URL is within the allowed domains list.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isAllowedDomain(urlStr) {
  try {
    const { hostname } = new URL(urlStr);
    return env.ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Fetches and parses a single page. Returns cleaned text content.
 * @param {string} url
 * @returns {Promise<{ title: string, text: string, links: string[] }>}
 */
async function scrapePage(url) {
  const response = await axios.get(url, {
    headers: SCRAPE_HEADERS,
    timeout: 15000,
    maxRedirects: 3,
    responseType: 'text',
  });

  const $ = cheerio.load(response.data);

  // Remove noise
  $('script, style, nav, footer, header, .navbar, .mobile-menu, .chat-btn, noscript, svg, iframe').remove();

  // Extract title
  const title = $('title').text().trim() || $('h1').first().text().trim() || url;

  // Extract meaningful text
  const sections = [];

  // Page heading
  const h1 = $('h1').first().text().trim();
  if (h1) sections.push(`# ${h1}`);

  // Main content areas
  const contentSelectors = ['main', 'article', '.content', '.container', '#content', 'body'];
  let contentEl = null;
  for (const sel of contentSelectors) {
    if ($(sel).length) { contentEl = $(sel); break; }
  }
  if (!contentEl) contentEl = $('body');

  // Extract headings, paragraphs, list items, table rows
  contentEl.find('h1, h2, h3, h4, p, li, td, th, .rule-title, .rule-desc, .faq-question, .faq-answer').each((_, el) => {
    const tag  = el.tagName?.toLowerCase();
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (!text || text.length < 10) return;

    if (['h1', 'h2'].includes(tag))      sections.push(`\n## ${text}`);
    else if (['h3', 'h4'].includes(tag)) sections.push(`\n### ${text}`);
    else                                 sections.push(text);
  });

  const rawText = cleanExtractedText(sections.join('\n'));

  // Collect internal links for crawling
  const baseUrl = new URL(url);
  const links = [];
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const resolved = new URL(href, baseUrl).href.split('#')[0];
      if (isAllowedDomain(resolved) && !links.includes(resolved)) links.push(resolved);
    } catch {}
  });

  return { title: title.replace(' | Funded Cobra', '').trim(), text: rawText, links };
}

/**
 * Crawls a website starting from a seed URL, up to maxPages.
 * @param {string} startUrl
 * @param {number} [maxPages]
 * @returns {Promise<{ url: string, title: string, text: string }[]>}
 */
async function crawlWebsite(startUrl, maxPages = env.MAX_SCRAPE_PAGES) {
  if (!isAllowedDomain(startUrl)) {
    throw new Error(`Domain not in allowed list. Only these domains are permitted: ${env.ALLOWED_DOMAINS.join(', ')}`);
  }

  const visited  = new Set();
  const queue    = [startUrl];
  const results  = [];

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      logger.info(`Scraping: ${url}`);
      const { title, text, links } = await scrapePage(url);

      if (text && text.length > 100) {
        results.push({ url, title, text });
      }

      // Enqueue new links (that haven't been visited yet)
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }

      // Polite delay
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      logger.warn(`Failed to scrape ${url}: ${err.message}`);
    }
  }

  logger.info(`Crawl complete: ${results.length} pages scraped.`);
  return results;
}

/**
 * Scrapes just one URL without crawling.
 * @param {string} url
 */
async function scrapeSingleUrl(url) {
  if (!isAllowedDomain(url)) {
    throw new Error(`Domain not allowed: ${new URL(url).hostname}`);
  }
  const { title, text } = await scrapePage(url);
  return { url, title, text };
}

module.exports = { crawlWebsite, scrapeSingleUrl, isAllowedDomain };
