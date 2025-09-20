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
  email: string;
  phone: string;
  approved: boolean;
  created_at: string;
}

interface Booking {
  membership_start_date: string;
  membership_end_date: string;
  status: string;
  payment_status: string;
}

interface UserTransaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;  
  admin_notes?: string;
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add transaction form state
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    status: '',
    admin_notes: ''
  });
  const [isAddingTx, setIsAddingTx] = useState(false);

  useEffect(() => {
    fetchUsersWithValidity();
  }, []);

  // Fetch users + their validity from bookings
  const fetchUsersWithValidity = async () => {
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
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .eq('payment_status', 'paid');

          if (bookingsError) throw bookingsError;

          let validity_from: string | null = null;
          let validity_to: string | null = null;

          if (bookings && bookings.length > 0) {
            const sortedByStart = bookings
              .filter(b => b.membership_start_date && b.membership_end_date)
              .sort((a, b) => new Date(a.membership_start_date).getTime() - new Date(b.membership_start_date).getTime());

            validity_from = sortedByStart[0]?.membership_start_date || null;
            validity_to = sortedByStart[sortedByStart.length - 1]?.membership_end_date || null;
          }

          let days_remaining: number | null = null;
          if (validity_to) {
            const today = new Date();
            const endDate = new Date(validity_to);
            days_remaining = Math.max(Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
          }

          return {
            ...user,
            validity_from,
            validity_to,
            days_remaining,
          };
        })
      );

      setUsers(usersData || []);
      setUserData(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users with validity:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users.",
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

  // const handleAddTransaction = async () => {
  //   if (!selectedUser) return;
  //   if (!newTransaction.amount || !newTransaction.status) {
  //     toast({ title: "Error", description: "Amount and Status are required.", variant: "destructive" });
  //     return;
  //   }
  //   try {
  //     setIsAddingTx(true);
  //     const { error } = await supabase.from('transactions').insert({
  //       user_id: selectedUser.id,
  //       amount: Number(newTransaction.amount),
  //       status: "completed",
  //       admin_notes: newTransaction.admin_notes,
  //     });
  //     if (error) throw error;
  //     toast({ title: "Success", description: "Transaction added successfully." });
  //     setNewTransaction({ amount: '', status: '', admin_notes: '' });
  //     await fetchUserTransactions(selectedUser.id);
  //   } catch (error) {
  //     console.error('Error adding transaction:', error);
  //     toast({ title: "Error", description: "Failed to add transaction.", variant: "destructive" });
  //   } finally {
  //     setIsAddingTx(false);
  //   }
  // };

  const handleAddTransaction = async () => {
  try {
    const { error } = await supabase.from("transactions").insert({
      user_id: selectedUser.id,
      amount: Number(newTransaction.amount),
      status: "completed", // ✅ hardcoded here, not from state
      admin_notes: newTransaction.admin_notes || null,
    });

    if (error) throw error;
      toast({ title: "Success", description: "Transaction added successfully." });
      setNewTransaction({ amount: '', status: '', admin_notes: '' });
      await fetchUserTransactions(selectedUser.id);
  } catch (err) {console.error('Error adding transaction:', error);
      toast({ title: "Error", description: "Failed to add transaction.", variant: "destructive" });
      console.error("Error adding transaction:", err.message);
  }
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

  const filteredUsers = userData.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.toLowerCase().includes(searchTerm.toLowerCase())
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
            All Users Management
          </CardTitle>
          <CardDescription>
            Manage user approvals, validity periods, and view transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validity Start</TableHead>
                <TableHead>Validity End</TableHead>
                <TableHead>Days Remaining</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{user.validity_from ? formatDate(user.validity_from) : '-'}</TableCell>
                  <TableCell>{user.validity_to ? formatDate(user.validity_to) : '-'}</TableCell>
                  <TableCell>{user.days_remaining != null ? user.days_remaining : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>                      
                    </div>
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
              <Card>
                <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label>Name</Label><p className="font-medium">{selectedUser.name}</p></div>
                  <div><Label>Email</Label><p className="font-medium">{selectedUser.email}</p></div>
                  <div><Label>Phone</Label><p className="font-medium">{selectedUser.phone}</p></div>
                  <div><Label>Status</Label>{getStatusBadge(selectedUser)}</div>
                  <div><Label>Validity Start</Label><p>{selectedUser.validity_from ? formatDate(selectedUser.validity_from) : '-'}</p></div>
                  <div><Label>Validity End</Label><p>{selectedUser.validity_to ? formatDate(selectedUser.validity_to) : '-'}</p></div>
                  <div><Label>Days Remaining</Label><p>{selectedUser.days_remaining != null ? selectedUser.days_remaining : '-'}</p></div>
                </CardContent>
              </Card>

              {/* Add Transaction */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Transaction</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input value="completed" disabled className="bg-gray-100 cursor-not-allowed" />
                  </div>

                  <div>
                    <Label>Admin Notes</Label>
                    <Input
                      placeholder="Optional notes"
                      value={newTransaction.admin_notes}
                      onChange={(e) => setNewTransaction({ ...newTransaction, admin_notes: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <Button onClick={handleAddTransaction} disabled={isAddingTx}>
                      {isAddingTx ? "Adding..." : "Add Transaction"}
                    </Button>
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
                              {tx.admin_notes && (
                                <p className="text-xs text-muted-foreground mt-1">Admin Notes: {tx.admin_notes}</p>
                              )}
                            </div>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
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
    </div>
  );
};
