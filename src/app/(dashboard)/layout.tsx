import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = isUserAdmin(session.user.email);

  return (
    <div className="min-h-screen">
      <Sidebar isAdmin={isAdmin} userEmail={session.user.email} />
      <main className="p-4 pb-24 md:ml-56 md:p-8 md:pb-8">{children}</main>
    </div>
  );
}
