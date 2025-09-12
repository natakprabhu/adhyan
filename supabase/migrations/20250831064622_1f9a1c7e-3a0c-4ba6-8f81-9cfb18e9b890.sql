-- Update bookings table to support new membership model
ALTER TABLE public.bookings 
ADD COLUMN seat_category TEXT CHECK (seat_category IN ('fixed', 'floating')),
ADD COLUMN duration_months INTEGER DEFAULT 1 CHECK (duration_months >= 1 AND duration_months <= 12),
ADD COLUMN monthly_cost NUMERIC DEFAULT 0,
ADD COLUMN membership_start_date DATE,
ADD COLUMN membership_end_date DATE;

-- Update existing bookings to have default values
UPDATE public.bookings 
SET seat_category = 'fixed', 
    duration_months = 1, 
    monthly_cost = 3300,
    membership_start_date = CURRENT_DATE,
    membership_end_date = CURRENT_DATE + INTERVAL '1 month'
WHERE seat_category IS NULL;

-- Make seat_category not null after setting defaults
ALTER TABLE public.bookings 
ALTER COLUMN seat_category SET NOT NULL;

-- Add constraint to ensure floating seats don't have specific seat assignments
ALTER TABLE public.bookings 
ADD CONSTRAINT check_floating_seat_logic 
CHECK (
  (seat_category = 'floating') OR 
  (seat_category = 'fixed' AND seat_id IS NOT NULL)
);

-- Update transactions table to include admin screenshot
ALTER TABLE public.transactions 
ADD COLUMN admin_screenshot_url TEXT,
ADD COLUMN approved_by_admin UUID REFERENCES admin_users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Create rules table for managing membership rules
CREATE TABLE public.membership_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rule_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on membership_rules
ALTER TABLE public.membership_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing rules
CREATE POLICY "Anyone can view active rules" 
ON public.membership_rules 
FOR SELECT 
USING (is_active = true);

-- Create policy for admin to manage rules
CREATE POLICY "Admins can manage rules" 
ON public.membership_rules 
FOR ALL 
USING (true);

-- Insert default rules
INSERT INTO public.membership_rules (title, content, rule_order) VALUES
('Fixed Seat Membership', 'Fixed seat membership provides you with a dedicated seat number, personal locker, and 24x7 access to the facility. Cost: ₹3,300 per month.', 1),
('Floating Seat Membership', 'Floating seat membership provides access to any available seat with 24x7 access to the facility. No personal locker included. Cost: ₹2,200 per month.', 2),
('Booking Duration', 'You can book your membership for a duration of 1 to 12 months. Payment must be made in advance for the entire duration.', 3),
('Seat Availability', 'For fixed seats, if your preferred seat is occupied, you will be shown the next available time slot. For floating seats, any available seat will be assigned on arrival.', 4),
('Access Hours', 'Both fixed and floating memberships provide 24x7 access to the study facility throughout your membership period.', 5),
('Membership Renewal', 'Please renew your membership before expiry to avoid interruption in service. Contact admin for renewal assistance.', 6);

-- Add trigger for updating updated_at on membership_rules
CREATE TRIGGER update_membership_rules_updated_at
BEFORE UPDATE ON public.membership_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check seat availability for fixed seats
CREATE OR REPLACE FUNCTION public.check_seat_availability(
  seat_number_param INTEGER,
  start_date_param DATE,
  end_date_param DATE
) RETURNS TABLE (
  is_available BOOLEAN,
  next_available_date DATE,
  conflicting_booking_end DATE
) LANGUAGE plpgsql AS $$
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