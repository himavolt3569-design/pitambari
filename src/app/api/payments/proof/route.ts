import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { paymentProofSchema, fieldErrors } from "@/lib/validation/schemas";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import {
  GuardError,
  assertSameOrigin,
  clientIp,
  rateLimit,
} from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/** Same sentence for "not yours" and "does not exist": neither teaches anything. */
const NOT_FOUND = "We could not find that order.";
const BAD_UPLOAD = "That upload does not belong to this order.";

/** The exact shape `/api/checkout/upload-proof` hands back to the browser. */
const MEDIA_PATH = /^\/api\/media\/([A-Za-z0-9_-]{1,200})$/;

/**
 * Records a manual payment claim: a transaction reference and/or an uploaded
 * screenshot.
 *
 * Crucially, this does NOT mark the order paid. It moves the payment to
 * `pending_verification` and leaves a human to confirm it in the admin. A
 * customer pressing "I have paid" is a claim, not proof.
 */
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("payment-proof", await clientIp(), 12, 600);

    const body = await request.json().catch(() => null);
    const parsed = paymentProofSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Add a transaction reference or upload a screenshot.",
          fields: fieldErrors(parsed.error),
        },
        { status: 400, headers: noStore },
      );
    }

    const { orderId, orderNumber, reference, proofPath } = parsed.data;

    if (!reference && !proofPath) {
      return NextResponse.json(
        { ok: false, error: "Add a transaction reference or upload a screenshot." },
        { status: 400, headers: noStore },
      );
    }

    // Read outside the transaction: the cookie cannot change mid-request.
    const cookieKey = (await cookies()).get(CUSTOMER_COOKIE)?.value;

    const db = requireDb();
    const orderRef = db.collection(COLLECTIONS.orders).doc(orderId);

    // One transaction for the whole claim. Checking the payment status and
    // then writing separately loses a race that really happens: staff press
    // Mark paid in the admin while the customer is pressing I have paid, and
    // the later write drags a settled order back to pending_verification.
    const settled = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);

      if (!snap.exists) {
        throw new GuardError(NOT_FOUND, 404);
      }

      const order = snap.data() ?? {};

      // The order number acts as a shared secret between us and the customer,
      // so knowing an order id alone is not enough to alter someone else's
      // payment.
      if (order.orderNumber !== orderNumber) {
        throw new GuardError(NOT_FOUND, 404);
      }

      // ...and the number alone is not enough either. The customer cookie is
      // what proves this browser is the one that placed the order. The panel
      // that posts here only ever opens straight after checkout, in that same
      // browser, so requiring the cookie costs a real customer nothing.
      if (
        !isCustomerKey(cookieKey) ||
        typeof order.customerKey !== "string" ||
        cookieKey !== order.customerKey
      ) {
        throw new GuardError(NOT_FOUND, 404);
      }

      // A verified payment is final; a customer cannot reopen it.
      if (
        order.paymentStatus === "paid" ||
        order.paymentStatus === "refunded" ||
        order.paymentStatus === "refund_pending"
      ) {
        return String(order.paymentStatus);
      }

      // Every read has to precede every write inside a transaction, so the
      // upload is checked here rather than after the update is queued. An
      // upload is only accepted once the stored image says it belongs to this
      // order, so a guessed id cannot pin a stranger's screenshot to this one.
      if (proofPath) {
        const match = MEDIA_PATH.exec(proofPath);
        if (!match) {
          throw new GuardError(BAD_UPLOAD, 400);
        }

        const mediaSnap = await tx.get(
          db.collection(COLLECTIONS.media).doc(match[1]),
        );

        if (!mediaSnap.exists || mediaSnap.data()?.orderId !== orderId) {
          throw new GuardError(BAD_UPLOAD, 400);
        }
      }

      tx.update(orderRef, {
        paymentStatus: "pending_verification",
        paymentReference: reference || null,
        paymentProofPath: proofPath || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {
        orderId,
        orderNumber,
        type: "payment_claimed",
        message: reference
          ? `Customer submitted payment reference ${reference}.`
          : "Customer uploaded a payment screenshot.",
        actor: "customer",
        createdAt: FieldValue.serverTimestamp(),
      });

      return null;
    });

    if (settled) {
      return NextResponse.json(
        { ok: true, alreadySettled: true, paymentStatus: settled },
        { headers: noStore },
      );
    }

    return NextResponse.json(
      { ok: true, paymentStatus: "pending_verification" },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
