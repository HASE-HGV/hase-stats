"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function ConfirmButton({
  deedId,
  userId,
}: {
  deedId: string;
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("good_deed_confirmations").insert({
      deed_id: deedId,
      confirmed_by: userId,
    });
    setLoading(false);
    if (error) {
      toast.error("Konnte nicht bestätigt werden", { description: error.message });
      return;
    }
    toast.success("Bestätigt", {
      description: "Eine weitere Bestätigung wird noch gebraucht.",
    });
    router.refresh();
  }

  return (
    <Button onClick={onConfirm} disabled={loading} className="w-full sm:w-auto">
      {loading ? <Spinner /> : <CheckIcon />}
      {loading ? "Bestätige…" : "Bestätigen"}
    </Button>
  );
}
