import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { Search, AlertTriangle, Calendar, User, Phone, Mail } from 'lucide-react';

interface ExpiringMembership {
  id: string;
  membership_end_date: string;
  seat_category: 'fixed' | 'floating';
  duration_months: number;
  monthly_cost: number;
  seat: {
    seat_number: number;
  } | null;
  users: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export default function ExpiringMemberships() {
  const [memberships, setMemberships] = useState<ExpiringMembership[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExpiringMemberships();
  }, []);

  const fetchExpiringMemberships = async () => {
    try {
      // Get memberships expiring in the next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          membership_end_date,
          seat_category,
          duration_months,
          monthly_cost,
          seat:seats (seat_number),
          users (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid')
        .gte('membership_end_date', new Date().toISOString().split('T')[0])
        .lte('membership_end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('membership_end_date');

      if (error) throw error;
      setMemberships((data || []) as ExpiringMembership[]);
    } catch (error) {
      console.error('Error fetching expiring memberships:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expiring memberships",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMemberships = memberships.filter(membership =>
    membership.users.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.users.phone.includes(searchTerm)
  );

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const timeDiff = end.getTime() - now.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, days);
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 3) {
      return <Badge variant="destructive">Expires in {days} day{days !== 1 ? 's' : ''}</Badge>;
    } else if (days <= 7) {
      return <Badge variant="secondary">Expires in {days} days</Badge>;
    } else {
      return <Badge variant="outline">Expires in {days} days</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Expiring Memberships</h1>
              <p className="text-muted-foreground">
                Memberships expiring in the next 30 days
              </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              <span>{filteredMemberships.length} memberships</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">
                  {memberships.filter(m => getDaysUntilExpiry(m.membership_end_date) <= 3).length}
                </div>
                <p className="text-sm text-muted-foreground">Expires ≤ 3 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">
                  {memberships.filter(m => {
                    const days = getDaysUntilExpiry(m.membership_end_date);
                    return days > 3 && days <= 7;
                  }).length}
                </div>
                <p className="text-sm text-muted-foreground">Expires 4-7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {memberships.filter(m => {
                    const days = getDaysUntilExpiry(m.membership_end_date);
                    return days > 7 && days <= 15;
                  }).length}
                </div>
                <p className="text-sm text-muted-foreground">Expires 8-15 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {memberships.filter(m => getDaysUntilExpiry(m.membership_end_date) > 15).length}
                </div>
                <p className="text-sm text-muted-foreground">Expires 16-30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Memberships Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Expiring Memberships
              </CardTitle>
              <CardDescription>
                Members whose memberships are expiring soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMemberships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expiring memberships found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Seat</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMemberships.map((membership) => {
                      const daysLeft = getDaysUntilExpiry(membership.membership_end_date);
                      return (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{membership.users.name}</div>
                                <div className="text-sm text-muted-foreground capitalize">
                                  {membership.seat_category} seat
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                <span className="text-muted-foreground">{membership.users.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                <span className="text-muted-foreground">{membership.users.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">₹{membership.monthly_cost.toLocaleString()}/month</div>
                              <div className="text-sm text-muted-foreground">
                                {membership.duration_months} month{membership.duration_months > 1 ? 's' : ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {membership.seat_category === 'fixed' 
                                ? `Seat ${membership.seat?.seat_number}` 
                                : 'Any Available'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(membership.membership_end_date)}</div>
                          </TableCell>
                          <TableCell>
                            {getExpiryBadge(daysLeft)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (membership.users.phone) {
                                    window.open(`tel:${membership.users.phone}`, '_blank');
                                  }
                                }}
                              >
                                Call
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (membership.users.email) {
                                    window.open(`mailto:${membership.users.email}?subject=Membership Renewal Reminder`, '_blank');
                                  }
                                }}
                              >
                                Email
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}