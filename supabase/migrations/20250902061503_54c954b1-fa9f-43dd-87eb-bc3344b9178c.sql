-- Remove pending approval process - make users approved by default
ALTER TABLE public.users ALTER COLUMN approved SET DEFAULT true;

-- Update existing users to be approved by default
UPDATE public.users SET approved = true WHERE approved = false;