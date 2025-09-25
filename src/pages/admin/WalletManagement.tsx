"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

export const WalletManagement = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    fixedRevenue: 0,
    floatingRevenue: 0,
    limitedRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, [selectedMonth, viewMode]);

  // Helper for ordinal suffix
  const getOrdinal = (n: number) => {
    if (n > 3 && n < 21) return n + "th";
    switch (n % 10) {
      case 1:
        return n + "st";
      case 2:
        return n + "nd";
      case 3:
        return n + "rd";
      default:
        return n + "th";
    }
  };

  const fetchRevenue = async () => {
    try {
      setStatsLoading(true);

      const [year, month] = selectedMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      const startDate = start.toISOString();
      const endDate = end.toISOString();

      // Fetch transactions
      const { data: txnData, error: txnError } = await supabase
        .from("transactions")
        .select("id, amount, booking_id, created_at")
        .eq("status", "completed")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (txnError) throw txnError;

      // Fetch booking categories
      const bookingIds = txnData?.map((t) => t.booking_id).filter(Boolean) || [];
      let bookingsMap: Record<string, string> = {};
      if (bookingIds.length > 0) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, seat_category")
          .in("id", bookingIds);

        if (bookingsError) throw bookingsError;

        bookingsData?.forEach((b) => {
          bookingsMap[b.id] = b.seat_category;
        });
      }

      // Compute totals
      let totalRevenue = 0;
      let fixedRevenue = 0;
      let floatingRevenue = 0;
      let limitedRevenue = 0;

      txnData?.forEach((txn) => {
        const amt = Number(txn.amount || 0);
        totalRevenue += amt;

        const seat = txn.booking_id ? bookingsMap[txn.booking_id] : null;
        switch (seat?.toLowerCase()) {
          case "fixed":
            fixedRevenue += amt;
            break;
          case "floating":
            floatingRevenue += amt;
            break;
          case "limited":
          case "limited_hours":
            limitedRevenue += amt;
            break;
        }
      });

      setStats({ totalRevenue, fixedRevenue, floatingRevenue, limitedRevenue });

      // Prepare chart data
      if (viewMode === "daily") {
        const daysInMonth = end.getDate();
        const dailyRevenue: Record<string, any> = {};

        // Initialize all days
        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month - 1, d);
          const dateKey = dateObj.toLocaleDateString("en-GB"); // dd/mm/yyyy
          dailyRevenue[dateKey] = { amount: 0, dayLabel: getOrdinal(d) };
        }

        // Fill actual revenue
        txnData?.forEach((txn) => {
          const dateKey = new Date(txn.created_at).toLocaleDateString("en-GB");
          if (dailyRevenue[dateKey]) {
            dailyRevenue[dateKey] = {
              amount: dailyRevenue[dateKey].amount + Number(txn.amount || 0),
              dayLabel: dailyRevenue[dateKey].dayLabel,
            };
          }
        });

        // Convert to chartData with weekend marking
        const chartData = Object.keys(dailyRevenue)
          .sort(
            (a, b) =>
              new Date(a.split("/").reverse().join("-")).getTime() -
              new Date(b.split("/").reverse().join("-")).getTime()
          )
          .map((dateKey) => {
            const dateParts = dateKey.split("/");
            const dateObj = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
            return {
              date: dailyRevenue[dateKey].dayLabel,
              revenue: dailyRevenue[dateKey].amount,
              isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            };
          });

        setRevenueData(chartData);
      } else {
        // Monthly aggregation
        const monthlyRevenue: Record<string, number> = {};
        txnData?.forEach((txn) => {
          const monthKey = new Date(txn.created_at).toLocaleString("default", {
            month: "short",
            year: "numeric",
          });
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(txn.amount || 0);
        });

        const chartData = Object.keys(monthlyRevenue)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .map((month) => ({
            date: month,
            revenue: monthlyRevenue[month],
            isWeekend: false,
          }));

        setRevenueData(chartData);
      }
    } catch (err: any) {
      console.error("❌ Error fetching revenue:", err?.message || JSON.stringify(err));
    } finally {
      setStatsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <Button onClick={() => setViewMode(viewMode === "daily" ? "monthly" : "daily")}>
            Toggle {viewMode === "daily" ? "Monthly" : "Daily"}
          </Button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="p-6 bg-green-600 text-white">
          <h2 className="text-lg">Total Revenue</h2>
          <p className="text-2xl font-bold">₹{formatCurrency(stats.totalRevenue)}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg">Fixed Seats</h2>
          <p className="text-2xl font-bold">₹{formatCurrency(stats.fixedRevenue)}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg">Floating Seats</h2>
          <p className="text-2xl font-bold">₹{formatCurrency(stats.floatingRevenue)}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg">Limited Hours</h2>
          <p className="text-2xl font-bold">₹{formatCurrency(stats.limitedRevenue)}</p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-12 w-full">
        <h2 className="text-lg font-semibold mb-4">
          Revenue Timeline ({viewMode === "daily" ? "Daily" : "Monthly"})
        </h2>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              width: `${Math.max(revenueData.length * 35, 800)}px`,
              height: 350,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `₹${formatCurrency(value)}`} />
                <Bar dataKey="revenue" barSize={8} radius={[4, 4, 0, 0]}>
                  {revenueData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isWeekend ? "#f97316" : "#4f46e5"}
                      style={{ transition: "all 0.2s" }}
                    />
                  ))}
                  <LabelList
                    dataKey="revenue"
                    position="top"
                    formatter={(value: number) => `₹${formatCurrency(value)}`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WalletManagement;
