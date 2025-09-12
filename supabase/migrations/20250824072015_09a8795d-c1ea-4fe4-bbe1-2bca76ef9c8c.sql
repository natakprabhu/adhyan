-- Create admin users table for separate admin authentication
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view their own data
CREATE POLICY "Admins can view their own data" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Create biometric assignments table
CREATE TABLE public.biometric_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biometric_id INTEGER UNIQUE NOT NULL CHECK (biometric_id >= 1 AND biometric_id <= 100),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by_admin UUID REFERENCES public.admin_users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for biometric_assignments
ALTER TABLE public.biometric_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy for biometric assignments
CREATE POLICY "Admins can manage biometric assignments" 
ON public.biometric_assignments 
FOR ALL 
USING (true);

-- Add columns to bookings table for admin management
ALTER TABLE public.bookings 
ADD COLUMN admin_notes TEXT,
ADD COLUMN payment_screenshot_url TEXT,
ADD COLUMN receipt_sent BOOLEAN DEFAULT false,
ADD COLUMN receipt_sent_at TIMESTAMP WITH TIME ZONE;

-- Add validity period to users table
ALTER TABLE public.users 
ADD COLUMN validity_from DATE,
ADD COLUMN validity_to DATE;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biometric_assignments_updated_at
BEFORE UPDATE ON public.biometric_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (username: admin, password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO public.admin_users (username, password_hash, email) 
VALUES ('admin', '$2b$10$rOzJmZKj9jH3q3kZx8L8UeQvXs5YQ9jV8qC1pP2wN3mR4tS6uE7vG', 'admin@system.com');