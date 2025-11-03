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

// Seat lookup array
const allSeats = [
  {
    "id": "5878e430-6cc7-4010-a5cd-ed110a2a0d24",
    "seat_number": 1
  },
  {
    "id": "a07d07ac-a1f4-42d0-97a7-a33d8f4c8e86",
    "seat_number": 2
  },
  {
    "id": "ef8635ee-8d12-4a04-aadc-60d10a07a52a",
    "seat_number": 3
  },
  {
    "id": "965728ae-0646-4498-99af-fe46bd31d1db",
    "seat_number": 4
  },
  {
    "id": "78e9bab7-2732-4627-918f-73b7da81ca4d",
    "seat_number": 5
  },
  {
    "id": "5a13f1d1-31bd-4679-aa44-d1e89cfc44ec",
    "seat_number": 6
  },
  {
    "id": "dcfe71a1-f71f-4a12-85bc-2763026f5e2d",
    "seat_number": 7
  },
  {
    "id": "7aacb08d-0947-4093-95ae-435167be9672",
    "seat_number": 8
  },
  {
    "id": "ff62641f-a3b4-46ce-95fd-f479180da2f6",
    "seat_number": 9
  },
  {
    "id": "1add07cc-416d-4430-b2e5-4a17df879d96",
    "seat_number": 10
  },
  {
    "id": "066d6cec-aa95-485c-abf1-ae35286119d5",
    "seat_number": 11
  },
  {
    "id": "6974b7ec-67d9-4d48-9c91-dc6757e95a13",
    "seat_number": 12
  },
  {
    "id": "a22ebbb7-4b2b-4f9e-8fc4-4478a42217bd",
    "seat_number": 13
  },
  {
    "id": "0681b1d2-f081-4718-9e6b-0bcaf6e4cea5",
    "seat_number": 14
  },
  {
    "id": "66ad9ada-6009-4723-8a92-c9d79938d13a",
    "seat_number": 15
  },
  {
    "id": "5f3b9888-7543-4111-94c2-ccc818ca6217",
    "seat_number": 16
  },
  {
    "id": "2d49888e-c6c9-4e45-bec3-7630d4469944",
    "seat_number": 17
  },
  {
    "id": "5bfb10d9-5b03-4743-b684-85d48c732b1f",
    "seat_number": 18
  },
  {
    "id": "1e78cf78-d4ea-4498-93fb-9eeaa53bc521",
    "seat_number": 19
  },
  {
    "id": "75bf52b7-281e-40de-b741-9b517c576f43",
    "seat_number": 20
  },
  {
    "id": "9f10ccf0-1903-4a5b-883e-638fe133e2e7",
    "seat_number": 21
  },
  {
    "id": "03a50fd9-277b-42cc-a327-5a9f751f74ae",
    "seat_number": 22
  },
  {
    "id": "a84ba944-f428-4f64-ad0f-d92172a76a20",
    "seat_number": 23
  },
  {
    "id": "ec3d9196-e601-4f11-ad71-383b4507e1db",
    "seat_number": 24
  },
  {
    "id": "885c957b-7332-4cf6-a3ef-41df3bf04c58",
    "seat_number": 25
  },
  {
    "id": "7b6a9638-e02c-4302-adbd-f329fc73efee",
    "seat_number": 26
  },
  {
    "id": "b0aee9ca-d05f-4ad6-b410-7c38c42647ed",
    "seat_number": 27
  },
  {
    "id": "8051a904-f5f2-44fe-8405-51b1b1cb012b",
    "seat_number": 28
  },
  {
    "id": "74ae42c6-bb23-418b-ad5e-6dc2cd4b103b",
    "seat_number": 29
  },
  {
    "id": "0ceb1d2f-a023-490b-a727-2cdc42b4e88d",
    "seat_number": 30
  },
  {
    "id": "5f49b62d-19d2-4756-8e49-60afe7312da7",
    "seat_number": 31
  },
  {
    "id": "06a45788-556a-476b-9994-45476fb7506d",
    "seat_number": 32
  },
  {
    "id": "39a09bdb-c878-4468-8c50-6a8ca784efe8",
    "seat_number": 33
  },
  {
    "id": "b579b766-c56c-4502-80d8-287d3407e1fc",
    "seat_number": 34
  },
  {
    "id": "cce35263-d5b5-4b92-bd89-716eedbec968",
    "seat_number": 35
  },
  {
    "id": "cc23281b-04b9-46a6-97ca-1047f3a290ba",
    "seat_number": 36
  },
  {
    "id": "b63411c4-71d0-43dc-9f22-3337868ee5fa",
    "seat_number": 37
  },
  {
    "id": "ca0ba5b5-c0e6-4f85-b4de-7d304e14fd12",
    "seat_number": 38
  },
  {
    "id": "8c9bb693-d1b9-4b61-8983-f97d7c7be5bd",
    "seat_number": 39
  },
  {
    "id": "3ea47f6b-a1a2-4f9e-9f6a-275cd4c910e5",
    "seat_number": 40
  },
  {
    "id": "dafb3b97-eff5-47b9-a735-5d867005bc66",
    "seat_number": 41
  },
  {
    "id": "1bc77fe6-38da-4a3a-b4d9-e5d0f640d986",
    "seat_number": 42
  },
  {
    "id": "eb07ca9d-9c9e-4e74-9a8f-e2d531fd7626",
    "seat_number": 43
  },
  {
    "id": "6688e240-fb6b-40b5-97df-29d0e0d112d1",
    "seat_number": 44
  },
  {
    "id": "4e067e5e-c994-4e4b-9ed8-d1495f51eed0",
    "seat_number": 45
  },
  {
    "id": "3c5a6e00-619b-460a-b051-16c858c5915a",
    "seat_number": 46
  },
  {
    "id": "7c2fe8a9-0600-4eaf-b6ae-b971a945d93f",
    "seat_number": 47
  },
  {
    "id": "ea7148aa-a6ab-4a94-a10f-5eda68a3713a",
    "seat_number": 48
  },
  {
    "id": "593db843-e133-48c1-ba23-5b4b3e92cee2",
    "seat_number": 49
  },
  {
    "id": "0c5fca0d-9a90-4d56-a778-af25d6cc0681",
    "seat_number": 50
  }
]

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
    durationMonths: 1,   // Duration of new booking
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
          let monthly_cost: number | null = null;

          if (bookings && bookings.length > 0) {
            const booking = bookings[0];
            validity_from = booking.membership_start_date || null;
            validity_to = booking.membership_end_date || null;
            seat_type = booking.seat_category || null;
            seat_number = booking?.seats?.seat_number || null;
            monthly_cost = Number(booking.monthly_cost || 0);
          }

          let days_remaining: string | null = null;
          if (validity_to) {
            const today = new Date();
            const endDate = new Date(validity_to);
            const diffDays = Math.ceil(
              (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
          
            if (diffDays > 0) {
              days_remaining = `Active (${diffDays} day${diffDays > 1 ? 's' : ''} left)`;
            } else if (diffDays === 0) {
              days_remaining = 'Expires today';
            } else {
              days_remaining = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
            }
          }


          return {
            ...user,
            validity_from,
            validity_to,
            days_remaining,
            seat_type,
            seat_number,
            monthly_cost,
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
        user_id: selectedUser?.id,
        amount: Number(newTransaction.amount),
        status: "completed",
        admin_notes: newTransaction.admin_notes || null,
      });

      if (error) throw error;
      toast({ title: "Success", description: "Transaction added successfully." });
      setNewTransaction({ amount: '', status: '', admin_notes: '' });
      if (selectedUser) await fetchUserTransactions(selectedUser.id);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to add transaction.", variant: "destructive" });
      console.error("Error adding transaction:", err.message);
    }
  };

  const handleRepeatBookingModal = (user: User) => {
    setSelectedUser(user);
    setRepeatBookingData({
      startDate: '',                     // Admin picks the start date
      monthlyCost: user.monthly_cost || 0,
      seatNumber: user.seat_number || 0,
      durationMonths: 1,
    });
    setIsRepeatDialogOpen(true);
  };

  const handleRepeatBooking = async () => {
    if (!selectedUser) return;
    if (!repeatBookingData.startDate) {
      toast({ title: 'Error', description: 'Please select start date.', variant: 'destructive' });
      return;
    }

    try {
      setIsRepeating(true);

      const startDate = new Date(repeatBookingData.startDate);
      startDate.setHours(14, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + repeatBookingData.durationMonths);
      endDate.setHours(14, 0, 0, 0);

      const seatObj = allSeats.find(s => s.seat_number === repeatBookingData.seatNumber);
      const seatId = seatObj?.id;

      // Insert booking
      const { error: bookingError } = await supabase.from('bookings').insert({
        user_id: selectedUser.id,
        seat_id: seatId, // ensure you map this properly if using separate seats table
        type: 'membership',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        payment_status: 'pending',
        description: `Repeat booking of seat ${selectedUser.seat_number}`,
        seat_category: "fixed",
        duration_months: repeatBookingData.durationMonths,
        monthly_cost: repeatBookingData.monthlyCost,
        membership_start_date: repeatBookingData.startDate,
        membership_end_date: endDate.toISOString().split('T')[0]
      });

      if (bookingError) throw bookingError;

      toast({ title: 'Success', description: 'Repeat booking request submitted.' });
      await fetchFixedUsers();
      await fetchUserTransactions(selectedUser.id);
      setIsRepeatDialogOpen(false);  // Close modal
      setSelectedUser(null);         // Clear selected user to prevent reopening
      setRepeatBookingData({          // Reset the repeat booking form
        startDate: '',
        monthlyCost: 0,
        seatNumber: 0,
        durationMonths: 1,
      });

    } catch (err: any) {
      console.error('Error repeating booking:', err);
      toast({ title: 'Error', description: 'Failed to repeat booking.', variant: 'destructive' });
    } finally {
      setIsRepeating(false);

    }
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


      {/* Repeat Booking Modal */}

{/*<Dialog open={isRepeatDialogOpen} onOpenChange={setIsRepeatDialogOpen}>*/}
<Dialog
  open={isRepeatDialogOpen}
  onOpenChange={(open) => {
    setIsRepeatDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
      setRepeatBookingData({
        startDate: '',
        monthlyCost: 0,
        seatNumber: 0,
        durationMonths: 1,
      });
    }
  }}
>

  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Repeat Booking: {selectedUser?.name}</DialogTitle>
      <DialogDescription>
        Review seat details and confirm repeat booking
      </DialogDescription>
    </DialogHeader>

    {selectedUser && (
      <div className="space-y-6">
        {/* Seat & Membership Info */}
        <Card className="bg-gray-50 border">
          <CardHeader><CardTitle>Seat & Membership Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><Label>Current Seat Number</Label><p className="font-medium">{selectedUser.seat_number || '-'}</p></div>
            <div><Label>Seat Type</Label>{getSeatTypeBadge(selectedUser.seat_type)}</div>
            <div><Label>Last Membership Start</Label><p>{formatDate(selectedUser.validity_from || '')}</p></div>
            <div><Label>Last Membership End</Label><p>{formatDate(selectedUser.validity_to || '')}</p></div>
            
          </CardContent>
        </Card>

        {/* Repeat Booking Input */}
        <Card className="bg-white border">
          <CardHeader><CardTitle>Repeat Booking Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Select Seat Number</Label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={repeatBookingData.seatNumber}
                onChange={(e) =>
                  setRepeatBookingData({ ...repeatBookingData, seatNumber: Number(e.target.value) })
                }
              >
                {allSeats.map(seat => (
                  <option key={seat.id} value={seat.seat_number}>
                    {seat.seat_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={repeatBookingData.startDate}
                onChange={(e) =>
                  setRepeatBookingData({ ...repeatBookingData, startDate: e.target.value })
                }
              />
            </div>

               <Input
                type="hidden"
                value={repeatBookingData.monthlyCost}
                onChange={(e) =>
                  setRepeatBookingData({ ...repeatBookingData, monthlyCost: Number(e.target.value) })
                }
              />


            <div>
              <Label>Duration (Months)</Label>
              <Input
                type="number"
                value={repeatBookingData.durationMonths}
                onChange={(e) =>
                  setRepeatBookingData({ ...repeatBookingData, durationMonths: Number(e.target.value) })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsRepeatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRepeatBooking} disabled={isRepeating}>
            {isRepeating ? "Submitting..." : "Submit Booking Request"}
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

    </div>
  );
};
