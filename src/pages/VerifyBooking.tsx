import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, User, Calendar, MapPin, Phone, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  telegram_id?: string;
  validity_from?: string;
  validity_to?: string;
}

interface BookingData {
  id: string;
  type: string;
  seat_number?: number;
  membership_start_date: string;
  membership_end_date: string;
  status: string;
  payment_status: string;
  duration_months: number;
  monthly_cost: number;
}

export const VerifyBooking = () => {
  const { phone } = useParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);

  useEffect(() => {
    if (!phone) return;
    fetchBookingDetails();
  }, [phone]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);

      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (userError) {
        toast({
          title: 'Error',
          description: 'Failed to fetch user details.',
          variant: 'destructive',
        });
        return;
      }

      if (!user) {
        toast({
          title: 'No User Found',
          description: 'No user found with this phone number.',
          variant: 'destructive',
        });
        return;
      }

      setUserData(user);

      // Fetch booking data
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingError) {
        toast({
          title: 'Error',
          description: 'Failed to fetch booking details.',
          variant: 'destructive',
        });
        return;
      }

      setBookingData(bookings || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!phone) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-primary">No User Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              No user found with phone number: {phone}
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeBooking = bookingData.find(b => b.status === 'confirmed');
  const daysRemaining = activeBooking ? calculateDaysRemaining(activeBooking.membership_end_date) : 0;
  const isExpired = daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Adhyan Library</h1>
          <p className="text-muted-foreground">Booking Verification & ID Card</p>
        </div>

        {/* ID Card */}
        {activeBooking && (
          <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 relative overflow-hidden print:shadow-none">
            {/* Library Stamp Overlay */}
            <div className="absolute top-4 right-4 opacity-20 rotate-12 transform">
              <div className="border-4 border-primary rounded-full p-2">
                <div className="text-xs font-bold text-primary text-center">
                  ADHYAN<br/>LIBRARY
                </div>
              </div>
            </div>

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-primary">Library ID Card</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Photo Placeholder */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-primary/20">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>

              {/* User Details */}
              <div className="text-center space-y-2">
                <h3 className="font-bold text-lg">{userData.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>
                      {activeBooking.type === 'floating' ? 'Floating Seat' : `Seat ${activeBooking.seat_number}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{new Date(activeBooking.membership_start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className={isExpired ? 'text-red-600' : daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'}>
                      {isExpired ? 'Expired' : `${daysRemaining} days remaining`}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>
                      {userData.phone.slice(0, 6)}XXXX
                    </span>
                  </div>
                </div>
              </div>

              {/* Membership Type Badge */}
              <div className="flex justify-center">
                <Badge variant={activeBooking.type === 'floating' ? 'secondary' : 'default'} className="px-4 py-1">
                  {activeBooking.type === 'floating' ? 'Floating Membership' : 'Fixed Seat Membership'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{userData.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{userData.phone}</p>
            </div>
            {userData.telegram_id && (
              <div>
                <p className="text-sm text-muted-foreground">Telegram ID</p>
                <p className="font-medium">{userData.telegram_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking History */}
        <Card>
          <CardHeader>
            <CardTitle>Booking History</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bookings found.</p>
            ) : (
              <div className="space-y-4">
                {bookingData.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {booking.type === 'floating' ? 'Floating Seat' : `Seat ${booking.seat_number}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.membership_start_date).toLocaleDateString()} - {new Date(booking.membership_end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {booking.duration_months} month(s) | Cost: ₹{booking.monthly_cost * booking.duration_months}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>
                          {booking.status}
                        </Badge>
                        <Badge variant={booking.payment_status === 'paid' ? 'default' : booking.payment_status === 'pending' ? 'secondary' : 'destructive'}>
                          {booking.payment_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center print:hidden">
          <Button onClick={handlePrintCard} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Print ID Card
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/auth'}>
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};