'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'owner' | 'staff' | 'tenant'>('tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email || !password || !fullName || !phoneNumber) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            role: role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="text-center" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Đăng Ký Tài Khoản</h2>
        <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Tạo tài khoản để bắt đầu quản lý nhà nghỉ của bạn
        </p>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Họ và Tên</label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phoneNumber">Số Điện Thoại</label>
            <input
              type="tel"
              id="phoneNumber"
              className="form-input"
              placeholder="0987654321"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Vai Trò</label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="tenant">Khách Thuê (Tenant)</option>
              <option value="staff">Nhân Viên (Staff)</option>
              <option value="owner">Chủ Nhà Trọ (Owner)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
