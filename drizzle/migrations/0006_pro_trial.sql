CREATE TABLE public.pro_trials (
  user_id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL
);
GRANT SELECT ON public.pro_trials TO authenticated;
GRANT ALL ON public.pro_trials TO service_role;
ALTER TABLE public.pro_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trial read" ON public.pro_trials FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_pro(_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pro_subscriptions WHERE user_id = _user AND status = 'active')
      OR EXISTS (SELECT 1 FROM public.pro_trials WHERE user_id = _user AND ends_at > now())
$$;

CREATE OR REPLACE FUNCTION public.start_pro_trial() RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _end timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.pro_trials WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'trial already used';
  END IF;
  _end := now() + interval '7 days';
  INSERT INTO public.pro_trials(user_id, ends_at) VALUES (auth.uid(), _end);
  RETURN _end;
END $$;
REVOKE EXECUTE ON FUNCTION public.start_pro_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_pro_trial() TO authenticated;