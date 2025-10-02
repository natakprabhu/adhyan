import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

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

export const SeatLayout = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const leftRows = [
    [4, 3], [9, 8, 7], [16, 15, 14, 13],
    [23, 22, 21, 20], [30, 29, 28, 27],
    [37, 36, 35, 34], [44, 43, 42, 41]
  ];
  const rightRows = [
    [2, 1], [6, 5], [12, 11, 10], [19, 18, 17],
    [26, 25, 24], [33, 32, 31], [40, 39, 38],
    [47, 46, 45], [48, 49, 50]
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: seatsData, error: seatsError } = await supabase
          .from("seats")
          .select("*")
          .order("seat_number", { ascending: true });
        if (seatsError) throw seatsError;
        setSeats(seatsData || []);

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("payment_status", "paid");
        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      } catch (err) {
        console.error("Error fetching seats/bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getSeatStatus = (seat: Seat) => {
    const booked = bookings.find(
      (b) => b.seat_id === seat.id && b.seat_category === "fixed"
    );
    return booked ? "booked" : "available";
  };

const renderSeat = (seatNumber: number) => {
  const seat = seats.find((s) => s.seat_number === seatNumber);
  const status = seat?.status || "available";
  const bgClass = status === "booked" ? "bg-red-500" : "bg-green-500";

  return (
    <div
      key={seatNumber}
      className={`w-8 h-8 sm:w-10 sm:h-10 m-0.5 rounded flex items-center justify-center font-bold text-[10px] sm:text-xs text-white ${bgClass}`}
    >
      {seatNumber}
    </div>
  );
};


  const EntryArrow = () => (
    <div className="flex flex-col items-center mt-1">
      <span className="text-[10px] mb-1 text-gray-700">Entry</span>
      <svg width="12" height="24" viewBox="0 0 12 24">
        <path d="M6 0 V18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 18 L6 24 L11 18 Z" fill="currentColor" />
      </svg>
    </div>
  );

  if (loading) return <p>Loading seat layout...</p>;

  return (
    <Card className="bg-white p-4 shadow-md">
          <CardContent className="realative">
            {/* Legend */}
            <div className="absolute top-2 right-2 flex gap-4 bg-white/80 px-3 py-1 rounded shadow text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                Available
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                Fixed Booked
              </div>
            </div>
        <div className="flex w-full items-stretch gap-2 justify-center flex-wrap md:flex-nowrap">
          {/* Left Zone */}
          <div className="flex flex-col">
            {leftRows.map((row, i) => (
              <div key={i} className="flex justify-start">
                {row.map((label) => renderSeat(label))}
              </div>
            ))}
          </div>
          {/* Right Zone */}
          <div className="flex flex-col items-end">
            {rightRows.map((row, i) => (
              <div key={i} className="flex justify-end">
                {row.map((label) => renderSeat(label))}
              </div>
            ))}
            {/* Pantry */}
            <div className="mt-4 w-full h-16 bg-gray-100 flex items-center justify-center border border-gray-300 rounded-md">
              <span className="text-gray-700 text-sm font-medium">Pantry</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
