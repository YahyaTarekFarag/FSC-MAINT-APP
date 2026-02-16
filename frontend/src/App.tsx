import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Database } from './lib/supabase';
import { Loader2 } from 'lucide-react';

// Components
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import NewTicket from './pages/tickets/NewTicket';
import TicketList from './pages/tickets/TicketList';
import TicketDetails from './pages/tickets/TicketDetails';
import BranchList from './pages/admin/branches/BranchList';
import StaffList from './pages/admin/staff/StaffList';
import AdminConsole from './pages/admin/AdminConsole';
import FormBuilder from './pages/admin/settings/FormBuilder';
import InventoryList from './pages/admin/inventory/InventoryList';
import ReportsPage from './pages/reports/ReportsPage';

type Profile = Database['public']['Tables']['profiles']['Row'];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
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
          <Route path="tickets/new" element={<NewTicket />} />
          <Route path="tickets" element={<TicketList userProfile={profile} />} />
          <Route path="tickets/:id" element={<TicketDetails userProfile={profile} />} />

          {/* Admin Only Routes */}
          {profile?.role === 'admin' && (
            <>
              <Route path="admin/console" element={<AdminConsole />} />
              <Route path="admin/inventory" element={<InventoryList />} />
              <Route path="admin/forms" element={<FormBuilder />} />
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
    </BrowserRouter>
  );
}

export default App;
