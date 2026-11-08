import type { KnowledgeEntry } from "../lib/schemas";
// Bounded lexical retrieval: company-scoped input only. No external crawling or arbitrary URLs.
export function retrieveKnowledge(
  entries: KnowledgeEntry[],
  question: string,
): KnowledgeEntry[] {
  const terms = [
    ...new Set(question.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []),
  ].slice(-100);
  const ranked = entries.map((e) => ({
    e,
    score: terms.reduce(
      (n, t) =>
        n +
        ((e.title + " " + e.content + " " + e.sku)
          .toLocaleLowerCase()
          .includes(t)
          ? 1
          : 0),
      0,
    ),
  }));
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
