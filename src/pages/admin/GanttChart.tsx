import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SeatBooking {
  id: string;
  seat_id: string;
  seat_number: number;
  user_name: string;
  membership_start_date: string;
  membership_end_date: string;
  type: string;
}

export const GanttChart = () => {
  const [bookings, setBookings] = useState<SeatBooking[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const bookingColors = [
    "bg-green-200 text-green-800 border-green-300",
    "bg-blue-200 text-blue-800 border-blue-300",
    "bg-purple-200 text-purple-800 border-purple-300",
    "bg-yellow-200 text-yellow-800 border-yellow-300",
    "bg-pink-200 text-pink-800 border-pink-300",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch seats
      const { data: seatsData, error: seatsError } = await supabase
        .from("seats")
        .select("id, seat_number")
        .order("seat_number");

      if (seatsError) throw seatsError;
      setSeats(seatsData || []);

      // Fetch bookings with users and seats
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          seat_id,
          membership_start_date,
          membership_end_date,
          type,
          users ( name ),
          seats ( seat_number )
        `
        )
        .order("membership_start_date");

      if (bookingsError) throw bookingsError;

      if (bookingsData) {
        setBookings(
          bookingsData.map((b: any) => ({
            id: b.id,
            seat_id: b.seat_id,
            seat_number: b.seats?.seat_number || 0,
            membership_start_date: b.membership_start_date,
            membership_end_date: b.membership_end_date,
            type: b.type,
            user_name: b.users?.name || "Unknown",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch schedule data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Utility: check overlap between two bookings
  const isOverlap = (a: SeatBooking, b: SeatBooking) => {
    const startA = new Date(a.membership_start_date).getTime();
    const endA = new Date(a.membership_end_date).getTime();
    const startB = new Date(b.membership_start_date).getTime();
    const endB = new Date(b.membership_end_date).getTime();
    return startA <= endB && startB <= endA;
  };

  // Utility: calculate booking duration in days
  const getBookingDays = (booking: SeatBooking) => {
    const start = new Date(booking.membership_start_date);
    const end = new Date(booking.membership_end_date);
    return Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seat Schedule
          </CardTitle>
          <CardDescription>
            Each bar width = membership days, overlaps shown in{" "}
            <span className="text-red-600 font-medium">red</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {seats.map((seat) => {
              const seatBookings = bookings
                .filter((b) => b.seat_id === seat.id)
                .sort(
                  (a, b) =>
                    new Date(a.membership_start_date).getTime() -
                    new Date(b.membership_start_date).getTime()
                );

              return (
                <div
                  key={seat.id}
                  className="border rounded-md p-2 bg-gray-50 space-y-1"
                >
                  <div className="font-medium text-xs mb-1">
                    Seat {seat.seat_number}
                  </div>

                  {seatBookings.length === 0 ? (
                    <div className="text-xs text-gray-400">
                      No bookings for this seat
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 items-center">
                      {seatBookings.map((booking, i) => {
                        const days = getBookingDays(booking);

                        // Check if this booking overlaps with any other for same seat
                        const hasOverlap = seatBookings.some(
                          (other, j) => j !== i && isOverlap(booking, other)
                        );

                        return (
                          <div
                            key={booking.id}
                            className={`text-[10px] px-2 py-0.5 rounded border shadow-sm whitespace-nowrap ${
                              hasOverlap
                                ? "bg-red-200 text-red-800 border-red-400"
                                : bookingColors[i % bookingColors.length]
                            }`}
                            style={{ width: `${days * 12}px` }} // 12px per day
                            title={`${booking.user_name} (${formatDate(
                              booking.membership_start_date
                            )} → ${formatDate(booking.membership_end_date)})`}
                          >
                            {booking.user_name}{" "}
                            {formatDate(booking.membership_start_date)} →{" "}
                            {formatDate(booking.membership_end_date)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
