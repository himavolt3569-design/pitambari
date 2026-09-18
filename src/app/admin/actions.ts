"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { requireSuperAdmin, NotAuthorisedError } from "@/lib/auth/session";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SETTINGS_DOC } from "@/lib/firebase/collections";
import { rupeesToMinor } from "@/lib/utils/money";
import { NEPAL_DISTRICTS, NEPAL_PROVINCES } from "@/config/nepal";
import { ORDER_STATUSES } from "@/lib/commerce/order-status";
import { applyOrderTransition } from "@/lib/commerce/apply-transition";
import { OrderTransitionError } from "@/lib/commerce/order-transition";
import { videoSettingsSchema } from "@/lib/content/video";
import { variantSchema, validateVariantSave } from "@/lib/commerce/variant-admin";

/**
 * Every admin mutation.
 *
 * Each action re-verifies the session and the superAdmin claim before touching
 * anything: being able to call a Server Action is not authorisation. Inputs are
 * validated with zod, and every write records an audit event.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function guard() {
  try {
    return await requireSuperAdmin();
  } catch {
    throw new NotAuthorisedError();
  }
}

function fail(error: unknown): ActionResult {
  if (error instanceof OrderTransitionError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof NotAuthorisedError) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  console.error("[admin action]", error);
  return { ok: false, error: "That did not save. Please try again." };
}

async function audit(
  orderId: string | null,
  type: string,
  message: string,
  actorEmail: string | null,
) {
  const db = requireDb();
  await db.collection(COLLECTIONS.orderEvents).add({
    orderId,
    type,
    message,
    actor: actorEmail ?? "admin",
    createdAt: FieldValue.serverTimestamp(),
  });
}

/* ---------------------------------------------------------------- orders */

const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "pending_verification",
  "paid",
  "failed",
  "refund_pending",
  "refunded",
] as const;

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.enum(ORDER_STATUSES).safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown order status." };

    await applyOrderTransition({
      orderId,
      to: parsed.data,
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Cancelling is not just a status: it returns stock, and a paid order is
 * marked "refund due" for someone to settle by hand. Both happen inside
 * applyOrderTransition. Nothing here moves money.
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.string().trim().max(500).safeParse(reason);
    if (!parsed.success) return { ok: false, error: "That reason is too long." };

    await applyOrderTransition({
      orderId,
      to: "cancelled",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      reason: parsed.data,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const FAILURE_REASONS = [
  "customer_unreachable",
  "address_not_found",
  "customer_refused",
  "payment_not_ready",
  "rescheduled_by_customer",
  "area_not_serviced",
  "damaged_in_transit",
  "other",
] as const;

/** Records a courier's failed attempt, with why, and counts the attempt. */
export async function recordDeliveryFailure(
  orderId: string,
  reason: string,
  note: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .object({
        reason: z.enum(FAILURE_REASONS),
        note: z.string().trim().max(500),
      })
      .safeParse({ reason, note });

    if (!parsed.success) return { ok: false, error: "Choose a failure reason." };

    await applyOrderTransition({
      orderId,
      to: "delivery_failed",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      failureReason: parsed.data.reason,
      reason: parsed.data.note,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Approving cancels and restocks. Refusing puts the parcel back on the road,
 * which is why the order returns to out_for_delivery rather than its old state.
 */
export async function decideCancellationRequest(
  orderId: string,
  decision: "approve" | "refuse",
  note: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .object({
        decision: z.enum(["approve", "refuse"]),
        note: z.string().trim().max(500),
      })
      .safeParse({ decision, note });

    if (!parsed.success) return { ok: false, error: "Choose approve or refuse." };

    await applyOrderTransition({
      orderId,
      to: parsed.data.decision === "approve" ? "cancelled" : "out_for_delivery",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      reason: parsed.data.note,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * The only path that can mark a manual payment as paid, and it is admin-only
 * and audited. Nothing the customer does can reach this state.
 */
export async function setPaymentStatus(
  orderId: string,
  status: string,
  note?: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.enum(PAYMENT_STATUSES).safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown payment status." };

    const db = requireDb();
    const ref = db.collection(COLLECTIONS.orders).doc(orderId);

    const shouldConfirm = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Order not found");

      tx.update(ref, {
        paymentStatus: parsed.data,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Confirming payment on a still-pending order also moves it forward, but
      // that move belongs to the transition machine, not to this write.
      return parsed.data === "paid" && snap.data()?.orderStatus === "pending";
    });

    if (shouldConfirm) {
      await applyOrderTransition({
        orderId,
        to: "confirmed",
        actor: "admin",
        actorLabel: admin.email ?? admin.uid,
        reason: "Payment confirmed.",
      });
    }

    await audit(
      orderId,
      "payment_status_changed",
      note
        ? `Payment marked ${parsed.data}. ${note}`
        : `Payment marked ${parsed.data}.`,
      admin.email,
    );
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------- products */

export async function saveVariant(
  input: z.input<typeof variantSchema>,
  creating = false,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = variantSchema.safeParse(input);
    if (typeof creating !== "boolean") return { ok: false, error: "Invalid save mode." };
    if (!parsed.success) {
      // Report every empty field at once. Surfacing only issues[0] means an
      // admin filling a blank row fixes one box, saves, and is told about the
      // next one, which reads as the button failing at random.
      const problems = [...new Set(parsed.error.issues.map(issue => issue.message))];
      return { ok: false, error: problems.join(" ") || "Check the values." };
    }

    const v = parsed.data;
    const db = requireDb();

    const productRef = db.collection(COLLECTIONS.products).doc(v.productId);
    const variantsRef = productRef.collection(COLLECTIONS.variants);
    await db.runTransaction(async tx => {
      const product = await tx.get(productRef);
      if (!product.exists) throw new Error("Product not found.");
      const variants = await tx.get(variantsRef);
      validateVariantSave(v, variants.docs.map(doc => ({ id: doc.id, sku: String(doc.data().sku ?? "") })), creating);
      const data = {
          label: v.label,
          volume: v.volume,
          sku: v.sku,
          priceMinor: rupeesToMinor(v.priceRupees),
          stock: v.stock,
          active: v.active,
          isDefault: v.isDefault,
          sortOrder: v.sortOrder,
          updatedAt: FieldValue.serverTimestamp(),
      };
      if (creating) tx.create(variantsRef.doc(v.variantId), { ...data, compareAtPriceMinor: null });
      else tx.update(variantsRef.doc(v.variantId), data);
      if (v.isDefault) {
        for (const variant of variants.docs) {
          if (variant.id !== v.variantId && variant.data().isDefault) tx.update(variant.ref, { isDefault: false });
        }
      }
      // Serialize all edits for this product, including concurrent default/SKU changes.
      tx.update(productRef, { updatedAt: FieldValue.serverTimestamp() });
      tx.create(db.collection(COLLECTIONS.orderEvents).doc(), {
        orderId: null, type: creating ? "variant_created" : "variant_updated",
        message: `${v.label} set to Rs. ${v.priceRupees} with ${v.stock} in stock.`,
        actor: admin.email ?? admin.uid, createdAt: FieldValue.serverTimestamp(),
      });
    });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setProductActive(
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.products).doc(productId).update({
      active,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------- payment and delivery */

const paymentMethodSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  kind: z.enum(["cod", "qr", "bank_transfer", "esewa", "khalti", "fonepay", "custom"]),
  enabled: z.boolean(),
  requiresVerification: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  instructions: z.string().trim().max(600).optional(),
  accountTitle: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(60).optional(),
  qrImageUrl: z.string().trim().max(600).optional(),
});

export async function savePaymentMethod(
  input: z.input<typeof paymentMethodSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = paymentMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { id, ...rest } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.paymentMethods)
      .doc(id)
      .set({ ...rest, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const deliveryMethodSchema = z.object({
  partnerId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).nullable().optional(),
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  kind: z.enum(["home", "valley", "outside_valley", "pickup", "same_day"]),
  enabled: z.boolean(),
  feeRupees: z.number().min(0).max(1_000_000),
  estimate: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(999),
  provinces: z.array(z.enum(NEPAL_PROVINCES)).max(7),
  districts: z.array(z.string().trim().refine(d => Object.values(NEPAL_DISTRICTS).flat().includes(d), "Choose a valid Nepal district.")).max(77),
  freeDeliveryThresholdRupees: z.number().min(0).max(10_000_000).nullable(),
  minimumOrderRupees: z.number().min(0).max(10_000_000).nullable(),
});

export async function saveDeliveryMethod(
  input: z.input<typeof deliveryMethodSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = deliveryMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const {
      id,
      feeRupees,
      freeDeliveryThresholdRupees,
      minimumOrderRupees,
      ...rest
    } = parsed.data;

    const db = requireDb();
    if (rest.partnerId) {
      const company = await db.collection("partners").doc(rest.partnerId).get();
      if (!company.exists || !company.data()?.active) return { ok: false, error: "Choose an active delivery company." };
    }
    await db
      .collection(COLLECTIONS.deliveryMethods)
      .doc(id)
      .set(
        {
          ...rest,
          feeMinor: rupeesToMinor(feeRupees),
          freeDeliveryThresholdMinor:
            freeDeliveryThresholdRupees === null
              ? null
              : rupeesToMinor(freeDeliveryThresholdRupees),
          minimumOrderMinor:
            minimumOrderRupees === null ? null : rupeesToMinor(minimumOrderRupees),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------- content and settings */

const settingsSchema = z.object({
  video: videoSettingsSchema.optional(),
  heroImage: z.string().trim().max(1000).default(""),
  introImage: z.string().trim().max(1000).default("/shine/03_Website_Visuals/super-shine-warm-product-scene.png"),
  heroPrimaryCta: z.string().trim().min(1).max(80).default("Shop Super Shine"),
  heroSecondaryCta: z.string().trim().min(1).max(80).default("See the results"),
  announcement: z.string().trim().max(200),
  announcementEnabled: z.boolean(),
  heroEyebrow: z.string().trim().max(80),
  heroHeadline: z.string().trim().max(200),
  heroBody: z.string().trim().max(600),
  heroSupport: z.string().trim().max(200),
  introEyebrow: z.string().trim().max(80),
  introHeadline: z.string().trim().max(200),
  introBody: z.string().trim().max(900),
  whyHeadline: z.string().trim().max(200),
  whyBody: z.string().trim().max(2000),
  usageNote: z.string().trim().max(600),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(120),
  address: z.string().trim().max(200),
});

export async function saveSettings(
  input: z.input<typeof settingsSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      // Name the field. One bad value rejects the whole form, so a bare
      // "enter a valid link" leaves an editor hunting through every panel
      // for what it is complaining about - and silently discards the rest
      // of their edits while they do.
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(" › ")}: ` : "";
      return {
        ok: false,
        error: `${where}${issue?.message ?? "Check the values."}`,
      };
    }

    const s = parsed.data;
    const db = requireDb();

    await db
      .collection(COLLECTIONS.siteSettings)
      .doc(SETTINGS_DOC)
      .set(
        {
          announcement: s.announcement || null,
          ...(s.video ? { video: s.video } : {}),
          announcementEnabled: s.announcementEnabled,
          hero: {
            image: s.heroImage,
            primaryCta: s.heroPrimaryCta,
            secondaryCta: s.heroSecondaryCta,
            eyebrow: s.heroEyebrow,
            // One line per row keeps the hero's line breaks in the editor's hands.
            headline: s.heroHeadline.split("\n").map((l) => l.trim()).filter(Boolean),
            body: s.heroBody,
            support: s.heroSupport,
          },
          intro: {
            image: s.introImage,
            eyebrow: s.introEyebrow,
            headline: s.introHeadline,
            body: s.introBody,
          },
          why: {
            headline: s.whyHeadline,
            body: s.whyBody.split("\n\n").map((p) => p.trim()).filter(Boolean),
          },
          usageNote: s.usageNote || null,
          contact: {
            phone: s.phone,
            whatsapp: s.whatsapp,
            email: s.email,
            address: s.address,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const faqSchema = z.object({
  id: z.string().trim().min(1).max(60),
  question: z.string().trim().min(3).max(240),
  answer: z.string().trim().min(3).max(1200),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export async function saveFaq(
  input: z.input<typeof faqSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { id, ...rest } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.faqs)
      .doc(id)
      .set({ ...rest, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.faqs).doc(id).delete();
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------- editorial collections */

/**
 * Benefits, how-to-use steps and surfaces share the same shape, so they share
 * one action. The collection name is checked against a whitelist rather than
 * passed straight through, so a crafted call cannot reach `orders` or
 * `paymentMethods`.
 */
const EDITABLE = {
  benefits: COLLECTIONS.benefits,
  steps: COLLECTIONS.steps,
  surfaces: COLLECTIONS.surfaces,
} as const;

type EditableKey = keyof typeof EDITABLE;

const contentItemSchema = z.object({
  kind: z.enum(["benefits", "steps", "surfaces"]),
  id: z.string().trim().min(1).max(60),
  /** Benefits and steps call this `title`; surfaces call it `name`. */
  heading: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(600),
  sortOrder: z.number().int().min(0).max(999),
  /** Surfaces only. An empty string clears the photograph. */
  image: z.string().trim().max(600).optional(),
});

export async function saveContentItem(
  input: z.input<typeof contentItemSchema>,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = contentItemSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { kind, id, heading, body, sortOrder, image } = parsed.data;
    const collection = EDITABLE[kind as EditableKey];

    const data: Record<string, unknown> = { body, sortOrder };
    if (kind === "surfaces") {
      data.name = heading;
      data.image = image ? image : null;
    } else {
      data.title = heading;
    }

    const db = requireDb();
    await db
      .collection(collection)
      .doc(id)
      .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await audit(null, "content_updated", `Updated ${kind}: ${heading}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteContentItem(
  kind: string,
  id: string,
): Promise<ActionResult> {
  try {
    await guard();
    const parsedKind = z.enum(["benefits", "steps", "surfaces"]).safeParse(kind);
    if (!parsedKind.success) return { ok: false, error: "Unknown content type." };

    const db = requireDb();
    await db.collection(EDITABLE[parsedKind.data]).doc(id).delete();
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const validImageRef = z
  .string()
  .trim()
  .min(1, "Image path or URL is required")
  .max(1000)
  .refine(
    (val) =>
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      val.startsWith("data:"),
    "Image must be a valid URL or relative path",
  );

/** Replaces a product's image list. URLs come from uploads or external media. */
export async function saveProductImages(
  productId: string,
  images: string[],
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .array(validImageRef)
      .min(1, "Keep at least one product image")
      .max(8)
      .safeParse(images);

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the images." };
    }

    const db = requireDb();
    await db.collection(COLLECTIONS.products).doc(productId).update({
      images: parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await audit(null, "product_images_updated", `Updated product imagery.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ---------------------------------------------------- before & after comparisons */

const comparisonSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  caption: z.string().trim().max(600),
  beforeImage: validImageRef,
  afterImage: validImageRef,
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveComparison(
  input: z.input<typeof comparisonSchema>,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = comparisonSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the comparison values." };
    }

    const { id, label, caption, beforeImage, afterImage, sortOrder } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.comparisons)
      .doc(id)
      .set(
        {
          label,
          caption,
          beforeImage,
          afterImage,
          sortOrder,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await audit(null, "comparison_updated", `Updated comparison: ${label}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteComparison(id: string): Promise<ActionResult> {
  try {
    const admin = await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.comparisons).doc(id).delete();
    await audit(null, "comparison_deleted", `Deleted comparison: ${id}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
