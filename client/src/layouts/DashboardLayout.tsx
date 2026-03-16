import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar user={user} />
      <main className="overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
