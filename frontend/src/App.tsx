import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Database } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/common/ErrorBoundary';

import ReloadPrompt from './components/common/ReloadPrompt';
import toast, { Toaster } from 'react-hot-toast';
import { useLocationSync } from './hooks/useLocationSync';

// Eager Components (Core)
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import NewTicket from './pages/tickets/NewTicket';
import TicketList from './pages/tickets/TicketList';
import TicketDetails from './pages/tickets/TicketDetails';

// Lazy Components (Admin & Heavy Modules)
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const DashboardAnalytics = lazy(() => import('./pages/admin/DashboardAnalytics'));
const AdminConsole = lazy(() => import('./pages/admin/AdminConsole'));
const SystemSettings = lazy(() => import('./pages/admin/settings/SystemSettings'));
const BranchList = lazy(() => import('./pages/admin/branches/BranchList'));
const StaffList = lazy(() => import('./pages/admin/staff/StaffList'));
const FormBuilder = lazy(() => import('./pages/admin/settings/FormBuilder'));
const InventoryList = lazy(() => import('./pages/admin/inventory/InventoryList'));
const ReportsPage = lazy(() => import('./pages/admin/reports/ReportsPage'));
const OrganizationManager = lazy(() => import('./pages/admin/structure/OrganizationManager'));
const UserManager = lazy(() => import('./pages/admin/users/UserManager'));
const MasterDataManager = lazy(() => import('./pages/admin/settings/MasterDataManager'));
const AuditLogs = lazy(() => import('./pages/admin/system-logs/AuditLogs'));
const TechRoster = lazy(() => import('./pages/admin/workforce/TechRoster'));
const AssignmentManager = lazy(() => import('./pages/admin/settings/AssignmentManager'));
const FormEditor = lazy(() => import('./pages/admin/settings/FormEditor'));
const TechnicianMap = lazy(() => import('./pages/admin/users/TechnicianMap'));
const MaintenanceScheduler = lazy(() => import('./pages/admin/MaintenanceScheduler'));
const AssetList = lazy(() => import('./pages/admin/assets/AssetList'));
const AssetDetails = lazy(() => import('./pages/admin/assets/AssetDetails'));

type Profile = Database['public']['Tables']['profiles']['Row'];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Technician Location
  useLocationSync(profile);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
      toast.error('فشل تسجيل الخروج. حاول مرة أخرى.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }



  // ...

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <ErrorBoundary>
        <ReloadPrompt />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        }>
          <Routes>
            {/* Public Route */}
            <Route
              path="/login"
              element={session ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            {/* Protected Dashboard Routes */}
            <Route
              path="/"
              element={session ? <DashboardLayout profile={profile} handleSignOut={handleSignOut} /> : <Navigate to="/login" replace />}
            >
              <Route index element={<DashboardHome userProfile={profile} />} />
              <Route path="dashboard" element={<DashboardHome userProfile={profile} />} />
              <Route path="tickets/new" element={<NewTicket userProfile={profile} />} />
              <Route path="tickets" element={<TicketList userProfile={profile} />} />
              <Route path="tickets/:id" element={<TicketDetails userProfile={profile} />} />


              {/* Admin Routes (Wrapped in AdminLayout) */}
              {profile?.role === 'admin' && (
                <Route path="admin" element={<AdminLayout />}>
                  <Route path="dashboard" element={<DashboardAnalytics />} />
                  <Route path="console" element={<AdminConsole />} />
                  <Route path="tickets" element={<TicketList userProfile={profile} />} />
                  <Route path="workforce/roster" element={<TechRoster />} />
                  <Route path="workforce/assignments" element={<AssignmentManager />} />
                  <Route path="map" element={<TechnicianMap />} />
                  <Route path="inventory" element={<InventoryList />} />
                  <Route path="forms" element={<FormBuilder />} />
                  <Route path="settings/forms" element={<FormEditor />} />
                  <Route path="structure" element={<OrganizationManager />} />
                  <Route path="users" element={<UserManager />} />
                  <Route path="analytics" element={<DashboardAnalytics />} />
                  <Route path="logs" element={<AuditLogs />} />
                  <Route path="settings/master-data" element={<MasterDataManager />} />
                  <Route path="settings/system" element={<SystemSettings />} />
                  <Route path="maintenance/schedules" element={<MaintenanceScheduler />} />
                  <Route path="assets" element={<AssetList />} />
                  <Route path="assets/:id" element={<AssetDetails />} />
                </Route>
              )}

              {/* Legacy/Direct Access (if needed) or Redirects */}
              {profile?.role === 'admin' && (
                <>
                  <Route path="branches" element={<BranchList />} />
                  <Route path="staff" element={<StaffList />} />
                </>
              )}

              {/* Reports (Admin & Manager) */}
              {(profile?.role === 'admin' || profile?.role === 'manager') && (
                <Route path="reports" element={<ReportsPage />} />
              )}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
