ALTER TABLE public.credit_usage ADD COLUMN voice_pending integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_credits(_cost numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL OR _cost NOT IN (0.25, 1) THEN RETURN false; END IF;
  INSERT INTO public.credit_usage(user_id, day) VALUES (uid, public.paris_today()) ON CONFLICT DO NOTHING;
  UPDATE public.credit_usage SET used = used + _cost,
      voice_pending = CASE WHEN _cost = 0.25 THEN voice_pending + 1 ELSE voice_pending END
    WHERE user_id = uid AND day = public.paris_today() AND used + _cost <= 10 + bonus
    RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

-- A message sent right after a voice note was already paid (0.25) by the transcription.
CREATE OR REPLACE FUNCTION public.consume_message(_voice boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF _voice THEN
    UPDATE public.credit_usage SET voice_pending = voice_pending - 1
      WHERE user_id = uid AND day = public.paris_today() AND voice_pending > 0
      RETURNING true INTO ok;
    IF ok THEN RETURN true; END IF;
  END IF;
  RETURN public.consume_credits(1);
END $$;