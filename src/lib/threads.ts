import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export const threadsQuery = queryOptions({
  queryKey: ["threads"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const messagesQuery = (threadId: string) =>
  queryOptions({
    queryKey: ["messages", threadId],
    staleTime: Infinity,
    queryFn: async (): Promise<UIMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sdk_id,role,parts")
        .eq("thread_id", threadId)
        .order("created_at");
      if (error) throw error;
      return data.map((m) => ({
        id: m.sdk_id ?? m.id,
        role: m.role as UIMessage["role"],
        parts: m.parts as unknown as UIMessage["parts"],
      }));
    },
  });

export async function createThread() {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("threads")
    .insert({ user_id: u.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
