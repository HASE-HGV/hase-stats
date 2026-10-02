import {
  CheckCircle2Icon,
  CircleDashedIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GoodDeedStatus } from "@/lib/types";

/**
 * Semantische Status-Anzeige. Vorher nutzte die Liste nur
 * `default`/`secondary`, wodurch "wartet", "bestätigt" und "abgelehnt"
 * visuell kaum unterscheidbar waren.
 */
const config: Record<
  GoodDeedStatus,
  { label: string; icon: typeof CheckCircle2Icon; className: string }
> = {
  approved: {
    label: "Bestätigt",
    icon: CheckCircle2Icon,
    className:
      "bg-success/15 text-success ring-1 ring-inset ring-success/25",
  },
  rejected: {
    label: "Abgelehnt",
    icon: XCircleIcon,
    className:
      "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/25",
  },
  pending: {
    label: "Wartet",
    icon: CircleDashedIcon,
    className:
      "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
  },
};

export default function StatusBadge({
  status,
  className,
}: {
  status: GoodDeedStatus;
  className?: string;
}) {
  const { label, icon: Icon, className: variantClass } = config[status];

  return (
    <Badge className={cn("gap-1.5", variantClass, className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
