// -------------------------------------------------------------
// PROFILE PAGE — FULLY UPDATED FOR LIMITED HOURS MEMBERSHIP
// -------------------------------------------------------------
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import {
  User,
  Phone,
  MapPin,
  Edit,
  Download,
  LogOut,
  Calendar,
  Clock
} from 'lucide-react';

import { generateInvoicePDF } from '@/utils/pdfGenerator';

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  approved: boolean;
}

interface Booking {
  id: string;
  seat_category: 'fixed' | 'floating' | 'limited';
  slot?: string;
  start_time: string;
  end_time: string;
  seats: { seat_number: number } | null;
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

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------
const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const limitedShiftLabel = (slot?: string) => {
  if (!slot) return '';
  if (slot === "morning") return "Morning Shift (6 AM – 3 PM)";
  if (slot === "evening") return "Evening Shift (3 PM – 12 AM)";
  return slot;
};
const bookingSeatLabel = (b) => {
  // Fixed Seat → must show actual seat number
  if (b.seat_category === "fixed") {
    return b.seats?.seat_number
      ? `Seat ${b.seats.seat_number}`
      : "Seat Not Assigned";
  }

  // Floating → always any seat
  if (b.seat_category === "floating" || "limited") {
    return "Any Available Seat";
  }

};


const bookingCategoryLabel = (b) => {
  if (b.seat_category === "limited") {
    return b.slot === "morning"
      ? "Limited Hours – Morning Shift (6 AM - 3 PM)"
      : "Limited Hours – Evening Shift (3 PM - 12 AM)";
  }

  if (b.seat_category === "floating") return "Floating Seat";

  return "Fixed Seat";
};

const getStatusColor = (status: string) => {
  const s = status.toLowerCase().trim();
  if (s === 'paid' || s === 'success' || s === 'completed')
    return 'bg-green-100 text-green-800';
  if (s === 'pending')
    return 'bg-yellow-100 text-yellow-800';
  if (s === 'failed')
    return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentSeat, setCurrentSeat] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  // -------------------------------------------------------------
  // Fetch all profile data
  // -------------------------------------------------------------
  useEffect(() => {
    if (user) fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // User Profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();

      setUserProfile(profile);

      // Transactions
      const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      // Fetch all corresponding bookings
      const bookingIds = tx.filter((t: any) => t.booking_id).map((t: any) => t.booking_id);
      let bookingMap: any = {};

      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`*, seats (seat_number)`)
          .in('id', bookingIds);

        bookings?.forEach((b) => (bookingMap[b.id] = b));
      }

      const enriched = tx.map((t: any) => ({
        ...t,
        booking: t.booking_id ? bookingMap[t.booking_id] : undefined
      }));

      setTransactions(enriched);

      // Current Active Booking
      const now = new Date().toISOString().split("T")[0];
      const { data: active } = await supabase
        .from("bookings")
        .select(`*, seats(seat_number)`)
        .eq("user_id", profile.id)
        .eq("status", "confirmed")
        .eq("payment_status", "paid")
        .lte("membership_start_date", now)
        .gte("membership_end_date", now)
        .order("membership_end_date", { ascending: false })
        .limit(1)
        .single();

      if (active) {
        const daysRemaining =
          Math.ceil(
            (new Date(active.membership_end_date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
          );

        setCurrentSeat({
          label: bookingCategoryLabel(active),
          seat: bookingSeatLabel(active),
          validity_to: active.membership_end_date,
          days_remaining: Math.max(daysRemaining, 0)
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };


  // -------------------------------------------------------------
  // Invoice Download Handler
  // -------------------------------------------------------------
  const handleDownloadInvoice = (tx: Transaction) => {
    const b = tx.booking;
    if (!b || !userProfile) return;

    const invoiceData = {
      bookingId: tx.booking_id || tx.id,
      userName: userProfile.name,
      userPhone: userProfile.phone,
      amount: tx.amount,
      seatNumber: bookingSeatLabel(b),
      bookingType: bookingCategoryLabel(b),
      slot: b.slot || '',
      startDate: formatDateTime(b.start_time),
      endDate: formatDateTime(b.end_time),
      transactionId: tx.id,
      paymentDate: tx.created_at,
      status: tx.status,
      adminNotes: tx.admin_notes || ""
    };

    generateInvoicePDF(invoiceData);

    toast({ title: "Invoice Downloaded", description: "Your invoice has been downloaded." });
  };


  // -------------------------------------------------------------
  // Update Profile Handler
  // -------------------------------------------------------------
  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (password && password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match!", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    try {
      await supabase
        .from("users")
        .update({ name, phone })
        .eq("auth_user_id", userProfile?.auth_user_id);

      if (password) {
        await supabase.auth.updateUser({ password });
      }

      setUserProfile((p) => p ? { ...p, name, phone } : p);
      setIsEditing(false);

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  // -------------------------------------------------------------
  // Sign Out
  // -------------------------------------------------------------
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };


  // -------------------------------------------------------------
  // Loading / Redirect
  // -------------------------------------------------------------
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen p-4 space-y-6">

      {/* Header */}
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Account Status
            <Badge variant={userProfile?.approved ? "default" : "secondary"}>
              {userProfile?.approved ? "Approved" : "Pending"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Personal Information
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
              <div>
                <Label>Name</Label>
                <Input name="name" defaultValue={userProfile?.name} required />
              </div>

              <div>
                <Label>Phone</Label>
                <Input name="phone" defaultValue={userProfile?.phone} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="flex items-center gap-2"><User className="h-4 w-4" /> {userProfile?.name}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {userProfile?.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your past bookings & payments</CardDescription>
        </CardHeader>

        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground">No transactions found</p>
          ) : (
            transactions.map((tx) => {
              const normalizedStatus = tx.status?.toLowerCase().trim();
              const allowDownload =
                normalizedStatus === "paid" ||
                normalizedStatus === "success" ||
                normalizedStatus === "completed";

              return (
                <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                  {tx.booking && (
                    <>
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{bookingCategoryLabel(tx.booking)}</p>
                          <p className="text-sm text-muted-foreground">
                            {bookingSeatLabel(tx.booking)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold">₹{tx.amount}</span>
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>

                          {allowDownload && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(tx)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(tx.booking.start_time)} → {formatDateTime(tx.booking.end_time)}
                      </div>

                      {tx.admin_notes && (
                        <p className="text-xs text-muted-foreground">Notes: {tx.admin_notes}</p>
                      )}

                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        Transaction Date: {formatDateTime(tx.created_at)}
                      </p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="destructive"
        size="lg"
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
