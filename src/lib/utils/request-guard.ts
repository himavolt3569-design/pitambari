import "server-only";

import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { SITE } from "@/config/site";

/**
 * Request-level defences shared by every mutating route: origin checking,
 * caller identification and rate limiting.
 */

/** Best-effort client address. Trusts only the first hop from the platform. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return (
    h.get("x-real-ip")?.slice(0, 64) ??
    h.get("cf-connecting-ip")?.slice(0, 64) ??
    "unknown"
  );
}

/**
 * Cross-origin POSTs are rejected outright. Next.js checks this for Server
 * Actions already; route handlers need it doing explicitly.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");

  // Same-origin fetches from some clients omit Origin entirely; a cross-site
  // browser POST never does, so a missing header is allowed through.
  if (!origin) return;

  const host = h.get("host");
  const allowed = new Set<string>();
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  try {
    allowed.add(new URL(SITE.url).origin);
  } catch {
    /* SITE.url is malformed; host check still applies. */
  }

  if (!allowed.has(origin)) {
    throw new GuardError("Request blocked.", 403);
  }
}

export class GuardError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "GuardError";
  }
}

/* ---------------------------------------------------------- rate limiting */

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window limiter. Uses Firestore so the limit holds across serverless
 * instances, and falls back to per-instance memory when Firebase is absent.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${bucket}:${identifier}:${windowStart}`;

  const db = adminDb();

  if (!db) {
    const entry = memoryWindows.get(key);
    if (entry && entry.resetAt > now) {
      if (entry.count >= limit) {
        throw new GuardError(
          "Too many attempts. Please wait a moment and try again.",
          429,
          Math.ceil((entry.resetAt - now) / 1000),
        );
      }
      entry.count += 1;
    } else {
      memoryWindows.set(key, { count: 1, resetAt: windowStart + windowMs });
    }
    // Keep the map from growing without bound on a long-lived instance.
    if (memoryWindows.size > 5_000) {
      for (const [k, v] of memoryWindows) {
        if (v.resetAt <= now) memoryWindows.delete(k);
      }
    }
    return;
  }

  const ref = db.collection(COLLECTIONS.rateLimits).doc(encodeKey(key));

  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
    const next = current + 1;
    tx.set(
      ref,
      { count: next, expiresAt: new Date(windowStart + windowMs), bucket },
      { merge: true },
    );
    return next;
  });

  if (count > limit) {
    throw new GuardError(
      "Too many attempts. Please wait a moment and try again.",
      429,
      Math.ceil((windowStart + windowMs - now) / 1000),
    );
  }
}

/** Firestore document ids cannot contain "/" and are capped in length. */
function encodeKey(key: string): string {
  return Buffer.from(key).toString("base64url").slice(0, 400);
}

/* ------------------------------------------------------------ idempotency */

export interface IdempotencyHit<T> {
  replayed: true;
  value: T;
  /** The browser key recorded when this order was first placed. */
  customerKey: string | null;
}

/**
 * The document a claim lives in.
 *
 * Exposed so the order transaction can mark the claim completed in the same
 * commit that writes the order. Completing it afterwards leaves a window: if
 * the process dies in between, the key never completes and the retry that
 * follows creates a second order for the same payment.
 */
export function idempotencyRef(key: string) {
  const db = adminDb();
  if (!db) return null;
  return db.collection(COLLECTIONS.idempotency).doc(encodeKey(key));
}

/**
 * Claims an idempotency key. Returns the stored result when the key has already
 * completed, so a double-tapped Place Order button cannot create two orders.
 *
 * The claim records the browser that made it. The caller serves a replay only
 * to that same browser, or to one presenting no key at all - which is the case
 * this whole mechanism exists for, where the first response was lost and the
 * cookie it carried never arrived.
 */
export async function claimIdempotency<T>(
  key: string,
  customerKey: string,
): Promise<IdempotencyHit<T> | null> {
  const db = adminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTIONS.idempotency).doc(encodeKey(key));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (snap.exists) {
      const data = snap.data() ?? {};
      if (data.status === "completed") {
        return {
          replayed: true,
          value: data.result as T,
          customerKey:
            typeof data.customerKey === "string" ? data.customerKey : null,
        };
      }
      // An in-flight claim from a concurrent retry.
      throw new GuardError("This order is already being processed.", 409);
    }

    tx.set(ref, {
      status: "in_flight",
      customerKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return null;
  });
}

/**
 * Frees a claim so the customer can correct the problem and retry.
 *
 * Only ever called by the request that owns the claim, and only before its
 * order exists. Releasing someone else's in-flight claim would let the next
 * retry through as if it were the first.
 */
export async function releaseIdempotency(key: string) {
  const db = adminDb();
  if (!db) return;
  await db
    .collection(COLLECTIONS.idempotency)
    .doc(encodeKey(key))
    .delete()
    .catch(() => {});
}
