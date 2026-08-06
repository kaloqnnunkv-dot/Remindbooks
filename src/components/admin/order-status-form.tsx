"use client";

import { useActionState, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/app/actions/admin-orders";
import type { AdminState } from "@/app/actions/admin-products";
import { BG_ORDER_STATUS } from "@/lib/format";
import { Alert, Button, Checkbox, Field, Input, Select } from "../ui";

const initialState: AdminState = { ok: false, message: "" };

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export function OrderStatusForm({
  orderId,
  currentStatus,
  trackingNumber,
  isShipping,
  customerEmail,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  trackingNumber: string;
  isShipping: boolean;
  customerEmail: string;
}) {
  const [state, action, pending] = useActionState(updateOrderStatus, initialState);
  const [status, setStatus] = useState<OrderStatus>(currentStatus);

  const isCancelling = status === "CANCELLED" || status === "REFUNDED";
  const wasCounted = ["PAID", "SHIPPED", "COMPLETED"].includes(currentStatus);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Статус" htmlFor="o-status" required>
          <Select
            id="o-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {BG_ORDER_STATUS[s]}
              </option>
            ))}
          </Select>
        </Field>

        {isShipping && (
          <Field
            label="Номер за проследяване"
            htmlFor="o-tracking"
            hint="Изпраща се на клиента в имейла."
          >
            <Input
              id="o-tracking"
              name="trackingNumber"
              defaultValue={trackingNumber}
              maxLength={80}
              className="font-mono"
              placeholder="напр. 1234567890"
            />
          </Field>
        )}
      </div>

      {status !== currentStatus && (
        <label className="flex items-start gap-3 p-3 bg-muted rounded-md cursor-pointer">
          <Checkbox
            name="notifyCustomer"
            defaultChecked={status === "SHIPPED"}
            className="mt-0.5"
          />
          <span className="text-sm">
            Изпрати имейл до клиента ({customerEmail}) за новия статус „
            {BG_ORDER_STATUS[status]}“.
          </span>
        </label>
      )}

      {isCancelling && wasCounted && (
        <Alert tone="error">
          Тази поръчка е била платена. При смяна към „
          {BG_ORDER_STATUS[status]}“ количествата на физическите книги ще бъдат
          върнати обратно в склада.
        </Alert>
      )}

      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <Button type="submit" disabled={pending || status === currentStatus}>
        {pending ? "Запазване…" : "Запази промяната"}
      </Button>
    </form>
  );
}
