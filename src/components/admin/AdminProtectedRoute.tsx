// import { Navigate } from 'react-router-dom';
// import { useAdminAuth } from '@/hooks/useAdminAuth';

// interface AdminProtectedRouteProps {
//   children: React.ReactNode;
// }

// export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
//   const { adminUser, loading } = useAdminAuth();

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-background">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   if (!adminUser) {
//     return <Navigate to="/superman/login" replace />;
//   }

//   return <>{children}</>;
// };


import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "admin") return <Navigate to="/home" replace />;

  return <>{children}</>;
};



