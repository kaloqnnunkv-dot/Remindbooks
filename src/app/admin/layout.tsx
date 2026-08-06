import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Двойна защита: middleware пази маршрута, но проверката тук е меродавната.
  if (!session?.user?.id) {
    redirect(`/vhod?redirect=${encodeURIComponent("/admin")}`);
  }
  if (session.user.role !== "ADMIN") {
    redirect("/profil");
  }

  return (
    <div className="container-page py-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <div className="mb-5 pb-5 border-b border-border">
              <p className="font-sans text-xs uppercase tracking-[0.15em] text-primary">
                Администрация
              </p>
              <p className="mt-1 font-sans text-sm text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>

            <AdminNav />
          </div>
        </aside>

        <div className="lg:col-span-4 min-w-0">{children}</div>
      </div>
    </div>
  );
}
