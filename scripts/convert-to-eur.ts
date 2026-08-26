/**
 * Превръща сумите в базата от лева в евро.
 *
 * Пуска се ЕДНОКРАТНО, при преминаването към евро. Кодът вече смята в
 * евроцентове; този скрипт оправя числата, останали в базата от времето на
 * лева. Без него всяка цена става почти двойна: 24,90 лв. се показва като
 * 24,90 €.
 *
 * Курсът е официалният фиксиран: 1 EUR = 1.95583 BGN. Той не се променя и не
 * подлежи на договаряне — по него се преизчисляват и заварените суми.
 *
 * Какво се превръща:
 *   Product     priceCents, compareAtCents
 *   Bundle      priceCents
 *   Order       subtotalCents, discountCents, shippingCents, giftCardCents, totalCents
 *   OrderItem   unitCents
 *   PromoCode   amount (само при FIXED), minOrderCents
 *   GiftCard    initialCents, balanceCents
 *
 * Старите поръчки също се преизчисляват. Стойността им не се променя — сменя
 * се единицата, с която е записана. Иначе историята щеше да се показва с
 * евровия знак, но с числа в левове.
 *
 * Употреба:
 *   npm run db:eur           преглед: показва какво ще се промени, без да пипа
 *   npm run db:eur -- --apply  записва
 *
 * Скриптът отказва да мине втори път — вписва отметка в `Setting`. Второ
 * пускане би разделило сумите пак и цените щяха да паднат наполовина.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Официалният фиксиран курс на лева към еврото. */
const RATE = 1.95583;

/** Отметката, която пази скрипта от второ пускане. */
const DONE_KEY = "currency_migrated_to_eur";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

/** Левове в евро, закръглено до цял евроцент (търговско закръгляване). */
function toEur(cents: number): number {
  return Math.round(cents / RATE);
}

function line(label: string, before: number, after: number): string {
  const fmt = (c: number) => (c / 100).toFixed(2);
  return `    ${label.padEnd(26)} ${fmt(before).padStart(9)} → ${fmt(after).padStart(9)}`;
}

/**
 * Показва към коя база е насочен скриптът, без потребителското име и паролата.
 *
 * Две бази лесно се бъркат — локалната и тази в Railway. Скриптът мени суми и
 * няма връщане назад, затова адресът се изписва, преди да е пипнато каквото и
 * да е, и се проверява дали изобщо е достижим оттук.
 */
function describeTarget(): string {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "(DATABASE_URL липсва или е нечетим)";
  }
}

async function main() {
  const target = describeTarget();
  console.log(`База: ${target}`);

  // Вътрешният адрес на Railway се резолва само вътре в тяхната мрежа.
  // `railway run` изпълнява командата тук, на локалната машина, затова оттам
  // тази база е недостижима — нужен е публичният адрес на услугата.
  if (target.includes(".railway.internal")) {
    console.error(
      [
        "",
        "Този адрес работи само вътре в Railway, не и оттук.",
        "Вземете DATABASE_PUBLIC_URL от услугата Postgres и пуснете:",
        "",
        '  DATABASE_URL="<публичният адрес>" npm run db:eur',
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const done = await db.setting.findUnique({ where: { key: DONE_KEY } });
  if (done && !force) {
    console.log(
      `Сумите вече са превърнати в евро на ${done.value}.\n` +
        "Второ пускане би ги разделило пак. Ако наистина е нужно: --force.",
    );
    return;
  }

  console.log(apply ? "ЗАПИСВАНЕ\n" : "ПРЕГЛЕД (нищо не се записва)\n");
  let touched = 0;

  // ---------------- Продукти ----------------
  const products = await db.product.findMany({
    select: { id: true, title: true, priceCents: true, compareAtCents: true },
    orderBy: { title: "asc" },
  });
  console.log(`Продукти (${products.length}):`);
  for (const p of products) {
    const price = toEur(p.priceCents);
    const compare = p.compareAtCents === null ? null : toEur(p.compareAtCents);
    console.log(line(p.title.slice(0, 26), p.priceCents, price));
    if (apply) {
      await db.product.update({
        where: { id: p.id },
        data: { priceCents: price, compareAtCents: compare },
      });
    }
    touched++;
  }

  // ---------------- Комплекти ----------------
  const bundles = await db.bundle.findMany({
    select: { id: true, title: true, priceCents: true },
  });
  console.log(`\nКомплекти (${bundles.length}):`);
  for (const b of bundles) {
    const price = toEur(b.priceCents);
    console.log(line(b.title.slice(0, 26), b.priceCents, price));
    if (apply) {
      await db.bundle.update({ where: { id: b.id }, data: { priceCents: price } });
    }
    touched++;
  }

  // ---------------- Поръчки ----------------
  const orders = await db.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      subtotalCents: true,
      discountCents: true,
      shippingCents: true,
      giftCardCents: true,
      totalCents: true,
    },
  });
  console.log(`\nПоръчки (${orders.length}):`);
  for (const o of orders) {
    const total = toEur(o.totalCents);
    console.log(line(o.orderNumber, o.totalCents, total));
    if (apply) {
      await db.order.update({
        where: { id: o.id },
        data: {
          subtotalCents: toEur(o.subtotalCents),
          discountCents: toEur(o.discountCents),
          shippingCents: toEur(o.shippingCents),
          giftCardCents: toEur(o.giftCardCents),
          totalCents: total,
        },
      });
    }
    touched++;
  }

  // ---------------- Редове от поръчки ----------------
  const items = await db.orderItem.findMany({ select: { id: true, unitCents: true } });
  console.log(`\nРедове в поръчки: ${items.length}`);
  if (apply) {
    for (const i of items) {
      await db.orderItem.update({
        where: { id: i.id },
        data: { unitCents: toEur(i.unitCents) },
      });
    }
  }
  touched += items.length;

  // ---------------- Промо кодове ----------------
  const promos = await db.promoCode.findMany({
    select: {
      id: true,
      code: true,
      discountType: true,
      amount: true,
      minOrderCents: true,
    },
  });
  console.log(`\nПромо кодове (${promos.length}):`);
  for (const promo of promos) {
    // Процентите не са сума и не се превръщат.
    const fixed = promo.discountType === "FIXED";
    const amount = fixed ? toEur(promo.amount) : promo.amount;
    const minOrder =
      promo.minOrderCents === null ? null : toEur(promo.minOrderCents);
    console.log(
      `    ${promo.code.padEnd(26)} ${fixed ? `${(promo.amount / 100).toFixed(2)} → ${(amount / 100).toFixed(2)}` : `${promo.amount}% (без промяна)`}`,
    );
    if (apply) {
      await db.promoCode.update({
        where: { id: promo.id },
        data: { amount, minOrderCents: minOrder },
      });
    }
    touched++;
  }

  // ---------------- Подаръчни карти ----------------
  const cards = await db.giftCard.findMany({
    select: { id: true, code: true, initialCents: true, balanceCents: true },
  });
  console.log(`\nПодаръчни карти (${cards.length}):`);
  for (const card of cards) {
    const balance = toEur(card.balanceCents);
    console.log(line(card.code, card.balanceCents, balance));
    if (apply) {
      await db.giftCard.update({
        where: { id: card.id },
        data: { initialCents: toEur(card.initialCents), balanceCents: balance },
      });
    }
    touched++;
  }

  if (apply) {
    await db.setting.upsert({
      where: { key: DONE_KEY },
      create: { key: DONE_KEY, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });
    console.log(`\nГотово. Превърнати записа: ${touched}.`);
    console.log(
      "Проверете и променливите на средата: SHIPPING_CENTS, " +
        "FREE_SHIPPING_OVER_CENTS и COD_FEE_CENTS също са суми.",
    );
  } else {
    console.log(`\nПреглед. Засегнати записа: ${touched}.`);
    console.log("За запис: npm run db:eur -- --apply");
  }
}

main()
  .catch((error) => {
    console.error("Грешка при превръщането:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
