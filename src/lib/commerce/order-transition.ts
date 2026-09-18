import { RESTOCK_ON, canTransition, type TransitionActor } from "./order-status";
import { summarizeLedger } from "@/lib/partners/ledger";
import type { PartnerEntry } from "@/types/partners";
import type {
  DeliveryFailureReason,
  OrderCancellation,
  OrderStatus,
  PaymentStatus,
} from "@/types";

/**
 * Decides what a status change means, without touching the database.
 *
 * Keeping this pure is what makes the rules that matter testable: stock comes
 * back exactly once, money a partner still has against an order blocks a
 * cancellation, a failed delivery must say why, and a paid order that is
 * cancelled lands in "refund_pending" until a human actually sends the money.
 *
 * A null on paymentStatus, deliveryAttempts, failure or cancellation means
 * "leave that field as it is".
 */

export class OrderTransitionError extends Error {
  constructor(
    message: string,
    readonly code: "illegal" | "unchanged" | "reconciled" | "missing_reason",
  ) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export interface TransitionOrder {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  stockRestoredAt: string | null;
  deliveryAttempts: number;
  items: { productId: string; variantId: string; quantity: number }[];
  /** Ledger entries recorded against this order, reversals included. */
  partnerEntries: PartnerEntry[];
  /** True when more entries exist than were read, so the net is unknown. */
  partnerLedgerTruncated?: boolean;
}

export interface TransitionRequest {
  to: OrderStatus;
  actor: TransitionActor;
  /** Email or "customer": recorded on the audit event, never shown publicly. */
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export interface TransitionPlan {
  status: OrderStatus;
  restockItems: { productId: string; variantId: string; quantity: number }[];
  markStockRestored: boolean;
  paymentStatus: PaymentStatus | null;
  deliveryAttempts: number | null;
  failure: { reason: DeliveryFailureReason; note: string } | null;
  cancellation: Partial<OrderCancellation> | null;
  event: { type: string; message: string };
}

export function planTransition(
  order: TransitionOrder,
  request: TransitionRequest,
): TransitionPlan {
  const { to, actor, reason } = request;
  const from = order.orderStatus;

  if (from === to) {
    throw new OrderTransitionError(
      "That order is already in this state.",
      "unchanged",
    );
  }

  if (!canTransition(from, to, actor)) {
    throw new OrderTransitionError(
      "That order cannot move to this state.",
      "illegal",
    );
  }

  if (to === "delivery_failed" && !request.failureReason) {
    throw new OrderTransitionError(
      "Choose a reason for the failed delivery.",
      "missing_reason",
    );
  }

  const restores = RESTOCK_ON.includes(to);

  // Money a partner still holds against this order cannot be unwound by
  // flipping a status. Entries that have already been reversed are another
  // matter: refusing those left an order that had been put right correctly
  // impossible to ever cancel.
  if (
    restores &&
    (order.partnerLedgerTruncated || !ledgerSettled(order.partnerEntries))
  ) {
    throw new OrderTransitionError(
      "This order has partner money recorded against it. Reverse those entries first.",
      "reconciled",
    );
  }

  const restockItems =
    restores && !order.stockRestoredAt ? order.items.map((i) => ({ ...i })) : [];

  return {
    status: to,
    restockItems,
    markStockRestored: restockItems.length > 0,
    // Cancelling does not move money. It records that money is owed, and a
    // human marks it "refunded" once they have actually sent it.
    paymentStatus:
      restores && order.paymentStatus === "paid" ? "refund_pending" : null,
    deliveryAttempts:
      to === "delivery_failed" ? order.deliveryAttempts + 1 : null,
    failure:
      to === "delivery_failed" && request.failureReason
        ? { reason: request.failureReason, note: reason ?? "" }
        : null,
    cancellation: cancellationFor(from, to, actor, reason ?? null),
    event: eventFor(from, to, reason ?? null, request.failureReason ?? null),
  };
}

function cancellationFor(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
  reason: string | null,
): Partial<OrderCancellation> | null {
  if (to === "cancellation_requested") {
    return {
      state: "requested",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  if (from === "cancellation_requested") {
    // Deciding on an existing request. Who asked and why is left alone; the
    // admin's own words go somewhere of their own.
    return {
      state: to === "cancelled" ? "approved" : "refused",
      decisionReason: reason,
    };
  }
  if (to === "cancelled") {
    return {
      state: "approved",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  return null;
}

/**
 * Whether a partner still has anything of ours against this order.
 *
 * A `sale` reversed by a `return`, or a `collection` reversed by a `refund`,
 * nets to nothing and no longer stands in the way. Money remitted to us or
 * taken as a fee has genuinely moved and is not undone by a status change, so
 * any of that still blocks.
 */
function ledgerSettled(entries: PartnerEntry[]): boolean {
  if (!entries.length) return true;

  const net = summarizeLedger(entries);

  return (
    net.salesMinor === 0 &&
    net.soldUnits === 0 &&
    net.collectedMinor === net.refundedMinor &&
    net.remittedMinor === 0 &&
    net.feesMinor === 0
  );
}

function eventFor(
  from: OrderStatus,
  to: OrderStatus,
  reason: string | null,
  failureReason: DeliveryFailureReason | null,
): { type: string; message: string } {
  const tail = reason ? ` ${reason}` : "";

  if (to === "delivery_failed") {
    return {
      type: "delivery_failed",
      message: `Delivery attempt failed: ${failureReason}.${tail}`,
    };
  }
  if (to === "cancellation_requested") {
    return {
      type: "cancellation_requested",
      message: `Cancellation requested.${tail}`,
    };
  }
  if (to === "cancelled") {
    return { type: "order_cancelled", message: `Order cancelled.${tail}` };
  }
  if (to === "returned") {
    return { type: "order_returned", message: `Parcel returned to us.${tail}` };
  }
  if (from === "cancellation_requested") {
    return {
      type: "cancellation_refused",
      message: `Cancellation refused, order continues as ${to}.${tail}`,
    };
  }
  return { type: "status_changed", message: `Order marked ${to}.${tail}` };
}
