'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PaymentStatus = 'unpaid' | 'paid';
type PaymentMethod = 'cash' | 'bank_transfer' | 'card';

interface Invoice {
  id: string;
  booking_id: string;
  room_fee: number;
  service_fee: number;
  discount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  bookings: {
    id: string;
    customers: { full_name: string } | null;
    rooms: { room_number: string } | null;
  } | null;
}

interface CheckedOutBooking {
  id: string;
  total_price: number;
  customers: { full_name: string } | null;
  rooms: { room_number: string } | null;
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa Thanh Toán',
  paid: 'Đã Thanh Toán',
};

const PAYMENT_STATUS_BADGES: Record<PaymentStatus, string> = {
  unpaid: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tiền Mặt',
  bank_transfer: 'Chuyển Khoản',
  card: 'Thẻ',
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [checkedOutBookings, setCheckedOutBookings] = useState<CheckedOutBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const invoicedBookingIds = useMemo(
    () => new Set(invoices.map((invoice) => invoice.booking_id)),
    [invoices]
  );

  const availableBookings = useMemo(
    () => checkedOutBookings.filter((booking) => !invoicedBookingIds.has(booking.id)),
    [checkedOutBookings, invoicedBookingIds]
  );

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings(
          id,
          customers(full_name),
          rooms(room_number)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(`Không thể tải danh sách hóa đơn: ${error.message}`);
      setInvoices([]);
    } else {
      setInvoices((data as unknown as Invoice[]) ?? []);
    }
  };

  const fetchCheckedOutBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        total_price,
        customers(full_name),
        rooms(room_number)
      `)
      .eq('status', 'checked_out')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(`Không thể tải đặt phòng đã trả: ${error.message}`);
      setCheckedOutBookings([]);
    } else {
      setCheckedOutBookings((data as unknown as CheckedOutBooking[]) ?? []);
    }
  };

  const refreshPageData = async () => {
    setLoading(true);
    setErrorMsg(null);
    await Promise.all([fetchInvoices(), fetchCheckedOutBookings()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshPageData();
  }, []);

  const openGenerateModal = () => {
    setSelectedBookingId('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowGenerateModal(true);
  };

  const closeGenerateModal = () => {
    setSelectedBookingId('');
    setShowGenerateModal(false);
  };

  const handleGenerateInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const booking = availableBookings.find((item) => item.id === selectedBookingId);
    if (!booking) {
      setErrorMsg('Vui lòng chọn đặt phòng đã check-out và chưa có hóa đơn.');
      setGenerating(false);
      return;
    }

    const { data: existingInvoice, error: duplicateCheckError } = await supabase
      .from('invoices')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle();

    if (duplicateCheckError) {
      setErrorMsg(duplicateCheckError.message);
      setGenerating(false);
      return;
    }

    if (existingInvoice) {
      setErrorMsg('Đặt phòng này đã có hóa đơn. Không thể tạo trùng.');
      await refreshPageData();
      setGenerating(false);
      return;
    }

    const roomFee = Number(booking.total_price || 0);
    const serviceFee = 0;
    const discount = 0;
    const totalAmount = roomFee + serviceFee - discount;

    const { error } = await supabase.from('invoices').insert([
      {
        booking_id: booking.id,
        room_fee: roomFee,
        service_fee: serviceFee,
        discount,
        total_amount: totalAmount,
        payment_status: 'unpaid' as PaymentStatus,
        payment_method: null,
      },
    ]);

    if (error) {
      setErrorMsg(error.code === '23505' ? 'Đặt phòng này đã có hóa đơn.' : error.message);
    } else {
      setSuccessMsg('Đã tạo hóa đơn mới.');
      closeGenerateModal();
      await refreshPageData();
    }

    setGenerating(false);
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setPaymentMethod('cash');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const closePaymentModal = () => {
    setPayingInvoice(null);
    setPaymentMethod('cash');
  };

  const handleMarkAsPaid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payingInvoice) return;

    setPaymentLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from('invoices')
      .update({
        payment_status: 'paid' as PaymentStatus,
        payment_method: paymentMethod,
      })
      .eq('id', payingInvoice.id);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg('Đã cập nhật hóa đơn thành đã thanh toán.');
      closePaymentModal();
      await refreshPageData();
    }

    setPaymentLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Danh sách hóa đơn
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {invoices.length} hóa đơn
          </p>
        </div>

        <button
          type="button"
          onClick={openGenerateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Tạo hóa đơn
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
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
          <p className="text-slate-400 mb-1 text-sm">Chưa có hóa đơn nào.</p>
          <p className="text-slate-600 text-xs">
            Tạo hóa đơn từ đặt phòng đã check-out để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Hóa đơn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Đặt phòng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Phòng
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tiền phòng
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Dịch vụ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Giảm giá
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tổng tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Thanh toán
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Phương thức
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                      {invoice.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {invoice.booking_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {invoice.bookings?.customers?.full_name ?? 'Không rõ khách'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {invoice.bookings?.rooms?.room_number ?? 'Không rõ phòng'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatVND(Number(invoice.room_fee || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatVND(Number(invoice.service_fee || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatVND(Number(invoice.discount || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-400 whitespace-nowrap">
                      {formatVND(Number(invoice.total_amount || 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${PAYMENT_STATUS_BADGES[invoice.payment_status]}`}>
                        {PAYMENT_STATUS_LABELS[invoice.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {invoice.payment_method ? PAYMENT_METHOD_LABELS[invoice.payment_method] : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(invoice.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {invoice.payment_status === 'unpaid' ? (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(invoice)}
                            className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 transition-colors"
                          >
                            Đã thanh toán
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Hoàn tất</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeGenerateModal();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold font-title text-slate-100">
                Tạo hóa đơn
              </h2>
              <button
                type="button"
                onClick={closeGenerateModal}
                aria-label="Dong form tao hoa don"
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                Dong
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Đặt phòng đã check-out <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(event) => setSelectedBookingId(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  <option value="">Chọn đặt phòng</option>
                  {availableBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.customers?.full_name ?? 'Không rõ khách'} - phòng {booking.rooms?.room_number ?? 'không rõ'} - {formatVND(Number(booking.total_price || 0))}
                    </option>
                  ))}
                </select>
              </div>

              {availableBookings.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  Không có đặt phòng đã check-out nào chưa lập hóa đơn.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={generating || availableBookings.length === 0}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Đang tạo...' : 'Tạo hóa đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePaymentModal();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold font-title text-slate-100">
                Thanh toán hóa đơn
              </h2>
              <button
                type="button"
                onClick={closePaymentModal}
                aria-label="Dong form thanh toan"
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                Dong
              </button>
            </div>

            <form onSubmit={handleMarkAsPaid} className="p-6 space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-500 mb-1">Tổng tiền</p>
                <p className="text-lg font-bold text-indigo-400">
                  {formatVND(Number(payingInvoice.total_amount || 0))}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Phương thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="card">Thẻ</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? 'Đang lưu...' : 'Xác nhận đã thanh toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
