import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "size-6 [&_*]:text-[10px]",
  sm: "size-8 [&_*]:text-xs",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
} as const;

const fallbackClasses = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
} as const;

/**
 * Einheitlicher Avatar. Vorher kursierten size-7, size-8, size-9, size-14,
 * size-16 und `size="lg" className="size-14"` nebeneinander.
 */
export default function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className,
}: {
  username: string | null | undefined;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const initial = username?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <Avatar
      className={cn("shrink-0", sizeClasses[size], className)}
      aria-hidden={username ? undefined : true}
    >
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className={fallbackClasses[size]}>{initial}</AvatarFallback>
    </Avatar>
  );
}
