"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Seat {
  id: string;
  seat_number: number;
}

interface Booking {
  id: string;
  seat_id: string | null;
  seat_category: string;
  status: string;
  payment_status: string;
}

export const SaveSeatStatusButton = () => {
  const [loading, setLoading] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: seatsData, error: seatsError } = await supabase
          .from("seats")
          .select("*")
          .order("seat_number", { ascending: true });
        if (seatsError) throw seatsError;
        setSeats(seatsData || []);

        const nowISO = new Date().toISOString();

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("payment_status", "paid")
          .eq("seat_category", "fixed")
          .gte("membership_end_date", nowISO);

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      } catch (err) {
        console.error("Error fetching seats/bookings:", err);
      }
    };

    fetchData();
  }, []);

  const saveSeatStatus = async () => {
    if (!seats.length) {
      toast({ title: "No seats found", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const rowsToUpsert = seats.map((seat) => {
        const booked = bookings.find(
          (b) => b.seat_id === seat.id && b.seat_category === "fixed"
        );
        return {
          seat_id: seat.id,
          seat_number: seat.seat_number,
          status: booked ? "booked" : "available",
        };
      });

      const { data, error } = await supabase
        .from("fixed_seats")
        .upsert(rowsToUpsert, { onConflict: ["seat_id"] });

      if (error) throw error;

      toast({
        title: "Seat Status Saved",
        description: "Fixed seat status has been updated successfully.",
      });
      console.log("Seat status saved:", data);
    } catch (err) {
      console.error("Error saving seat status:", err);
      toast({
        title: "Error",
        description: "Failed to save seat status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={saveSeatStatus} disabled={loading}>
      {loading ? "Saving..." : "Save Seat Status"}
    </Button>
  );
};
