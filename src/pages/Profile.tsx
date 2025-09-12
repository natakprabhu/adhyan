import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Phone, Mail, MessageCircle, Calendar, Clock, MapPin, Edit, Download, LogOut, Key } from 'lucide-react';
import { generateInvoicePDF } from '@/utils/pdfGenerator';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  telegram_id?: string;
  approved: boolean;
}

interface Booking {
  id: string;
  type: string;
  slot?: string;
  start_time: string;
  end_time: string;
  seats: {
    seat_number: number;
  };
}

interface Transaction {
  id: string;
  user_id: string;
  booking_id?: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string;
  booking?: Booking;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentSeat, setCurrentSeat] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      // Fetch transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      let enrichedTransactions: Transaction[] = [];

      if (transactionsData && transactionsData.length > 0) {
        const bookingIds = transactionsData
          .filter(tx => tx.booking_id)
          .map(tx => tx.booking_id);

        let bookingsMap: Record<string, Booking> = {};
        if (bookingIds.length > 0) {
          const { data: bookingsData, error: bkError } = await supabase
            .from('bookings')
            .select(`*, seats (seat_number)`)
            .in('id', bookingIds);

          if (bkError) throw bkError;

          bookingsData?.forEach(bk => {
            bookingsMap[bk.id] = bk;
          });
        }

        enrichedTransactions = transactionsData.map(tx => ({
          ...tx,
          booking: tx.booking_id ? bookingsMap[tx.booking_id] : undefined
        }));
      }

      setTransactions(enrichedTransactions);

      // Fetch current active seat
      const now = new Date().toISOString();
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select(`
          *,
          seats (seat_number)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid')
        .lte('start_time', now)
        .gte('end_time', now)
        .single();

      if (currentBooking) {
        const daysRemaining = currentBooking.end_time
          ? Math.ceil((new Date(currentBooking.end_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        setCurrentSeat({
          seat_number: currentBooking.seats?.seat_number || 0,
          type: currentBooking.type,
          validity_to: currentBooking.end_time,
          days_remaining: daysRemaining,
          is_expired: daysRemaining !== null && daysRemaining < 0
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      telegram_id: formData.get('telegram_id') as string,
      password: formData.get('password') as string,
    };

    try {
      // Update user profile fields in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: updates.name,
          phone: updates.phone,
          telegram_id: updates.telegram_id
        })
        .eq('id', userProfile?.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (updates.email && updates.email !== userProfile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: updates.email });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (updates.password) {
        const { error: pwError } = await supabase.auth.updateUser({ password: updates.password });
        if (pwError) throw pwError;
      }

      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);

      toast({ title: 'Success', description: 'Profile updated successfully.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Failed to update profile. Try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadInvoice = (transaction: Transaction) => {
    const bookingData = transaction.booking;
    if (!bookingData || !userProfile) return;

    const invoiceData = {
      bookingId: transaction.booking_id || transaction.id,
      userName: userProfile.name,
      userEmail: userProfile.email,
      amount: transaction.amount,
      seatNumber: bookingData.seats?.seat_number,
      bookingType: bookingData.type,
      slot: bookingData.slot || '',
      startDate: formatDateTime(bookingData.start_time),
      endDate: formatDateTime(bookingData.end_time),
      transactionId: transaction.id,
      paymentDate: transaction.created_at,
      status: transaction.status,
      adminNotes: transaction.admin_notes || ''
    };

    generateInvoicePDF(invoiceData);
    toast({ title: 'Invoice Downloaded', description: 'Your invoice has been downloaded.' });
  };

  if (loading || isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-primary">Profile</h1>
          <p className="text-muted-foreground">Manage your account and view history</p>
        </div>
      </header>

      {/* Account Status */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Account Status
            <Badge variant={userProfile?.approved ? 'default' : 'secondary'}>
              {userProfile?.approved ? 'Approved' : 'Pending Approval'}
            </Badge>
          </CardTitle>
        </CardHeader>
        {!userProfile?.approved && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account is pending admin approval. You can browse seats but cannot make bookings yet.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" /> Personal Information
            </span>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={userProfile?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" defaultValue={userProfile?.phone} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" defaultValue={userProfile?.email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <Input id="telegram_id" name="telegram_id" defaultValue={userProfile?.telegram_id} placeholder="@your_telegram_id" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><p>{userProfile?.name}</p></div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><p>{userProfile?.phone}</p></div>
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><p>{userProfile?.email}</p></div>
              {userProfile?.telegram_id && <div className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-muted-foreground" /><p>{userProfile.telegram_id}</p></div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Transaction History</CardTitle>
          <CardDescription>Your past and current bookings and payments</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No transactions found</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    {tx.booking && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Seat {tx.booking.seats?.seat_number}</span>
                        <Badge variant="outline">{tx.booking.type}</Badge>
                      </div>
                    )}
                    {tx.booking?.slot && <p className="text-sm text-muted-foreground">{tx.booking.slot} slot</p>}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="font-bold">₹{tx.amount}</p>
                    <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                    {(tx.status === 'paid' || tx.status === 'success' || tx.status === 'completed') && (
                      <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(tx)}><Download className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
                {tx.booking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDateTime(tx.booking.start_time)} - {formatDateTime(tx.booking.end_time)}
                  </div>
                )}
                {tx.admin_notes && <p className="text-xs text-muted-foreground">Admin Notes: {tx.admin_notes}</p>}
                <Separator />
                <p className="text-xs text-muted-foreground">Transaction Date: {formatDateTime(tx.created_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button variant="destructive" size="lg" className="w-full flex items-center justify-center gap-2" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
