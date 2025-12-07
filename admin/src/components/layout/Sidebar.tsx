import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
  { label: 'Prayers', href: '/admin/prayers', icon: '🙏' },
  { label: 'Messages', href: '/admin/messages', icon: '💬' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: '📋' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-64 transform bg-gray-900 text-white transition-transform duration-300 lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Title */}
          <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🙏</span>
              <div>
                <h1 className="text-lg font-bold">PrayerMap</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
                onClick={onClose}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-800 px-6 py-4">
            <p className="text-xs text-gray-500">Version 1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};
