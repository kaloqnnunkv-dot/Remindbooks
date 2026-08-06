import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatDate, formatDuration, BG_PRODUCT_TYPE } from "@/lib/format";
import { productHref } from "@/components/product-card";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { AudioPlayer } from "@/components/audio-player";
import { BookIcon, DownloadIcon, FileTextIcon, HeadphonesIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите книги",
  robots: { index: false, follow: false },
};

export default async function MyBooksPage() {
  const session = await auth();

  const entitlements = await db.entitlement.findMany({
    where: { userId: session!.user.id },
    orderBy: { grantedAt: "desc" },
    include: {
      product: {
        select: {
          id: true, slug: true, title: true, author: true, type: true,
          coverImage: true, durationSeconds: true, fileKey: true,
        },
      },
    },
  });

  const pdfItems = entitlements.filter((e) => e.product.type === "PDF");
  const audioItems = entitlements.filter((e) => e.product.type === "AUDIO");

  return (
    <div>
      <h1 className="text-3xl rule mb-3">Моите книги</h1>
      <p className="text-muted-foreground mb-8">
        Закупеното дигитално съдържание е достъпно тук завинаги.
      </p>

      {entitlements.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={36} />}
          title="Още нямате дигитално съдържание"
          description="PDF книгите и аудио материалите, които закупите, ще се появят тук веднага след плащането."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <ButtonLink href="/pdf">PDF книги</ButtonLink>
              <ButtonLink href="/audio" variant="outline">
                Аудио
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="space-y-12">
          {pdfItems.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-xl mb-5">
                <FileTextIcon size={20} className="text-primary" />
                PDF книги
                <span className="text-muted-foreground font-normal text-base">
                  ({pdfItems.length})
                </span>
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {pdfItems.map((e) => {
                  const cover = publicUrl(e.product.coverImage);
                  return (
                    <Card key={e.id} className="p-4 flex gap-4">
                      <Link
                        href={productHref(e.product)}
                        className="relative w-20 h-28 shrink-0 bg-muted rounded-sm overflow-hidden border border-border"
                      >
                        {cover ? (
                          <Image
                            src={cover}
                            alt={e.product.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <FileTextIcon size={22} />
                          </span>
                        )}
                      </Link>

                      <div className="flex flex-col min-w-0 flex-1">
                        <Link
                          href={productHref(e.product)}
                          className="font-sans text-sm font-bold leading-snug hover:text-primary transition-colors line-clamp-2"
                        >
                          {e.product.title}
                        </Link>
                        {e.product.author && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.product.author}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Отключена на {formatDate(e.grantedAt)}
                        </p>

                        <div className="mt-auto pt-3 flex flex-wrap gap-2">
                          {e.product.fileKey ? (
                            <>
                              <ButtonLink
                                href={`/profil/chetene/${e.product.slug}`}
                                size="sm"
                              >
                                <BookIcon size={14} />
                                Чети онлайн
                              </ButtonLink>
                              <ButtonLink
                                href={`/api/download/${e.product.id}`}
                                size="sm"
                                variant="outline"
                              >
                                <DownloadIcon size={14} />
                                Свали
                              </ButtonLink>
                            </>
                          ) : (
                            <Badge tone="warning">Файлът се подготвя</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {audioItems.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-xl mb-5">
                <HeadphonesIcon size={20} className="text-primary" />
                Аудио съдържание
                <span className="text-muted-foreground font-normal text-base">
                  ({audioItems.length})
                </span>
              </h2>

              <div className="space-y-4">
                {audioItems.map((e) => {
                  const cover = publicUrl(e.product.coverImage);
                  return (
                    <Card key={e.id} className="p-4">
                      <div className="flex gap-4">
                        <Link
                          href={productHref(e.product)}
                          className="relative w-20 h-20 shrink-0 bg-muted rounded-sm overflow-hidden border border-border"
                        >
                          {cover ? (
                            <Image
                              src={cover}
                              alt={e.product.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              <HeadphonesIcon size={22} />
                            </span>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={productHref(e.product)}
                            className="font-sans text-sm font-bold hover:text-primary transition-colors"
                          >
                            {e.product.title}
                          </Link>
                          {e.product.durationSeconds ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDuration(e.product.durationSeconds)}
                            </p>
                          ) : null}

                          {e.product.fileKey && (
                            <AudioPlayer
                              src={`/api/audio/${e.product.id}`}
                              className="mt-3"
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
