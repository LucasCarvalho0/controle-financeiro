import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserAdmin } from "@/lib/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = isUserAdmin(session.user.email);

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      cpf: true,
      phone: true,
    },
  });

  const currentUser = {
    id: session.user.id,
    name: dbUser?.name ?? session.user.name ?? null,
    email: dbUser?.email ?? session.user.email ?? "",
    image: dbUser?.image ?? session.user.image ?? null,
    cpf: dbUser?.cpf ?? null,
    phone: dbUser?.phone ?? null,
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar
        isAdmin={isAdmin}
        userName={currentUser.name}
        userEmail={currentUser.email}
        userImage={currentUser.image}
      />
      <div className="md:ml-56">
        <TopBar user={currentUser} isAdmin={isAdmin} />
        <main className="p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
