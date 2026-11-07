import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PRO_DAILY_CREDITS = 30;
export const PRO_PRICE = "1 €";
export const PRO_YEARLY_PRICE = "10 €";
export type ProStatus = "none" | "pending" | "active";

export const proQuery = queryOptions({
  queryKey: ["pro"],
  queryFn: async (): Promise<ProStatus> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return "none";
    const { data } = await supabase.from("pro_subscriptions").select("status").eq("user_id", u.user.id).maybeSingle();
    return (data?.status as ProStatus) ?? "none";
  },
});
