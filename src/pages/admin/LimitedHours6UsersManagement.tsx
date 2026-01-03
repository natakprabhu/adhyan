"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Calendar, Eye, Clock, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RepeatBookingData {
  startDate: string;
  durationMonths: number;
  monthlyCost: number;
  slot: "morning" | "evening";
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  approved: boolean;
  created_at: string;
  // enriched fields below:
  validity_from?: string | null;
  validity_to?: string | null;
  days_remaining?: number | null;
  seat_type?: string | null; // 'limited'
  last_slot?: "morning" | "evening" | null;
}

interface Booking {
  id: string;
  membership_start_date: string;
  membership_end_date: string;
  status: string;
  payment_status: string;
  slot?: "morning" | "evening" | null;
  seat_category?: string;
  monthly_cost?: number | string;
  duration_months?: number;
  seats?: { seat_number?: number } | null;
}

interface UserTransaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string | null;
  booking_id?: string | null;
}

export default function LimitedHours6UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [userData, setUserData] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired" | "spam">("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Repeat booking dialog state
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false);
  const [repeatBookingData, setRepeatBookingData] = useState<RepeatBookingData>({
    startDate: "",
    durationMonths: 1,
    monthlyCost: 1200, // default monthly cost
    slot: "morning",
  });
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [newTransaction, setNewTransaction] = useState<{ amount: string; admin_notes: string }>({
    amount: "",
    admin_notes: "",
  });

  useEffect(() => {
    fetchLimitedUsers();
  }, []);

  // Fetch users and enrich with their latest limited booking
  const fetchLimitedUsers = async () => {
    try {
      setIsLoading(true);

      // fetch all users (or you can filter by approved true if desired)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      if (!usersData) {
        setUsers([]);
        setUserData([]);
        return;
      }

      // For each user, fetch latest limited booking (if any)
      const enriched = await Promise.all(
        usersData.map(async (u: any) => {
          try {
            const { data: bookings, error: bookingError } = await supabase
              .from("bookings")
              .select("id, membership_start_date, membership_end_date, slot, seat_category, monthly_cost, duration_months")
              .eq("user_id", u.id)
              .eq("seat_category", "limited6")
              .eq("status", "confirmed")
              .eq("payment_status", "paid")
              .order("membership_start_date", { ascending: false })
              .limit(1);

            if (bookingError) throw bookingError;

            if (!bookings || bookings.length === 0) {
              return null; // user has no limited-hours booking
            }

            const booking: Booking = bookings[0];

            const validity_from = booking.membership_start_date || null;
            const validity_to = booking.membership_end_date || null;

            let days_remaining: number | null = null;
            if (validity_to) {
              const today = new Date();
              const endDate = new Date(validity_to);

              const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
              const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

              days_remaining = Math.ceil((endUTC - todayUTC) / (1000 * 60 * 60 * 24));
            }

            return {
              ...u,
              validity_from,
              validity_to,
              days_remaining,
              seat_type: booking.seat_category || "limited9",
              last_slot: booking.slot || null,
            } as User;
          } catch (err) {
            console.error("Error fetching booking for user", u.id, err);
            return null;
          }
        })
      );

      const filtered = (enriched.filter(Boolean) as User[]).map((u) => ({
        ...u,
        // ensure fields exist
        last_slot: u.last_slot ?? null,
        seat_type: u.seat_type ?? "limited",
      }));

      setUsers(usersData);
      setUserData(filtered);
    } catch (err: any) {
      console.error("Error fetching limited-hours users:", err);
      toast({
        title: "Error",
        description: "Failed to fetch limited hours users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    await fetchUserTransactions(user.id);
    setIsDialogOpen(true);
  };

  const handleAddTransaction = async () => {
    if (!selectedUser) return;
    if (!newTransaction.amount) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }
    try {
      setIsAddingTx(true);
      const { error } = await supabase.from("transactions").insert({
        user_id: selectedUser.id,
        amount: Number(newTransaction.amount),
        status: "completed",
        admin_notes: newTransaction.admin_notes || null,
      });

      if (error) throw error;
      toast({ title: "Success", description: "Transaction added" });
      setNewTransaction({ amount: "", admin_notes: "" });
      await fetchUserTransactions(selectedUser.id);
    } catch (err: any) {
      console.error("Add transaction error:", err);
      toast({ title: "Error", description: "Failed to add transaction", variant: "destructive" });
    } finally {
      setIsAddingTx(false);
    }
  };

  const handleRepeatBooking = async () => {
    if (!selectedUser) return;
    if (!repeatBookingData.startDate || !repeatBookingData.durationMonths) {
      toast({ title: "Error", description: "Start date and duration required", variant: "destructive" });
      return;
    }

    try {
      const startDate = new Date(repeatBookingData.startDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + repeatBookingData.durationMonths);

      const newBooking = {
        user_id: selectedUser.id,
        type: "membership",
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: "confirmed",
        payment_status: "paid",
        membership_start_date: startDate.toISOString().split("T")[0],
        membership_end_date: endDate.toISOString().split("T")[0],
        seat_category: "limited6",
        slot: repeatBookingData.slot,
        monthly_cost: repeatBookingData.monthlyCost,
        duration_months: repeatBookingData.durationMonths,
        description: `Limited Hours seat membership for ${repeatBookingData.durationMonths} month(s) - ${repeatBookingData.slot}`,
      };

      const { error } = await supabase.from("bookings").insert([newBooking]);
      if (error) throw error;

      toast({
        title: "Repeat Booking Created",
        description: `${selectedUser.name}'s limited-hours booking created.`,
      });

      setIsRepeatDialogOpen(false);
      setRepeatBookingData({
        startDate: "",
        durationMonths: 1,
        monthlyCost: 1200,
        slot: "morning",
      });

      await fetchLimitedUsers();
    } catch (err: any) {
      console.error("Repeat booking error:", err);
      toast({ title: "Error", description: "Failed to create repeat booking", variant: "destructive" });
    }
  };

  // sorting helpers
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const computeStatus = (u: User) => {
    if (!u.approved) return "Pending";
    if (!u.validity_from || !u.validity_to) return "Approved";
    const today = new Date();
    const validFrom = new Date(u.validity_from as string);
    const validTo = new Date(u.validity_to as string);
    if (today < validFrom) return "Future Valid";
    if (today > validTo) return "Expired";
    return "Active";
  };

  const sortedUsers = [...userData].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any = a[key];
    let valB: any = b[key];

    if (key === "status") {
      valA = computeStatus(a);
      valB = computeStatus(b);
    }

    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    if (typeof valA === "string" && typeof valB === "string") {
      return direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return direction === "asc" ? valA - valB : valB - valA;
    }

    if (key.includes("date") || key.includes("created") || key.includes("validity")) {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      return direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    return 0;
  });

  const filteredUsers = sortedUsers.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const status = computeStatus(u);
    const matchFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && status === "Active") ||
      (filterStatus === "expired" && status === "Expired") ||
      (filterStatus === "spam" && status === "Expired" && (u.days_remaining ?? -999) < -5);

    return matchSearch && matchFilter;
  });

  const formatDate = (dateString?: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

  const getSeatTypeBadge = (user: User) => {
    const label = user.last_slot === "morning" ? "Limited • Morning" : user.last_slot === "evening" ? "Limited • Evening" : "Limited";
    return <Badge className="bg-purple-600 text-white">{label}</Badge>;
  };

  const getStatusBadge = (user: User) => {
    const status = computeStatus(user);
    if (status === "Pending") return <Badge variant="secondary">Pending</Badge>;
    if (status === "Approved") return <Badge variant="outline">Approved</Badge>;
    if (status === "Future Valid") return <Badge variant="default">Future</Badge>;
    if (status === "Expired") return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="secondary">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Limited Hours (6 Hours) Users
          </CardTitle>
          <CardDescription>Manage memberships — Morning,Afternoon,Evening,Night shifts</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <Input placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-2 mb-4">
            <Button variant={filterStatus === "all" ? "default" : "outline"} onClick={() => setFilterStatus("all")}>All</Button>
            <Button variant={filterStatus === "active" ? "primary" : "outline"} onClick={() => setFilterStatus("active")}>Active</Button>
            <Button variant={filterStatus === "expired" ? "primary" : "outline"} onClick={() => setFilterStatus("expired")}>Expired</Button>
            <button onClick={() => setFilterStatus("spam")} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === "spam" ? "bg-red-600 text-white" : "bg-red-500 text-white hover:bg-red-600"}`}>
              <Trash2 className="h-4 w-4" /><span>Spam</span>
            </button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No.</TableHead>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer">Name{getSortIndicator("name")}</TableHead>
                <TableHead onClick={() => handleSort("email")} className="cursor-pointer">Email{getSortIndicator("email")}</TableHead>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer">Status{getSortIndicator("status")}</TableHead>
                <TableHead onClick={() => handleSort("validity_from")} className="cursor-pointer">Validity Start{getSortIndicator("validity_from")}</TableHead>
                <TableHead onClick={() => handleSort("validity_to")} className="cursor-pointer">Validity End{getSortIndicator("validity_to")}</TableHead>
                <TableHead onClick={() => handleSort("days_remaining")} className="cursor-pointer">Days Remaining{getSortIndicator("days_remaining")}</TableHead>
                <TableHead onClick={() => handleSort("seat_type")} className="cursor-pointer">Shift{getSortIndicator("seat_type")}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredUsers.map((u, i) => (
                <TableRow key={u.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{getStatusBadge(u)}</TableCell>
                  <TableCell>{u.validity_from ? formatDate(u.validity_from) : "-"}</TableCell>
                  <TableCell>{u.validity_to ? formatDate(u.validity_to) : "-"}</TableCell>
                  <TableCell>{u.days_remaining != null ? u.days_remaining : "-"}</TableCell>
                  <TableCell>{getSeatTypeBadge(u)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewUser(u)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button variant="default" size="sm" onClick={() => { setSelectedUser(u); setIsRepeatDialogOpen(true); setRepeatBookingData((r) => ({ ...r, slot: u.last_slot ?? "morning", monthlyCost: 1200 })); }}>
                        <Plus className="h-4 w-4 mr-1" /> Repeat
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW USER DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.name}</DialogTitle>
            <DialogDescription>View and manage transactions for this user</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label>Name</Label><p className="font-medium">{selectedUser.name}</p></div>
                  <div><Label>Email</Label><p className="font-medium">{selectedUser.email}</p></div>
                  <div><Label>Phone</Label><p className="font-medium">{selectedUser.phone}</p></div>
                  <div><Label>Status</Label>{getStatusBadge(selectedUser)}</div>
                  <div><Label>Validity Start</Label><p>{selectedUser.validity_from ? formatDate(selectedUser.validity_from) : "-"}</p></div>
                  <div><Label>Validity End</Label><p>{selectedUser.validity_to ? formatDate(selectedUser.validity_to) : "-"}</p></div>
                  <div><Label>Days Remaining</Label><p>{selectedUser.days_remaining != null ? selectedUser.days_remaining : "-"}</p></div>
                  <div><Label>Shift</Label><p>{selectedUser.last_slot ? (selectedUser.last_slot === "morning" ? "Morning (6AM–3PM)" : "Evening (3PM–12AM)") : "-"}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Transaction</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input value="completed" disabled className="bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Input placeholder="Optional notes" value={newTransaction.admin_notes} onChange={(e) => setNewTransaction({ ...newTransaction, admin_notes: e.target.value })} />
                  </div>

                  <div className="col-span-3 flex justify-end">
                    <Button onClick={handleAddTransaction} disabled={isAddingTx}>{isAddingTx ? "Adding..." : "Add Transaction"}</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Transaction History</CardTitle></CardHeader>
                <CardContent>
                  {userTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No transactions found</p>
                  ) : (
                    <div className="space-y-3">
                      {userTransactions.map(tx => (
                        <div key={tx.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">₹{tx.amount} - {tx.status}</p>
                              {tx.admin_notes && <p className="text-xs text-muted-foreground mt-1">Admin Notes: {tx.admin_notes}</p>}
                            </div>
                            <Badge variant={tx.status === "completed" ? "default" : "secondary"}>{tx.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* REPEAT BOOKING DIALOG */}
      <Dialog open={isRepeatDialogOpen} onOpenChange={setIsRepeatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Repeat Booking: {selectedUser?.name}</DialogTitle>
            <DialogDescription>Extend limited-hours membership for this user</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={repeatBookingData.startDate} onChange={(e) => setRepeatBookingData({ ...repeatBookingData, startDate: e.target.value })} />
            </div>

            <div>
              <Label>Duration (Months)</Label>
              <Input type="number" min={1} value={repeatBookingData.durationMonths} onChange={(e) => setRepeatBookingData({ ...repeatBookingData, durationMonths: Number(e.target.value) })} />
            </div>

            <div>
              <Label>Slot</Label>
              <select value={repeatBookingData.slot} onChange={(e) => setRepeatBookingData({ ...repeatBookingData, slot: e.target.value as "morning" | "evening" })} className="w-full h-10 border rounded-md px-2">
                <option value="morning">Morning (6 AM – 3 PM)</option>
                <option value="evening">Evening (3 PM – 12 AM)</option>
              </select>
            </div>

            <div>
              <Label>Monthly Cost (₹)</Label>
              <Input type="number" value={repeatBookingData.monthlyCost} onChange={(e) => setRepeatBookingData({ ...repeatBookingData, monthlyCost: Number(e.target.value) })} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={handleRepeatBooking}>Confirm Repeat Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
