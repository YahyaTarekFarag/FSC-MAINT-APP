import { Outlet } from 'react-router-dom';
import TechnicianBottomNav from '../components/layout/TechnicianBottomNav';
import JobTimer from '../components/tickets/JobTimer';

export default function TechnicianLayout() {
    return (
        <div className="min-h-screen bg-slate-50 relative pb-20 md:pb-0">
            {/* Main Content Area */}
            <main className="max-w-md mx-auto min-h-screen bg-white md:bg-transparent md:max-w-6xl p-4 md:p-6 shadow-none md:shadow-xl md:rounded-3xl md:my-8 md:min-h-[calc(100vh-4rem)] relative overflow-hidden">
                <Outlet />
            </main>

            {/* Floating Job Timer (Global for Tech) */}
            <JobTimer />

            {/* Bottom Navigation (Mobile Only) */}
            <TechnicianBottomNav />
        </div>
    );
}
