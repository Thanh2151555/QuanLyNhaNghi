'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BookingType = 'hourly' | 'overnight' | 'daily';
type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';

interface CustomerOption {
  id: string;
  full_name: string;
}

interface RoomOption {
  id: string;
  room_number: string;
  price_per_hour: number;
  price_per_night: number;
}

interface Booking {
  id: string;
  customer_id: string;
  room_id: string;
  check_in: string | null;
  check_out: string | null;
  booking_type: BookingType;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  customers: { full_name: string } | null;
  rooms: RoomOption | null;
}

interface BookingFormData {
  customer_id: string;
  room_id: string;
  booking_type: BookingType;
  check_in: string;
}

const EMPTY_FORM: BookingFormData = {
  customer_id: '',
  room_id: '',
  booking_type: 'hourly',
  check_in: '',
};

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  hourly: 'Theo giờ',
  overnight: 'Qua đêm',
  daily: 'Theo ngày',
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

const formatDateTime = (value: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const calculateTotalPrice = (booking: Booking, checkOutValue: string) => {
  const room = booking.rooms;
  if (!room) return 0;

  const checkIn = booking.check_in ? new Date(booking.check_in) : new Date();
  const checkOut = new Date(checkOutValue);
  const durationMs = Math.max(checkOut.getTime() - checkIn.getTime(), 0);

  if (booking.booking_type === 'hourly') {
    const hours = Math.max(Math.ceil(durationMs / (1000 * 60 * 60)), 1);
    return hours * Number(room.price_per_hour || 0);
  }

  if (booking.booking_type === 'daily') {
    const days = Math.max(Math.ceil(durationMs / (1000 * 60 * 60 * 24)), 1);
    return days * Number(room.price_per_night || 0);
  }

  return Number(room.price_per_night || 0);
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [availableRooms, setAvailableRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(full_name),
        rooms(id, room_number, price_per_hour, price_per_night)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(`Không thể tải danh sách đặt phòng: ${error.message}`);
      setBookings([]);
    } else {
      setBookings((data as Booking[]) ?? []);
    }
  };

  const fetchFormOptions = async () => {
    const [customersResult, roomsResult] = await Promise.all([
      supabase.from('customers').select('id, full_name').order('full_name', { ascending: true }),
      supabase
        .from('rooms')
        .select('id, room_number, price_per_hour, price_per_night')
        .eq('status', 'available')
        .order('room_number', { ascending: true }),
    ]);

    if (customersResult.error) {
      setErrorMsg(`Không thể tải danh sách khách hàng: ${customersResult.error.message}`);
      setCustomers([]);
    } else {
      setCustomers((customersResult.data as CustomerOption[]) ?? []);
    }

    if (roomsResult.error) {
      setErrorMsg(`Không thể tải danh sách phòng trống: ${roomsResult.error.message}`);
      setAvailableRooms([]);
    } else {
      setAvailableRooms((roomsResult.data as RoomOption[]) ?? []);
    }
  };

  const refreshPageData = async () => {
    setLoading(true);
    setErrorMsg(null);
    await Promise.all([fetchBookings(), fetchFormOptions()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshPageData();
  }, []);

  const openCreateModal = () => {
    setForm({
      ...EMPTY_FORM,
      check_in: toDateTimeLocalValue(new Date()),
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.customer_id || !form.room_id || !form.check_in) {
      setErrorMsg('Vui lòng chọn khách hàng, phòng trống và thời gian nhận phòng.');
      setSubmitting(false);
      return;
    }

    const payload = {
      customer_id: form.customer_id,
      room_id: form.room_id,
      booking_type: form.booking_type,
      check_in: new Date(form.check_in).toISOString(),
      status: 'reserved' as BookingStatus,
      total_price: 0,
    };

    const { error: insertError } = await supabase.from('bookings').insert([payload]);

    if (insertError) {
      setErrorMsg(insertError.message);
      setSubmitting(false);
      return;
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'reserved' })
      .eq('id', form.room_id);

    if (roomError) {
      setErrorMsg(`Đã tạo đặt phòng nhưng chưa cập nhật được trạng thái phòng: ${roomError.message}`);
    } else {
      setSuccessMsg('Đã tạo đặt phòng mới.');
      closeModal();
    }

    await refreshPageData();
    setSubmitting(false);
  };

  const handleCheckIn = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const updatePayload = {
      status: 'checked_in' as BookingStatus,
      check_in: booking.check_in ?? new Date().toISOString(),
    };

    const { error: bookingError } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id);

    if (bookingError) {
      setErrorMsg(bookingError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', booking.room_id);

    if (roomError) {
      setErrorMsg(roomError.message);
    } else {
      setSuccessMsg('Đã check-in đặt phòng.');
    }

    await refreshPageData();
    setActionLoadingId(null);
  };

  const handleCheckOut = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const checkOutValue = new Date().toISOString();
    const totalPrice = calculateTotalPrice(booking, checkOutValue);

    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'checked_out' as BookingStatus,
        check_out: checkOutValue,
        total_price: totalPrice,
      })
      .eq('id', booking.id);

    if (bookingError) {
      setErrorMsg(bookingError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'cleaning' })
      .eq('id', booking.room_id);

    if (roomError) {
      setErrorMsg(roomError.message);
    } else {
      setSuccessMsg(`Đã check-out. Tổng tiền: ${formatVND(totalPrice)}.`);
    }

    await refreshPageData();
    setActionLoadingId(null);
  };

  const handleCancel = async (booking: Booking) => {
    const confirmed = window.confirm('Bạn có chắc muốn hủy đặt phòng này?');
    if (!confirmed) return;

    setActionLoadingId(booking.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' as BookingStatus })
      .eq('id', booking.id);

    if (bookingError) {
      setErrorMsg(bookingError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'available' })
      .eq('id', booking.room_id);

    if (roomError) {
      setErrorMsg(roomError.message);
    } else {
      setSuccessMsg('Đã hủy đặt phòng.');
    }

    await refreshPageData();
    setActionLoadingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Danh sách đặt phòng
          </p>
          <p className="text-xs text-slate-500 mt-1">{bookings.length} đặt phòng</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Tạo đặt phòng
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-14 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
          <p className="text-slate-400 mb-1 text-sm">Chưa có đặt phòng nào.</p>
          <p className="text-slate-600 text-xs">
            Nhấn "Tạo đặt phòng" để thêm đặt phòng đầu tiên.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
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
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nhận phòng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Trả phòng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tổng tiền
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bookings.map((booking) => {
                  const isActionLoading = actionLoadingId === booking.id;

                  return (
                    <tr key={booking.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                        {booking.customers?.full_name ?? 'Không rõ khách'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {booking.rooms?.room_number ?? 'Không rõ phòng'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {BOOKING_TYPE_LABELS[booking.booking_type]}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(booking.check_in)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(booking.check_out)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${STATUS_BADGES[booking.status]}`}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-400 whitespace-nowrap">
                        {formatVND(Number(booking.total_price || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {booking.status === 'reserved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCheckIn(booking)}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 transition-colors disabled:opacity-50"
                              >
                                Check-in
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancel(booking)}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600 text-rose-100 transition-colors disabled:opacity-50"
                              >
                                Hủy
                              </button>
                            </>
                          )}

                          {booking.status === 'checked_in' && (
                            <button
                              type="button"
                              onClick={() => handleCheckOut(booking)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 text-xs rounded bg-indigo-700 hover:bg-indigo-600 text-indigo-100 transition-colors disabled:opacity-50"
                            >
                              Check-out
                            </button>
                          )}

                          {(booking.status === 'checked_out' || booking.status === 'cancelled') && (
                            <span className="text-xs text-slate-500">Hoàn tất</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold font-title text-slate-100">
                Tạo đặt phòng
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Dong form dat phong"
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                Dong
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Khách hàng <span className="text-rose-400">*</span>
                </label>
                <select
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Phòng trống <span className="text-rose-400">*</span>
                </label>
                <select
                  name="room_id"
                  value={form.room_id}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  <option value="">Chọn phòng trống</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} - giờ {formatVND(Number(room.price_per_hour || 0))} / đêm {formatVND(Number(room.price_per_night || 0))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Loại đặt phòng
                  </label>
                  <select
                    name="booking_type"
                    value={form.booking_type}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  >
                    <option value="hourly">Theo giờ</option>
                    <option value="overnight">Qua đêm</option>
                    <option value="daily">Theo ngày</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Thời gian nhận phòng <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="check_in"
                    value={form.check_in}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu đặt phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
