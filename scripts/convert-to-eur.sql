-- Превръщане на сумите в базата от лева в евро.
--
-- Същото, което прави `npm run db:eur`, но на чист SQL — за случаите, когато
-- базата не е достижима отвън и заявката се пуска от конзолата на доставчика.
--
-- Курсът е официалният фиксиран: 1 EUR = 1.95583 BGN.
--
-- Записът по-долу е ЕДНА заявка, която завършва със SELECT. Написан е така
-- нарочно: уеб конзолите (включително тази на Railway) добавят свой LIMIT
-- накрая и всичко, което не завършва със SELECT, се чупи с „syntax error at
-- or near LIMIT“. Една заявка означава и че или минава цялата, или нищо.
--
-- Пуска се ЕДНОКРАТНО. Второ пускане не променя нищо — отметката в "Setting"
-- го спира, защото повторно делене би свалило цените наполовина.
--
-- Преди това: направете резервно копие на базата.

-- ---------------------------------------------------------------------------
-- 1. ПРЕГЛЕД — пуснете това първо. Само чете, нищо не променя.
-- ---------------------------------------------------------------------------

SELECT title,
       "priceCents"                             AS сега,
       ROUND("priceCents" / 1.95583)::int       AS ще_стане,
       "compareAtCents"                         AS стара_цена_сега,
       ROUND("compareAtCents" / 1.95583)::int   AS стара_цена_после
FROM "Product"
ORDER BY title;

-- ---------------------------------------------------------------------------
-- 2. ЗАПИС — пуснете целия блок наведнъж, чак след прегледа.
--
--    Връща по колона за всяка таблица с броя променени записи. Ако навсякъде
--    излязат нули, значи превръщането вече е било направено веднъж.
-- ---------------------------------------------------------------------------

WITH guard AS (
  -- Празен резултат = вече е минало веднъж. Тогава всички UPDATE-и по-долу
  -- намират нула реда за променяне и заявката не пипа нищо.
  SELECT 1 AS ok
  WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE "key" = 'currency_migrated_to_eur')
),
prod AS (
  UPDATE "Product" SET
    "priceCents"     = ROUND("priceCents" / 1.95583)::int,
    "compareAtCents" = ROUND("compareAtCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
bund AS (
  UPDATE "Bundle" SET
    "priceCents" = ROUND("priceCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
ord AS (
  -- Преизчисляват се и старите поръчки: стойността им не се променя, сменя се
  -- единицата, с която е записана.
  UPDATE "Order" SET
    "subtotalCents" = ROUND("subtotalCents" / 1.95583)::int,
    "discountCents" = ROUND("discountCents" / 1.95583)::int,
    "shippingCents" = ROUND("shippingCents" / 1.95583)::int,
    "giftCardCents" = ROUND("giftCardCents" / 1.95583)::int,
    "totalCents"    = ROUND("totalCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
items AS (
  UPDATE "OrderItem" SET
    "unitCents" = ROUND("unitCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
promo AS (
  -- Двете полета се пипат в един UPDATE нарочно. Два отделни върху една и съща
  -- таблица в една заявка могат да се паднат на един и същи ред, а тогава
  -- Postgres не гарантира коя промяна ще остане.
  --
  -- Процентът не е сума и не се превръща — само фиксираните отстъпки.
  UPDATE "PromoCode" SET
    "amount" = CASE WHEN "discountType" = 'FIXED'
                    THEN ROUND("amount" / 1.95583)::int
                    ELSE "amount" END,
    "minOrderCents" = ROUND("minOrderCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
cards AS (
  UPDATE "GiftCard" SET
    "initialCents" = ROUND("initialCents" / 1.95583)::int,
    "balanceCents" = ROUND("balanceCents" / 1.95583)::int
  WHERE EXISTS (SELECT 1 FROM guard)
  RETURNING 1
),
mark AS (
  -- Отметката, която спира второ пускане. Вписва се само ако guard е върнал ред.
  INSERT INTO "Setting" ("key", "value", "updatedAt")
  SELECT 'currency_migrated_to_eur', NOW()::text, NOW() FROM guard
  RETURNING 1
)
SELECT (SELECT count(*) FROM prod)  AS продукти,
       (SELECT count(*) FROM bund)  AS комплекти,
       (SELECT count(*) FROM ord)   AS поръчки,
       (SELECT count(*) FROM items) AS редове_в_поръчки,
       (SELECT count(*) FROM promo) AS промо_кодове,
       (SELECT count(*) FROM cards) AS подаръчни_карти,
       (SELECT count(*) FROM mark)  AS отметка;

-- ---------------------------------------------------------------------------
-- 3. ПРОВЕРКА след записа.
-- ---------------------------------------------------------------------------

SELECT title, "priceCents" FROM "Product" ORDER BY title;
