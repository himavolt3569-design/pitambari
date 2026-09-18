import { z } from "zod";
import {
  NEPAL_DISTRICTS,
  NEPAL_PROVINCES,
  normalizeNepaliMobile,
} from "@/config/nepal";

/**
 * One schema set, used by the checkout form in the browser and again by the
 * server routes. The server never trusts the client-side pass: it re-parses
 * every payload before touching Firestore.
 */

const trimmed = (max: number) => z.string().trim().max(max);

/** Strips control characters that have no business in an address field. */
const safeText = (max: number) =>
  trimmed(max).transform((v) => v.replace(/[\x00-\x1f\x7f]/g, ""));

export const provinceSchema = z.enum(NEPAL_PROVINCES);

export const addressSchema = z
  .object({
    fullName: safeText(80).pipe(z.string().min(2, "Enter your full name")),
    mobile: trimmed(24)
      .min(1, "Enter your mobile number")
      .transform((v, ctx) => {
        const national = normalizeNepaliMobile(v);
        if (!national) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid Nepali mobile number, for example 98XXXXXXXX",
          });
          return z.NEVER;
        }
        return national;
      }),
    email: z.union([z.literal(""), z.email("Enter a valid email address")]).optional(),
    province: provinceSchema,
    district: safeText(60).pipe(z.string().min(1, "Select your district")),
    municipality: safeText(80).pipe(
      z.string().min(2, "Enter your municipality or city"),
    ),
    ward: safeText(10).optional(),
    area: safeText(120).pipe(z.string().min(2, "Enter your area or tole")),
    street: safeText(160).optional(),
    notes: safeText(500).optional(),
  })
  .superRefine((value, ctx) => {
    // Guard against a district that does not belong to the chosen province.
    const districts = NEPAL_DISTRICTS[value.province];
    if (districts && !districts.includes(value.district)) {
      ctx.addIssue({
        code: "custom",
        path: ["district"],
        message: "Choose a district inside the selected province",
      });
    }
  });

export type AddressInput = z.infer<typeof addressSchema>;

export const cartItemSchema = z.object({
  productId: trimmed(120).min(1),
  variantId: trimmed(120).min(1),
  quantity: z.number().int().min(1).max(99),
});

export const cartSchema = z
  .array(cartItemSchema)
  .min(1, "Your cart is empty")
  .max(20, "Too many different items in one order")
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (const item of items) {
      const key = `${item.productId}::${item.variantId}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: "Duplicate item in cart" });
        return;
      }
      seen.add(key);
    }
  });

export const quoteRequestSchema = z.object({
  items: cartSchema,
  province: provinceSchema.optional(),
  district: trimmed(60).optional(),
});

export const createOrderSchema = z.object({
  items: cartSchema,
  address: addressSchema,
  deliveryMethodId: trimmed(120).min(1, "Choose a delivery option"),
  paymentMethodId: trimmed(120).min(1, "Choose a payment method"),
  /** Client-generated UUID that makes a retried submit safe to replay. */
  idempotencyKey: z.uuid("Invalid request key"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const paymentProofSchema = z.object({
  orderId: trimmed(120).min(1),
  orderNumber: trimmed(40).min(1),
  reference: safeText(120).optional(),
  /** Storage path written by the browser upload, verified server side. */
  proofPath: trimmed(400).optional(),
});

export const trackLookupSchema = z.object({
  orderNumber: trimmed(40)
    .min(1, "Enter your order number")
    .transform((v) => v.toUpperCase()),
  mobile: trimmed(24).min(1, "Enter the mobile number on the order"),
});

export const cancelOrderSchema = z.object({
  orderNumber: trimmed(40)
    .min(1, "Enter your order number")
    .transform((v) => v.toUpperCase()),
  /** Sent only when the browser has no customer cookie. */
  mobile: trimmed(24).optional(),
  reason: safeText(300).optional(),
});

export const adminLoginSchema = z.object({
  idToken: z.string().min(20).max(4096),
});

/** Flattens a ZodError into `{ fieldName: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
