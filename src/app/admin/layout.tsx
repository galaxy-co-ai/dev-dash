import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { AdminSidebar } from './AdminSidebar';
import config from '@/admin.config';

export const metadata: Metadata = {
  title: {
    default: 'Admin Dashboard',
    template: `%s | ${config.project.name} Admin`,
  },
  description: `${config.project.name} development admin dashboard`,
  robots: {
    index: false,
    follow: false,
  },
};

// Force dynamic to check auth on each request
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check admin authentication
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session')?.value;
  const expectedToken = process.env.ADMIN_SESSION_TOKEN;

  // No session cookie → send to login
  if (!adminToken) {
    redirect('/?auth=required');
  }

  // Token mismatch → send to login
  if (expectedToken && adminToken !== expectedToken) {
    redirect('/?auth=expired');
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
