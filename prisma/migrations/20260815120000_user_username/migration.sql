-- Кратко име за вход вместо имейл.
-- Колоната допуска NULL, за да не се пипат съществуващите записи, а уникалният
-- индекс е частичен по същата причина: в PostgreSQL NULL стойностите не се
-- смятат за еднакви, тъй че много потребители могат да останат без име.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
