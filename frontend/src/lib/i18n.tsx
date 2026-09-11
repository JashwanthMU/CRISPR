import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { phraseTranslations, translations } from './translations';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ta', name: 'தமிழ்' },
] as const;
export type Language = typeof LANGUAGES[number]['code'];
export const LANGUAGE_STORAGE_KEY = 'crispr.language';
const TRANSLATION_CACHE_KEY = 'crispr.translation-cache.v1';
type TranslationCache = Record<string, string>;
const machineCache: TranslationCache = (() => {
  try { return JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) ?? '{}'); }
  catch { return {}; }
})();
function cacheKey(language: Language, text: string) { return `${language}:${text}`; }
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some(({ code }) => code === value);
export function translate(language: Language, text: string): string {
  if (language === 'en') return text;
  const cached = machineCache[cacheKey(language, text)];
  if (cached) return cached;
  const exact = translations[text]?.[language];
  if (exact) return exact;
  let result = text;
  for (const [source, localized] of phraseTranslations) {
    const replacement = localized[language];
    if (!replacement || !result.toLocaleLowerCase('en').includes(source.toLocaleLowerCase('en'))) continue;
    result = result.replace(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
  }
  return result;
}

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder'] as const;
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function hasEnglishWords(value: string) {
  return /[A-Za-z]{2,}/.test(value) && !/^\s*(https?:|[A-Z]{2,}[-_0-9]*$)/.test(value.trim());
}

function localizeTree(root: Node, language: Language) {
  const nodes: Node[] = [root];
  while (nodes.length) {
    const node = nodes.pop()!;
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const current = textNode.data;
      const source = originalText.get(textNode) ?? current;
      if (!originalText.has(textNode) && hasEnglishWords(source)) originalText.set(textNode, source);
      const original = originalText.get(textNode);
      if (original) textNode.data = translate(language, original);
      continue;
    }
    if (!(node instanceof Element) && node !== document) continue;
    const element = node instanceof Element ? node : null;
    if (element?.matches('script, style, code, pre, [data-no-translate]')) continue;
    if (element) {
      let originals = originalAttributes.get(element);
      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        if (!originals && hasEnglishWords(current)) {
          originals = new Map();
          originalAttributes.set(element, originals);
        }
        if (originals && !originals.has(attribute) && hasEnglishWords(current)) originals.set(attribute, current);
        const original = originals?.get(attribute);
        if (original) element.setAttribute(attribute, translate(language, original));
      }
    }
    Array.from(node.childNodes).reverse().forEach(child => nodes.push(child));
  }
}

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isLanguage(saved) ? saved : 'en';
    } catch { return 'en'; }
  });
  const setLanguage = (next: Language) => {
    if (!isLanguage(next)) return;
    updateLanguage(next);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Session-only when storage is blocked. */ }
  };
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    localizeTree(document.body, language);
    const observer = new MutationObserver(records => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === 'characterData') {
          const textNode = record.target as Text;
          const previousSource = originalText.get(textNode);
          // React reuses text nodes when async data replaces a loading label.
          // Treat text that differs from our last translation as new source
          // content, otherwise the observer would restore stale text such as
          // "Unavailable" over a value that has just arrived from the API.
          if (previousSource && textNode.data !== translate(language, previousSource)) {
            originalText.set(textNode, textNode.data);
          }
          localizeTree(textNode, language);
        }
        record.addedNodes.forEach(node => localizeTree(node, language));
        if (record.type === 'attributes') localizeTree(record.target, language);
      }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...TRANSLATABLE_ATTRIBUTES] });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...TRANSLATABLE_ATTRIBUTES] });
    return () => observer.disconnect();
  }, [language]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
        updateLanguage(isLanguage(event.newValue) ? event.newValue : 'en');
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <LanguageContext.Provider value={{ language, setLanguage, t: (text) => translate(language, text) }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage requires LanguageProvider');
  return context;
}
