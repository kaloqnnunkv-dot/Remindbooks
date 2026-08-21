import type { Metadata } from "next";

import { getSiteImagesForAdmin } from "@/lib/images";
import { THEME_TOKENS, getThemeValues } from "@/lib/theme";
import { AdminHeader } from "@/components/admin/admin-ui";
import { AppearanceForms } from "@/components/admin/appearance-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оформление",
  robots: { index: false, follow: false },
};

export default async function AdminAppearancePage() {
  const [images, themeValues] = await Promise.all([
    getSiteImagesForAdmin(),
    getThemeValues(),
  ]);

  return (
    <>
      <AdminHeader
        title="Оформление"
        description="Снимките и цветовете на сайта. Промените се виждат веднага — не е нужен нов деплой."
      />

      <AppearanceForms
        images={images}
        tokens={THEME_TOKENS}
        themeValues={themeValues}
      />
    </>
  );
}
