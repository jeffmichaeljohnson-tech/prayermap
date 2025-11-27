import React from 'react';
import { Button } from '../ui/button';

export interface HeaderProps {
  userEmail?: string;
  userRole?: 'admin' | 'moderator';
  onSignOut: () => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userEmail = 'admin@prayermap.com',
  userRole = 'admin',
  onSignOut,
  onMenuClick,
}) => {
  const roleBadgeColors = {
    admin: 'bg-purple-100 text-purple-800',
    moderator: 'bg-blue-100 text-blue-800',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      {/* Left side - Mobile menu button */}
      <div className="flex items-center">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="mr-4 rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900 lg:hidden">PrayerMap Admin</h2>
      </div>

      {/* Right side - User info and sign out */}
      <div className="ml-auto flex items-center space-x-4">
        <div className="hidden items-center space-x-3 sm:flex">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{userEmail}</p>
            <div className="flex items-center justify-end space-x-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColors[userRole]}`}
              >
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {userEmail.charAt(0).toUpperCase()}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="flex items-center space-x-2"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};
