// /pages/status.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface FixedSeat {
  id: string;
  seat_id: string | null;
  seat_number: number;
  status: string; // "booked" or "available"
}

export default function SeatStatusPage() {
  const [seats, setSeats] = useState<FixedSeat[]>([]);
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
    const fetchSeats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("fixed_seats")
          .select("*")
          .order("seat_number", { ascending: true });
        if (error) throw error;
        setSeats(data || []);
      } catch (err) {
        console.error("Error fetching fixed seats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, []);

  const renderSeat = (seatNumber: number) => {
    const seat = seats.find((s) => s.seat_number === seatNumber);
    const status = seat?.status || "available";
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

  const EntryArrow = () => (
    <div className="flex flex-col items-center mt-1">
      <span className="text-[10px] mb-1 text-gray-700">Entry</span>
      <svg width="12" height="24" viewBox="0 0 12 24">
        <path d="M6 0 V18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 18 L6 24 L11 18 Z" fill="currentColor" />
      </svg>
    </div>
  );

  if (loading) return <p className="text-center mt-4">Loading seat layout...</p>;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <img
              src="/lovable-uploads/082b41c8-f84f-44f0-9084-137a3e9cbfe2.png"
              alt="Adhyan Library Logo"
              className="h-16 w-auto"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800">Adhyan Library</h1>
              <p className="text-sm text-gray-500">A Peaceful Space for Powerful Minds</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto relative">
          <Card className="bg-white p-4 shadow-md min-w-[320px]">
            <CardContent className="relative">
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

              <div className="flex w-max items-stretch gap-2 justify-center flex-wrap md:flex-nowrap">
                {/* Left Zone */}
                <div className="flex flex-col">
                  {leftRows.map((row, i) => (
                    <div key={i} className="flex justify-start">
                      {row.map((label) => renderSeat(label))}
                    </div>
                  ))}
                </div>

                {/* Passage */}
                <div className="relative w-8 flex flex-col justify-start items-center self-stretch">
                  <div className="absolute top-0 bottom-0 left-1 w-px border-l-2 border-dotted border-gray-400"></div>
                  <div className="absolute top-0 bottom-0 right-1 w-px border-l-2 border-dotted border-gray-400"></div>
                  <div className="rotate-90 text-xs md:text-sm text-gray-500 absolute top-1/3">
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
                  <div className="mt-4 w-full h-16 bg-gray-100 flex items-center justify-center border border-gray-300 rounded-md">
                    <span className="text-gray-700 text-sm font-medium">Pantry</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner p-4 flex justify-center">
        <a
          href="/auth"
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Back to Login
        </a>
      </footer>
    </div>
  );
}
