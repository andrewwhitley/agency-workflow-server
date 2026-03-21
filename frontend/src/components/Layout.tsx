import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home, Users, FlaskConical, HeartPulse, Pill, UtensilsCrossed,
  TrendingUp, MessageCircle, BookOpen, Menu, X, LogOut,
  Activity, Apple,
} from 'lucide-react';
import type { SessionUser, FamilyMember } from '../types';
import { MemberSwitcher } from './MemberSwitcher';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';

interface LayoutProps {
  user: SessionUser | null;
  members: FamilyMember[];
  activeMember: FamilyMember | null;
  setActiveMember: (m: FamilyMember) => void;
}

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/family', icon: Users, label: 'Family' },
  { to: '/biomarkers', icon: Activity, label: 'Biomarkers' },
  { to: '/labs', icon: FlaskConical, label: 'Labs' },
  { to: '/symptoms', icon: HeartPulse, label: 'Symptoms' },
  { to: '/protocols', icon: Pill, label: 'Protocols' },
  { to: '/foods', icon: Apple, label: 'Foods' },
  { to: '/diet', icon: UtensilsCrossed, label: 'Diet Log' },
  { to: '/trends', icon: TrendingUp, label: 'Trends' },
  { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
];

export function Layout({ user, members, activeMember, setActiveMember }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, addToast } = useToast();

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-600
        transform transition-transform duration-200 ease-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-dark-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-semibold text-sm">My Health Optimized</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member switcher */}
          {members.length > 0 && activeMember && (
            <MemberSwitcher
              members={members}
              active={activeMember}
              onChange={(m) => { setActiveMember(m); setSidebarOpen(false); }}
            />
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors mb-0.5
                  ${isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
                  }
                `}
              >
                <Icon className="w-4.5 h-4.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          {user && (
            <div className="border-t border-dark-600 p-3">
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs">
                    {user.name?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                </div>
                <a href="/auth/logout" className="p-1.5 text-gray-500 hover:text-gray-300">
                  <LogOut className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-dark-600 bg-dark-800">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            {activeMember && (
              <span className="text-sm font-medium">{activeMember.name}</span>
            )}
          </div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet context={{ activeMember, members, addToast }} />
          </div>
        </main>
      </div>

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  );
}
