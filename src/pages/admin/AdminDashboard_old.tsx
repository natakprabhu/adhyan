import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagement } from './UsersManagement';
import { BiometricManagement } from './BiometricManagement';
import { GanttChart } from './GanttChart';
import { ManageBookings } from './ManageBookings';
import { FixedUsersManagement } from "./FixedUsersManagement";
import { FloatingUsersManagement } from "./FloatingUsersManagement";
import { LimitedUsersManagement } from "./LimitedUsersManagement";
import { WalletManagement } from "./WalletManagement";
import { SeatLayout } from "./SeatLayout";

export const AdminDashboard = () => {
  const { user, role, loading } = useAuth();

  // Stats state
  const [stats, setStats] = useState({
    revenue: 0,
    bookedSeats: 0,
    fixedSeats: 0,
    floatingSeats: 0,
    users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Temp password modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loadingPasswordReset, setLoadingPasswordReset] = useState(false);

  // Format currency (INR)
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);

  const monthName = new Date().toLocaleString("default", { month: "long" });
  const year = new Date().getFullYear();

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const { startDate, endDate } = getCurrentMonthRange();

      const { data: txnData, error: txnError } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (txnError) throw txnError;

      const revenue = (txnData ?? []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      const bookedRes = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "booked").eq("payment_status", "paid");
      const fixedRes = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("seat_category", "fixed").eq("payment_status", "paid");
      const floatRes = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("seat_category", "floating").eq("payment_status", "paid");
      const usersRes = await supabase.from("users").select("*", { count: "exact", head: true });

      setStats({
        revenue,
        bookedSeats: bookedRes.count ?? 0,
        fixedSeats: fixedRes.count ?? 0,
        floatingSeats: floatRes.count ?? 0,
        users: usersRes.count ?? 0,
      });
    } catch (err) {
      console.error("❌ fetchStats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // Redirect if not admin
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'admin') return <Navigate to="/home" replace />;

  // Generate temporary password
  const generateTempPassword = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle temp password reset
  const handleResetPassword = async (userId: string) => {
    try {
      setLoadingPasswordReset(true);
      const newPassword = generateTempPassword();
      const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;

      setTempPassword(newPassword);
      setSelectedUserId(userId);
      setIsPasswordModalOpen(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    } finally {
      setLoadingPasswordReset(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-primary text-white shadow rounded flex flex-col justify-between">
          <div>
            <h3 className="text-sm opacity-80">Total Users</h3>
            <p className="text-2xl font-bold">{statsLoading ? "—" : stats.users}</p>
          </div>
          <button
            onClick={() => handleResetPassword("user-id-here")} // replace with selected user
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={loadingPasswordReset}
          >
            {loadingPasswordReset ? "Generating..." : "Reset Password"}
          </button>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <h3 className="text-sm text-gray-500">Total Booked Seats</h3>
          <p className="text-2xl font-bold">{statsLoading ? "—" : stats.bookedSeats}</p>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <h3 className="text-sm text-gray-500">Fixed Seats</h3>
          <p className="text-2xl font-bold">{statsLoading ? "—" : stats.fixedSeats}</p>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <h3 className="text-sm text-gray-500">Floating Seats</h3>
          <p className="text-2xl font-bold">{statsLoading ? "—" : stats.floatingSeats}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid grid-cols-9 w-full gap-1">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="fixed-users">Fixed Users</TabsTrigger>
          <TabsTrigger value="floating-users">Floating Users</TabsTrigger>
          <TabsTrigger value="limited-users">Limited Hours Users</TabsTrigger>
          <TabsTrigger value="biometric">Biometric</TabsTrigger>
          <TabsTrigger value="schedule">Seat Status</TabsTrigger>
          <TabsTrigger value="layout">Seat Layout</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings"><ManageBookings /></TabsContent>
        <TabsContent value="users"><UsersManagement /></TabsContent>
        <TabsContent value="fixed-users"><FixedUsersManagement /></TabsContent>
        <TabsContent value="floating-users"><FloatingUsersManagement /></TabsContent>
        <TabsContent value="limited-users"><LimitedUsersManagement /></TabsContent>
        <TabsContent value="biometric"><BiometricManagement /></TabsContent>
        <TabsContent value="schedule"><GanttChart /></TabsContent>
        <TabsContent value="layout"><SeatLayout /></TabsContent>
        <TabsContent value="wallet"><WalletManagement /></TabsContent>
      </Tabs>

      {/* Temp Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Temporary Password Generated</h2>
            <p className="mb-4">User ID: {selectedUserId}</p>
            <p className="mb-4 font-mono text-lg bg-gray-100 p-2 rounded">{tempPassword}</p>
            <p className="mb-4 text-sm text-gray-500">Share this password with the user. They should change it on next login.</p>
            <button
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
