import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  isCustomerKey,
  newCustomerKey,
} from "@/lib/commerce/customer-key";
import { createOrderSchema, fieldErrors } from "@/lib/validation/schemas";
import { createOrder, type CreatedOrder } from "@/lib/commerce/orders";
import {
  GuardError,
  assertSameOrigin,
  claimIdempotency,
  clientIp,
  rateLimit,
  releaseIdempotency,
} from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * Creates an order.
 *
 * The request carries ids and an address, never prices. Totals, stock and the
 * order number are all decided here. An idempotency key makes a retried or
 * double-tapped submit return the original order instead of creating a second.
 */
export async function POST(request: Request) {
  let idempotencyKey: string | null = null;

  // True only while this request holds the claim and its order does not exist
  // yet. Releasing a claim we do not own would free a concurrent request's
  // lock, and the retry behind it would place a second order.
  let ownsClaim = false;

  try {
    await assertSameOrigin();

    const ip = await clientIp();
    // Deliberately tight: a genuine customer places one order at a time.
    await rateLimit("order", ip, 8, 600);

    const body = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please check the highlighted fields.",
          fields: fieldErrors(parsed.error),
        },
        { status: 400, headers: noStore },
      );
    }

    idempotencyKey = parsed.data.idempotencyKey;

    // One key per browser, reused for every later order so the customer sees
    // their whole history. A malformed cookie is replaced rather than trusted.
    const existing = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    const presented = isCustomerKey(existing) ? existing : null;
    const customerKey = presented ?? newCustomerKey();
    const isProduction = process.env.NODE_ENV === "production";

    const replay = await claimIdempotency<CreatedOrder>(
      idempotencyKey,
      customerKey,
    );

    if (replay) {
      // A replay belongs to the browser that placed the order. One arriving
      // with a different key is not retrying anything; it is asking for
      // somebody else's order.
      if (
        presented &&
        replay.customerKey &&
        replay.customerKey !== presented
      ) {
        throw new GuardError("We could not find that order.", 404);
      }

      const response = NextResponse.json(
        { ok: true, order: replay.value, replayed: true },
        { headers: noStore },
      );

      // The first response carried the cookie and never arrived, which is
      // usually why this retry exists at all. Hand it back, or the customer
      // loses the only thread to the order they just placed.
      if (!presented && replay.customerKey) {
        response.cookies.set(
          CUSTOMER_COOKIE,
          replay.customerKey,
          customerCookieOptions(isProduction),
        );
      }

      return response;
    }

    ownsClaim = true;

    const userAgent = (await headers()).get("user-agent");
    const order = await createOrder(parsed.data, {
      ip,
      userAgent,
      customerKey,
      idempotencyKey,
    });

    // The order exists, and the claim was completed in that same commit. From
    // here the key must never be freed, whatever else goes wrong: freeing it
    // would invite a retry that charges the customer twice.
    ownsClaim = false;

    const response = NextResponse.json({ ok: true, order }, { headers: noStore });
    response.cookies.set(
      CUSTOMER_COOKIE,
      customerKey,
      customerCookieOptions(isProduction),
    );
    return response;
  } catch (error) {
    // Free the key so the customer can correct the problem and retry - but
    // only ours, and only while no order stands behind it.
    if (ownsClaim && idempotencyKey) await releaseIdempotency(idempotencyKey);
    return errorResponse(error);
  }
}
