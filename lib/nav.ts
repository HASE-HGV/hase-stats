import {
  ChartColumnIcon,
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
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    href: "/wall",
    label: "Wall of Shame",
    icon: ShieldAlertIcon,
    description: "Wer gerade auf der Wall of Shame steht.",
  },
  {
    href: "/stats",
    label: "Stats",
    icon: ChartColumnIcon,
    description: "Wer wie lange im Hase-Raum oder im Home Office war.",
  },
  {
    href: "/good-deeds",
    label: "Wall of Good Deeds",
    icon: ListChecksIcon,
    description: "Die verfügbaren Aufgaben, die als Good Deed gelten.",
  },
  {
    href: "/deeds",
    label: "Good Deed einreichen",
    icon: SparklesIcon,
    description: "Mit Foto-Beweis einreichen und einen Eintrag auflösen.",
  },
  {
    href: "/confirm",
    label: "Bestätigen",
    icon: ClipboardCheckIcon,
    description: "Offene Good Deeds anderer Personen bestätigen.",
  },
  {
    href: "/quotes",
    label: "Zitate",
    icon: MessageSquareQuoteIcon,
    description: "Die besten Sprüche aus dem Büro.",
  },
  {
    href: "/profile",
    label: "Profil",
    icon: UserIcon,
    description: "Nutzername und Profilbild pflegen.",
  },
];

export const appName = "HASE Stats";
