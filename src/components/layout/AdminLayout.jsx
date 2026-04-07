import { AdminSidebar } from './AdminSidebar';

export function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
