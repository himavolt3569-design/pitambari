import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { OrderTransitionError, planTransition } from "./order-transition";
import type { TransitionActor } from "./order-status";
import type { DeliveryFailureReason, OrderCancellation, OrderStatus } from "@/types";
import type { PartnerEntry } from "@/types/partners";

/**
 * The only writer of `orderStatus` in this application.
 *
 * Reads the order, asks the pure planner what the move means, then performs
 * every consequence in one transaction: the status itself, returning stock to
 * the shelf, the payment status when a paid order is cancelled, and the audit
 * event. Because admin, customer and courier paths all come through here, none
 * of them can skip the restock or the audit trail.
 */

/** Enough to cover an order that was sold, returned, collected and refunded. */
const LEDGER_SCAN_LIMIT = 50;

export interface ApplyTransitionInput {
  orderId: string;
  to: OrderStatus;
  actor: TransitionActor;
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export async function applyOrderTransition(
  input: ApplyTransitionInput,
): Promise<void> {
  const db = requireDb();
  const orderRef = db.collection(COLLECTIONS.orders).doc(input.orderId);

  // Every ledger entry against this order, reversals included, so the planner
  // can see the net position rather than just that something was once
  // recorded. An order with far more entries than this is not something to
  // unwind automatically, so the planner treats a truncated read as blocking.
  const ledgerQuery = db
    .collection("partnerEntries")
    .where("orderId", "==", input.orderId)
    .limit(LEDGER_SCAN_LIMIT);

  await db.runTransaction(async (tx) => {
    /* ------------------------------------------------- reads before writes */
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new OrderTransitionError("Order not found.", "illegal");
    }
    const ledger = await tx.get(ledgerQuery);

    const data = snap.data() ?? {};

    const plan = planTransition(
      {
        orderStatus: (data.orderStatus ?? "pending") as OrderStatus,
        paymentStatus: data.paymentStatus ?? "unpaid",
        stockRestoredAt: data.stockRestoredAt ? String(data.stockRestoredAt) : null,
        deliveryAttempts: Number(data.deliveryAttempts ?? 0),
        items: (data.items ?? []).map(
          (i: { productId: string; variantId: string; quantity: number }) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: Number(i.quantity ?? 0),
          }),
        ),
        partnerEntries: ledger.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as PartnerEntry,
        ),
        partnerLedgerTruncated: ledger.size >= LEDGER_SCAN_LIMIT,
      },
      {
        to: input.to,
        actor: input.actor,
        actorLabel: input.actorLabel,
        reason: input.reason,
        failureReason: input.failureReason,
      },
    );

    /* ------------------------------------------------------------- writes */
    const update: Record<string, unknown> = {
      orderStatus: plan.status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (plan.markStockRestored) update.stockRestoredAt = new Date().toISOString();
    if (plan.paymentStatus) update.paymentStatus = plan.paymentStatus;
    if (plan.deliveryAttempts !== null) update.deliveryAttempts = plan.deliveryAttempts;
    if (plan.failure) {
      update.lastFailureReason = plan.failure.reason;
      update.lastFailureNote = plan.failure.note;
    }
    if (plan.cancellation) {
      const previous = (data.cancellation ?? {}) as Partial<OrderCancellation>;
      const isNewRequest = plan.cancellation.state === "requested";

      update.cancellation = isNewRequest
        ? {
            // A fresh request starts a clean record, so an earlier refusal
            // cannot read as a decision on this one.
            state: "requested" as const,
            requestedBy: plan.cancellation.requestedBy ?? null,
            reason: plan.cancellation.reason ?? null,
            decisionReason: null,
            decidedBy: null,
            decidedAt: null,
          }
        : {
            state: plan.cancellation.state ?? previous.state ?? "none",
            // Who asked, and why, survives the decision. Overwriting it threw
            // away the only record of the customer's own words.
            requestedBy:
              plan.cancellation.requestedBy ?? previous.requestedBy ?? null,
            reason: plan.cancellation.reason ?? previous.reason ?? null,
            decisionReason: plan.cancellation.decisionReason ?? null,
            decidedBy:
              input.actor === "admin"
                ? input.actorLabel
                : (previous.decidedBy ?? null),
            decidedAt:
              input.actor === "admin"
                ? new Date().toISOString()
                : (previous.decidedAt ?? null),
          };
    }

    tx.update(orderRef, update);

    for (const item of plan.restockItems) {
      const variantRef = db
        .collection(COLLECTIONS.products)
        .doc(item.productId)
        .collection(COLLECTIONS.variants)
        .doc(item.variantId);

      tx.update(variantRef, {
        stock: FieldValue.increment(item.quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {
      orderId: input.orderId,
      orderNumber: data.orderNumber ?? null,
      type: plan.event.type,
      // The customer timeline labels a status change from this, never from the
      // message, which is staff text.
      status: plan.status,
      message: plan.event.message,
      actor: input.actorLabel,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
