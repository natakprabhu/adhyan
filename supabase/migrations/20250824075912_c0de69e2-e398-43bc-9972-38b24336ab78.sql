-- Add description column to bookings table for admin notes
ALTER TABLE public.bookings 
ADD COLUMN description TEXT;