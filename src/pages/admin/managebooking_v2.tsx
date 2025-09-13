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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Eye, Calendar } from "lucide-react";

interface Booking {
  id: string;
  user_id?: string;
  status: string;
  payment_status: string;
  type: string;
  slot?: string;
  start_time?: string | null;
  end_time?: string | null;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  created_at?: string;
  admin_notes?: string | null;
  users?: {
    id?: string;
    name?: string;
    email?: string;
  };
  seats?: {
    seat_number?: number;
  };
}

interface Transaction {
  id: string;
  booking_id: string;
  user_id?: string;
  amount: string | number;
  status: string;
  created_at: string;
  admin_notes?: string | null;
}

export const ManageBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Edit modal
  const [isBookingEditOpen, setIsBookingEditOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  // Transaction Edit modal
  const [isTxnEditOpen, setIsTxnEditOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [editTxnCreatedAtInput, setEditTxnCreatedAtInput] = useState<string>("");

  // Payment Dialog (create new transaction)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentAdminNote, setPaymentAdminNote] = useState<string>("");
  const [paymentTxnDateInput, setPaymentTxnDateInput] = useState<string>(""); // yyyy-mm-dd

  // booking edit date inputs helper
  const [editBookingStartInput, setEditBookingStartInput] = useState<string>(""); // datetime-local
  const [editBookingEndInput, setEditBookingEndInput] = useState<string>(""); // datetime-local
  const [editMembershipStartInput, setEditMembershipStartInput] = useState<string>(""); // date
  const [editMembershipEndInput, setEditMembershipEndInput] = useState<string>(""); // date

  // Filters + pagination
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  /** ----------------------- helper date helpers ----------------------- **/
  // convert ISO to input type="datetime-local" (local tz)



  // For date-only booking fields (membership_start_date, membership_end_date)
  const inputDateToDB = (val: string) => val || null;

  // For reading from DB into <input type="date">
  const isoToInputDateSimple = (iso?: string | null) => iso || "";

  const isoToInputDateTimeLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    // get local iso without timezone offset
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  };
  // convert input value (datetime-local) to ISO for DB
  const inputDateTimeLocalToISO = (val: string) => {
    if (!val) return null;
    const d = new Date(val); // interprets as local
    return d.toISOString();
  };

  // convert ISO to input date (yyyy-mm-dd)
  const isoToInputDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const inputDateToISO = (val: string) => {
    if (!val) return null;
    // store as start-of-day ISO
    const d = new Date(val + "T00:00:00");
    return d.toISOString();
  };

  const isoToInputDateOnlyForTxn = (iso?: string | null) => {
    if (!iso) return "";
    // Use datetime-local style for created_at editing (YYYY-MM-DDTHH:MM)
    return isoToInputDateTimeLocal(iso);
  };

  /** ----------------------- fetchers ----------------------- **/
  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          users (id, name, email),
          seats (seat_number)
        `
        )
        .order("created_at", { ascending: false });

      if (filter === "pending") query = query.eq("status", "pending");
      else if (filter === "confirmed") query = query.eq("status", "confirmed");

      const { data, error } = await query;
      if (error) throw error;

      console.log("📦 fetched bookings:", data);
      setBookings(data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("❌ fetchBookings error:", err);
      toast({
        title: "Error",
        description: "Failed to fetch bookings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // fetch transactions for a booking
  const fetchTransactionsByBookingId = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log(`📌 Transactions for ${bookingId}:`, data);
      setTransactions(data || []);
    } catch (err) {
      console.error("❌ fetchTransactionsByBookingId error:", err);
      setTransactions([]);
    }
  };

  /** ----------------------- view and open handlers ----------------------- **/
  const handleViewBooking = async (booking: Booking) => {
    console.log("🔎 Viewing booking", booking.id);
    setSelectedBooking(booking);
    setIsDialogOpen(true);
    await fetchTransactionsByBookingId(booking.id);
  };

  /** ----------------------- booking update ----------------------- **/
  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    try {
      console.log("✏️ updateBooking", id, updates);
      const { error } = await supabase.from("bookings").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Booking updated." });
      await fetchBookings();
      // if editing current booking, refetch its transactions
      if (selectedBooking && selectedBooking.id === id) {
        const refreshed = await supabase.from("bookings").select("*").eq("id", id).single();
        if (!refreshed.error) setSelectedBooking(refreshed.data as Booking);
        await fetchTransactionsByBookingId(id);
      }
    } catch (err) {
      console.error("❌ updateBooking error:", err);
      toast({ title: "Error", description: "Failed to update booking.", variant: "destructive" });
    }
  };

  /** ----------------------- Booking Edit modal handlers ----------------------- **/
  const handleBookingEdit = (booking: Booking) => {
    console.log("🟢 handleBookingEdit", booking.id);
    setEditBooking({
      ...booking,
      // keep same shape - we'll update fields directly
    });
    // populate input controls
    setEditBookingStartInput(isoToInputDateSimple(booking.start_time));
    setEditBookingEndInput(isoToInputDateSimple(booking.end_time));
    setEditMembershipStartInput(isoToInputDateSimple(booking.membership_start_date));
    setEditMembershipEndInput(isoToInputDateSimple(booking.membership_end_date));
    setIsBookingEditOpen(true);
  };

  const handleBookingSave = async () => {
    if (!editBooking) return;
    try {
      // build updates from editBooking + date inputs
      const updates: any = {
        status: editBooking.status,
        payment_status: editBooking.payment_status,
        admin_notes: editBooking.admin_notes ?? null,
      };

      if (editBookingStartInput) updates.start_time = inputDateToDB(editBookingStartInput);
      if (editBookingEndInput) updates.end_time = inputDateToDB(editBookingEndInput);
      if (editMembershipStartInput) updates.membership_start_date = inputDateToDB(editMembershipStartInput);
      if (editMembershipEndInput) updates.membership_end_date = inputDateToDB(editMembershipEndInput);

      console.log("💾 handleBookingSave updates:", updates);

      const { error } = await supabase.from("bookings").update(updates).eq("id", editBooking.id);
      if (error) throw error;

      toast({ title: "Success", description: "Booking saved." });
      setIsBookingEditOpen(false);
      // refresh both booking list and selected booking info
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === editBooking.id) {
        const { data } = await supabase.from("bookings").select("*").eq("id", editBooking.id).single();
        setSelectedBooking(data as Booking);
      }
    } catch (err) {
      console.error("❌ handleBookingSave error:", err);
      toast({ title: "Error", description: "Failed to save booking.", variant: "destructive" });
    }
  };

  /** ----------------------- Transaction edit handlers ----------------------- **/
  const handleTxnEdit = (txn: Transaction) => {
    console.log("🟢 handleTxnEdit", txn.id);
    setEditTxn({ ...txn });
    setEditTxnCreatedAtInput(isoToInputDateTimeLocal(txn.created_at));
    setIsTxnEditOpen(true);
  };

  const handleTxnSave = async () => {
    if (!editTxn) return;
    try {
      const updates: any = {
        amount: editTxn.amount,
        status: editTxn.status,
        admin_notes: editTxn.admin_notes ?? null,
      };

      if (editTxnCreatedAtInput) {
        updates.created_at = inputDateTimeLocalToISO(editTxnCreatedAtInput);
      }

      console.log("💾 handleTxnSave updates:", updates);

      const { error } = await supabase.from("transactions").update(updates).eq("id", editTxn.id);
      if (error) throw error;

      toast({ title: "Success", description: "Transaction saved." });
      setIsTxnEditOpen(false);
      // refresh transactions list for the selected booking
      if (selectedBooking) await fetchTransactionsByBookingId(selectedBooking.id);
    } catch (err) {
      console.error("❌ handleTxnSave error:", err);
      toast({ title: "Error", description: "Failed to save transaction.", variant: "destructive" });
    }
  };

  /** ----------------------- Payment (create transaction) handlers ----------------------- **/
  const handleMarkPaidClick = (booking: Booking) => {
    setPaymentBooking(booking);
    setPaymentAmount("");
    setPaymentAdminNote("");
    setPaymentTxnDateInput(new Date().toISOString().slice(0, 10)); // default to today yyyy-mm-dd
    // also prefill booking date inputs so admin can change booking dates here if needed
    setEditBookingStartInput(isoToInputDateTimeLocal(booking.start_time));
    setEditBookingEndInput(isoToInputDateTimeLocal(booking.end_time));
    setEditMembershipStartInput(isoToInputDate(booking.membership_start_date));
    setEditMembershipEndInput(isoToInputDate(booking.membership_end_date));
    setPaymentBooking(booking);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentBooking) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast({ title: "Error", description: "Enter valid amount.", variant: "destructive" });
      return;
    }

    try {
      // Build booking updates if admin changed any booking dates / admin note
      const bookingUpdates: any = { payment_status: "paid" };
      if (paymentAdminNote) bookingUpdates.admin_notes = paymentAdminNote;
      if (editBookingStartInput) bookingUpdates.start_time = inputDateTimeLocalToISO(editBookingStartInput);
      if (editBookingEndInput) bookingUpdates.end_time = inputDateTimeLocalToISO(editBookingEndInput);
      if (editMembershipStartInput) bookingUpdates.membership_start_date = inputDateToISO(editMembershipStartInput);
      if (editMembershipEndInput) bookingUpdates.membership_end_date = inputDateToISO(editMembershipEndInput);

      console.log("▶️ handlePaymentSubmit bookingUpdates:", bookingUpdates);

      // 1) Update booking
      const { error: bookingError } = await supabase.from("bookings").update(bookingUpdates).eq("id", paymentBooking.id);
      if (bookingError) throw bookingError;

      // 2) Insert transaction (use created_at from input if present)
      const txn: any = {
        booking_id: paymentBooking.id,
        user_id: paymentBooking.users?.id ?? paymentBooking.user_id,
        amount: paymentAmount,
        status: "completed",
      };
      if (paymentAdminNote) txn.admin_notes = paymentAdminNote;
      if (paymentTxnDateInput) {
        // paymentTxnDateInput is yyyy-mm-dd -> create ISO (start of day)
        txn.created_at = new Date(paymentTxnDateInput + "T00:00:00").toISOString();
      }

      console.log("▶️ handlePaymentSubmit insert txn:", txn);

      const { error: txnError } = await supabase.from("transactions").insert(txn);
      if (txnError) throw txnError;

      toast({ title: "Success", description: "Payment recorded and transaction created." });
      setIsPaymentDialogOpen(false);
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === paymentBooking.id) {
        await fetchTransactionsByBookingId(paymentBooking.id);
      }
    } catch (err) {
      console.error("❌ handlePaymentSubmit error:", err);
      toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" });
    }
  };

  const formatDate = (dateString?: string) =>
    dateString ? new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

  const paginatedBookings = bookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manage Bookings
          </CardTitle>
          <CardDescription>Review and manage bookings & transactions</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
            <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
            <Button variant={filter === "confirmed" ? "default" : "outline"} onClick={() => setFilter("confirmed")}>Approved</Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.users?.name}</TableCell>
                  <TableCell>{booking.seats?.seat_number ?? "-"}</TableCell>
                  <TableCell>
                    {booking.membership_start_date ? formatDate(booking.membership_start_date) : "-"} to {booking.membership_end_date ? formatDate(booking.membership_end_date) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.status === "confirmed" ? "default" : "destructive"}>{booking.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.payment_status === "paid" ? "secondary" : "destructive"}>{booking.payment_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewBooking(booking)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>

                      {booking.status === "pending" && (
                        <Button size="sm" onClick={() => updateBooking(booking.id, { status: "confirmed" })}>Approve</Button>
                      )}

                      {booking.payment_status !== "paid" && (
                        <Button size="sm" variant="secondary" onClick={() => handleMarkPaidClick(booking)}>Mark Paid</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</Button>
            <span>Page {currentPage} of {Math.max(1, Math.ceil(bookings.length / itemsPerPage))}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(bookings.length / itemsPerPage)} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------ Booking Details Dialog (VIEW) ------------------ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl shadow-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Booking Details</DialogTitle>
            <p className="text-sm text-gray-500">View and manage this booking</p>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking info */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>User</Label>
                    <div>{selectedBooking.users?.name} ({selectedBooking.users?.email})</div>
                  </div>
                  <div>
                    <Label>Seat</Label>
                    <div>{selectedBooking.seats?.seat_number ?? "-"}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div>{selectedBooking.status}</div>
                  </div>
                  <div>
                    <Label>Payment</Label>
                    <div>{selectedBooking.payment_status}</div>
                  </div>
                  <div>
                    <Label>Start</Label>
                    <div>{formatDate(selectedBooking.start_time)}</div>
                  </div>
                  <div>
                    <Label>End</Label>
                    <div>{formatDate(selectedBooking.end_time)}</div>
                  </div>
                  <div className="col-span-2">
                    <Label>Admin Notes</Label>
                    <div>{selectedBooking.admin_notes ?? "-"}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => handleBookingEdit(selectedBooking)}>Edit Booking</Button>
                  <Button variant="secondary" onClick={() => { setPaymentBooking(selectedBooking); setIsPaymentDialogOpen(true); }}>Create Transaction</Button>
                </div>
              </div>

              {/* Transactions */}
              <div className="border p-4 rounded-md">
                <h3 className="font-semibold mb-2">Transactions</h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-500">No transactions found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Admin Notes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>₹{Number(txn.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={txn.status === "completed" ? "default" : "secondary"}>{txn.status}</Badge>
                          </TableCell>
                          <TableCell>{txn.admin_notes ?? "-"}</TableCell>
                          <TableCell>{formatDate(txn.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleTxnEdit(txn)}>Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------ Booking Edit Dialog ------------------ */}
      <Dialog open={isBookingEditOpen} onOpenChange={setIsBookingEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>

          {editBooking && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Input value={editBooking.status} onChange={(e) => setEditBooking({ ...editBooking, status: e.target.value })} />
              </div>

              <div>
                <Label>Payment Status</Label>
                <Input value={editBooking.payment_status} onChange={(e) => setEditBooking({ ...editBooking, payment_status: e.target.value })} />
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea value={editBooking.admin_notes ?? ""} onChange={(e) => setEditBooking({ ...editBooking, admin_notes: e.target.value })} />
              </div>

              <div>
                <Label>Start time</Label>
                <Input type="datetime-local" value={editBookingStartInput} onChange={(e) => setEditBookingStartInput(e.target.value)} />
              </div>

              <div>
                <Label>End time</Label>
                <Input type="datetime-local" value={editBookingEndInput} onChange={(e) => setEditBookingEndInput(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Membership start</Label>
                  <Input type="date" value={editMembershipStartInput} onChange={(e) => setEditMembershipStartInput(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label>Membership end</Label>
                  <Input type="date" value={editMembershipEndInput} onChange={(e) => setEditMembershipEndInput(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsBookingEditOpen(false)}>Cancel</Button>
                <Button onClick={handleBookingSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------ Transaction Edit Dialog ------------------ */}
      <Dialog open={isTxnEditOpen} onOpenChange={setIsTxnEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>

          {editTxn && (
            <div className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={String(editTxn.amount)} onChange={(e) => setEditTxn({ ...editTxn, amount: e.target.value })} />
              </div>

              <div>
                <Label>Status</Label>
                <select value={editTxn.status} onChange={(e) => setEditTxn({ ...editTxn, status: e.target.value })} className="w-full p-2 border rounded">
                  <option value="pending">pending</option>
                  <option value="completed">completed</option>
                  <option value="failed">failed</option>
                </select>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea value={editTxn.admin_notes ?? ""} onChange={(e) => setEditTxn({ ...editTxn, admin_notes: e.target.value })} />
              </div>

              <div>
                <Label>Created at</Label>
                <Input type="datetime-local" value={editTxnCreatedAtInput} onChange={(e) => setEditTxnCreatedAtInput(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Adjust transaction timestamp if needed.</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTxnEditOpen(false)}>Cancel</Button>
                <Button onClick={handleTxnSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------ Payment Dialog (create transaction) ------------------ */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={paymentAmount as any} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </div>

            <div>
              <Label>Transaction Date</Label>
              <Input type="date" value={paymentTxnDateInput} onChange={(e) => setPaymentTxnDateInput(e.target.value)} />
            </div>

            <div>
              <Label>Admin Note (booking)</Label>
              <Input value={paymentAdminNote} onChange={(e) => setPaymentAdminNote(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Booking Start</Label>
                <Input type="date" value={editMembershipStartInput} onChange={(e) => setEditMembershipStartInput(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Booking End</Label>
                <Input type="date" value={editMembershipEndInput} onChange={(e) => setEditMembershipEndInput(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handlePaymentSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
