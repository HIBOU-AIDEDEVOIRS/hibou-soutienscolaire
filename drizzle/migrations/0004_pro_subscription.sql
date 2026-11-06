CREATE TABLE public.pro_subscriptions (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);
GRANT SELECT ON public.pro_subscriptions TO authenticated;
GRANT ALL ON public.pro_subscriptions TO service_role;
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro read" ON public.pro_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_pro(_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pro_subscriptions WHERE user_id = _user AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.daily_base(_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_pro(_user) THEN 30 ELSE 10 END::numeric
$$;

CREATE OR REPLACE FUNCTION public.request_pro() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.pro_subscriptions(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_pro(_user uuid, _active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _active THEN
    INSERT INTO public.pro_subscriptions(user_id, status, activated_at) VALUES (_user, 'active', now())
      ON CONFLICT (user_id) DO UPDATE SET status = 'active', activated_at = now();
  ELSE
    DELETE FROM public.pro_subscriptions WHERE user_id = _user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users2()
RETURNS TABLE(id uuid, email text, name text, grade text, used numeric, bonus numeric, created_at timestamptz, pro text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, trim(p.first_name || ' ' || p.last_name), p.grade,
    COALESCE(c.used, 0), COALESCE(c.bonus, 0), p.created_at, COALESCE(s.status, 'none')
  FROM public.profiles p
  LEFT JOIN public.credit_usage c ON c.user_id = p.id AND c.day = public.paris_today()
  LEFT JOIN public.pro_subscriptions s ON s.user_id = p.id
  ORDER BY (s.status = 'pending') DESC NULLS LAST, p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.my_credits()
RETURNS TABLE(used numeric, total numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(c.used, 0), public.daily_base(auth.uid()) + COALESCE(c.bonus, 0)
  FROM (SELECT 1) x LEFT JOIN public.credit_usage c ON c.user_id = auth.uid() AND c.day = public.paris_today()
$$;

CREATE OR REPLACE FUNCTION public.consume_credits(_cost numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL OR _cost NOT IN (0.5, 1) THEN RETURN false; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (uid, public.paris_today()) ON CONFLICT DO NOTHING;
  UPDATE public.credit_usage SET used = used + _cost,
      voice_pending = CASE WHEN _cost = 0.5 THEN voice_pending + 1 ELSE voice_pending END
    WHERE user_id = uid AND day = public.paris_today() AND used + _cost <= public.daily_base(uid) + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.consume_message2(_voice boolean, _has_text boolean, _small_images int, _large_images int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean; cost numeric := 0; use_voice boolean := false;
BEGIN
  IF uid IS NULL OR _small_images < 0 OR _large_images < 0 OR _small_images + _large_images > 4 THEN RETURN false; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (uid, public.paris_today()) ON CONFLICT DO NOTHING;
  IF _voice THEN
    SELECT voice_pending > 0 INTO use_voice FROM public.credit_usage WHERE user_id = uid AND day = public.paris_today();
  END IF;
  IF _has_text AND NOT COALESCE(use_voice, false) THEN cost := cost + 1; END IF;
  cost := cost + 0.5 * _small_images + 0.75 * _large_images;
  IF cost = 0 AND NOT COALESCE(use_voice, false) THEN cost := 1; END IF;
  UPDATE public.credit_usage SET used = used + cost,
      voice_pending = CASE WHEN COALESCE(use_voice, false) THEN voice_pending - 1 ELSE voice_pending END
    WHERE user_id = uid AND day = public.paris_today() AND used + cost <= public.daily_base(uid) + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;