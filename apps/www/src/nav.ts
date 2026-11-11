export interface NavItem {
  href: string;
  label: string;
}

export const docsNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Getting started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/docs/theming", label: "Theming" },
    ],
  },
  {
    title: "Components",
    items: [
      { href: "/docs/components/button", label: "Button" },
      { href: "/docs/components/dialog", label: "Dialog" },
      { href: "/docs/components/tabs", label: "Tabs" },
    ],
  },
];
