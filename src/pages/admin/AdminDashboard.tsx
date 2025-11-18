import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagement } from './UsersManagement';
import { BiometricManagement } from './BiometricManagement';
import { GanttChart } from './GanttChart';
import { ManageBookings } from './ManageBookings';
import { FixedUsersManagement } from "./FixedUsersManagement";
import { FloatingUsersManagement } from "./FloatingUsersManagement";
import { MasterAdminView } from "./MasterAdminView";
import { WalletManagement } from "./WalletManagement";
import { SeatLayout } from "./SeatLayout";
import { PasswordManager } from "./PasswordManager";
import { ReleaseSeat } from "./ReleaseSeat";
import { SaveSeatStatusButton } from "./SaveSeatStatusButton";
import LimitedHoursUsersManagement from "@/pages/admin/LimitedHoursUsersManagement";

export const AdminDashboard = () => {
  const { user, role, loading } = useAuth();

const [stats, setStats] = useState({
  bookedSeats: 0,
  free: 0,
  fixedSeats: 0,
  floatingSeats: 0,
  limitedHours: 0,  // ✅ default
});

  const [statsLoading, setStatsLoading] = useState(true);

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

      const nowISO = new Date().toISOString();

    // Booked seats (active & paid)
    const { count: bookedCount } = await supabase.from("bookings")
      .select("id", { count: "exact" })
      .eq("status", "confirmed")
      .eq("payment_status", "paid")
      .gte("membership_end_date", nowISO);

  // Fixed seats (active & paid)
    const { data: fixedBookings, error: fixedError } = await supabase
      .from("bookings")
      .select("id")  // fetch the id column
      .eq("seat_category", "fixed")
      .eq("payment_status", "paid")
      .gte("membership_end_date", nowISO)
      .eq("status", "confirmed");

    if (fixedError) {
      //console.error("Error fetching fixed bookings:", fixedError);
    } else {
      //console.log("Fixed booking IDs:", fixedBookings?.map(b => b.id));
    }

// LIMITED HOURS — NEW
      const { data: limited } = await supabase
        .from("bookings")
        .select("id")
        .eq("seat_category", "limited")
        .eq("payment_status", "paid")
        .eq("status", "confirmed")
        .gte("membership_end_date", nowISO);

      const limitedHoursCount = limited?.length ?? 0;



    // Count if needed
    const fixedCount = fixedBookings?.length ?? 0;

    const freeFixedSeats = 50 - fixedCount;


    // Floating seats (active & paid)
    const { count: floatCount } = await supabase.from("bookings")
      .select("id", { count: "exact" })
      .eq("seat_category", "floating")
      .eq("payment_status", "paid")
      .gte("membership_end_date", nowISO)
      .eq("status", "confirmed");

      const usersRes = await supabase.from("users")
        .select("*", { count: "exact", head: true });

      setStats({
        revenue,
        bookedSeats: bookedCount ?? 0,
        fixedSeats: fixedCount ?? 0,
        floatingSeats: floatCount ?? 0,
        limitedHours: limitedHoursCount,  
        users: usersRes.count ?? 0,
        free: freeFixedSeats ?? 0,
      });
    } catch (err) {
      console.error("❌ fetchStats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Redirect if not admin
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'admin') return <Navigate to="/home" replace />;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sticky Header with Logo and Tagline */}
      <header className="sticky top-0 z-50 bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Logo and Tagline */}
          <div className="flex items-center space-x-4">
            <img
              src="/lovable-uploads/082b41c8-f84f-44f0-9084-137a3e9cbfe2.png"
              alt="Adhyan Library Logo"
              className="h-16 w-auto"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800">Adhyan Library</h1>
              <p className="text-sm text-gray-500">A Peaceful Space for Powerful Minds</p>
            </div>
          </div>
        </div>

    {/* Admin Header and Buttons */}
    <div className="flex items-center justify-between mb-6 gap-4">
      {/* Save Seat Status Button */}
      <SaveSeatStatusButton />

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5"
          />
        </svg>
        <span>Logout</span>
      </button>
    </div>

      </header>

{/* Main Content */}
<main className="flex-1 overflow-auto p-6">
  {/* Stats Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
  {/* Total Booked */}
  <div className="p-6 bg-primary text-white shadow-lg rounded-xl flex flex-col justify-between hover:shadow-2xl transition">
    <h3 className="text-sm opacity-80">Total Booked Seats</h3>
    <p className="text-3xl font-bold mt-2">{statsLoading ? "—" : stats.bookedSeats}</p>
  </div>

  {/* Free */}
  <div className="p-6 bg-white shadow-lg rounded-xl flex flex-col justify-between hover:shadow-2xl transition">
    <h3 className="text-sm text-gray-500">Free Seats</h3>
    <p className="text-3xl font-bold mt-2">{statsLoading ? "—" : stats.free}</p>
  </div>

  {/* Fixed */}
  <div className="p-6 bg-white shadow-lg rounded-xl flex flex-col justify-between hover:shadow-2xl transition">
    <h3 className="text-sm text-gray-500">Fixed Seats</h3>
    <p className="text-3xl font-bold mt-2">{statsLoading ? "—" : stats.fixedSeats}</p>
  </div>

  {/* Floating */}
  <div className="p-6 bg-white shadow-lg rounded-xl flex flex-col justify-between hover:shadow-2xl transition">
    <h3 className="text-sm text-gray-500">Floating Seats</h3>
    <p className="text-3xl font-bold mt-2">{statsLoading ? "—" : stats.floatingSeats}</p>
  </div>

<div className="p-6 bg-orange-100 text-orange-800 shadow-lg rounded-xl flex flex-col justify-between hover:shadow-2xl transition">
  <h3 className="text-sm">Limited Hours Users</h3>
  <p className="text-3xl font-bold mt-2">{statsLoading ? "—" : stats.limitedHours}</p>
</div>

</div>


        <Tabs defaultValue="bookings" className="w-full">
  <TabsList className="flex flex-wrap w-full gap-1 mb-4 border-b border-gray-200">
    <TabsTrigger value="bookings">Bookings</TabsTrigger>
    <TabsTrigger value="users">All Users</TabsTrigger>
    <TabsTrigger value="fixed-users">Fixed Users</TabsTrigger>
    <TabsTrigger value="floating-users">Floating Users</TabsTrigger>
    <TabsTrigger value="limited-users">Limited Hours</TabsTrigger>
    <TabsTrigger value="biometric">Biometric</TabsTrigger>
    <TabsTrigger value="schedule">Seat Status</TabsTrigger>
    <TabsTrigger value="layout">Seat Layout</TabsTrigger>
    <TabsTrigger value="wallet">Wallet</TabsTrigger>
    <TabsTrigger value="passwords">Password Manager</TabsTrigger>
    <TabsTrigger value="release-seat">Release Seat</TabsTrigger> {/* New Tab */}
  </TabsList>

  <TabsContent value="bookings"><ManageBookings /></TabsContent>
  <TabsContent value="users"><UsersManagement /></TabsContent>
  <TabsContent value="fixed-users"><FixedUsersManagement /></TabsContent>
  <TabsContent value="floating-users"><FloatingUsersManagement /></TabsContent>
  <TabsContent value="limited-users"><LimitedHoursUsersManagement /></TabsContent>
  <TabsContent value="biometric"><BiometricManagement /></TabsContent>
  <TabsContent value="schedule"><GanttChart /></TabsContent>
  <TabsContent value="layout"><SeatLayout /></TabsContent>
  <TabsContent value="wallet"><WalletManagement /></TabsContent>
  <TabsContent value="passwords"><PasswordManager /></TabsContent>
  <TabsContent value="release-seat"><ReleaseSeat /></TabsContent> {/* New Tab */}
</Tabs>

      </main>
    </div>
  );
};
