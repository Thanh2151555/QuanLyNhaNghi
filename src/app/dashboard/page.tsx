'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';

interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  totalCustomers: number;
  todayBookings: number;
  todayRevenue: number;
}

interface RoomStatusRow {
  status: string;
}

interface InvoiceRevenueRow {
  total_amount: number;
}

interface RecentBooking {
  id: string;
  status: BookingStatus;
  created_at: string;
  customers: { full_name: string } | null;
  rooms: { room_number: string } | null;
}

const EMPTY_STATS: DashboardStats = {
  totalRooms: 0,
  availableRooms: 0,
  occupiedRooms: 0,
  reservedRooms: 0,
  totalCustomers: 0,
  todayBookings: 0,
  todayRevenue: 0,
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  reserved: 'Đã đặt',
  checked_in: 'Đang ở',
  checked_out: 'Đã trả',
  cancelled: 'Đã hủy',
};

const STATUS_BADGES: Record<BookingStatus, string> = {
  reserved: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  checked_in: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  checked_out: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { startIso, endIso } = getTodayRange();

      const [
        roomsResult,
        customersResult,
        todayBookingsResult,
        todayRevenueResult,
        recentBookingsResult,
      ] = await Promise.all([
        supabase.from('rooms').select('status'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('payment_status', 'paid')
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        supabase
          .from('bookings')
          .select(`
            id,
            status,
            created_at,
            customers(full_name),
            rooms(room_number)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const firstError =
        roomsResult.error ||
        customersResult.error ||
        todayBookingsResult.error ||
        todayRevenueResult.error ||
        recentBookingsResult.error;

      if (firstError) {
        setErrorMsg(firstError.message);
        setStats(EMPTY_STATS);
        setRecentBookings([]);
        setLoading(false);
        return;
      }

      const roomRows = (roomsResult.data as RoomStatusRow[]) ?? [];
      const paidInvoices = (todayRevenueResult.data as InvoiceRevenueRow[]) ?? [];
      const todayRevenue = paidInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total_amount || 0),
        0
      );

      setStats({
        totalRooms: roomRows.length,
        availableRooms: roomRows.filter((room) => room.status === 'available').length,
        occupiedRooms: roomRows.filter((room) => room.status === 'occupied').length,
        reservedRooms: roomRows.filter((room) => room.status === 'reserved').length,
        totalCustomers: customersResult.count ?? 0,
        todayBookings: todayBookingsResult.count ?? 0,
        todayRevenue,
      });

      setRecentBookings((recentBookingsResult.data as unknown as RecentBooking[]) ?? []);
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Tổng phòng',
      value: stats.totalRooms,
      tone: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20',
    },
    {
      label: 'Phòng trống',
      value: stats.availableRooms,
      tone: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20',
    },
    {
      label: 'Phòng đang ở',
      value: stats.occupiedRooms,
      tone: 'bg-rose-600/20 text-rose-400 border-rose-500/20',
    },
    {
      label: 'Phòng đã đặt',
      value: stats.reservedRooms,
      tone: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
    },
    {
      label: 'Khách hàng',
      value: stats.totalCustomers,
      tone: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/20',
    },
    {
      label: 'Đặt phòng hôm nay',
      value: stats.todayBookings,
      tone: 'bg-amber-600/20 text-amber-400 border-amber-500/20',
    },
    {
      label: 'Doanh thu hôm nay',
      value: formatVND(stats.todayRevenue),
      tone: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
      wide: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Tổng quan hôm nay
        </p>
        <h2 className="mt-2 text-2xl font-bold font-title text-slate-100">
          DashBoard Quản Lý Nhà Nghỉ
        </h2>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div
              key={item}
              className="h-28 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`p-5 rounded-xl border bg-slate-900/50 backdrop-blur-sm ${card.tone} ${card.wide ? 'lg:col-span-2' : ''}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-extrabold font-title">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold font-title text-slate-100">
              Đặt phòng gần đây
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              5 đặt phòng mới nhất
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 bg-slate-950 border border-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Chưa có đặt phòng nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Phòng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ngày tạo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                      {booking.customers?.full_name ?? 'Không rõ khách'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {booking.rooms?.room_number ?? 'Không rõ phòng'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${STATUS_BADGES[booking.status]}`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(booking.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
