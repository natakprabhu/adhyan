-- Fix the search path for the function to address security warning
DROP FUNCTION IF EXISTS public.check_seat_availability(INTEGER, DATE, DATE);

CREATE OR REPLACE FUNCTION public.check_seat_availability(
  seat_number_param INTEGER,
  start_date_param DATE,
  end_date_param DATE
) RETURNS TABLE (
  is_available BOOLEAN,
  next_available_date DATE,
  conflicting_booking_end DATE
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  conflict_end DATE;
BEGIN
  -- Check if there's any conflicting booking for the fixed seat
  SELECT b.membership_end_date INTO conflict_end
  FROM public.bookings b
  JOIN public.seats s ON b.seat_id = s.id
  WHERE s.seat_number = seat_number_param
    AND b.seat_category = 'fixed'
    AND b.status IN ('confirmed', 'pending')
    AND (
      (b.membership_start_date <= start_date_param AND b.membership_end_date >= start_date_param) OR
      (b.membership_start_date <= end_date_param AND b.membership_end_date >= end_date_param) OR
      (b.membership_start_date >= start_date_param AND b.membership_end_date <= end_date_param)
    )
  ORDER BY b.membership_end_date DESC
  LIMIT 1;

  IF conflict_end IS NOT NULL THEN
    RETURN QUERY SELECT false, (conflict_end + INTERVAL '1 day')::DATE, conflict_end;
  ELSE
    RETURN QUERY SELECT true, NULL::DATE, NULL::DATE;
  END IF;
END;
$$;