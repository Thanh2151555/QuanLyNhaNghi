'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return 'Tổng Quan Hệ Thống';
      case '/dashboard/rooms':
        return 'Danh Sách Phòng';
      case '/dashboard/customers':
        return 'Quán Lý Khách Thuế';
      case '/dashboard/bookings':
        return 'Quản Lý Đặt Phòng';
      case '/dashboard/invoices':
        return 'Quản Lý Hóa Đơn';
      default:
        return 'Hệ Thống Quản Lý';
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const displayName = profile?.full_name || user?.email || 'Khách Hàng';
  const roleLabel = profile?.role === 'staff' ? 'Nhân Viên' : 'Quản Trị Viên';

  return (
    <header className="h-auto min-h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 text-slate-100">
      <div className="min-w-0">
        <h1 className="truncate text-base sm:text-lg font-bold font-title text-slate-100">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs text-slate-400 font-medium">{roleLabel}</p>
            <p className="max-w-48 truncate text-sm font-bold text-slate-200">{displayName}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden md:inline-flex px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-colors"
        >
          Đăng Xuất
        </button>
      </div>
    </header>
  );
}
