import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User } from 'lucide-react';

interface SeatInfo {
  id: string;
  seat_number: number;
  created_at: string;
  currentBooking?: {
    user_name: string;
    slot?: string;
    start_time: string;
    end_time: string;
    status: string;
  };
  waitlistCount: number;
}

export default function SeatPlan() {
  const { user, loading } = useAuth();
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SeatInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSeatPlan();
    }
  }, [user]);

  const fetchSeatPlan = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Optimized query - get all data in fewer requests
      const { data: seatsData } = await supabase
        .from('seats')
        .select('*')
        .order('seat_number');

      // Get all today's bookings in one query
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select(`
          seat_id,
          slot,
          start_time,
          end_time,
          status,
          payment_status,
          users (name)
        `)
        .in('status', ['confirmed'])
        .eq('payment_status', 'paid')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      // Get all waitlist counts in one query
      const { data: waitlistData } = await supabase
        .from('waitlist')
        .select('seat_id');

      // Process waitlist counts
      const waitlistCounts = waitlistData?.reduce((acc, item) => {
        acc[item.seat_id] = (acc[item.seat_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process seat information
      const seatInfos: SeatInfo[] = seatsData?.map(seat => {
        const seatBookings = todayBookings?.filter(booking => booking.seat_id === seat.id) || [];
        const currentBooking = seatBookings[0]; // Get first booking for today

        return {
          ...seat,
          currentBooking: currentBooking ? {
            user_name: currentBooking.users?.name || 'Unknown User',
            slot: currentBooking.slot,
            start_time: currentBooking.start_time,
            end_time: currentBooking.end_time,
            status: currentBooking.status,
          } : undefined,
          waitlistCount: waitlistCounts[seat.id] || 0,
        };
      }) || [];

      setSeats(seatInfos);
    } catch (error) {
      console.error('Error fetching seat plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getSeatColor = (seat: SeatInfo) => {
    if (seat.currentBooking) return 'bg-seat-occupied text-white';
    if (seat.waitlistCount > 0) return 'bg-seat-waitlisted text-black';
    return 'bg-seat-available text-black';
  };

  const getSeatStatus = (seat: SeatInfo) => {
    if (seat.currentBooking) return 'Occupied';
    if (seat.waitlistCount > 0) return 'Waitlisted';
    return 'Available';
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Today's Seat Plan</h1>
        <p className="text-muted-foreground">Current seat availability and occupancy</p>
      </header>

      <div className="space-y-4">
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-available rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-occupied rounded"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-waitlisted rounded"></div>
            <span>Waitlisted</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Library Seating Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => setSelectedSeat(seat)}
                  className={`
                    h-16 rounded-lg border transition-all hover:scale-105 
                    ${getSeatColor(seat)}
                    ${seat.currentBooking ? 'shadow-md' : ''}
                  `}
                >
                  <div className="text-center">
                    <div className="font-bold text-lg">{seat.seat_number}</div>
                    <div className="text-xs opacity-80">Seat</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSeat && (
        <Dialog open={!!selectedSeat} onOpenChange={() => setSelectedSeat(null)}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Seat {selectedSeat.seat_number} Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Seat Number:</span>
                <Badge variant="outline">#{selectedSeat.seat_number}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge 
                  variant={selectedSeat.currentBooking ? 'destructive' : 'default'}
                >
                  {getSeatStatus(selectedSeat)}
                </Badge>
              </div>

              {selectedSeat.currentBooking && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Current Occupant</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{selectedSeat.currentBooking.user_name}</span>
                    </div>
                    
                    {selectedSeat.currentBooking.slot && selectedSeat.currentBooking.slot !== 'full' && (
                      <div className="flex justify-between">
                        <span>Slot:</span>
                        <span className="capitalize">{selectedSeat.currentBooking.slot}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>
                        {formatTime(selectedSeat.currentBooking.start_time)} - {formatTime(selectedSeat.currentBooking.end_time)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedSeat.waitlistCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Waitlist:</span>
                  <Badge variant="secondary">
                    {selectedSeat.waitlistCount} person{selectedSeat.waitlistCount > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}

              {!selectedSeat.currentBooking && selectedSeat.waitlistCount === 0 && (
                <div className="text-center text-muted-foreground">
                  This seat is available for booking
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}