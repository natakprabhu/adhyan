import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagement } from './UsersManagement';
import { BiometricManagement } from './BiometricManagement';
import { GanttChart } from './GanttChart';
import { ManageBookings } from './ManageBookings'; // 👈 new component

export const AdminDashboard = () => {
  const { user, role, loading } = useAuth();

  // Redirect if not admin
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'admin') return <Navigate to="/home" replace />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="biometric">Biometric</TabsTrigger>
          <TabsTrigger value="schedule">Seat Schedule</TabsTrigger>
        
        </TabsList>

        <TabsContent value="users">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="biometric">
          <BiometricManagement />
        </TabsContent>

        <TabsContent value="schedule">
          <GanttChart />
        </TabsContent>

        <TabsContent value="bookings">
          <ManageBookings /> {/* 👈 bookings CRUD */}
        </TabsContent>

        
      </Tabs>
    </div>
  );
};
