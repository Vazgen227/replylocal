import type { KnowledgeEntry } from "../lib/schemas";

// Bounded lexical retrieval: company-scoped input only. No external crawling or arbitrary URLs.
// Light stemming handles Russian/Ukrainian word endings ("масла" → "масло"), and a
// small synonym table covers how customers name common car-service jobs.
const synonymGroups = [
  ["масло", "масла", "мастило", "олива", "оливи", "oil", "техобслуживание", "техобслуговування", "фильтр", "фільтр", "filter"],
  ["развал", "схождение", "сход", "розвал", "сходження", "alignment"],
  ["шиномонтаж", "шины", "шина", "резина", "колеса", "колесо", "шини", "гума", "балансировка", "балансування", "tyre", "tire", "tyres", "tires"],
  ["тормоз", "тормоза", "колодки", "гальма", "гальмівні", "колодок", "brake", "brakes"],
  ["ходовая", "подвеска", "ходова", "підвіска", "амортизатор", "амортизатори", "стойки", "suspension"],
  ["кондиционер", "кондиціонер", "фреон", "кондей", "aircon"],
  ["диагностика", "діагностика", "ошибка", "ошибки", "помилка", "помилки", "чек", "check", "сканер", "diagnostics", "diagnostic"],
  ["электрика", "електрика", "аккумулятор", "акумулятор", "генератор", "стартер", "проводка", "electrics", "battery"],
  ["двигатель", "мотор", "двигун", "engine"],
  ["грм", "ремень", "ремінь", "цепь", "ланцюг", "timing"],
  ["антифриз", "охлаждающей", "охолоджувальної", "тосол", "coolant"],
];
const normalize = (s: string) => s.toLocaleLowerCase().replace(/ё/g, "е");
export function stem(word: string) {
  const w = normalize(word);
  if (!/[а-яіїєґ]/.test(w)) return w.length > 4 ? w.replace(/(es|s)$/, "") : w;
  if (w.length >= 7) return w.slice(0, -2);
  if (w.length >= 5) return w.slice(0, -1);
  return w;
}
const words = (s: string) => normalize(s).match(/[\p{L}\p{N}]{3,}/gu) ?? [];
const synonymIndex = new Map<string, string[]>();
for (const group of synonymGroups) {
  const stems = [...new Set(group.map(stem))];
  for (const s of stems) synonymIndex.set(s, stems);
}
function expand(term: string) {
  const s = stem(term);
  return synonymIndex.get(s) ?? [s];
}
export function retrieveKnowledge(
  entries: KnowledgeEntry[],
  question: string,
): KnowledgeEntry[] {
  const terms = [...new Set(words(question))].slice(-100);
  const variants = terms.map(expand);
  const ranked = entries.map((e) => {
    const text = normalize(e.title + " " + e.content + " " + e.sku);
    const docStems = new Set(words(text).map(stem));
    const score = variants.reduce(
      (n, options) =>
        n +
        (options.some((s) => docStems.has(s) || (s.length >= 4 && text.includes(s)))
          ? 1
          : 0),
      0,
    );
    return { e, score };
  });
  const rules = ranked
    .filter((x) => x.e.kind === "rule")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const facts = ranked
    .filter((x) => x.e.kind !== "rule" && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  let remaining = 24000;
  return [...rules, ...facts].flatMap(({ e }) => {
    if (remaining < 300) return [];
    const content = e.content.slice(0, Math.min(4000, remaining));
    remaining -= content.length + e.title.length + 100;
    return [{ ...e, content }];
  });
}
