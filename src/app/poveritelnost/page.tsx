import type { Metadata } from "next";
import { getLegalContent, LEGAL_META } from "@/lib/legal-content";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";

const META = LEGAL_META.privacy;

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  alternates: { canonical: `/${META.slug}` },
};

export default async function Page() {
  const content = await getLegalContent("privacy");
  return <LegalPage title={META.title} content={content} />;
}
