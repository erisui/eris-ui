/** One searchable thing in /search.json: a whole docs page, or one heading on a page. */
export interface SearchRecord {
  href: string;
  title: string;
  /** The page title for a heading, the nav section for a page. */
  parent: string;
  text: string;
  kind: "page" | "section";
}
