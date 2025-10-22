"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  approved: boolean;
}

interface Booking {
  id: string;
  seat_id: string | null;
  seat_number?: number | null;
  status: string;
  payment_status: string;
  membership_start_date: string | null;
  membership_end_date: string | null;
}

interface Transaction {
  id: string;
  booking_id: string;
  amount: string | null;
  status: string | null;
}

export const MasterAdminView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bookingsMap, setBookingsMap] = useState<Record<string, Booking[]>>({});
  const [transactionsMap, setTransactionsMap] = useState<Record<string, Transaction[]>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: userError } = await supabase.from("users").select("*");
      if (userError) throw userError;

      setUsers(usersData || []);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*, seats(id, seat_number)")
        .order("membership_start_date", { ascending: true });
      if (bookingsError) throw bookingsError;

      // Map bookings per user
      const map: Record<string, Booking[]> = {};
      (bookingsData || []).forEach((b: any) => {
        const userBookings = map[b.user_id] || [];
        userBookings.push({
          id: b.id,
          seat_id: b.seat_id,
          seat_number: b.seats?.seat_number || null,
          status: b.status,
          payment_status: b.payment_status,
          membership_start_date: b.membership_start_date,
          membership_end_date: b.membership_end_date,
        });
        map[b.user_id] = userBookings;
      });
      setBookingsMap(map);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*");
      if (transactionsError) throw transactionsError;

      // Map transactions per booking
      const txnMap: Record<string, Transaction[]> = {};
      (transactionsData || []).forEach((t) => {
        const bTxns = txnMap[t.booking_id] || [];
        bTxns.push(t);
        txnMap[t.booking_id] = bTxns;
      });
      setTransactionsMap(txnMap);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (user: User) => {
    try {
      await supabase.from("users").update({
        name: user.name,
        phone: user.phone,
        email: user.email,
        approved: user.approved,
      }).eq("id", user.id);
      toast({ title: "User updated" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Error saving user", description: err.message, variant: "destructive" });
    }
  };

  const saveBooking = async (booking: Booking) => {
    try {
      await supabase.from("bookings").update({
        status: booking.status,
        payment_status: booking.payment_status,
        membership_start_date: booking.membership_start_date,
        membership_end_date: booking.membership_end_date,
        seat_id: booking.seat_id,
      }).eq("id", booking.id);
      if (booking.seat_id && booking.seat_number !== undefined) {
        await supabase.from("seats").update({ seat_number: booking.seat_number }).eq("id", booking.seat_id);
      }
      toast({ title: "Booking updated" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Error saving booking", description: err.message, variant: "destructive" });
    }
  };

  const saveTransaction = async (txn: Transaction) => {
    try {
      await supabase.from("transactions").update({
        amount: txn.amount,
        status: txn.status,
      }).eq("id", txn.id);
      toast({ title: "Transaction updated" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Error saving transaction", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <Loader2 className="animate-spin w-6 h-6 m-10" />;

  return (
    <div className="space-y-4 p-4">
      {users.map((user) => (
        <Card key={user.id} className="bg-white shadow-md">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Input
                  value={user.name}
                  onChange={(e) => setUsers(users.map(u => u.id === user.id ? {...u, name: e.target.value} : u))}
                  className="mb-1"
                />
                <Input
                  value={user.email}
                  onChange={(e) => setUsers(users.map(u => u.id === user.id ? {...u, email: e.target.value} : u))}
                  className="mb-1"
                />
                <Input
                  value={user.phone}
                  onChange={(e) => setUsers(users.map(u => u.id === user.id ? {...u, phone: e.target.value} : u))}
                  className="mb-1"
                />
                <Input
                  value={user.approved ? "true" : "false"}
                  onChange={(e) => setUsers(users.map(u => u.id === user.id ? {...u, approved: e.target.value === "true"} : u))}
                />
              </div>
              <Button onClick={() => saveUser(user)}>Save User</Button>
              <Button variant="outline" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                {expandedUser === user.id ? "Hide Bookings" : "Show Bookings"}
              </Button>
            </div>

            {expandedUser === user.id && bookingsMap[user.id]?.map((booking) => (
              <Card key={booking.id} className="ml-6 mt-2 bg-gray-50">
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      value={booking.status}
                      onChange={(e) => setBookingsMap({
                        ...bookingsMap,
                        [user.id]: bookingsMap[user.id].map(b => b.id === booking.id ? {...b, status: e.target.value} : b)
                      })}
                    />
                    <Input
                      value={booking.payment_status}
                      onChange={(e) => setBookingsMap({
                        ...bookingsMap,
                        [user.id]: bookingsMap[user.id].map(b => b.id === booking.id ? {...b, payment_status: e.target.value} : b)
                      })}
                    />
                    <Input
                      type="date"
                      value={booking.membership_start_date?.slice(0,10) || ""}
                      onChange={(e) => setBookingsMap({
                        ...bookingsMap,
                        [user.id]: bookingsMap[user.id].map(b => b.id === booking.id ? {...b, membership_start_date: e.target.value} : b)
                      })}
                    />
                    <Input
                      type="date"
                      value={booking.membership_end_date?.slice(0,10) || ""}
                      onChange={(e) => setBookingsMap({
                        ...bookingsMap,
                        [user.id]: bookingsMap[user.id].map(b => b.id === booking.id ? {...b, membership_end_date: e.target.value} : b)
                      })}
                    />
                    <Input
                      type="number"
                      value={booking.seat_number || ""}
                      onChange={(e) => setBookingsMap({
                        ...bookingsMap,
                        [user.id]: bookingsMap[user.id].map(b => b.id === booking.id ? {...b, seat_number: Number(e.target.value)} : b)
                      })}
                    />
                    <Button onClick={() => saveBooking(booking)}>Save Booking</Button>
                    <Button variant="outline" onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}>
                      {expandedBooking === booking.id ? "Hide Txns" : "Show Txns"}
                    </Button>
                  </div>

                  {expandedBooking === booking.id && transactionsMap[booking.id]?.map((txn) => (
                    <div key={txn.id} className="ml-6 mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        value={txn.amount || ""}
                        onChange={(e) => setTransactionsMap({
                          ...transactionsMap,
                          [booking.id]: transactionsMap[booking.id].map(t => t.id === txn.id ? {...t, amount: e.target.value} : t)
                        })}
                      />
                      <Input
                        value={txn.status || ""}
                        onChange={(e) => setTransactionsMap({
                          ...transactionsMap,
                          [booking.id]: transactionsMap[booking.id].map(t => t.id === txn.id ? {...t, status: e.target.value} : t)
                        })}
                      />
                      <Button onClick={() => saveTransaction(txn)}>Save Txn</Button>
                    </div>
                  ))}

                </CardContent>
              </Card>
            ))}

          </CardContent>
        </Card>
      ))}
    </div>
  );
};
