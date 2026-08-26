-- Превръщане на сумите в базата от лева в евро.
--
-- Същото, което прави `npm run db:eur`, но на чист SQL — за случаите, когато
-- базата не е достижима отвън и заявката се пуска от конзолата на доставчика.
--
-- Курсът е официалният фиксиран: 1 EUR = 1.95583 BGN.
--
-- Пуска се ЕДНОКРАТНО. Целият блок е една операция: ако нещо се спъне, нищо не
-- се записва. Второ пускане се отказва само — отметката в "Setting" го спира,
-- защото повторно делене би свалило цените наполовина.
--
-- Преди това: направете резервно копие на базата.

-- ---------------------------------------------------------------------------
-- 1. ПРЕГЛЕД — пуснете това първо. Само чете, нищо не променя.
-- ---------------------------------------------------------------------------

SELECT title,
       "priceCents"                             AS сега_в_стотинки,
       ROUND("priceCents" / 1.95583)::int       AS ще_стане_в_евроцентове,
       "compareAtCents"                         AS стара_цена_сега,
       ROUND("compareAtCents" / 1.95583)::int   AS стара_цена_после
FROM "Product"
ORDER BY title;

-- ---------------------------------------------------------------------------
-- 2. ЗАПИС — пуснете го чак след като прегледът изглежда верен.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Setting" WHERE "key" = 'currency_migrated_to_eur') THEN
    RAISE EXCEPTION
      'Сумите вече са превърнати в евро. Второ пускане би ги разделило пак.';
  END IF;

  -- Продукти и комплекти
  UPDATE "Product" SET
    "priceCents"     = ROUND("priceCents" / 1.95583)::int,
    "compareAtCents" = ROUND("compareAtCents" / 1.95583)::int;

  UPDATE "Bundle" SET
    "priceCents" = ROUND("priceCents" / 1.95583)::int;

  -- Поръчки. Преизчисляват се и старите: стойността им не се променя, сменя се
  -- единицата, с която е записана.
  UPDATE "Order" SET
    "subtotalCents" = ROUND("subtotalCents" / 1.95583)::int,
    "discountCents" = ROUND("discountCents" / 1.95583)::int,
    "shippingCents" = ROUND("shippingCents" / 1.95583)::int,
    "giftCardCents" = ROUND("giftCardCents" / 1.95583)::int,
    "totalCents"    = ROUND("totalCents" / 1.95583)::int;

  UPDATE "OrderItem" SET
    "unitCents" = ROUND("unitCents" / 1.95583)::int;

  -- Промо кодове: само тези с фиксирана сума. Процентът не е сума.
  UPDATE "PromoCode" SET
    "amount" = ROUND("amount" / 1.95583)::int
  WHERE "discountType" = 'FIXED';

  UPDATE "PromoCode" SET
    "minOrderCents" = ROUND("minOrderCents" / 1.95583)::int;

  -- Подаръчни карти — и издадената стойност, и остатъкът.
  UPDATE "GiftCard" SET
    "initialCents" = ROUND("initialCents" / 1.95583)::int,
    "balanceCents" = ROUND("balanceCents" / 1.95583)::int;

  -- Отметката, която спира второ пускане.
  INSERT INTO "Setting" ("key", "value", "updatedAt")
  VALUES ('currency_migrated_to_eur', NOW()::text, NOW());
END $$;

-- ---------------------------------------------------------------------------
-- 3. ПРОВЕРКА след записа.
-- ---------------------------------------------------------------------------

SELECT title, "priceCents" FROM "Product" ORDER BY title;
SELECT "key", "value" FROM "Setting" WHERE "key" = 'currency_migrated_to_eur';
