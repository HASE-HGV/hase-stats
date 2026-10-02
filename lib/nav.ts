import {
  ClipboardCheckIcon,
  ListChecksIcon,
  MessageSquareQuoteIcon,
  ShieldAlertIcon,
  SparklesIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Short label for the mobile tab bar, where horizontal space is tight. */
  shortLabel: string;
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    href: "/wall",
    label: "Wall of Shame",
    shortLabel: "Schande",
    icon: ShieldAlertIcon,
    description: "Wer gerade auf der Wall of Shame steht.",
  },
  {
    href: "/good-deeds",
    label: "Wall of Good Deeds",
    shortLabel: "Aufgaben",
    icon: ListChecksIcon,
    description: "Die verfügbaren Aufgaben, die als Good Deed gelten.",
  },
  {
    href: "/deeds",
    label: "Good Deed einreichen",
    shortLabel: "Einreichen",
    icon: SparklesIcon,
    description: "Mit Foto-Beweis einreichen und einen Eintrag auflösen.",
  },
  {
    href: "/confirm",
    label: "Bestätigen",
    shortLabel: "Bestätigen",
    icon: ClipboardCheckIcon,
    description: "Offene Good Deeds anderer Personen bestätigen.",
  },
  {
    href: "/quotes",
    label: "Zitate",
    shortLabel: "Zitate",
    icon: MessageSquareQuoteIcon,
    description: "Die besten Sprüche aus dem Büro.",
  },
  {
    href: "/profile",
    label: "Profil",
    shortLabel: "Profil",
    icon: UserIcon,
    description: "Nutzername und Profilbild pflegen.",
  },
];

/** Die fünf wichtigsten Routen für die mobile Tab-Leiste. */
export const mobileNavItems: NavItem[] = navItems.filter((i) =>
  ["/wall", "/deeds", "/confirm", "/quotes", "/profile"].includes(i.href),
);

export const appName = "HASE";
export const appTagline = "Wall of Shame";
