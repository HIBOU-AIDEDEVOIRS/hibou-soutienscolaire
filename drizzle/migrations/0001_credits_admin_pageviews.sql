CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-grant admin to the site owner
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 's.boucher32@ejm.org' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_owner_admin AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
INSERT INTO public.user_roles(user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE lower(email) = 's.boucher32@ejm.org' ON CONFLICT DO NOTHING;

-- Daily credits
CREATE TABLE public.credit_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  used numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.credit_usage TO authenticated;
GRANT ALL ON public.credit_usage TO service_role;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits read" ON public.credit_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.paris_today() RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Europe/Paris')::date
$$;

CREATE OR REPLACE FUNCTION public.my_credits()
RETURNS TABLE(used numeric, total numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(c.used, 0), 10 + COALESCE(c.bonus, 0)
  FROM (SELECT 1) x LEFT JOIN public.credit_usage c ON c.user_id = auth.uid() AND c.day = public.paris_today()
$$;

CREATE OR REPLACE FUNCTION public.consume_credits(_cost numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL OR _cost NOT IN (0.25, 1) THEN RETURN false; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (uid, public.paris_today()) ON CONFLICT DO NOTHING;
  UPDATE public.credit_usage SET used = used + _cost
    WHERE user_id = uid AND day = public.paris_today() AND used + _cost <= 10 + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, name text, grade text, used numeric, bonus numeric, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, trim(p.first_name || ' ' || p.last_name), p.grade,
    COALESCE(c.used, 0), COALESCE(c.bonus, 0), p.created_at
  FROM public.profiles p LEFT JOIN public.credit_usage c ON c.user_id = p.id AND c.day = public.paris_today()
  ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_credits(_user uuid, _bonus numeric, _reset boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (_user, public.paris_today()) ON CONFLICT DO NOTHING;
  UPDATE public.credit_usage SET bonus = GREATEST(_bonus, -10), used = CASE WHEN _reset THEN 0 ELSE used END
    WHERE user_id = _user AND day = public.paris_today();
END $$;

-- Page views
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone logs views" ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (length(path) <= 200 AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "admin reads views" ON public.page_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));