import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import { noStore } from "@/lib/utils/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Takes the payment screenshot and stores it in Firestore.
 *
 * It is saved under the `proof` folder, which is what makes `/api/media` treat
 * it as staff-only, and stamped with its order id so `/api/payments/proof` can
 * confirm the screenshot really belongs to the order claiming it. Nothing is
 * written to `public/`: that directory is served to anyone who asks.
 *
 * The path returned here is not a permission. It is checked again, against the
 * customer's own cookie, before it is ever attached to an order.
 */
export async function POST(req: NextRequest) {
  try {
    await assertSameOrigin();
    await rateLimit("checkout-upload-proof", await clientIp(), 10, 300);

    const formData = await req.formData();
    const file = formData.get("file");
    const rawOrderId = formData.get("orderId");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No image file provided." },
        { status: 400, headers: noStore },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Screenshot exceeds 6MB limit." },
        { status: 400, headers: noStore },
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPEG, PNG, or WebP images are allowed." },
        { status: 400, headers: noStore },
      );
    }

    // Without an order to attach it to, the screenshot could never be claimed,
    // so refuse it here rather than storing an orphan.
    const orderId =
      typeof rawOrderId === "string"
        ? rawOrderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120)
        : "";

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Missing order reference for this upload." },
        { status: 400, headers: noStore },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveMediaToFirestore } = await import("@/lib/data/media");
    const mediaUrl = await saveMediaToFirestore(
      buffer,
      file.type || "image/jpeg",
      file.name,
      "proof",
      orderId,
    );

    return NextResponse.json({ ok: true, path: mediaUrl }, { headers: noStore });
  } catch (err) {
    console.error("[upload-proof error]", err);
    return NextResponse.json(
      { ok: false, error: "Could not upload proof screenshot." },
      { status: 500, headers: noStore },
    );
  }
}
