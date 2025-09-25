import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { auth_user_id, new_password, admin_token } = req.body;

    if (admin_token !== 'admin-session-token') {
      return res.status(403).json({ message: 'Unauthorized: Invalid admin token' });
    }

    // Reset password using Supabase admin API
    const { error } = await supabase.auth.admin.updateUserById(auth_user_id, { password: new_password });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({ message: 'Password reset successfully', password: new_password });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
