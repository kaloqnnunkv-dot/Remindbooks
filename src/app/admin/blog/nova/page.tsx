import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-ui";
import { PostForm } from "@/components/admin/post-form";

export const metadata: Metadata = {
  title: "Нова публикация",
  robots: { index: false, follow: false },
};

export default function NewPostPage() {
  return (
    <div>
      <AdminHeader
        title="Нова публикация"
        description="Напишете статия за блога „Вътрешен компас“."
      />
      <PostForm />
    </div>
  );
}
