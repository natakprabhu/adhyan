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

  // Filters + pagination
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchBookings();
  }, [filter]);

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
      // 1️⃣ Update booking payment_status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", paymentBooking.id);

      if (bookingError) throw bookingError;

      // 2️⃣ Insert transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: paymentBooking.users?.id,
          booking_id: paymentBooking.id,
          amount: paymentAmount,
          status: "completed",
          admin_notes: adminNote,
          created_at: new Date().toISOString(),
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Success",
        description: "Payment marked and transaction created.",
      });
      setIsPaymentDialogOpen(false);
      fetchBookings();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to mark payment.",
        variant: "destructive",
      });
    }
  };

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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Booking Info</h3>
              <p>
                <strong>User:</strong> {selectedBooking.users?.name} (
                {selectedBooking.users?.email})
              </p>
              <p>
                <strong>Seat:</strong>{" "}
                {selectedBooking.seats?.seat_number || "-"}
              </p>
              <p>
                <strong>Status:</strong> {selectedBooking.status}
              </p>
              <p>
                <strong>Payment:</strong> {selectedBooking.payment_status}
              </p>
              <p>
                <strong>Start:</strong>{" "}
                {formatDate(selectedBooking.start_time)}
              </p>
              <p>
                <strong>End:</strong> {formatDate(selectedBooking.end_time)}
              </p>
              <p>
                <strong>Admin Notes:</strong>{" "}
                {selectedBooking.admin_notes || "-"}
              </p>

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
                className="h-8"
              />
            </div>
            <div>
              <Label>Admin Note</Label>
              <Input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
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
