"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Calendar, Eye, Clock, Plus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  phone: string;
  approved: boolean;
  created_at: string;
  seat_type?: string;
}

interface Booking {
  id: string;
  user_id: string;
  seat_id: string;
  type: string;
  slot?: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  payment_screenshot_url?: string;
  receipt_sent: boolean;
  receipt_sent_at?: string;
  description: string;
  seat_category?: string;
  duration_months?: number;
  monthly_cost?: string;
  membership_start_date?: string;
  membership_end_date?: string;
  seat_number?: string;
}

interface UserTransaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string;
}

export const FixedUsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    status: '',
    admin_notes: ''
  });
  const [isAddingTx, setIsAddingTx] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);


  // Filter state: 'all' | 'active' | 'expired'
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');


// Repeat Booking modal state
const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false);
const [repeatBookingData, setRepeatBookingData] = useState({
  startDate: '',       // Date admin selects
  monthlyCost: 0,      // Default previous cost
  seatNumber: 0,       // Fixed seat number
});
const [isRepeating, setIsRepeating] = useState(false); // loading state


  useEffect(() => {
    fetchFixedUsers();
  }, []);

  const fetchFixedUsers = async () => {
    try {
      setIsLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const enrichedUsers = await Promise.all(
        (usersData || []).map(async (user: User) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              *,
              seats(seat_number)
            `)
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .eq('payment_status', 'paid')
            .order('membership_start_date', { ascending: false })
            .limit(1);

          if (bookingsError) throw bookingsError;

          let validity_from: string | null = null;
          let validity_to: string | null = null;
          let seat_type: string | null = null;
          let seat_number: string | null = null;

          if (bookings && bookings.length > 0) {
            const booking = bookings[0];
            validity_from = booking.membership_start_date || null;
            validity_to = booking.membership_end_date || null;
            seat_type = booking.seat_category || null;
            seat_number = booking?.seats?.seat_number || null;
          }

          let days_remaining: number | null = null;
          if (validity_to) {
            const today = new Date();
            const endDate = new Date(validity_to);
            days_remaining = Math.max(
              Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
              0
            );
          }

          return {
            ...user,
            validity_from,
            validity_to,
            days_remaining,
            seat_type,
            seat_number,
          };
        })
      );

      const fixedUsers = enrichedUsers.filter(u => u.seat_type?.toLowerCase() === 'fixed');

      setUsers(usersData || []);
      setUserData(fixedUsers);
    } catch (error) {
      console.error('Error fetching fixed users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch fixed users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions.",
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
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: selectedUser.id,
        amount: Number(newTransaction.amount),
        status: "completed",
        admin_notes: newTransaction.admin_notes || null,
      });

      if (error) throw error;
      toast({ title: "Success", description: "Transaction added successfully." });
      setNewTransaction({ amount: '', status: '', admin_notes: '' });
      await fetchUserTransactions(selectedUser.id);
    } catch (err) {
      toast({ title: "Error", description: "Failed to add transaction.", variant: "destructive" });
      console.error("Error adding transaction:", err.message);
    }
  };

  const handleRepeatBooking = async () => {
    if (!selectedUser) return;

    try {
      setIsRepeating(true);

      const start = new Date(repeatBookingData.startDate);

      const startDate = new Date(repeatBookingData.startDate);
      startDate.setHours(14, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setHours(14, 0, 0, 0);

      const { data: lastBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid')
        .order('membership_start_date', { ascending: false })
        .limit(1)
        .single();

      const seatId = lastBooking?.seat_id;

      const { error: bookingError } = await supabase.from('bookings').insert({
        user_id: selectedUser.id,
        seat_id: selectedUser.seat_id,
        type: 'membership',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        payment_status: 'pending',
        description: `Repeat booking of seat ${selectedUser.seat_number}`,
        seat_category: "fixed",
        duration_months: 1, // can be dynamic if needed
        monthly_cost: selectedUser.monthly_cost || 0, // reuse previous cost
        membership_start_date: repeatBookingData.startDate,
        membership_end_date: endDate.toISOString().split('T')[0]
      });

const bookingRow = {
  user_id: selectedUser.id,
  seat_id: selectedUser.seat_id,
  type: 'membership',
  start_time: startDate.toISOString(),
  end_time: endDate.toISOString(),
  status: 'pending',
  payment_status: 'pending',
  description: `Repeat booking of seat ${selectedUser.seat_number}`,
  seat_category: "fixed",
  duration_months: 1, // can be dynamic if needed
  monthly_cost: selectedUser.monthly_cost || 0, // reuse previous cost
  membership_start_date: repeatBookingData.startDate,
  membership_end_date: endDate.toISOString().split('T')[0]
};


      console.log("Repeat booking row to insert:", bookingRow);

      if (bookingError) throw bookingError;

      const { error: txError } = await supabase.from('transactions').insert({
        user_id: selectedUser.id,
        amount: Number(repeatBookingData.amount),
        status: 'completed',
        admin_notes: 'Auto-added via Repeat Booking',
      });

      if (txError) throw txError;

      toast({ title: 'Success', description: 'Repeat booking created successfully.' });

      await fetchFixedUsers();
      await fetchUserTransactions(selectedUser.id);

      setIsRepeatDialogOpen(false);
      setRepeatBookingData({ amount: '', startDate: '' });
    } catch (err) {
      console.error('Error repeating booking:', err);
      toast({ title: 'Error', description: 'Failed to repeat booking.', variant: 'destructive' });
    } finally {
      setIsRepeating(false);
    }
  };


  const handleRepeatBookingModal = (user: User) => {
    setSelectedUser(user);

    setRepeatBookingData({
      startDate: '',                  // Admin picks the start date
      monthlyCost: user.monthly_cost || 0,  // Reuse previous cost
      seatNumber: user.seat_number || 0,    // Use actual seat number for fixed seat
    });

    setIsRepeatDialogOpen(true);
  };

  const getSeatTypeBadge = (seatType?: string) => {
    if (!seatType) return <Badge variant="outline">-</Badge>;
    const formatted = seatType.charAt(0).toUpperCase() + seatType.slice(1).toLowerCase();
    if (seatType.toLowerCase() === 'floating') return <Badge className="bg-yellow-500 text-white">{formatted}</Badge>;
    if (seatType.toLowerCase() === 'fixed') return <Badge className="bg-blue-500 text-white">{formatted}</Badge>;
    return <Badge variant="outline">{formatted}</Badge>;
  };

  const formatDate = (dateString: string) =>
    dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const getStatusBadge = (user: any) => {
    if (!user.approved) return <Badge variant="secondary">Pending</Badge>;
    if (!user.validity_from || !user.validity_to) return <Badge variant="outline">Approved</Badge>;
    const today = new Date();
    const validFrom = new Date(user.validity_from);
    const validTo = new Date(user.validity_to);
    if (today < validFrom) return <Badge variant="default">Future Valid</Badge>;
    if (today > validTo) return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="secondary">Active</Badge>;
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => prev && prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  const getSortIndicator = (key: string) => !sortConfig || sortConfig.key !== key ? '' : sortConfig.direction === 'asc' ? ' ▲' : ' ▼';

  const sortedUsers = [...userData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any = a[key];
    let valB: any = b[key];

    if (key === 'status') {
      const computeStatus = (user: any) => {
        if (!user.approved) return 'Pending';
        if (!user.validity_from || !user.validity_to) return 'Approved';
        const today = new Date();
        const validFrom = new Date(user.validity_from);
        const validTo = new Date(user.validity_to);
        if (today < validFrom) return 'Future Valid';
        if (today > validTo) return 'Expired';
        return 'Active';
      };
      valA = computeStatus(a);
      valB = computeStatus(b);
    }

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    if (typeof valA === 'number' && typeof valB === 'number') return direction === 'asc' ? valA - valB : valB - valA;
    if (key.includes('date') || key.includes('created') || key.includes('validity')) {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    return 0;
  });

  const filteredUsers = sortedUsers.filter(u => 
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.phone?.toLowerCase().includes(searchTerm.toLowerCase()))
    && (filterStatus === 'all' || 
       (filterStatus === 'active' && u.days_remaining && u.days_remaining > 0) ||
       (filterStatus === 'expired' && u.days_remaining === 0))
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fixed Users Management
          </CardTitle>
          <CardDescription>
            Manage fixed users, approvals, validity periods, and view transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant={filterStatus==='all'?'default':'outline'} onClick={() => setFilterStatus('all')}>All</Button>
            <Button variant={filterStatus==='active'?'default':'outline'} onClick={() => setFilterStatus('active')}>Active</Button>
            <Button variant={filterStatus==='expired'?'default':'outline'} onClick={() => setFilterStatus('expired')}>Expired</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No.</TableHead>
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer">Name{getSortIndicator('name')}</TableHead>
                <TableHead onClick={() => handleSort('phone')} className="cursor-pointer">Phone{getSortIndicator('phone')}</TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer">Status{getSortIndicator('status')}</TableHead>
                <TableHead onClick={() => handleSort('validity_from')} className="cursor-pointer">Validity Start{getSortIndicator('validity_from')}</TableHead>
                <TableHead onClick={() => handleSort('validity_to')} className="cursor-pointer">Validity End{getSortIndicator('validity_to')}</TableHead>
                <TableHead onClick={() => handleSort('days_remaining')} className="cursor-pointer">Days Remaining{getSortIndicator('days_remaining')}</TableHead>
                <TableHead onClick={() => handleSort('seat_number')} className="cursor-pointer">Seat No.{getSortIndicator('seat_number')}</TableHead>
                <TableHead onClick={() => handleSort('seat_type')} className="cursor-pointer">Seat Type{getSortIndicator('seat_type')}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell>{index+1}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{user.validity_from ? formatDate(user.validity_from) : '-'}</TableCell>
                  <TableCell>{user.validity_to ? formatDate(user.validity_to) : '-'}</TableCell>
                  <TableCell>{user.days_remaining != null ? user.days_remaining : '-'}</TableCell>
                  <TableCell>{user.seat_number || '-'}</TableCell>
                  <TableCell>{getSeatTypeBadge(user.seat_type)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepeatBookingModal(user)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Repeat Booking
                    </Button>

                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.name}</DialogTitle>
            <DialogDescription>View and manage user information and transaction history</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label>Name</Label><p className="font-medium">{selectedUser.name}</p></div>
                  <div><Label>Phone</Label><p className="font-medium">{selectedUser.phone}</p></div>
                  <div><Label>Status</Label>{getStatusBadge(selectedUser)}</div>
                  <div><Label>Validity Start</Label><p>{selectedUser.validity_from ? formatDate(selectedUser.validity_from) : '-'}</p></div>
                  <div><Label>Validity End</Label><p>{selectedUser.validity_to ? formatDate(selectedUser.validity_to) : '-'}</p></div>
                  <div><Label>Days Remaining</Label><p>{selectedUser.days_remaining != null ? selectedUser.days_remaining : '-'}</p></div>
                  <div>{getSeatTypeBadge(selectedUser.seat_type)}</div>
                </CardContent>
              </Card>

              {/* Add Transaction */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Transaction</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" value={newTransaction.amount} onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input value="completed" disabled className="bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Input placeholder="Optional notes" value={newTransaction.admin_notes} onChange={e => setNewTransaction({ ...newTransaction, admin_notes: e.target.value })} />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <Button onClick={handleAddTransaction} disabled={isAddingTx}>{isAddingTx ? "Adding..." : "Add Transaction"}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
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
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
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

      <Dialog open={isRepeatDialogOpen} onOpenChange={setIsRepeatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Repeat Booking: {selectedUser?.name}</DialogTitle>
            <DialogDescription>Enter start date for repeat booking</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={repeatBookingData.startDate}
                  onChange={(e) => setRepeatBookingData({ ...repeatBookingData, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Monthly Cost</Label>
                <Input
                  type="number"
                  value={repeatBookingData.monthlyCost}
                  onChange={(e) => setRepeatBookingData({ ...repeatBookingData, monthlyCost: Number(e.target.value) })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleRepeatBooking} disabled={isRepeating}>
                  {isRepeating ? "Booking..." : "Create Repeat Booking"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};
