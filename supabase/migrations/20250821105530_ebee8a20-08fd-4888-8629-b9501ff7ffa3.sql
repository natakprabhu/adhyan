-- Create function to timeout pending bookings after 30 minutes
CREATE OR REPLACE FUNCTION public.timeout_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update bookings that have been pending for more than 30 minutes
    UPDATE public.bookings 
    SET 
        status = 'timeout',
        payment_status = 'timeout',
        updated_at = now()
    WHERE 
        status = 'pending' 
        AND payment_status = 'pending'
        AND created_at < now() - interval '30 minutes';
        
    -- Log the number of bookings timed out
    RAISE NOTICE 'Timed out % bookings', (SELECT count(*) FROM public.bookings WHERE status = 'timeout' AND updated_at > now() - interval '1 minute');
END;
$$;

-- Create a function that can be called via cron to cleanup expired bookings
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the timeout function
    PERFORM public.timeout_pending_bookings();
END;
$$;