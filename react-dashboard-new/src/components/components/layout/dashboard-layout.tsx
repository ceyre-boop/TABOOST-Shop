// Fix viewport overflow by removing inline maxWidth and ensuring proper width constraints

import { GraduationCap, Users, TrendingUp, FolderKanban, CheckSquare, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: 'dashboard' | 'students' | 'progress' | 'programs' | 'tasks') => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
  { id: 'students', label: 'Student Profiles', icon: Users },
  { id: 'progress', label: 'Academic Progress', icon: TrendingUp },
  { id: 'programs', label: 'Program Management', icon: FolderKanban },
  { id: 'tasks', label: 'Tasks & Projects', icon: CheckSquare },
];

export function DashboardLayout({ children, currentView, onNavigate }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (view: any) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: '#FAFAF8' }}>
      <header className="border-b shadow-sm w-full flex-shrink-0" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 w-full box-border">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#7BA68C' }} />
              <h1 className="font-bold text-lg sm:text-xl" style={{ color: '#2C2C2C' }}>EduManage</h1>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: '#2C2C2C' }}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
          <nav className={cn(
            'lg:flex gap-1 w-full box-border',
            mobileMenuOpen ? 'flex flex-col gap-2' : 'hidden'
          )}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 lg:w-auto justify-start flex-shrink-0 box-border'
                  )}
                  style={
                    currentView === item.id
                      ? { backgroundColor: '#7BA68C', color: '#FFFFFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
                      : { color: '#6B6B6B' }
                  }
                  onMouseEnter={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = '#F2F2F2';
                      e.currentTarget.style.color = '#2C2C2C';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6B6B6B';
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-auto w-full box-border">
        {children}
      </main>
    </div>
  );
}
