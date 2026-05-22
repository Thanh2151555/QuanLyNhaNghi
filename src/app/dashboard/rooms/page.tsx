'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Room {
  id: string;
  room_number: string;
  room_type: string;
  price_per_hour: number;
  price_per_night: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  description: string | null;
  created_at: string;
}

interface RoomFormData {
  room_number: string;
  room_type: string;
  price_per_hour: string;
  price_per_night: string;
  status: Room['status'];
  description: string;
}

const ROOM_STATUS_OPTIONS: Array<{ value: Room['status']; label: string }> = [
  { value: 'available', label: 'Trống' },
  { value: 'occupied', label: 'Có khách' },
  { value: 'reserved', label: 'Đặt trước' },
  { value: 'cleaning', label: 'Đang dọn' },
  { value: 'maintenance', label: 'Bảo trì' },
];

const EMPTY_FORM: RoomFormData = {
  room_number: '',
  room_type: 'Single',
  price_per_hour: '',
  price_per_night: '',
  status: 'available',
  description: '',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const STATUS_CONFIG: Record<Room['status'], { label: string; badge: string; border: string }> = {
  available:   { label: 'Trống',     badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', border: 'border-emerald-500/20' },
  occupied:    { label: 'Có khách',  badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',          border: 'border-rose-500/20'    },
  reserved:    { label: 'Đặt trước', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',          border: 'border-blue-500/20'    },
  cleaning:    { label: 'Đang dọn',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',       border: 'border-amber-500/20'   },
  maintenance: { label: 'Bảo trì',   badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',       border: 'border-slate-500/20'   },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal & form state
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const isEditMode = !!editingRoom;

  const [form, setForm] = useState<RoomFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete confirm state
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch rooms ─────────────────────────────
  const fetchRooms = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true });
    if (error) {
      setErrorMsg(`Không thể tải danh sách phòng: ${error.message}`);
    }
    if (error) console.error('Lỗi tải phòng:', error.message);
    else setRooms((data as Room[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  // ─── Form helpers ────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDelete = async () => {
    if (!deletingRoom) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('rooms').delete().eq('id', deletingRoom.id);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(`✅ Đã xóa phòng "${deletingRoom.room_number}"`);
      await fetchRooms();
    }
    setDeletingRoom(null);
    setDeleteLoading(false);
  };

  // Open modal in ADD mode
  const openAddModal = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setSuccessMsg(null);
    setErrorMsg(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  // ─── Derived data ─────────────────────────────
  const filtered = filterStatus === 'all'
    ? rooms
    : rooms.filter((r) => r.status === filterStatus);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Top action bar ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4
                      bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Lọc:</span>
          {[{ value: 'all', label: 'Tất cả' }, ...ROOM_STATUS_OPTIONS].map((statusOption) => {
            const s = statusOption.value;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterStatus === s
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}>
                {statusOption.label}
              </button>
            );
          })}
          <span className="ml-2 text-xs text-slate-500">({filtered.length} phòng)</span>
        </div>

        <button onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors">
          <span className="text-base leading-none">＋</span>
          Thêm phòng mới
        </button>
      </div>

      {successMsg && !showModal && (
        <div className="app-alert-success">
          {successMsg}
        </div>
      )}

      {errorMsg && !showModal && (
        <div className="app-alert-error">
          {errorMsg}
        </div>
      )}

      {/* ── Room grid ─────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
          <p className="text-slate-400 mb-1 text-sm">Không tìm thấy phòng nào.</p>
          <p className="text-slate-600 text-xs">Nhấn <span className="text-indigo-400 font-semibold">"Thêm phòng mới"</span> để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((room) => {
            const cfg = STATUS_CONFIG[room.status];
            return (
              <div key={room.id}
                className={`p-5 rounded-xl border bg-slate-900/50 backdrop-blur-sm flex flex-col
                           justify-between h-auto shadow-lg transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-xl ${cfg.border}
                           border-slate-800`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-lg font-bold font-title text-slate-100 truncate mr-2">
                      {room.room_number}
                    </h4>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-md border ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                    {room.room_type}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {room.description || 'Không có mô tả.'}
                  </p>
                </div>

                  <div className="flex justify-between border-t border-slate-800/80 pt-3 mt-auto">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-0.5">Theo giờ</span>
                      <span className="text-xs font-bold text-slate-300">{formatVND(room.price_per_hour)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500 mb-0.5">Qua đêm</span>
                      <span className="text-xs font-bold text-indigo-400">{formatVND(room.price_per_night)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setForm({
                          room_number: room.room_number,
                          room_type: room.room_type,
                          price_per_hour: room.price_per_hour.toString(),
                          price_per_night: room.price_per_night.toString(),
                          status: room.status,
                          description: room.description || ''
                        });
                        setShowModal(true);
                      }}
                      className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setDeletingRoom(room)}
                      className="px-2 py-1 text-xs rounded bg-rose-700 hover:bg-rose-600 text-rose-100"
                    >
                      Xóa
                    </button>
                    <select
                      value={room.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Room['status'];
                        const { error } = await supabase.from('rooms').update({ status: newStatus }).eq('id', room.id);
                        if (error) {
                          setErrorMsg(error.message);
                        } else {
                          setSuccessMsg(`✅ Cập nhật trạng thái "${STATUS_CONFIG[newStatus].label}" cho phòng "${room.room_number}"`);
                          await fetchRooms();
                        }
                      }}
                      className="px-1 py-0.5 text-xs bg-slate-800 text-slate-200 rounded"
                    >
                      {ROOM_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit modal ───────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold font-title text-slate-100">
                {editingRoom ? 'Sửa phòng' : 'Thêm phòng mới'}
              </h2>
              <button type="button" onClick={closeModal} aria-label="Dong form phong" className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">Dong</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setSuccessMsg(null);
              setErrorMsg(null);
              const payload = {
                room_number:    form.room_number.trim(),
                room_type:      form.room_type.trim(),
                price_per_hour: parseFloat(form.price_per_hour) || 0,
                price_per_night: parseFloat(form.price_per_night) || 0,
                status:         form.status,
                description:    form.description.trim() || null,
              };

              if (editingRoom) {
                // Update existing room
                const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id);
                if (error) {
                  if (error.code === '23505') {
                    setErrorMsg(`Số phòng "${payload.room_number}" đã tồn tại. Vui lòng dùng số phòng khác.`);
                  } else {
                    setErrorMsg(error.message);
                  }
                } else {
                  setSuccessMsg(`✅ Đã cập nhật phòng "${payload.room_number}"`);
                  setEditingRoom(null);
                  await fetchRooms();
                  closeModal();
                }
              } else {
                // Add new room
                const { error } = await supabase.from('rooms').insert([payload]);
                if (error) {
                  if (error.code === '23505') {
                    setErrorMsg(`Số phòng "${payload.room_number}" đã tồn tại. Vui lòng dùng số phòng khác.`);
                  } else {
                    setErrorMsg(error.message);
                  }
                } else {
                  setSuccessMsg(`✅ Đã thêm phòng "${payload.room_number}" thành công!`);
                  setForm(EMPTY_FORM);
                  await fetchRooms();
                }
              }
              setSubmitting(false);
            }} className="p-6 space-y-4">
              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Row 1: room_number + room_type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Số phòng <span className="text-rose-400">*</span>
                  </label>
                  <input name="room_number" value={form.room_number} onChange={handleChange}
                    placeholder="VD: Phòng 101"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                               text-slate-100 text-sm placeholder-slate-600
                               focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
                               transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Loại phòng
                  </label>
                  <select name="room_type" value={form.room_type} onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                               text-slate-100 text-sm focus:outline-none focus:border-indigo-500
                               focus:ring-1 focus:ring-indigo-500/30 transition-colors">
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="VIP">VIP</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
              </div>

              {/* Row 2: price_per_hour + price_per_night */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Giá theo giờ (VNĐ)
                  </label>
                  <input name="price_per_hour" type="number" min="0" value={form.price_per_hour}
                    onChange={handleChange} placeholder="60000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                               text-slate-100 text-sm placeholder-slate-600
                               focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
                               transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Giá qua đêm (VNĐ)
                  </label>
                  <input name="price_per_night" type="number" min="0" value={form.price_per_night}
                    onChange={handleChange} placeholder="400000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                               text-slate-100 text-sm placeholder-slate-600
                               focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
                               transition-colors" />
                </div>
              </div>

              {/* Row 3: status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Trạng thái
                </label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                             text-slate-100 text-sm focus:outline-none focus:border-indigo-500
                             focus:ring-1 focus:ring-indigo-500/30 transition-colors">
                  {ROOM_STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Mô tả (tuỳ chọn)
                </label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={2} placeholder="VD: Tầng 2, máy lạnh, cửa sổ nhìn ra sân vườn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2
                             text-slate-100 text-sm placeholder-slate-600 resize-none
                             focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
                             transition-colors" />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700
                             text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
                  Huỷ
                </button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700
                             text-white shadow-md shadow-indigo-600/20 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting
                    ? 'Đang lưu...'
                    : isEditMode ? 'Lưu thay đổi' : 'Lưu phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ───────────────── */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700
                          rounded-2xl shadow-2xl p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold font-title text-slate-100 mb-2">Xác nhận xoá phòng</h3>
            <p className="text-sm text-slate-400 mb-6">
              Bạn có chắc muốn xoá phòng{' '}
              <span className="font-bold text-rose-400">"{deletingRoom.room_number}"</span>?
              <br />
              <span className="text-xs text-slate-500">Hành động này không thể hoàn tác.</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeletingRoom(null)}
                className="px-5 py-2 rounded-lg text-sm font-medium border border-slate-700
                           text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
                Huỷ bỏ
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700
                           text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {deleteLoading ? 'Đang xoá...' : 'Xoá phòng'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
