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
import { toast } from "@/hooks/use-toast";
import { Eye, Calendar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
interface Booking {
  id: string;
  status: string;
  payment_status: string;
  type: string;
  slot?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  admin_notes?: string;
  users?: {
    id: string;
    name: string;
    email: string;
  };
  seats?: {
    seat_number: number;
  };
}

interface Transaction {
  id: string;
  booking_id: string;
  user_id: string;
  amount: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

export const ManageBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Payment Dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [adminNote, setAdminNote] = useState<string>("");

  // Payment Dialog extra state
  const [transactionDate, setTransactionDate] = useState<string>("");

  // booking date edits (yyyy-mm-dd strings for <input type="date">)
  const [newStartDate, setNewStartDate] = useState<string>("");
  const [newEndDate, setNewEndDate] = useState<string>("");


  // Filters + pagination
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const [isBookingEditOpen, setIsBookingEditOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const handleBookingEdit = (booking: Booking) => {
    setEditBooking(booking);
    setIsBookingEditOpen(true);
  };

  const handleBookingSave = async () => {
    if (!editBooking) return;
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: editBooking.status,
          payment_status: editBooking.payment_status,
          admin_notes: editBooking.admin_notes,
          start_time: editBooking.start_time,
          end_time: editBooking.end_time,
          membership_start_date: editBooking.membership_start_date,
          membership_end_date: editBooking.membership_end_date,
        })
        .eq("id", editBooking.id);

      if (error) throw error;
      toast({ title: "Success", description: "Booking updated successfully" });
      setIsBookingEditOpen(false);
      fetchBookings();
    } catch (err) {
      console.error("Booking update error:", err);
      toast({ title: "Error", description: "Failed to update booking", variant: "destructive" });
    }
  };

  

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

      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Fetch transactions for a specific booking
  const fetchTransactionsByBookingId = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(`📌 Transactions for booking ${bookingId}:`, data);
      setTransactions(data || []);
    } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      setTransactions([]);
    }
  };




  const handleViewBooking = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
    await fetchTransactionsByBookingId(booking.id);
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Booking updated successfully.",
      });
      await fetchBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking.",
        variant: "destructive",
      });
    }
  };

const formatBookingDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long', // use 'short' for Nov instead of November
    year: 'numeric',
  });
};


  const handleMarkPaidClick = (booking: Booking) => {
    setPaymentBooking(booking);
    setPaymentAmount(0);
    setAdminNote("");

    // default transaction date = today in yyyy-mm-dd
    setTransactionDate(new Date().toISOString().split("T")[0]);

    // prefill booking start/end as yyyy-mm-dd (if present)
    setNewStartDate(booking.start_time ? booking.start_time.split("T")[0] : "");
    setNewEndDate(booking.end_time ? booking.end_time.split("T")[0] : "");

    setIsPaymentDialogOpen(true);
  };
  const handlePaymentSubmit = async () => {
  if (!paymentBooking) return;

  if (!paymentAmount || paymentAmount <= 0) {
    toast({
      title: "Error",
      description: "Amount must be greater than 0",
      variant: "destructive",
    });
    return;
  }

  try {
    // Build booking updates (only include fields that admin set)
    const bookingUpdates: any = { payment_status: "paid", admin_notes: adminNote || null };

    // if admin set new start/end, convert to ISO
    if (newStartDate) {
      bookingUpdates.start_time = new Date(newStartDate).toISOString();
      bookingUpdates.membership_start_date = new Date(newStartDate).toISOString();
    }
    if (newEndDate) {
      // set to end of day if you want full day, else ISO of midnight is fine
      bookingUpdates.end_time = new Date(newEndDate).toISOString();
      bookingUpdates.membership_end_date = new Date(newEndDate).toISOString();
    }

    // 1) Update booking
    const { error: bookingError } = await supabase
      .from("bookings")
      .update(bookingUpdates)
      .eq("id", paymentBooking.id);

    if (bookingError) throw bookingError;

    // 2) Insert transaction (use created_at if your DB allows custom timestamps)
    const txn: any = {
      user_id: paymentBooking.users?.id,
      booking_id: paymentBooking.id,
      amount: paymentAmount,
      status: "completed",
      admin_notes: adminNote || null,
    };

    if (transactionDate) {
      // convert yyyy-mm-dd to full ISO so DB stores exact time
      txn.created_at = new Date(transactionDate).toISOString();
    }

    const { error: transactionError } = await supabase.from("transactions").insert(txn);

    if (transactionError) throw transactionError;

    toast({
      title: "Success",
      description: "Payment marked and transaction created.",
    });

    setIsPaymentDialogOpen(false);

    // refresh bookings list and transactions for the booking being viewed
    await fetchBookings();
    if (selectedBooking && selectedBooking.id === paymentBooking.id) {
      await fetchTransactionsByBookingId(paymentBooking.id);
    }
  } catch (error) {
    console.error("handlePaymentSubmit error:", error);
    toast({
      title: "Error",
      description: "Failed to mark payment.",
      variant: "destructive",
    });
  }
};


  // const handlePaymentSubmit = async () => {
  //   if (!paymentBooking) return;

  //   if (!paymentAmount || paymentAmount <= 0) {
  //     toast({
  //       title: "Error",
  //       description: "Amount must be greater than 0",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   try {
  //     // 1️⃣ Update booking payment_status
  //     const { error: bookingError } = await supabase
  //       .from("bookings")
  //       .update({ payment_status: "paid" })
  //       .eq("id", paymentBooking.id);

  //     if (bookingError) throw bookingError;

  //     // 2️⃣ Insert transaction
  //     const { error: transactionError } = await supabase
  //       .from("transactions")
  //       .insert({
  //         user_id: paymentBooking.users?.id,
  //         booking_id: paymentBooking.id,
  //         amount: paymentAmount,
  //         status: "completed",
  //         admin_notes: adminNote,
  //         created_at: new Date().toISOString(),
  //       });

  //     if (transactionError) throw transactionError;

  //     toast({
  //       title: "Success",
  //       description: "Payment marked and transaction created.",
  //     });
  //     setIsPaymentDialogOpen(false);
  //     fetchBookings();
  //   } catch (error) {
  //     console.error(error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to mark payment.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const paginatedBookings = bookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <CardDescription>
            Review and approve bookings, update payment status, and view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant={filter === "confirmed" ? "default" : "outline"}
              onClick={() => setFilter("confirmed")}
            >
              Approved
            </Button>
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
                  <TableCell>{booking.seats?.seat_number || "-"}</TableCell>
                  <TableCell>
                    {booking.membership_start_date
                      ? formatBookingDate(booking.membership_start_date)
                      : '-'}{' '}
                    to{' '}
                    {booking.membership_end_date
                      ? formatBookingDate(booking.membership_end_date)
                      : '-'}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : "destructive"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.payment_status === "paid"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {booking.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBooking(booking)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {booking.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateBooking(booking.id, { status: "confirmed" })
                          }
                        >
                          Approve
                        </Button>
                      )}

                      {booking.payment_status !== "paid" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkPaidClick(booking)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span>
              Page {currentPage} of{" "}
              {Math.ceil(bookings.length / itemsPerPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                currentPage >= Math.ceil(bookings.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

    {/* Booking Details Dialog */}
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="max-w-3xl rounded-2xl shadow-lg bg-white">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold text-gray-900">
        Booking Details
      </DialogTitle>
      <p className="text-sm text-gray-500">
        View and manage all information related to this booking.
      </p>
    </DialogHeader>

    {selectedBooking && (
      <div className="space-y-6">
        {/* Booking Info */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Booking Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500 font-medium">User</span>
              <span className="text-gray-900">
                {selectedBooking.users?.name} ({selectedBooking.users?.email})
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-medium">Seat</span>
              <span className="text-gray-900">
                {selectedBooking.seats?.seat_number || "-"}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-medium">Status</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedBooking.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedBooking.status}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-medium">Payment</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedBooking.payment_status === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {selectedBooking.payment_status}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-medium">Start</span>
              <span className="text-gray-900">
                {formatDate(selectedBooking.start_time)}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-medium">End</span>
              <span className="text-gray-900">
                {formatDate(selectedBooking.end_time)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-gray-500 font-medium">Admin Notes</span>
              <span className="text-gray-900">
                {selectedBooking.admin_notes || "-"}
              </span>
            </div>
          </div>
        </div>



              {/* ✅ Transactions */}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>₹{txn.amount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                txn.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{txn.admin_notes || "-"}</TableCell>
                          <TableCell>{formatDate(txn.created_at)}</TableCell>
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

     {/* Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Mark Payment for {paymentBooking?.users?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"

            />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
            <Label>Booking Start Date</Label>
            <Input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"

            />
             </div>

             <div className="flex flex-col flex-1">
              <Label>Booking End Date</Label>
              <Input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"

              />
            </div>
          </div>

          <div>
            <Label>Admin Note</Label>
            <Input
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />

          </div>



          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentSubmit}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    </div>
  );
};