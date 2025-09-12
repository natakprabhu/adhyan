-- Insert dummy seats data
-- 24hr seats (1-13)
INSERT INTO public.seats (id, seat_number, type) VALUES
  (gen_random_uuid(), 1, '24hr'),
  (gen_random_uuid(), 2, '24hr'),
  (gen_random_uuid(), 3, '24hr'),
  (gen_random_uuid(), 4, '24hr'),
  (gen_random_uuid(), 5, '24hr'),
  (gen_random_uuid(), 6, '24hr'),
  (gen_random_uuid(), 7, '24hr'),
  (gen_random_uuid(), 8, '24hr'),
  (gen_random_uuid(), 9, '24hr'),
  (gen_random_uuid(), 10, '24hr'),
  (gen_random_uuid(), 11, '24hr'),
  (gen_random_uuid(), 12, '24hr'),
  (gen_random_uuid(), 13, '24hr');

-- 12hr seats (14-50)
INSERT INTO public.seats (id, seat_number, type) VALUES
  (gen_random_uuid(), 14, '12hr'),
  (gen_random_uuid(), 15, '12hr'),
  (gen_random_uuid(), 16, '12hr'),
  (gen_random_uuid(), 17, '12hr'),
  (gen_random_uuid(), 18, '12hr'),
  (gen_random_uuid(), 19, '12hr'),
  (gen_random_uuid(), 20, '12hr'),
  (gen_random_uuid(), 21, '12hr'),
  (gen_random_uuid(), 22, '12hr'),
  (gen_random_uuid(), 23, '12hr'),
  (gen_random_uuid(), 24, '12hr'),
  (gen_random_uuid(), 25, '12hr'),
  (gen_random_uuid(), 26, '12hr'),
  (gen_random_uuid(), 27, '12hr'),
  (gen_random_uuid(), 28, '12hr'),
  (gen_random_uuid(), 29, '12hr'),
  (gen_random_uuid(), 30, '12hr'),
  (gen_random_uuid(), 31, '12hr'),
  (gen_random_uuid(), 32, '12hr'),
  (gen_random_uuid(), 33, '12hr'),
  (gen_random_uuid(), 34, '12hr'),
  (gen_random_uuid(), 35, '12hr'),
  (gen_random_uuid(), 36, '12hr'),
  (gen_random_uuid(), 37, '12hr'),
  (gen_random_uuid(), 38, '12hr'),
  (gen_random_uuid(), 39, '12hr'),
  (gen_random_uuid(), 40, '12hr'),
  (gen_random_uuid(), 41, '12hr'),
  (gen_random_uuid(), 42, '12hr'),
  (gen_random_uuid(), 43, '12hr'),
  (gen_random_uuid(), 44, '12hr'),
  (gen_random_uuid(), 45, '12hr'),
  (gen_random_uuid(), 46, '12hr'),
  (gen_random_uuid(), 47, '12hr'),
  (gen_random_uuid(), 48, '12hr'),
  (gen_random_uuid(), 49, '12hr'),
  (gen_random_uuid(), 50, '12hr');

-- Insert dummy user for testing
INSERT INTO public.users (id, auth_user_id, name, email, phone, telegram_id, approved) VALUES
  (gen_random_uuid(), gen_random_uuid(), 'John Doe', 'john@example.com', '+1234567890', '@johndoe', true),
  (gen_random_uuid(), gen_random_uuid(), 'Jane Smith', 'jane@example.com', '+0987654321', '@janesmith', true);

-- Create some dummy bookings for testing
WITH user_data AS (
  SELECT id, name FROM public.users LIMIT 1
),
seat_data AS (
  SELECT id, seat_number FROM public.seats WHERE seat_number IN (1, 15, 25) LIMIT 3
)
INSERT INTO public.bookings (user_id, seat_id, type, slot, start_time, end_time, status, payment_status) 
SELECT 
  u.id,
  s.id,
  CASE WHEN s.seat_number <= 13 THEN '24hr' ELSE '12hr' END,
  CASE WHEN s.seat_number <= 13 THEN 'full' ELSE 'day' END,
  now(),
  now() + interval '1 month',
  'confirmed',
  'paid'
FROM user_data u, seat_data s;

-- Create some waitlist entries
WITH user_data AS (
  SELECT id FROM public.users LIMIT 1
),
seat_data AS (
  SELECT id FROM public.seats WHERE seat_number = 2 LIMIT 1
)
INSERT INTO public.waitlist (user_id, seat_id, slot)
SELECT u.id, s.id, 'full'
FROM user_data u, seat_data s;