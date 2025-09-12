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
import { User, Phone, Mail, MessageCircle, Calendar, Clock, MapPin, Edit, Download, LogOut } from 'lucide-react';
import { generateInvoicePDF } from '@/utils/pdfGenerator';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  telegram_id?: string;
  approved: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  booking_id?: string;
  bookings?: {
    id: string;
    type: string;
    slot?: string;
    start_time: string;
    end_time: string;
    seats: {
      seat_number: number;
    };
  };
  booking?: {
    seats: {
      seat_number: number;
    };
    type: string;
    slot?: string;
    start_time: string;
    end_time: string;
  };
}

export default function Profile() {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentSeat, setCurrentSeat] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();
      
      setUserProfile(profile);

      // Fetch transactions
      if (profile) {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select(`
            *,
            bookings (
              type,
              slot,
              start_time,
              end_time,
              seats (seat_number)
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        const formattedTransactions = (transactionsData || []).map(tx => ({
          ...tx,
          booking: tx.bookings,
          bookings: tx.bookings ? {
            ...tx.bookings,
            id: tx.booking_id || tx.id
          } : undefined
        }));

        setTransactions(formattedTransactions as Transaction[]);

        // Fetch current active seat
        const now = new Date().toISOString();
        const { data: currentBooking } = await supabase
          .from('bookings')
          .select(`
            *,
            seats (seat_number),
            users!inner (validity_from, validity_to)
          `)
          .eq('user_id', profile.id)
          .in('status', ['confirmed'])
          .eq('payment_status', 'paid')
          .lte('start_time', now)
          .gte('end_time', now)
          .single();

        if (currentBooking) {
          const validityTo = currentBooking.users?.validity_to;
          const daysRemaining = validityTo ? Math.ceil((new Date(validityTo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
          
          setCurrentSeat({
            seat_number: 0,
            type: currentBooking.type,
            validity_to: validityTo,
            days_remaining: daysRemaining,
            is_expired: daysRemaining !== null && daysRemaining < 0
          });
        }
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
      telegram_id: formData.get('telegram_id') as string,
    };

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userProfile?.id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadInvoice = (transaction: Transaction) => {
    const bookingData = transaction.bookings || transaction.booking;
    if (!bookingData || !userProfile) return;

    const invoiceData = {
      bookingId: transaction.booking_id || transaction.id,
      userName: userProfile.name,
      userEmail: userProfile.email,
      amount: parseFloat(transaction.amount.toString()),
      seatNumber: bookingData.seats.seat_number,
      bookingType: bookingData.type,
      slot: bookingData.slot || '',
      startDate: formatDateTime(bookingData.start_time),
      endDate: formatDateTime(bookingData.end_time),
      transactionId: transaction.id,
      paymentDate: transaction.created_at,
      status: transaction.status
    };

    generateInvoicePDF(invoiceData);
    toast({
      title: "Invoice Downloaded",
      description: "Your invoice has been downloaded successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-primary">Profile</h1>
          <p className="text-muted-foreground">Manage your account and view history</p>
        </div>
        
      </header>

      {/* Account Status & Current Seat */}
      <div className="w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Account Status</span>
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
      </div>


      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </span>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={userProfile?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={userProfile?.phone}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <Input
                  id="telegram_id"
                  name="telegram_id"
                  defaultValue={userProfile?.telegram_id}
                  placeholder="@your_telegram_id"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{userProfile?.name}</p>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{userProfile?.phone}</p>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{userProfile?.email}</p>
                  <p className="text-sm text-muted-foreground">Email Address (Managed by Auth)</p>
                </div>
              </div>
              {userProfile?.telegram_id && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{userProfile.telegram_id}</p>
                    <p className="text-sm text-muted-foreground">Telegram ID</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your past and current bookings and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No transactions found
            </p>
          ) : transactions.length <= 2 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Seat {transaction.booking.seats.seat_number}
                        </span>
                        <Badge variant="outline">{transaction.booking.type}</Badge>
                      </div>
                      {transaction.booking.slot && transaction.booking.slot !== 'full' && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {transaction.booking.slot} slot
                        </p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="font-bold">₹{transaction.amount}</p>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      {(transaction.status === 'paid' || transaction.status === 'success' || transaction.status === 'completed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(transaction)}
                          title="Download Invoice"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDateTime(transaction.booking.start_time)} - {formatDateTime(transaction.booking.end_time)}
                  </div>
                  
                  <Separator />
                  
                  <p className="text-xs text-muted-foreground">
                    Transaction Date: {formatDateTime(transaction.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1 space-y-4">
                {transactions.slice(0, 2).map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Seat {transaction.booking.seats.seat_number}
                          </span>
                          <Badge variant="outline">{transaction.booking.type}</Badge>
                        </div>
                        {transaction.booking.slot && transaction.booking.slot !== 'full' && (
                          <p className="text-sm text-muted-foreground capitalize">
                            {transaction.booking.slot} slot
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-bold">₹{transaction.amount}</p>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                        {(transaction.status === 'paid' || transaction.status === 'success' || transaction.status === 'completed') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(transaction)}
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDateTime(transaction.booking.start_time)} - {formatDateTime(transaction.booking.end_time)}
                    </div>
                    
                    <Separator />
                    
                    <p className="text-xs text-muted-foreground">
                      Transaction Date: {formatDateTime(transaction.created_at)}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Vertical Navigation for Recent Bookings */}
              <div className="w-64 border-l pl-4">
                <h4 className="font-medium mb-3 text-sm">Recent Bookings</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.slice(2).map((transaction) => (
                    <div key={transaction.id} className="border rounded p-2 text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">Seat {transaction.booking.seats.seat_number}</span>
                        <Badge variant="outline" className="text-xs">{transaction.booking.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{transaction.amount} - {transaction.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(transaction.created_at)}
                      </p>
                      {(transaction.status === 'paid' || transaction.status === 'success' || transaction.status === 'completed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 text-xs"
                          onClick={() => handleDownloadInvoice(transaction)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Button
          variant="destructive"
          size="lg"
          className="w-full font-semibold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />  {/* smaller icon */}
          Sign Out
      </Button>
    </div>
  );
}
