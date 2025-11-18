import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import {
  MapPin,
  Clock,
  Calendar,
  User,
  Crown,
  Users,
  AlertCircle,
  Edit
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';

interface ActiveBooking {
  id: string;
  seat_category: 'fixed' | 'floating' | 'limited';
  slot?: 'morning' | 'evening' | null;
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
    if (user) fetchActiveBooking();
  }, [user]);

  useEffect(() => {
    if (activeBooking) {
      const interval = setInterval(calculateDaysRemaining, 1000);
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
          slot,
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
      if (data) calculateDaysRemaining();
    } catch (error) {
      console.error('Error fetching active booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your seat information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!activeBooking) return;

    const endDate = new Date(activeBooking.membership_end_date);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 3600 * 24))));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const getMaskedPhone = (phone: string) =>
    phone?.length < 4 ? 'XXXX' : 'XXXX' + phone.slice(-4);

  if (!user) return <Navigate to="/auth" replace />;

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
              You don’t have an active membership. Please book one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => (window.location.href = '/home')} className="w-full">
              Book a Seat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getGradient = () => {
    if (activeBooking.seat_category === 'fixed')
      return 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white';

    if (activeBooking.seat_category === 'floating')
      return 'bg-gradient-to-br from-yellow-300 via-yellow-200 to-yellow-100 text-black';

    return 'bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white';
  };

  const getCategoryBadge = () => {
    if (activeBooking.seat_category === 'fixed')
      return <span className="px-3 py-1 bg-blue-700 text-white rounded-md">Fixed Seat</span>;

    if (activeBooking.seat_category === 'floating')
      return <span className="px-3 py-1 bg-yellow-400 text-black rounded-md">Floating Seat</span>;

    return <span className="px-3 py-1 bg-purple-600 text-white rounded-md">Limited Hours</span>;
  };

  const getSeatDisplay = () => {
    if (activeBooking.seat_category === 'fixed')
      return `Seat ${activeBooking.seat?.seat_number}`;

    if (activeBooking.seat_category === 'floating')
      return 'Any Available Seat';

    if (activeBooking.slot === 'morning')
      return 'Morning Shift (6 AM – 3 PM)';

    return 'Evening Shift (3 PM – 12 AM)';
  };

  const getAccessHours = () => {
    if (activeBooking.seat_category === 'limited') {
      return activeBooking.slot === 'morning'
        ? '6 AM – 3 PM'
        : '3 PM – 12 AM';
    }
    return '24×7 Access';
  };

  const getIcon = () => {
    if (activeBooking.seat_category === 'fixed')
      return <Crown className="h-16 w-16 mx-auto mb-4 text-white/80" />;

    if (activeBooking.seat_category === 'floating')
      return <Users className="h-16 w-16 mx-auto mb-4 text-black/70" />;

    return <Clock className="h-16 w-16 mx-auto mb-4 text-white/80" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="My ID Card" showBack />

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* ID CARD */}
        <Card className={cn('border-0 shadow-2xl relative', getGradient())}>
          <CardHeader className="pb-4 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 shadow-md bg-white/20 border-white/40">
                <User className="h-14 w-14 text-white" />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-7 w-7 p-0 rounded-full shadow"
                onClick={() => navigate('/profile')}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            <h2 className="text-xl font-bold">{userProfile.name}</h2>
            <p className="text-sm opacity-80">Member ID: {userProfile.id.slice(-8)}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Membership Type + Seat */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-70 text-xs uppercase">Membership Type</p>
                {getCategoryBadge()}
              </div>

              <div>
                <p className="opacity-70 text-xs uppercase">Seat / Shift</p>
                <p className="font-semibold">{getSeatDisplay()}</p>
              </div>
            </div>

            {/* Dates + Phone */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-70 text-xs uppercase">Booking Date</p>
                <p className="font-semibold">{formatDate(activeBooking.membership_start_date)}</p>
              </div>

              <div>
                <p className="opacity-70 text-xs uppercase">Phone</p>
                <p className="font-semibold">{getMaskedPhone(userProfile.phone)}</p>
              </div>
            </div>

            {/* Access Hours */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="font-medium">Access Hours</p>
                  <p className="text-sm opacity-80">{getAccessHours()}</p>
                </div>
              </div>
            </div>

            {/* Days Remaining */}
            <div className="rounded-lg p-4 text-center bg-white/20 backdrop-blur">
              <div className="text-3xl font-bold">{daysRemaining}</div>
              <div className="text-sm">Days Remaining</div>
            </div>
          </CardContent>
        </Card>

        {/* MEMBERSHIP DETAILS */}
        <Card className="mt-6 border-2">
          <CardHeader className="text-center">
            {getIcon()}
            <CardTitle className="text-3xl capitalize">
              {activeBooking.seat_category === 'limited'
                ? 'Limited Hours Membership'
                : `${activeBooking.seat_category} Seat Membership`}
            </CardTitle>
            <CardDescription className="text-lg">
              {activeBooking.seat_category === 'fixed'
                ? 'Premium membership with dedicated seat.'
                : activeBooking.seat_category === 'floating'
                ? 'Sit anywhere, anytime.'
                : '9 hours per day — stay focused.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Seat / Shift</p>
                  <p className="text-muted-foreground">{getSeatDisplay()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Access Hours</p>
                  <p className="text-muted-foreground">{getAccessHours()}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card shadow-sm flex gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Membership Period</p>
                  <p className="text-muted-foreground">
                    {formatDate(activeBooking.membership_start_date)} –{' '}
                    {formatDate(activeBooking.membership_end_date)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Remaining Card */}
        <Card className="mt-6 text-center border-2 border-dashed border-primary/30">
          <CardContent className="pt-8 pb-8">
            <div className="text-6xl font-bold text-primary">{daysRemaining}</div>
            <div className="text-2xl font-semibold">Days Remaining</div>
            <p className="text-muted-foreground mt-2">
              Expires on {formatDate(activeBooking.membership_end_date)}
            </p>

            {daysRemaining <= 7 && (
              <Badge variant="destructive" className="mt-3 px-4 py-2">
                Membership Expiring Soon!
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
