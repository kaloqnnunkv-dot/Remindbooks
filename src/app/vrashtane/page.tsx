import type { Metadata } from "next";
import { getLegalContent, LEGAL_META } from "@/lib/legal-content";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";

const META = LEGAL_META.returns;

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  alternates: { canonical: `/${META.slug}` },
};

export default async function Page() {
  const content = await getLegalContent("returns");
  return <LegalPage title={META.title} content={content} />;
}
