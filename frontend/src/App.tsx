import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Database } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/common/ErrorBoundary';

import ReloadPrompt from './components/common/ReloadPrompt';
import { Toaster } from 'react-hot-toast';
import { useLocationSync } from './hooks/useLocationSync';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';
import { NotificationEngine } from './utils/NotificationEngine';

// Eager Components (Core)
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import NewTicket from './pages/tickets/NewTicket';
import TicketList from './pages/tickets/TicketList';
import TicketDetails from './pages/tickets/TicketDetails';
import NotFound from './pages/NotFound';

// Lazy Components (Admin & Heavy Modules)
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const TechnicianLayout = lazy(() => import('./layouts/TechnicianLayout'));
const DashboardAnalytics = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const AdminConsole = lazy(() => import('./pages/admin/AdminConsole'));
const SystemSettings = lazy(() => import('./pages/admin/settings/SystemSettings'));
const BranchList = lazy(() => import('./pages/admin/branches/BranchesManagement'));
const StaffList = lazy(() => import('./pages/admin/staff/StaffList'));
const FormBuilder = lazy(() => import('./pages/admin/settings/FormBuilder'));
const InventoryList = lazy(() => import('./pages/admin/inventory/InventoryList'));
const ReportsLayout = lazy(() => import('./pages/reports/ReportsLayout'));
const TechnicianReport = lazy(() => import('./pages/reports/TechnicianReport'));
const AssetReport = lazy(() => import('./pages/reports/AssetReport'));
const InventoryReport = lazy(() => import('./pages/reports/InventoryReport'));
const OrganizationManager = lazy(() => import('./pages/admin/settings/OrganizationManager'));
const AssetManager = lazy(() => import('./pages/admin/assets/AssetManager'));
const UserManager = lazy(() => import('./pages/admin/settings/UserManager'));
const MasterDataManager = lazy(() => import('./pages/admin/settings/MasterDataManager'));
const AuditLogs = lazy(() => import('./pages/admin/system-logs/AuditLogs'));
const TechRoster = lazy(() => import('./pages/admin/workforce/TechRoster'));
const AssignmentManager = lazy(() => import('./pages/admin/settings/AssignmentManager'));
const FormEditor = lazy(() => import('./pages/admin/settings/FormEditor'));
const TechnicianMap = lazy(() => import('./pages/admin/users/TechnicianMap'));
const MaintenanceScheduler = lazy(() => import('./pages/admin/MaintenanceScheduler'));
const AssetDetails = lazy(() => import('./pages/admin/assets/AssetDetails'));
const CategoriesManager = lazy(() => import('./pages/admin/settings/CategoriesManager'));
const BranchMaps = lazy(() => import('./pages/BranchMaps'));
const FormManager = lazy(() => import('./pages/admin/forms/FormManager'));
const SovereignIntelligence = lazy(() => import('./pages/admin/SovereignIntelligence'));

// Technician Experience
const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard'));
const JobExecutionWizard = lazy(() => import('./pages/tickets/JobExecutionWizard'));

type Profile = Database['public']['Tables']['profiles']['Row'];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useLocationSync(profile);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    // Sync notifications templates once
    NotificationEngine.syncTemplates();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <SystemSettingsProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
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
                element={
                  session ? (
                    profile?.role === 'technician' ?
                      <TechnicianLayout /> :
                      <DashboardLayout profile={profile} handleSignOut={handleSignOut} />
                  ) : <Navigate to="/login" replace />
                }
              >
                <Route index element={
                  profile?.role === 'technician' ?
                    <TechnicianDashboard userProfile={profile} /> :
                    <DashboardHome userProfile={profile} />
                } />

                <Route path="dashboard" element={
                  profile?.role === 'technician' ?
                    <TechnicianDashboard userProfile={profile} /> :
                    <DashboardHome userProfile={profile} />
                } />

                <Route path="tickets/new" element={<NewTicket userProfile={profile} />} />
                <Route path="tickets" element={<TicketList userProfile={profile} />} />
                <Route path="maps" element={<BranchMaps />} />

                {/* Conditional Routing for Ticket Details */}
                <Route path="tickets/:id" element={
                  profile?.role === 'technician' ?
                    <JobExecutionWizard /> :
                    <TicketDetails userProfile={profile} />
                } />


                {/* Admin Routes (Wrapped in AdminLayout) */}
                {profile?.role === 'admin' && (
                  <Route path="admin" element={<AdminLayout profile={profile} handleSignOut={handleSignOut} />}>
                    <Route path="dashboard" element={<DashboardAnalytics />} />
                    <Route path="console" element={<AdminConsole />} />
                    <Route path="tickets" element={<TicketList userProfile={profile} />} />
                    <Route path="workforce/roster" element={<TechRoster />} />
                    <Route path="workforce/assignments" element={<AssignmentManager />} />
                    <Route path="map" element={<TechnicianMap />} />
                    <Route path="inventory" element={<InventoryList />} />
                    <Route path="forms" element={<FormBuilder />} />
                    <Route path="forms/manager" element={<FormManager />} />
                    <Route path="settings/forms" element={<FormEditor />} />
                    <Route path="structure" element={<OrganizationManager />} />
                    <Route path="users" element={<UserManager />} />
                    <Route path="analytics" element={<DashboardAnalytics />} />
                    <Route path="intelligence" element={<SovereignIntelligence />} />
                    <Route path="logs" element={<AuditLogs />} />
                    <Route path="settings/master-data" element={<MasterDataManager />} />
                    <Route path="settings/categories" element={<CategoriesManager />} />
                    <Route path="settings/system" element={<SystemSettings />} />
                    <Route path="maintenance/schedules" element={<MaintenanceScheduler />} />
                    <Route path="assets" element={<AssetManager />} />
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
                  <Route path="reports" element={<ReportsLayout />}>
                    <Route index element={<Navigate to="technicians" replace />} />
                    <Route path="technicians" element={<TechnicianReport />} />
                    <Route path="assets" element={<AssetReport />} />
                    <Route path="inventory" element={<InventoryReport />} />
                  </Route>
                )}
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </SystemSettingsProvider>
  );
}

export default App;
