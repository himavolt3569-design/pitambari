import { z } from "zod";

/**
 * Every message here is read verbatim by an admin standing in front of the
 * form, so each one names its own field. Zod's defaults ("Too small: expected
 * string to have >=1 characters") say nothing about which box is empty, which
 * makes a rejected save look like a broken button.
 */
export const variantSchema = z.object({
  productId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/, "That product link is not valid. Refresh the page and try again."),
  variantId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/, "That size link is not valid. Refresh the page and try again."),
  label: z.string().trim().min(1, 'Size is required, for example "500 ml".').max(60, "Size must be 60 characters or fewer."),
  volume: z.string().trim().min(1, 'Pack size / volume is required, for example "500 ml".').max(60, "Pack size / volume must be 60 characters or fewer."),
  sku: z.string().trim().min(1, 'SKU is required. It is your own code for this size, for example "SHINE-500".').max(120, "SKU must be 120 characters or fewer."),
  priceRupees: z.number().finite("Price must be a number.").min(0, "Price cannot be negative.").max(10_000_000, "Price is too large.").refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Price can have at most two decimal places."),
  stock: z.number().int("Stock must be a whole number.").min(0, "Stock cannot be negative.").max(1_000_000, "Stock is too large."),
  active: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int("Display order must be a whole number.").min(0, "Display order cannot be negative.").max(999, "Display order must be 999 or less."),
}).refine(value => !value.active || value.priceRupees > 0, { message: 'Price is required when "For sale" is ticked.', path: ["priceRupees"] });

/**
 * True when another size on the same product already uses this SKU.
 *
 * Split out so the admin form can test exactly this rule and blame the SKU box
 * for it. The identity checks in validateVariantSave are about server state the
 * browser cannot see, so they are not the form's to pre-empt.
 */
export function skuTaken(
  sku: string,
  variantId: string,
  existing: { id: string; sku: string }[],
) {
  const wanted = sku.trim().toLowerCase();
  return existing.some(item => item.id !== variantId && item.sku.toLowerCase() === wanted);
}

export const SKU_TAKEN_MESSAGE = "Use a unique SKU for each size.";

export function validateVariantSave(
  input: z.infer<typeof variantSchema>,
  existing: { id: string; sku: string }[],
  creating: boolean,
) {
  const found = existing.some(item => item.id === input.variantId);
  if (creating && found) throw new Error("This size already exists. Refresh and edit it instead.");
  if (!creating && !found) throw new Error("This size no longer exists. Refresh and add it again.");
  if (skuTaken(input.sku, input.variantId, existing)) throw new Error(SKU_TAKEN_MESSAGE);
}
