'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const menuItems = [
  { name: 'Tổng Quan', path: '/dashboard', icon: '📊' },
  { name: 'Phòng', path: '/dashboard/rooms', icon: '🚪' },
  { name: 'Khách', path: '/dashboard/customers', icon: '👥' },
  { name: 'Đặt Phòng', path: '/dashboard/bookings', icon: '📝' },
  { name: 'Hóa Dơn', path: '/dashboard/invoices', icon: '💵' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-slate-900 border-r border-slate-800 md:flex md:flex-col md:min-h-screen text-slate-300">
        <div className="p-6 border-b border-slate-800">
          <Link href="/dashboard" className="text-xl font-bold font-title text-indigo-400">
            Hotel Manager
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Điều Hướng Chính">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'hover:bg-slate-800 hover:text-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-base" aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          <button type="button" onClick={handleLogout} className="app-button-secondary w-full mb-3">
            Đăng Xuất
          </button>
          Hotel Management v1.0.0
        </div>
      </aside>

      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden" aria-label="Dieu huong di dong">
        <div className="flex items-center justify-between px-3 py-3">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-400">
            Hotel Manager
          </Link>
          <button type="button" onClick={handleLogout} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
            Đăng Xuất
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
