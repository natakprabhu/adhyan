-- Fix database issues for floating/fixed seat bookings

-- Drop the type constraint on seats table as it's no longer needed
ALTER TABLE public.seats DROP CONSTRAINT IF EXISTS seats_type_check;

-- Remove type column from seats table since all seats can be both floating and fixed
ALTER TABLE public.seats DROP COLUMN IF EXISTS type;

-- Fix the bookings type constraint to allow new seat categories
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_type_check;

-- Add check constraint for new seat categories
ALTER TABLE public.bookings ADD CONSTRAINT bookings_seat_category_check 
CHECK (seat_category IN ('fixed', 'floating'));

-- Make seat_id nullable for floating seat bookings (they don't need a specific seat)
ALTER TABLE public.bookings ALTER COLUMN seat_id DROP NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_seat_category ON public.bookings(seat_category);
CREATE INDEX IF NOT EXISTS idx_bookings_membership_dates ON public.bookings(membership_start_date, membership_end_date);