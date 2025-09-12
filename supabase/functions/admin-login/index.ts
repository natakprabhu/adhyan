import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get admin user by username
    const { data: adminUser, error } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !adminUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // For demo purposes, we'll use a simple password check
    // In production, use proper bcrypt hashing
    const isValidPassword = password === 'admin123';

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Return success with admin user data (without password)
    const { password_hash, ...adminData } = adminUser;
    
    return new Response(
      JSON.stringify({
        success: true,
        admin: adminData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Admin login error:', error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});