import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import SeatPlan from "./pages/SeatPlan";
import MySeat from "./pages/MySeat";
import IDCard from "./pages/IDCard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersManagement } from "./pages/admin/UsersManagement";
import ExpiringMemberships from "./pages/admin/ExpiringMemberships";
import { BiometricManagement } from "./pages/admin/BiometricManagement";
import { GanttChart } from "./pages/admin/GanttChart";
import { VerifyBooking } from "./pages/VerifyBooking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/phone/:phoneNumber" element={<IDCard />} />
              <Route path="/verify/:phone" element={<VerifyBooking />} />

              {/* Protected User Routes */}
              <Route path="/home" element={<ProtectedRoute><MobileLayout><Home /></MobileLayout></ProtectedRoute>} />
              <Route path="/seat-plan" element={<ProtectedRoute><MobileLayout><SeatPlan /></MobileLayout></ProtectedRoute>} />
              <Route path="/my-seat" element={<ProtectedRoute><MobileLayout><MySeat /></MobileLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><MobileLayout><Profile /></MobileLayout></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/superman" element={<AdminLogin />} />
              <Route path="/superman/login" element={<AdminLogin />} />
              <Route path="/superman/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/superman/users" element={<AdminProtectedRoute><UsersManagement /></AdminProtectedRoute>} />
              <Route path="/superman/expiring" element={<AdminProtectedRoute><ExpiringMemberships /></AdminProtectedRoute>} />
              <Route path="/superman/biometric" element={<AdminProtectedRoute><BiometricManagement /></AdminProtectedRoute>} />
              <Route path="/superman/gantt" element={<AdminProtectedRoute><GanttChart /></AdminProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
