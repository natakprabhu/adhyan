import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagement } from './UsersManagement';
import { BiometricManagement } from './BiometricManagement';
import { GanttChart } from './GanttChart';
import { ManageBookings } from './ManageBookings'; // 👈 new component
import { FixedUsersManagement } from "./FixedUsersManagement";
import { FloatingUsersManagement } from "./FloatingUsersManagement";
import { LimitedUsersManagement } from "./LimitedUsersManagement";
import { WalletManagement } from "./WalletManagement";
import { SeatLayout } from "./SeatLayout";


export const AdminDashboard = () => {
  const { user, role, loading } = useAuth();

  // Stats state
  const [stats, setStats] = useState({
    revenue: 0,        // numeric sum
    bookedSeats: 0,    // count
    fixedSeats: 0,     // count
    floatingSeats: 0,  // count
    users: 0,          // total user count
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // format currency (INR)
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);

  // human month name & year for title
  const monthName = new Date().toLocaleString("default", { month: "long" });
  const year = new Date().getFullYear();

  const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // local start
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // local end of last day
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

const fetchStats = async () => {
  try {
    setStatsLoading(true);
    const { startDate, endDate } = getCurrentMonthRange();

    // 1) Revenue for current month
    const { data: txnData, error: txnError } = await supabase
      .from("transactions")
      .select("amount, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (txnError) throw txnError;
    const revenue = (txnData ?? []).reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );

    // 2) Booked seats (status=booked + paid)
    const bookedRes = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "booked")
      .eq("payment_status", "paid");
    const bookedSeats = bookedRes.count ?? 0;

    // 3) Fixed seats (seat_category=fixed + paid)
    const fixedRes = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("seat_category", "fixed")
      .eq("payment_status", "paid");
    const fixedSeats = fixedRes.count ?? 0;

    // 4) Floating seats (seat_category=floating + paid)
    const floatRes = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("seat_category", "floating")
      .eq("payment_status", "paid");
    const floatingSeats = floatRes.count ?? 0;

    // 5) Total users
    const usersRes = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    const users = usersRes.count ?? 0;

    setStats({ revenue, bookedSeats, fixedSeats, floatingSeats, users });
  } catch (err) {
    console.error("❌ fetchStats error:", err);
  } finally {
    setStatsLoading(false);
  }
};

  useEffect(() => {
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const { startDate, endDate } = getCurrentMonthRange();

      // 1) Revenue for current month
      const { data: txnData, error: txnError } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (txnError) throw txnError;
      const revenue = (txnData ?? []).reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

      // 2) Booked seats count (adjust status filter if your schema uses different status)
      const bookedRes = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("payment_status", "paid");
      const bookedSeats = bookedRes.count ?? 0;

      // 3) Fixed seats (seat_category=fixed + paid)
      const fixedRes = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("seat_category", "fixed")
        .eq("payment_status", "paid");
      const fixedSeats = fixedRes.count ?? 0;

      // 4) Floating seats (seat_category=floating + paid)
      const floatRes = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("seat_category", "floating")
        .eq("payment_status", "paid");
      const floatingSeats = floatRes.count ?? 0;

      // 5) Total users
      const usersRes = await supabase.from("users").select("*", { count: "exact", head: true });
      const users = usersRes.count ?? 0;

      setStats({
        revenue,
        bookedSeats,
        fixedSeats,
        floatingSeats,
        users,
      });
    } catch (err) {
      console.error("❌ fetchStats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  fetchStats();
  // optionally add dependencies if you want to refresh on something: [filter, ...]
}, []);


  // Redirect if not admin
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'admin') return <Navigate to="/home" replace />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded">
          <h3 className="text-sm text-gray-500">Revenue ({monthName} {year})</h3>
          <p className="text-2xl font-bold">0</p>
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

        <div className="p-4 bg-white shadow rounded col-span-1 sm:col-span-2 lg:col-span-4">
          <h3 className="text-sm text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold">{statsLoading ? "—" : stats.users}</p>
        </div>
      </div>

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

          {/* Tabs Content */}
          <TabsContent value="bookings">
            <ManageBookings /> {/* bookings CRUD */}
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="fixed-users">
            <FixedUsersManagement />
          </TabsContent>

          <TabsContent value="floating-users">
            <FloatingUsersManagement />
          </TabsContent>

          <TabsContent value="limited-users">
            <LimitedUsersManagement />
          </TabsContent>

          <TabsContent value="biometric">
            <BiometricManagement />
          </TabsContent>

          <TabsContent value="schedule">
            <GanttChart />
          </TabsContent>

          <TabsContent value="layout">
            <SeatLayout /> {/* Seat layout grid */}
          </TabsContent>

          <TabsContent value="wallet">
            <WalletManagement /> {/* Wallet tab component */}
          </TabsContent>
        </Tabs>

    </div>
  );
};
