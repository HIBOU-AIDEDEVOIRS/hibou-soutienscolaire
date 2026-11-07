ALTER TABLE public.pro_subscriptions ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'mensuel' CHECK (plan IN ('mensuel','annuel'));

CREATE OR REPLACE FUNCTION public.request_pro_plan(_plan text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _plan NOT IN ('mensuel','annuel') THEN RAISE EXCEPTION 'bad plan'; END IF;
  INSERT INTO public.pro_subscriptions(user_id, plan) VALUES (auth.uid(), _plan) ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.request_pro_plan(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users3()
RETURNS TABLE(id uuid, email text, name text, grade text, used numeric, bonus numeric, created_at timestamptz, pro text, plan text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, trim(p.first_name || ' ' || p.last_name), p.grade,
    COALESCE(c.used, 0), COALESCE(c.bonus, 0), p.created_at, COALESCE(s.status, 'none'), s.plan
  FROM public.profiles p
  LEFT JOIN public.credit_usage c ON c.user_id = p.id AND c.day = public.paris_today()
  LEFT JOIN public.pro_subscriptions s ON s.user_id = p.id
  ORDER BY (s.status = 'pending') DESC NULLS LAST, p.created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users3() TO authenticated;