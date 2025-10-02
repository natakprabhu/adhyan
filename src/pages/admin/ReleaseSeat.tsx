"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  user_id?: string;
  seats?: { seat_number?: number };
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  users?: { id?: string; name?: string; email?: string };
}

export const ReleaseSeat = () => {
  const [availableSeats, setAvailableSeats] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch active bookings on mount
  useEffect(() => {
    fetchAvailableSeats();
  }, []);

  const fetchAvailableSeats = async () => {
    try {
      setIsLoading(true);
      const nowISO = new Date().toISOString();

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, seats(seat_number), membership_start_date, membership_end_date, users(id, name, email)"
        )
        .eq("seat_category", "fixed")
        .gte("membership_end_date", nowISO)
        .order("membership_start_date", { ascending: true });

      if (error) throw error;
      setAvailableSeats(data || []);
    } catch (err) {
      console.error("❌ fetchAvailableSeats error:", err);
      toast({
        title: "Error",
        description: "Failed to fetch booked seats.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const releaseSeat = async () => {
    if (!selectedBooking) {
      toast({
        title: "Error",
        description: "Select a seat to delete.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // 1️⃣ Delete all transactions related to this booking
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("booking_id", selectedBooking.id);

      if (transactionsError) throw transactionsError;

      // 2️⃣ Delete the booking itself
      const { error: bookingError } = await supabase
        .from("bookings")
        .delete()
        .eq("id", selectedBooking.id);

      if (bookingError) throw bookingError;

      toast({
        title: "Success",
        description: `Seat ${selectedBooking.seats?.seat_number} and related transactions deleted.`,
      });

      setSelectedBooking(null);
      fetchAvailableSeats();
    } catch (err) {
      console.error("❌ releaseSeat error:", err);
      toast({
        title: "Error",
        description: "Failed to delete seat and transactions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedBooking(null);
  };

  return (
    <div className="p-4 border rounded-md bg-white shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold">Delete Seat</h2>

      {!selectedBooking && (
        <div>
          <Label>Select Seat to Delete</Label>
          <select
            value={selectedBooking?.id || ""}
            onChange={(e) => {
              const booking =
                availableSeats.find((b) => b.id === e.target.value) || null;
              setSelectedBooking(booking);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a seat</option>
            {availableSeats.map((b) => (
              <option key={b.id} value={b.id}>
                Seat {b.seats?.seat_number} (Booked by {b.users?.name})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedBooking && (
        <div className="border p-3 rounded bg-gray-50 space-y-2">
          <h4 className="font-semibold mb-2">Booking Details</h4>
          <p>
            <strong>User:</strong> {selectedBooking.users?.name} (
            {selectedBooking.users?.email})
          </p>
          <p>
            <strong>Seat:</strong> {selectedBooking.seats?.seat_number}
          </p>
          <p>
            <strong>Validity:</strong>{" "}
            {selectedBooking.membership_start_date?.slice(0, 10)} to{" "}
            {selectedBooking.membership_end_date?.slice(0, 10)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Confirm before deleting this seat and all related transactions.
          </p>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={releaseSeat}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete Seat"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
