// Direct download page scrapers for apps not in Repology
// Each entry: { url, parse(html) }
// url = the page to scrape; parse = extract version from HTML
const PAGE_SCRAPERS = {
  'clickshare': {
    url: 'https://www.barco.com/en/support/software/r3306194',
    manual: true,
  },
  'arsclip': {
    url: 'https://www.joejoesoft.com/vcms/97/',
    parse: (html) => {
      const match = html.match(/Changes in v([\d.]+)/i);
      return match ? match[1] : null;
    },
  },
  'ms report builder': {
    url: 'https://www.microsoft.com/en-us/download/details.aspx?id=53613',
    parse: (html) => {
      const match = html.match(/Version:\s*<\/h3>\s*<p[^>]*>([\d.]+)<\/p>/i);
      return match ? match[1] : null;
    },
  },
  'microsoft powerbi desktop': {
    url: 'https://www.microsoft.com/en-us/download/details.aspx?id=58494',
    parse: (html) => {
      const match = html.match(/Version:\s*<\/h3>\s*<p[^>]*>([\d.]+)<\/p>/i);
      return match ? match[1] : null;
    },
  },
  'cumins insite': {
    url: 'https://www.cummins.com/en-na/support/digital-products-and-services-support/insite-support',
    parse: (html) => {
      // First "INSITE x.x.x" in a label is the latest version
      const match = html.match(/INSITE\s+([\d.]+)/i);
      return match ? match[1] : null;
    },
  },
  'git enterprise': {
    url: 'https://enterprise.github.com/releases',
    parse: (html) => {
      const match = html.match(/>\s*(\d+\.\d+\.\d+)\s*</);
      return match ? match[1] : null;
    },
  },
};


async function fetchFromPage(softwareName, signal) {
  const key = softwareName.toLowerCase().trim();
  const scraper = PAGE_SCRAPERS[key];
  if (!scraper) return null;

  // Manual entries — return link only, no auto-scrape
  if (scraper.manual) {
    console.log(`[PageScraper] ${softwareName}: manual check → ${scraper.url}`);
    return { latestVersion: 'Manual Check', source: scraper.url };
  }

  const res = await fetch(`/api/fetch?url=${encodeURIComponent(scraper.url)}`, { signal });
  if (!res.ok) return null;

  const html = await res.text();
  const version = scraper.parse(html);
  if (!version) return null;

  console.log(`[PageScraper] ${softwareName}: ${version}`);
  return { latestVersion: version, source: scraper.url };
}

// Manual overrides for software that Repology names differently
const NAME_OVERRIDES = {
  'zoom': ['zoom-videoconference', 'zoom-unclassified'],
  'notepad++': 'notepad++',
  'visualstudiocode': 'vscode',
  'microsoftvisualcode': 'vscode',
};

// Generate candidate Repology project names from a software name
function getCandidateNames(softwareName) {
  const key = softwareName.toLowerCase().trim().replace(/\s+/g, '');
  const override = NAME_OVERRIDES[key];
  if (override) return Array.isArray(override) ? override : [override];
  const lower = softwareName.toLowerCase().trim();
  // Replace + with plus before stripping special chars
  const plusReplaced = lower.replace(/\+/g, 'plus');
  const hyphenated = plusReplaced.replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const nospaces = plusReplaced.replace(/[^a-z0-9]/g, '');
  const words = lower.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1].replace(/[^a-z0-9]/g, '');
  // Also try with dots replaced (e.g. node.js → nodejs)
  const noDots = hyphenated.replace(/\./g, '');

  const candidates = [lower.replace(/\s+/g, ''), hyphenated];
  if (nospaces !== hyphenated) candidates.push(nospaces);
  if (noDots !== hyphenated) candidates.push(noDots);
  if (words.length > 1) candidates.push(lastWord);

  return [...new Set(candidates)];
}

async function fetchProject(name, signal) {
  const url = `/api/repology/project/${encodeURIComponent(name)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const packages = await res.json();
  if (!Array.isArray(packages) || packages.length === 0) return null;

  // Try statuses in priority order
  for (const status of ['newest', 'unique', 'noscheme', 'outdated', 'devel', 'rolling', 'legacy']) {
    const match = packages.find(p => p.status === status);
    if (match) return { version: match.version, repo: match.repo };
  }
  return null;
}

async function fetchRepology(softwareName, signal) {
  const candidates = getCandidateNames(softwareName);
  console.log(`[Repology] Trying candidates for "${softwareName}":`, candidates);

  const found = [];
  for (const name of candidates) {
    console.log(`[Repology] Trying: ${name}`);
    const result = await fetchProject(name, signal);
    if (result) {
      console.log(`[Repology] Found: ${name} → ${result.version} (${result.repo})`);
      found.push({ name, version: result.version, repo: result.repo });
    }
  }

  if (found.length === 0) {
    console.warn(`[Repology] No match for "${softwareName}"`);
    return null;
  }

  // Use the first result as the primary version, list all sources
  return {
    latestVersion: found[0].version,
    source: found.map(f => `https://repology.org/project/${f.name}/versions`).join(' | '),
  };
}

// --- AI fallback ---

const PROVIDERS = {
  perplexity: {
    key: () => import.meta.env.VITE_PERPLEXITY_API_KEY,
    name: 'Perplexity',
  },
  gemini: {
    key: () => import.meta.env.VITE_GEMINI_API_KEY,
    name: 'Gemini',
  },
  openai: {
    key: () => import.meta.env.VITE_OPENAI_API_KEY,
    name: 'OpenAI',
  },
};

export function getActiveProvider() {
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    if (provider.key()) return { id, name: provider.name };
  }
  return null;
}

function buildPrompt(softwareName) {
  const today = new Date().toISOString().split('T')[0];
  return `Today is ${today}. What is the latest stable version of ${softwareName} as of today? Respond ONLY with JSON: {"latestVersion": "x.y.z", "source": "url"}`;
}

function extractJSON(text) {
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return cleaned.slice(start, end + 1);
}

async function fetchAIFallback(softwareName, signal) {
  const provider = getActiveProvider();
  if (!provider) return null;

  const apiKey = PROVIDERS[provider.id].key();
  let res;

  if (provider.id === 'perplexity') {
    res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a software version lookup assistant. Respond only with valid JSON.' },
          { role: 'user', content: buildPrompt(softwareName) },
        ],
      }),
    });
  } else if (provider.id === 'gemini') {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(softwareName) }] }],
        tools: [{ google_search: {} }],
      }),
    });
  } else {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini-search-preview',
        messages: [
          { role: 'system', content: 'You are a software version lookup assistant. Respond only with valid JSON.' },
          { role: 'user', content: buildPrompt(softwareName) },
        ],
      }),
    });
  }

  if (res.status === 429) throw { status: 429 };
  if (!res.ok) throw new Error(`${provider.name} error: ${res.status}`);

  const data = await res.json();
  let raw;
  if (provider.id === 'gemini') {
    raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    raw = data.choices?.[0]?.message?.content || '';
  }

  console.log(`[AI Fallback - ${provider.name}] ${softwareName} raw:`, raw);
  const parsed = JSON.parse(extractJSON(raw));
  return {
    latestVersion: parsed.latestVersion || null,
    source: parsed.source || provider.name,
  };
}

// --- Main lookup: Repology first, AI fallback ---

export async function lookupLatestVersion(softwareName, installedVersion, signal) {
  // Try direct page scraper first (for apps with known download pages)
  try {
    const pageResult = await fetchFromPage(softwareName, signal);
    if (pageResult) return pageResult;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`[PageScraper] Failed for ${softwareName}:`, err.message);
  }

  // Try Repology
  try {
    const result = await fetchRepology(softwareName, signal);
    if (result && result.latestVersion) {
      console.log(`[Repology] ✓ ${softwareName}: ${result.latestVersion}`);
      return result;
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`[Repology] Failed for ${softwareName}:`, err.message);
  }

  // Skip — no AI fallback, let user see what needs manual mapping
  console.warn(`[SKIP] ${softwareName}: not found in Repology`);
  return null;
}
