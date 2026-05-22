import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Hệ Thống Quản Lý Nhà Nghỉ - Hotel Management System',
  description: 'Hệ thống quản lý phòng trọ, nhà nghỉ hiện đại, tiện lợi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
