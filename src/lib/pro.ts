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

export const trialQuery = queryOptions({
  queryKey: ["pro-trial"],
  queryFn: async (): Promise<{ used: boolean; endsAt: string | null; daysLeft: number }> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { used: false, endsAt: null, daysLeft: 0 };
    const { data } = await supabase.from("pro_trials").select("ends_at").eq("user_id", u.user.id).maybeSingle();
    if (!data) return { used: false, endsAt: null, daysLeft: 0 };
    const ms = new Date(data.ends_at).getTime() - Date.now();
    return { used: true, endsAt: data.ends_at, daysLeft: Math.max(0, Math.ceil(ms / 86400000)) };
  },
});

export const PRO_EMAIL = "hibou.aideauxdevoirs@gmail.com";
