import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DAILY_CREDITS = 10;
export const TEXT_COST = 1;
export const VOICE_COST = 0.25;

export const creditsQuery = queryOptions({
  queryKey: ["credits"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("my_credits");
    if (error) throw error;
    const row = data?.[0];
    return { used: Number(row?.used ?? 0), total: Number(row?.total ?? DAILY_CREDITS) };
  },
});

export function formatCredits(n: number) {
  return Math.max(0, n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
