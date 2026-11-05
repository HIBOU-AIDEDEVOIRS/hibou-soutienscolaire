CREATE OR REPLACE FUNCTION public.consume_credits(_cost numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL OR _cost NOT IN (0.5, 1) THEN RETURN false; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (uid, public.paris_today()) ON CONFLICT DO NOTHING;
  UPDATE public.credit_usage SET used = used + _cost,
      voice_pending = CASE WHEN _cost = 0.5 THEN voice_pending + 1 ELSE voice_pending END
    WHERE user_id = uid AND day = public.paris_today() AND used + _cost <= 10 + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

-- Charges a user message: text (1, or 0 if paid by a voice note) + images (0.5 small / 0.75 large each).
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
    WHERE user_id = uid AND day = public.paris_today() AND used + cost <= 10 + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;