import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { UsersView } from "@/components/admin/users-view";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!isUserAdmin(session.user.email)) {
    redirect("/dashboard");
  }

  return <UsersView currentEmail={session.user.email} />;
}
