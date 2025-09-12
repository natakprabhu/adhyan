import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User, MapPin, Calendar, Clock } from 'lucide-react';
import { Header } from '@/components/Header';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

interface ActiveBooking {
  id: string;
  seat_category: 'fixed' | 'floating';
  membership_start_date: string;
  membership_end_date: string;
  status: string;
  payment_status: string;
  monthly_cost: number;
  duration_months: number;
  seat?: {
    seat_number: number;
  };
}

export default function IDCard() {
  const { phoneNumber } = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phoneNumber) {
      fetchUserData();
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (activeBooking) {
      calculateDaysRemaining();
      const interval = setInterval(calculateDaysRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBooking]);

  const fetchUserData = async () => {
    try {
      // Extract the phone number from URL (remove any non-digits)
      const cleanPhone = phoneNumber?.replace(/\D/g, '');
      
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Invalid phone number');
        setIsLoading(false);
        return;
      }

      // Search for user by phone number (try different formats)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.91${cleanPhone}`)
        .single();

      if (profileError || !profile) {
        setError('User not found');
        setIsLoading(false);
        return;
      }

      setUserProfile(profile);

      // Fetch active booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          seat_category,
          membership_start_date,
          membership_end_date,
          status,
          payment_status,
          monthly_cost,
          duration_months,
          seat:seats (seat_number)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid')
        .gte('membership_end_date', new Date().toISOString().split('T')[0])
        .order('membership_end_date', { ascending: false })
        .limit(1)
        .single();

      if (bookingError && bookingError.code !== 'PGRST116') {
        console.error('Error fetching booking:', bookingError);
      }
      
      setActiveBooking(booking as ActiveBooking);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!activeBooking) return;

    const endDate = new Date(activeBooking.membership_end_date);
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    setDaysRemaining(Math.max(0, days));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getMaskedPhone = (phone: string) => {
    if (!phone || phone.length < 4) return 'XXXX';
    return 'XXXX' + phone.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="ID Card" showBack={true} />
        <div className="flex items-center justify-center pt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="ID Card" showBack={true} />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="text-center">
            <CardContent className="pt-8">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Not Found</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="ID Card" showBack={true} />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="text-center">
            <CardContent className="pt-8">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">{userProfile?.name}</h2>
              <p className="text-muted-foreground">No active membership found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Member ID Card" showBack={true} />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* ID Card */}
        <div className="relative mb-6">
          <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white border-0 shadow-2xl overflow-hidden">
            {/* Library Stamp Overlay */}
            <div className="absolute top-4 right-4 opacity-20 rotate-12">
              <div className="border-2 border-white rounded-full p-3">
                <div className="text-xs font-bold text-center">
                  ADHYAN<br/>LIBRARY
                </div>
              </div>
            </div>
            
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                {/* Profile Picture */}
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-white/80" />
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{userProfile?.name}</h2>
                  <p className="text-white/80 text-sm">Member ID: {userProfile?.id?.slice(-8)?.toUpperCase()}</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Membership Type</p>
                  <p className="font-semibold capitalize">{activeBooking.seat_category} Seat</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Seat Number</p>
                  <p className="font-semibold">
                    {activeBooking.seat_category === 'fixed' 
                      ? `${activeBooking.seat?.seat_number}`
                      : 'Floating'
                    }
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Booking Date</p>
                  <p className="font-semibold">{formatDate(activeBooking.membership_start_date)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Phone</p>
                  <p className="font-semibold">{getMaskedPhone(userProfile?.phone || '')}</p>
                </div>
              </div>
              
              {/* Days Remaining - Large Display */}
              <div className="bg-white/10 rounded-lg p-4 text-center mt-4">
                <div className="text-3xl font-bold animate-pulse">{daysRemaining}</div>
                <div className="text-sm text-white/80">Days Remaining</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Membership Period</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(activeBooking.membership_start_date)} - {formatDate(activeBooking.membership_end_date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Access Hours</p>
                  <p className="text-sm text-muted-foreground">24×7 Access</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Monthly Cost</p>
                  <p className="text-sm text-muted-foreground">₹{activeBooking.monthly_cost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}