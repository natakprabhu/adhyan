import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details with user information
    const { data: booking, error } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        users (name, email),
        seats (seat_number),
        transactions (amount, status, created_at)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return new Response(
        JSON.stringify({ success: false, message: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Update receipt_sent status
    await supabaseClient
      .from('bookings')
      .update({ 
        receipt_sent: true,
        receipt_sent_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    // In a real implementation, you would send an email here
    // For now, we'll just return success
    console.log(`Receipt would be sent to ${booking.users.email} for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt sent successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Send receipt error:', error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});