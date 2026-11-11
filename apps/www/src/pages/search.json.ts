import type { APIRoute } from "astro";
import { getCollection, render } from "astro:content";
import { docsNav } from "../nav";
import type { SearchRecord } from "../search";

/** MDX source to the words a reader sees. Drops imports, components, code and markup. */
function toPlainText(mdx: string) {
  const prose = mdx
    .replace(/^import .*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{`[\s\S]*?`\}/g, "")
    .replace(/^\|?[\s|:-]+\|?$/gm, "")
    .replace(/\\\|/g, "\u0000")
    .replace(/\|/g, " ")
    .replace(/\u0000/g, "|")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Inline code is kept as written (it can hold `<a>`); markup outside it is dropped.
  return prose
    .split(/(`[^`\n]+`)/)
    .map((s, i) => (i % 2 ? s.slice(1, -1) : s.replace(/<\/?[A-Za-z][^>]*>/g, "").replace(/[*_]/g, "")))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const groupOf = new Map(docsNav.flatMap((s) => s.items.map((i) => [i.href, s.title] as const)));
const order = docsNav.flatMap((s) => s.items.map((i) => i.href));

export const GET: APIRoute = async () => {
  const entries = await getCollection("docs");
  const records: SearchRecord[] = [];

  for (const entry of entries) {
    const href = entry.id === "index" ? "/docs" : `/docs/${entry.id}`;
    const { headings } = await render(entry);
    // Split the source at ## and ### so each heading carries its own text.
    const chunks = (entry.body ?? "").split(/^#{2,3} .*$/m);
    const linked = headings.filter((h) => h.depth === 2 || h.depth === 3);

    records.push({
      href,
      title: entry.data.title,
      parent: groupOf.get(href) ?? "Docs",
      text: `${entry.data.description} ${toPlainText(chunks[0] ?? "")}`.trim(),
      kind: "page",
    });
    linked.forEach((h, i) => {
      records.push({
        href: `${href}#${h.slug}`,
        title: h.text,
        parent: entry.data.title,
        text: toPlainText(chunks[i + 1] ?? ""),
        kind: "section",
      });
    });
  }

  // Pages in nav order, each followed by its headings.
  const rank = (r: SearchRecord) => {
    const i = order.indexOf(r.href.split("#")[0]!);
    return i === -1 ? order.length : i;
  };
  const sorted = records
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .map(({ r }) => r);

  return new Response(JSON.stringify(sorted), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
