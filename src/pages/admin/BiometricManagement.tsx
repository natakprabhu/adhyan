import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Fingerprint, Users, UserCheck } from 'lucide-react';

interface BiometricAssignment {
  id: string;
  biometric_id: number;
  user_id: string;
  assigned_at: string;
  status: string;
  users: {
    name: string;
    email: string;
  };
}

interface ApprovedUser {
  id: string;
  name: string;
  email: string;
  approved: boolean;
}

export const BiometricManagement = () => {
  const [assignments, setAssignments] = useState<BiometricAssignment[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<ApprovedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch existing biometric assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('biometric_assignments')
        .select(`
          *,
          users (name, email)
        `)
        .eq('status', 'active')
        .order('biometric_id', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch approved users without biometric assignments
      const assignedUserIds = (assignmentsData || []).map(a => a.user_id);
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, approved')
        .eq('approved', true);

      if (usersError) throw usersError;

      const users = usersData || [];
      const unassignedUsers = users.filter(user => !assignedUserIds.includes(user.id));
      
      setPendingUsers(unassignedUsers);
      setApprovedUsers(users);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch biometric data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const assignBiometric = async (biometricId: number, userId: string) => {
    try {
      const { error } = await supabase
        .from('biometric_assignments')
        .insert({
          biometric_id: biometricId,
          user_id: userId,
          status: 'active'
        });

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Success",
        description: `Biometric ID ${biometricId} assigned successfully.`,
      });
    } catch (error) {
      console.error('Error assigning biometric:', error);
      toast({
        title: "Error",
        description: "Failed to assign biometric ID.",
        variant: "destructive",
      });
    }
  };


  const unassignBiometric = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('biometric_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Biometric ID removed successfully.",
      });
    } catch (error) {
      console.error('Error unassigning biometric:', error);
      toast({
        title: "Error",
        description: "Failed to remove biometric ID.",
        variant: "destructive",
      });
    }
  };


  const generateBiometricGrid = () => {
    const grid = [];
    const assignedIds = new Set(assignments.map(a => a.biometric_id));

    for (let i = 51; i <= 200; i++) {
      const isAssigned = assignedIds.has(i);
      const assignment = assignments.find(a => a.biometric_id === i);

      grid.push(
        <div
          key={i}
          className={`
            border-2 rounded-lg p-3 text-center cursor-pointer transition-all
            ${isAssigned 
              ? 'border-green-500 bg-green-50 hover:bg-green-100' 
              : 'border-gray-300 bg-white hover:bg-gray-50'
            }
          `}
          title={isAssigned ? `Assigned to ${assignment?.users.name}` : 'Available'}
        >
          <div className="font-bold text-lg">{i}</div>
          {isAssigned && assignment && (
            <div className="text-xs mt-1">
              <div className="truncate">{assignment.users.name}</div>
              <Button
                variant="destructive"
                size="sm"
                className="mt-1 text-xs"
                onClick={() => unassignBiometric(assignment.id)}
              >
                Remove
              </Button>
            </div>
          )}
          {!isAssigned && pendingUsers.length > 0 && (
            <Select onValueChange={(userId) => assignBiometric(i, userId)}>
              <SelectTrigger className="w-full mt-1 text-xs">
                <SelectValue placeholder="Assign" />
              </SelectTrigger>
              <SelectContent>
                {pendingUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    return grid;
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
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}/200</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available IDs</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{200 - assignments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Biometric Assignment
            </CardTitle>
            <CardDescription>
              Approved users who haven't been assigned a biometric ID yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="p-3">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <Badge variant="secondary" className="mt-2">
                    Awaiting Assignment
                  </Badge>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Biometric Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric ID Grid (1-200)
          </CardTitle>
          <CardDescription>
            Click on available IDs to assign them to approved users. Green boxes are assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {generateBiometricGrid()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};