'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CustomerType = 'individual' | 'business' | 'vip';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  citizen_id: string;
  customer_type: CustomerType;
  address: string;
  created_at: string;
}

interface CustomerFormData {
  full_name: string;
  phone: string;
  citizen_id: string;
  customer_type: CustomerType;
  address: string;
}

const EMPTY_FORM: CustomerFormData = {
  full_name: '',
  phone: '',
  citizen_id: '',
  customer_type: 'individual',
  address: '',
};

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: 'Cá nhân',
  business: 'Doanh nghiệp',
  vip: 'VIP',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditMode = !!editingCustomer;

  const fetchCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(`Không thể tải danh sách khách hàng: ${error.message}`);
      setCustomers([]);
    } else {
      setCustomers((data as Customer[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const name = customer.full_name.toLowerCase();
      const phone = customer.phone.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [customers, search]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      full_name: customer.full_name,
      phone: customer.phone,
      citizen_id: customer.citizen_id,
      customer_type: customer.customer_type ?? 'individual',
      address: customer.address,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      citizen_id: form.citizen_id.trim(),
      customer_type: form.customer_type,
      address: form.address.trim(),
    };

    if (!payload.full_name || !payload.phone || !payload.citizen_id || !payload.address) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin khách hàng.');
      setSubmitting(false);
      return;
    }

    const result = isEditMode && editingCustomer
      ? await supabase.from('customers').update(payload).eq('id', editingCustomer.id)
      : await supabase.from('customers').insert([payload]);

    if (result.error) {
      setErrorMsg(result.error.message);
    } else {
      setSuccessMsg(
        isEditMode
          ? `Đã cập nhật khách hàng "${payload.full_name}".`
          : `Đã thêm khách hàng "${payload.full_name}".`
      );
      await fetchCustomers();
      closeModal();
    }

    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    setDeleteLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', deletingCustomer.id);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(`Đã xóa khách hàng "${deletingCustomer.full_name}".`);
      await fetchCustomers();
    }

    setDeletingCustomer(null);
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <label htmlFor="customer-search" className="sr-only">
              Tìm khách hàng
            </label>
            <input
              id="customer-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full sm:w-80 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
          </div>
          <span className="text-xs text-slate-500">
            {filteredCustomers.length} khách hàng
          </span>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Thêm khách hàng
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
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
          <p className="text-slate-400 mb-1 text-sm">Không tìm thấy khách hàng nào.</p>
          <p className="text-slate-600 text-xs">
            Thêm khách hàng mới hoặc thử tìm kiếm với từ khóa khác.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Họ và tên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Số điện thoại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    CMND / CCCD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Loại khách
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Địa chỉ
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
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                      {customer.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {customer.citizen_id}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {CUSTOMER_TYPE_LABELS[customer.customer_type ?? 'individual']}
                    </td>
                    <td className="px-4 py-3 text-slate-400 min-w-48">
                      {customer.address}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomer(customer)}
                          className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600 text-rose-100 transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {isEditMode ? 'Sửa khách hàng' : 'Thêm khách hàng'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Dong form khach hang"
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                Dong
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Họ và tên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Số điện thoại <span className="text-rose-400">*</span>
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    CMND / CCCD <span className="text-rose-400">*</span>
                  </label>
                  <input
                    name="citizen_id"
                    value={form.citizen_id}
                    onChange={handleChange}
                    placeholder="012345678901"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Loại khách <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="customer_type"
                    value={form.customer_type}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  >
                    <option value="individual">Cá nhân</option>
                    <option value="business">Doanh nghiệp</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Địa chỉ <span className="text-rose-400">*</span>
                </label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Quận 1, TP. Hồ Chí Minh"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
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
                  {submitting
                    ? 'Đang lưu...'
                    : isEditMode
                      ? 'Lưu thay đổi'
                      : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold font-title text-slate-100 mb-2">
              Xác nhận xóa khách hàng
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Bạn có chắc muốn xóa khách hàng{' '}
              <span className="font-bold text-rose-400">
                "{deletingCustomer.full_name}"
              </span>
              ?
              <br />
              <span className="text-xs text-slate-500">
                Hành động này không thể hoàn tác.
              </span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-5 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa khách hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
