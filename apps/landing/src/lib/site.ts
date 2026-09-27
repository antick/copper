export const site = {
  name: "Copper",
  url: "https://copper.potion.sh",
  title: "Copper — Notes, tasks, and projects. Yours.",
  description:
    "A calm desktop workspace for your notes, tasks, and projects. Plain Markdown files, stored on your computer. No account. No cloud required.",
  repository: "https://github.com/antick/copper",
  releases: "https://github.com/antick/copper/releases",
  install: "https://github.com/antick/copper/blob/main/docs/INSTALL.md",
  setup: "https://github.com/antick/copper#run-locally",
  potion: "https://potion.sh",
  license: "https://github.com/antick/copper/blob/main/LICENSE",
};

export const navigation = [
  { label: "Notes", href: "#workspace" },
  { label: "Tasks", href: "#tasks" },
  { label: "Your files", href: "#your-files" },
  { label: "Questions", href: "#questions" },
];

export const features = [
  {
    number: "01",
    title: "Follow the thought.",
    description:
      "Write in Markdown, link one note to another, and find your way back with backlinks. Give your ideas room to connect.",
    label: "Notes & connections",
  },
  {
    number: "02",
    title: "Find your next step.",
    description:
      "Bring projects and issues into the same workspace. Move between a list and a board, without moving away from your thinking.",
    label: "Projects & tasks",
  },
  {
    number: "03",
    title: "Make yourself at home.",
    description:
      "Choose a palette that feels right. Settle into a quiet writing space, with quick search and the details close at hand.",
    label: "A workspace that fits",
  },
];

export const questions = [
  {
    question: "What is Copper?",
    answer:
      "Copper is a desktop workspace for Markdown notes, tasks, and projects. It brings writing, linked notes, search, properties, and task boards together around a folder on your computer.",
  },
  {
    question: "Do I need an account or an internet connection?",
    answer:
      "No account is needed. Your notes, search, and tasks work locally. Optional actions such as checking for updates, opening external links, or using a Git remote need a connection.",
  },
  {
    question: "Can I bring my existing Markdown files?",
    answer:
      "Yes. Open a folder of Markdown files as a Vault. Your files stay in that folder, so you can keep using other editors. Copper keeps its search index separately in app data.",
  },
  {
    question: "Where do my tasks live?",
    answer:
      "Projects and issues are Markdown files too, stored in your Vault’s Tasks folder. Their properties live in YAML frontmatter, a small block of readable fields at the top of each file.",
  },
  {
    question: "Which computers does Copper support?",
    answer:
      "Download Copper for Apple Silicon or Intel Macs, Windows x64, and Linux x64 or ARM64. This early release has no paid publisher certificates: macOS is ad-hoc signed, not notarized, and Windows may show a warning. Follow the installation guide. Updates are manual; the source is also available under AGPL-3.0.",
  },
];
