// cwomn - hewwo language translator uwu

const STORAGE_KEY = 'cwomn_enabled';
const ORIGINAL_ATTR = 'data-cwomn-original';

// Tags whose text content should never be touched
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'CODE', 'PRE', 'KBD',
  'SAMP', 'VAR', 'MATH', 'SVG', 'HEAD', 'META', 'LINK', 'TITLE'
]);

// --- Hewwo transformation rules ---

const ASCII_EMOJIS = [
  '(✿^‿^)', '(≧ω≦)', '(◕‿◕)', '(ﾉ´ヮ`)ﾉ', '(⁀ᗢ⁀)',
  '(｡♥‿♥｡)', 'ヾ(＾∇＾)', '(★ω★)', '(◍•ᴗ•◍)', '(づ｡◕‿◕｡)づ'
];

const EMOJI_CHANCE = 0.08;

function randomEmoji() {
  return ASCII_EMOJIS[Math.floor(Math.random() * ASCII_EMOJIS.length)];
}

function hewwoify(text) {
  // Don't touch whitespace-only strings
  if (!text.trim()) return text;

  let t = text;

  // th → d / dh variations (do before other substitutions)
  t = t.replace(/\bthe\b/gi, (m) => m[0] === 'T' ? 'Da' : 'da');
  t = t.replace(/\bthis\b/gi, (m) => m[0] === 'T' ? 'Dis' : 'dis');
  t = t.replace(/\bthat\b/gi, (m) => m[0] === 'T' ? 'Dat' : 'dat');
  t = t.replace(/\bthey\b/gi, (m) => m[0] === 'T' ? 'Dey' : 'dey');
  t = t.replace(/\bthem\b/gi, (m) => m[0] === 'T' ? 'Dem' : 'dem');
  t = t.replace(/\btheir\b/gi, (m) => m[0] === 'T' ? 'Deir' : 'deir');
  t = t.replace(/\bthere\b/gi, (m) => m[0] === 'T' ? 'Dere' : 'dere');
  t = t.replace(/\bthink\b/gi, (m) => m[0] === 'T' ? 'Dink' : 'dink');
  t = t.replace(/\bthings?\b/gi, (m) => {
    const base = m.toLowerCase().replace('th', 'd');
    return m[0] === 'm'.toUpperCase() ? base[0].toUpperCase() + base.slice(1) : base;
  });
  // Generic th → d
  t = t.replace(/TH/g, 'D');
  t = t.replace(/Th/g, 'D');
  t = t.replace(/th/g, 'd');

  // r → w, l → w  (preserve case)
  t = t.replace(/r/g, 'w');
  t = t.replace(/R/g, 'W');
  t = t.replace(/l/g, 'w');
  t = t.replace(/L/g, 'W');

  // ove → uv (love → wuv, move → muv)
  t = t.replace(/ove/g, 'uv');
  t = t.replace(/OVE/g, 'UV');
  t = t.replace(/Ove/g, 'Uv');

  // n + vowel → ny + vowel (e.g. "now" → "nyow", "nice" → "nyice")
  t = t.replace(/n([aeiou])/g, 'ny$1');
  t = t.replace(/N([aeiou])/g, 'Ny$1');
  t = t.replace(/N([AEIOU])/g, 'NY$1');

  // Sprinkle "~" after sentence-ending punctuation, and occasionally add "pwincess" or ASCII emoji
  const PRINCESS_CHANCE = 0.15;
  t = t.replace(/([.!?])(~?\s)/g, (_, punct, space) => {
    const roll = Math.random();
    let insert;
    if (roll < PRINCESS_CHANCE) insert = `${punct}~ pwincess,`;
    else if (roll < PRINCESS_CHANCE + EMOJI_CHANCE) insert = `${punct}~ ${randomEmoji()}`;
    else insert = `${punct}~`;
    return insert + space;
  });
  t = t.replace(/([.!?])$/g, (_, punct) => {
    const roll = Math.random();
    if (roll < PRINCESS_CHANCE) return `${punct}~ pwincess~`;
    if (roll < PRINCESS_CHANCE + EMOJI_CHANCE) return `${punct}~ ${randomEmoji()}`;
    return `${punct}~`;
  });

  // Sprinkle random ASCII emojis between words throughout the text
  const WORD_EMOJI_CHANCE = 0.05;
  t = t.replace(/ /g, (space) => {
    if (Math.random() < WORD_EMOJI_CHANCE) return ` ${randomEmoji()} `;
    return space;
  });

  // Always add an emoji at the end of non-trivial text
  if (t.trim().length > 20 && Math.random() < 0.3) {
    t = t + ' ' + randomEmoji();
  }

  return t;
}

// --- DOM traversal ---

function transformTextNodes(root, transformFn) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent) continue;

    if (transformFn === null) {
      // Restore original
      const original = parent.getAttribute(ORIGINAL_ATTR);
      if (original !== null) {
        node.textContent = original;
        parent.removeAttribute(ORIGINAL_ATTR);
      }
    } else {
      // Only save original once
      if (!parent.hasAttribute(ORIGINAL_ATTR)) {
        parent.setAttribute(ORIGINAL_ATTR, node.textContent);
      }
      node.textContent = transformFn(node.textContent);
    }
  }
}

// --- MutationObserver for dynamic content ---

let observer = null;

function startObserver() {
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (parent && !SKIP_TAGS.has(parent.tagName) && !parent.isContentEditable) {
            if (!parent.hasAttribute(ORIGINAL_ATTR)) {
              parent.setAttribute(ORIGINAL_ATTR, node.textContent);
            }
            node.textContent = hewwoify(node.textContent);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          transformTextNodes(node, hewwoify);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// --- Enable / Disable ---

function enable() {
  transformTextNodes(document.body, hewwoify);
  startObserver();
}

function disable() {
  stopObserver();
  transformTextNodes(document.body, null);
}

// --- Message listener from popup ---

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'enable') enable();
  if (message.action === 'disable') disable();
});

// --- Init: restore state from storage ---

chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) enable();
});
