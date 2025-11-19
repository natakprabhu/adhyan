"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  user_id: string;
  seat_id: string | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  seats?: { seat_number?: number | null };
  users?: { id?: string; name?: string; email?: string };
}

interface Seat {
  id: string;
  seat_number: number | null;
}

export const ReleaseSeat = () => {
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [oldEndDate, setOldEndDate] = useState("");
  const [newSeatStartDate, setNewSeatStartDate] = useState("");

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedNewSeatId, setSelectedNewSeatId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableBookings();
    fetchSeats();
  }, []);

  // -------------------------
  // FETCH BOOKINGS WITH JOIN
  // -------------------------
  const fetchAvailableBookings = async () => {
    try {
      setIsLoading(true);
      const nowISO = new Date().toISOString();

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          user_id,
          seat_id,
          membership_start_date,
          membership_end_date,
          seats ( seat_number ),
          users ( id, name, email )
        `)
        .eq("seat_category", "fixed")
        .gte("membership_end_date", nowISO)
        .order("membership_start_date", { ascending: true });

      if (error) throw error;
      setAvailableBookings(data || []);
    } catch (err) {
      console.error("❌ fetchAvailableBookings:", err);
      toast({
        title: "Error",
        description: "Failed to fetch bookings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // FETCH SEATS
  // -------------------------
  const fetchSeats = async () => {
    try {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number")
        .order("seat_number", { ascending: true });

      if (error) throw error;
      setSeats(data || []);
    } catch (err) {
      console.error("❌ fetchSeats:", err);
      toast({
        title: "Error",
        description: "Failed to fetch seat list.",
        variant: "destructive",
      });
    }
  };

  const handleSelectBooking = (id: string) => {
    const booking = availableBookings.find((b) => b.id === id) || null;
    setSelectedBooking(booking);

    setOldEndDate(
      booking?.membership_end_date
        ? booking.membership_end_date.slice(0, 10)
        : ""
    );
    setNewSeatStartDate("");
    setSelectedNewSeatId("");
  };

  const handleBack = () => {
    setSelectedBooking(null);
    setOldEndDate("");
    setNewSeatStartDate("");
    setSelectedNewSeatId("");
  };

  // -------------------------
  // MOVE USER & RELEASE OLD SEAT
  // -------------------------
  const moveAndRelease = async () => {
    if (!selectedBooking) return;

    if (!oldEndDate) {
      toast({ title: "Error", description: "Enter old seat end date.", variant: "destructive" });
      return;
    }
    if (!selectedNewSeatId) {
      toast({ title: "Error", description: "Select a new seat.", variant: "destructive" });
      return;
    }
    if (!newSeatStartDate) {
      toast({ title: "Error", description: "Enter new seat start date.", variant: "destructive" });
      return;
    }

    try {
      setIsLoading(true);

      const originalEnd = selectedBooking.membership_end_date;

      // Step 1: Update old booking
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          membership_end_date: oldEndDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (updateErr) throw updateErr;

      // Step 2: Create new booking for new seat
      const newSeat = seats.find((s) => s.id === selectedNewSeatId);


const { data: newBooking, error: newBookingErr } = await supabase
  .from("bookings")
  .insert({
    user_id: selectedBooking.user_id,
    seat_id: selectedNewSeatId,
    seat_category: "fixed",
    type: "fixed",

    membership_start_date: newSeatStartDate,
    membership_end_date: originalEnd,

    start_time: `${newSeatStartDate}T00:00:00`,  // 🔥 REQUIRED
    end_time: `${originalEnd}T23:59:59`,        // 🔥 REQUIRED

    status: "confirmed",
    payment_status: "paid",
    description: `Moved from booking ${selectedBooking.id}`,
    created_at: new Date().toISOString()
  })
  .select()
  .single();




      if (newBookingErr) throw newBookingErr;

      // Step 3: Zero-amount transactions
      await supabase.from("transactions").insert([
        {
          booking_id: selectedBooking.id,
          user_id: selectedBooking.user_id,
          amount: 0,
          status: "completed",
          admin_notes: `Old seat validity changed to ${oldEndDate}`,
        },
        {
          booking_id: newBooking.id,
          user_id: selectedBooking.user_id,
          amount: 0,
          status: "completed",
          admin_notes: `New seat assigned. Valid until ${originalEnd}`,
        },
      ]);

      toast({
        title: "Success",
        description: "User moved successfully.",
      });

      handleBack();
      fetchAvailableBookings();
    } catch (err) {
      console.error("❌ moveAndRelease:", err);
      toast({
        title: "Error",
        description: "Seat move failed.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="p-4 border rounded-md bg-white shadow-md max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-semibold">Release & Move Seat</h2>

      {!selectedBooking && (
        <div>
          <Label>Select Booking</Label>
          <select
            value={selectedBooking?.id || ""}
            onChange={(e) => handleSelectBooking(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a booking</option>

            {availableBookings
              .slice()
              .sort(
                (a, b) =>
                  (a.seats?.seat_number || 0) -
                  (b.seats?.seat_number || 0)
              )
              .map((b) => (
                <option key={b.id} value={b.id}>
                  Seat {b.seats?.seat_number} — {b.users?.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {selectedBooking && (
        <div className="border p-3 rounded bg-gray-50 space-y-3">
          <h4 className="font-semibold">Booking Details</h4>

          <p><strong>User:</strong> {selectedBooking.users?.name}</p>

          <p>
            <strong>Current Seat:</strong>{" "}
            {selectedBooking.seats?.seat_number}
          </p>

          <p>
            <strong>Original Validity:</strong>{" "}
            {selectedBooking.membership_start_date} →{" "}
            {selectedBooking.membership_end_date}
          </p>

          <Label>Old Seat New End Date</Label>
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={oldEndDate}
            min={selectedBooking.membership_start_date || undefined}
            onChange={(e) => setOldEndDate(e.target.value)}
          />

          <Label>Select New Seat</Label>
          <select
            value={selectedNewSeatId}
            onChange={(e) => setSelectedNewSeatId(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select new seat</option>
            {seats.map((s) => (
              <option key={s.id} value={s.id}>
                Seat {s.seat_number}
              </option>
            ))}
          </select>

          <Label>New Seat Start Date</Label>
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={newSeatStartDate}
            onChange={(e) => setNewSeatStartDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={handleBack}>Back</Button>
            <Button
              variant="destructive"
              onClick={moveAndRelease}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Release & Move"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
