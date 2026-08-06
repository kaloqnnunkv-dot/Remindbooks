import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Целият раздел изисква вход. След вход потребителят се връща тук.
  if (!session?.user?.id) {
    redirect(`/vhod?redirect=${encodeURIComponent("/profil")}`);
  }

  return (
    <div className="container-page py-12">
      <div className="grid lg:grid-cols-4 gap-10">
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <div className="mb-6 pb-6 border-b border-border">
              <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
                Здравейте,
              </p>
              <p className="mt-1 font-sans text-lg font-bold truncate">
                {session.user.name ?? session.user.email}
              </p>
            </div>

            <ProfileNav isAdmin={session.user.role === "ADMIN"} />
          </div>
        </aside>

        <div className="lg:col-span-3 min-w-0">{children}</div>
      </div>
    </div>
  );
}
