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
    [47, 46, 45], [50, 49, 48]
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
    if (!seat) return null;

    const status = getSeatStatus(seat);
    const bgClass = status === "booked" ? "bg-red-500" : "bg-green-500";

    return (
      <div
        key={seatNumber}
         className={`w-6 h-6 sm:w-8 sm:h-8 m-0.5 rounded flex items-center justify-center font-bold text-[10px] sm:text-xs text-white ${bgClass}`}
      >
        {seatNumber}
      </div>
    );
  };
rttyu
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
          <CardContent className="relative">
            <div className="flex w-max items-stretch gap-2 justify-center">
              {/* Left Zone */}
              <div className="flex flex-col">
                {leftRows.map((row, i) => (
                  <div key={i} className="flex justify-start">
                    {row.map((label) => renderSeat(label))}
                  </div>
                ))}
              </div>
              {/* Passage */}
              <div className="relative w-6 flex flex-col justify-start items-center self-stretch">
                <div className="absolute top-0 bottom-0 left-0.5 w-px border-l border-dotted border-gray-400"></div>
                <div className="absolute top-0 bottom-0 right-0.5 w-px border-l border-dotted border-gray-400"></div>
                <div className="rotate-90 text-[9px] text-gray-500 absolute top-1/3 whitespace-nowrap">
                  Passage
                </div>
                <EntryArrow />
              </div>

              {/* Right Zone */}
              <div className="flex flex-col items-end">
                {rightRows.map((row, i) => (
                  <div key={i} className="flex justify-end">
                    {row.map((label) => renderSeat(label))}
                  </div>
                ))}

                {/* Pantry */}
                <div className="mt-2 w-full h-12 bg-gray-100 flex items-center justify-center border border-gray-300 rounded-md">
                  <span className="text-gray-700 text-xs font-medium">Pantry</span>
                </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      Available
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Fixed Booked
                    </div>
              </div>
            </div>
          </CardContent>
        </Card>

  );
};
