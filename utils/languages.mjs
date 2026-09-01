const explicitSeparator = /[,.;|/\n\r\u2022\u00b7]+/;

export function parseLanguageList(value) {
  if (value == null) return [];

  if (Array.isArray(value)) return cleanLanguages(value);
  if (typeof value === "object") return cleanLanguages(Object.values(value));

  const text = String(value).trim();
  if (!text) return [];

  if (explicitSeparator.test(text)) {
    return cleanLanguages(text.split(explicitSeparator));
  }

  const languages = [];
  const tokenPattern = /"([^"]+)"|'([^']+)'|(\S+)/g;
  for (const match of text.matchAll(tokenPattern)) {
    languages.push(match[1] ?? match[2] ?? match[3]);
  }
  return cleanLanguages(languages);
}

function cleanLanguages(languages) {
  const seen = new Set();
  const result = [];

  for (const value of languages) {
    const language = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!language) continue;

    const key = language.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(language);
  }

  return result;
}
