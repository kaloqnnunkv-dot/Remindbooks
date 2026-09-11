-- Къде отива пратката. Цената на доставката е различна за двете.
CREATE TYPE "DeliveryMethod" AS ENUM ('ADDRESS', 'OFFICE');

-- Заварените поръчки са правени, когато избор нямаше, а тогавашната цена беше
-- тази за доставка до адрес — затова подразбиращото се е ADDRESS.
ALTER TABLE "Order"
  ADD COLUMN "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'ADDRESS';
