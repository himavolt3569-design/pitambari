import { NextRequest, NextResponse } from "next/server";
import { getMediaFromFirestore } from "@/lib/data/media";
import { getAdminUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Images live in Firestore rather than Cloud Storage, so this route is the only
 * door to them and therefore the only place the privacy rule can live.
 *
 * A payment screenshot is a customer's bank record. It is stored under a
 * `proof_` id, only a signed-in admin may read one, and the response must not
 * be cached by any proxy in between. Everything else — product shots,
 * before/after photos — is public and safe to cache forever.
 */
const PRIVATE_PREFIX = "proof_";

const noStore = { "cache-control": "no-store" } as const;

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    if (!id || typeof id !== "string") {
      return new NextResponse("Not Found", { status: 404, headers: noStore });
    }

    const isPrivate = id.startsWith(PRIVATE_PREFIX);

    // Same answer as a missing image: an anonymous caller cannot learn whether
    // a given screenshot exists, let alone see it.
    if (isPrivate && !(await getAdminUser())) {
      return new NextResponse("Not Found", { status: 404, headers: noStore });
    }

    const media = await getMediaFromFirestore(id);
    if (!media) {
      return new NextResponse("Image Not Found", { status: 404, headers: noStore });
    }

    return new Response(new Uint8Array(media.buffer), {
      status: 200,
      headers: {
        "Content-Type": media.contentType || "image/jpeg",
        "Cache-Control": isPrivate
          ? "no-store"
          : "public, max-age=31536000, immutable",
        "Content-Length": String(media.buffer.length),
      },
    });
  } catch (error) {
    console.error("[api/media error]", error);
    return new NextResponse("Server Error", { status: 500, headers: noStore });
  }
}
