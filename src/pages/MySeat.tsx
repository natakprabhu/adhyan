import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Calendar, User, Crown, Users, AlertCircle, Edit, Phone } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';

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

export default function MySeat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchActiveBooking();
    }
  }, [user]);

  useEffect(() => {
    if (activeBooking) {
      const interval = setInterval(() => {
        calculateDaysRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBooking]);

  const fetchActiveBooking = async () => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');
      
      setUserProfile(profile);

      const { data, error } = await supabase
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

      if (error && error.code !== 'PGRST116') throw error;
      
      setActiveBooking(data as ActiveBooking);
      if (data) {
        calculateDaysRemaining();
      }
    } catch (error) {
      console.error('Error fetching active booking:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your seat information",
        variant: "destructive",
      });
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Active Membership</CardTitle>
            <CardDescription>
              You don't have any active membership. Please book a seat to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/home'} className="w-full">
              Book a Seat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get masked phone number
  const getMaskedPhone = (phone: string) => {
    if (!phone || phone.length < 4) return 'XXXX';
    return 'XXXX' + phone.slice(-4);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="My ID Card" showBack={true} />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* ID Card */}
        {/* ID Card */}
<div className="relative mb-6">
  <Card
    className={cn(
      "border-0 shadow-2xl relative",
      activeBooking.seat_category === 'fixed'
        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white"
        : "bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-200 text-black"
    )}
  >

    {/* Library Stamp Overlay */}
    <div className="absolute -top-6 -right-6 rotate-12">
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-black opacity-70"></div>
        <div className="absolute inset-2 rounded-full border-2 border-black opacity-60"></div>

        <div className="text-[17px] font-extrabold uppercase tracking-widest text-black text-center leading-tight opacity-70">
          ADHYAN<br/>LIBRARY
        </div>

        <div className="absolute inset-0 rounded-full mix-blend-multiply opacity-25"
             style={{
               backgroundImage: "url('https://www.transparenttextures.com/patterns/noise.png')",
               backgroundSize: "150px 150px"
             }}>
        </div>
      </div>
    </div>

    <CardHeader className="pb-4 flex flex-col items-center text-center">
      {/* Profile Picture */}
      <div className="relative mb-3">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center border-2 shadow-md ${
          activeBooking.seat_category === 'fixed' ? 'bg-white/20 border-white/40' : 'bg-black/10 border-black/20'
        }`}>
          <User className={`h-14 w-14 ${activeBooking.seat_category === 'fixed' ? 'text-white/80' : 'text-black/70'}`} />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-7 w-7 p-0 rounded-full shadow"
          onClick={() => navigate("/profile")}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      {/* User Info */}
      <h2 className="text-xl font-bold">{userProfile?.name || "Loading..."}</h2>
      <p className={`${activeBooking.seat_category === 'fixed' ? 'text-white/80' : 'text-black/70'} text-sm`}>
        Member ID: {userProfile?.id?.slice(-8)?.toUpperCase()}
      </p>
    </CardHeader>

    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className={`${activeBooking.seat_category === 'fixed' ? 'text-white/60' : 'text-black/60'} text-xs uppercase tracking-wide`}>
            Membership Type
          </p>
          <p className="font-semibold capitalize">
            <span className={`px-3 py-1 rounded-md font-semibold ${
              activeBooking.seat_category === 'fixed' ? 'bg-blue-700 text-white' : 'bg-yellow-300 text-black'
            }`}>
              {activeBooking.seat_category}
            </span>
          </p>
        </div>
        <div>
          <p className={`${activeBooking.seat_category === 'fixed' ? 'text-white/60' : 'text-black/60'} text-xs uppercase tracking-wide`}>
            Seat Number
          </p>
          <p className="font-semibold">
            {activeBooking.seat_category === 'fixed'
              ? `${activeBooking.seat?.seat_number}`
              : 'Any Available Seat'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className={`${activeBooking.seat_category === 'fixed' ? 'text-white/60' : 'text-black/60'} text-xs uppercase tracking-wide`}>
            Booking Date
          </p>
          <p className="font-semibold">{formatDate(activeBooking.membership_start_date)}</p>
        </div>
        <div>
          <p className={`${activeBooking.seat_category === 'fixed' ? 'text-white/60' : 'text-black/60'} text-xs uppercase tracking-wide`}>
            Phone
          </p>
          <p className="font-semibold">{getMaskedPhone(userProfile?.phone || '')}</p>
        </div>
      </div>

      {/* Days Remaining */}
      <div className={`rounded-lg p-4 text-center mt-4 ${activeBooking.seat_category === 'fixed' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>
        <div className="text-3xl font-bold animate-pulse">{daysRemaining}</div>
        <div className="text-sm">{daysRemaining === 1 ? 'Day Remaining' : 'Days Remaining'}</div>
      </div>
    </CardContent>
  </Card>
</div>


        <div className="grid gap-6">
          {/* Membership Type Card */}
          <Card className={cn(
            "border-2 transition-all",
            activeBooking.seat_category === 'fixed' 
              ? "border-primary bg-gradient-to-br from-primary/10 to-background" 
              : "border-secondary bg-gradient-to-br from-secondary/10 to-background"
          )}>
            <CardHeader className="text-center">
              {activeBooking.seat_category === 'fixed' ? (
                <Crown className="h-16 w-16 mx-auto text-primary mb-4" />
              ) : (
                <Users className="h-16 w-16 mx-auto text-secondary mb-4" />
              )}
              <CardTitle className="text-3xl capitalize">
                {activeBooking.seat_category} Seat Membership
              </CardTitle>
              <CardDescription className="text-lg">
                {activeBooking.seat_category === 'fixed' 
                  ? 'Premium membership with dedicated resources'
                  : 'Flexible membership with any available seat'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Seat Number</p>
                      <p className="text-muted-foreground">
                        {activeBooking.seat_category === 'fixed' 
                          ? `Seat ${activeBooking.seat?.seat_number}` 
                          : 'Any Available Seat'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Access Hours</p>
                      <p className="text-muted-foreground">24×7 Access</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-full w-full">
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-card shadow-sm w-full">
                    <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Membership Period</p>
                      <p className="text-muted-foreground">
                        {formatDate(activeBooking.membership_start_date)} – {formatDate(activeBooking.membership_end_date)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Days Remaining Card */}
          <Card className="text-center border-2 border-dashed border-primary/30">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-4">
                <div className="text-6xl font-bold text-primary animate-pulse">
                  {daysRemaining}
                </div>
                <div className="text-2xl font-semibold text-foreground">
                  Days Remaining
                </div>
                <div className="text-muted-foreground">
                  Your membership expires on {formatDate(activeBooking.membership_end_date)}
                </div>
                
                {daysRemaining <= 7 && (
                  <Badge variant="destructive" className="text-sm px-4 py-2">
                    Membership Expiring Soon!
                  </Badge>
                )}
                
                {daysRemaining > 1 && daysRemaining <= 7 && (
                  <Badge variant="secondary" className="text-sm px-4 py-2">
                    Renewal Reminder
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
