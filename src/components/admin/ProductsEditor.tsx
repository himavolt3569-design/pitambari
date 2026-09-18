"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import Image from "next/image";
import { saveProductImages, saveVariant, setProductActive } from "@/app/admin/actions";
import { uploadAdminMedia } from "@/lib/utils/upload";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import { minorToRupees, formatNpr } from "@/lib/utils/money";
import { variantSchema, skuTaken, SKU_TAKEN_MESSAGE } from "@/lib/commerce/variant-admin";
import type { Product, ProductVariant } from "@/types";
import { saveProductCopy } from "@/app/admin/content-actions";

export function ProductsEditor({ products }: { products: Product[] }) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  if (!products.length) {
    return (
      <Notice tone="warn">
        No products in Firestore yet. Seed the product in your configured Firebase
        project, then add your actual sizes, prices and stock here.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {products.map((product) => (
        <Panel key={product.id} title={product.name}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/12 px-5 py-3">
            <p className="text-[0.8125rem] text-muted">
              {product.variants.length} size
              {product.variants.length === 1 ? "" : "s"} . {product.active ? "Visible" : "Hidden"}
            </p>
            <ToggleActive
              productId={product.id}
              active={product.active}
              onDone={setMessage}
            />
          </div>

          <ProductCopy product={product} onDone={setMessage} />
          <ul className="divide-y divide-charcoal/10">
            {product.variants.map((variant) => (
              <VariantRow
                key={`${variant.id}-${variant.isDefault}`}
                productId={product.id}
                variant={variant}
                siblings={product.variants}
                onDone={setMessage}
              />
            ))}
          </ul>
          <NewVariant product={product} onDone={setMessage} />

          <ImageManager
            productId={product.id}
            images={product.images}
            onDone={setMessage}
          />
        </Panel>
      ))}
    </div>
  );
}

type Notify = (m: { tone: "success" | "error"; text: string }) => void;

function ProductCopy({ product, onDone }: { product: Product; onDone: Notify }) {
  const [s,setS]=useState({id:product.id,name:product.name,shortDescription:product.shortDescription,description:product.description});
  const [pending,start]=useTransition(); const router=useRouter();
  return <form className="grid gap-3 border-b border-charcoal/10 p-5" onSubmit={e=>{e.preventDefault();start(async()=>{const r=await saveProductCopy(s);onDone({tone:r.ok?'success':'error',text:r.ok?'Product description saved.':r.error??'Could not save.'});if(r.ok)router.refresh();});}}>
    {(['name','shortDescription','description'] as const).map(key=><label key={key} className="grid gap-1 text-xs text-muted">{{name:'Product name',shortDescription:'Short description',description:'Full description'}[key]}<textarea required rows={key==='description'?3:2} className="rounded-lg border bg-paper p-3 text-sm text-charcoal" value={s[key]} onChange={e=>setS({...s,[key]:e.target.value})}/></label>)}
    <div><Button type="submit" disabled={pending}>Save product copy</Button></div>
  </form>;
}

function ToggleActive({
  productId,
  active,
  onDone,
}: {
  productId: string;
  active: boolean;
  onDone: Notify;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setProductActive(productId, !active);
          onDone(
            r.ok
              ? { tone: "success", text: `Product ${!active ? "is now visible" : "is now hidden"}.` }
              : { tone: "error", text: r.error ?? "That did not save." },
          );
          if (r.ok) router.refresh();
        })
      }
    >
      <span>{active ? "Hide from store" : "Show in store"}</span>
    </Button>
  );
}

function VariantRow({
  productId,
  variant,
  siblings,
  onDone,
  isNew = false,
  onCreated,
}: {
  productId: string;
  variant: ProductVariant;
  /** Every size already on this product, so a clashing SKU is caught here too. */
  siblings: ProductVariant[];
  onDone: Notify;
  isNew?: boolean;
  onCreated?: () => void;
}) {
  const [label, setLabel] = useState(variant.label);
  const [volume, setVolume] = useState(variant.volume);
  const [sku, setSku] = useState(variant.sku);
  const [isDefault, setIsDefault] = useState(Boolean(variant.isDefault));
  const [sortOrder, setSortOrder] = useState(String(variant.sortOrder));
  const [price, setPrice] = useState(isNew ? "" : String(minorToRupees(variant.priceMinor)));
  const [stock, setStock] = useState(String(variant.stock));
  const [active, setActive] = useState(variant.active);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const rowId = useId();

  // Editing a box clears its own complaint, so the row does not keep shouting
  // about something already fixed.
  const clear = (name: string) =>
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });

  const dirty =
    isNew || volume !== variant.volume || sku !== variant.sku ||
    isDefault !== Boolean(variant.isDefault) || Number(sortOrder) !== variant.sortOrder ||
    label !== variant.label ||
    Number(price) !== minorToRupees(variant.priceMinor) ||
    Number(stock) !== variant.stock ||
    active !== variant.active;

  const save = () => {
    const payload = {
      productId,
      variantId: variant.id,
      label: label.trim(),
      volume: volume.trim(),
      sku: sku.trim(),
      isDefault,
      priceRupees: Number(price),
      stock: Number(stock),
      active,
      sortOrder: Number(sortOrder),
    };

    // Same schema the server action runs, so the row can answer immediately
    // instead of spending a round trip to say a box is empty. The server still
    // re-checks everything: this only decides whether it is worth asking.
    const parsed = variantSchema.safeParse(payload);
    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      onDone({ tone: "error", text: [...new Set(Object.values(found))].join(" ") });
      return;
    }

    // Duplicate SKUs are a cross-row rule, so it takes the siblings rather than
    // the schema. The server repeats it inside its transaction, where it is the
    // check that actually counts.
    if (skuTaken(payload.sku, variant.id, siblings)) {
      setErrors({ sku: SKU_TAKEN_MESSAGE });
      onDone({ tone: "error", text: SKU_TAKEN_MESSAGE });
      return;
    }

    setErrors({});
    start(async () => {
      const result = await saveVariant(payload, isNew);
      onDone(
        result.ok
          ? { tone: "success", text: `${label} saved.` }
          : { tone: "error", text: result.error ?? "That did not save." },
      );
      if (result.ok) { onCreated?.(); router.refresh(); }
    });
  };

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
      <Small label="Size" required hint='What buyers pick, e.g. "500 ml"' error={errors.label} errorId={`${rowId}-label`}>
        <input
          value={label}
          onChange={(e) => { setLabel(e.target.value); clear("label"); }}
          className={errors.label ? INPUT_INVALID : INPUT}
          aria-label="Size label"
          aria-required="true"
          aria-invalid={Boolean(errors.label)}
          aria-describedby={errors.label ? `${rowId}-label` : undefined}
        />
      </Small>

      <Small label="Pack size / volume" required hint="Contents of the bottle" error={errors.volume} errorId={`${rowId}-volume`}>
        <input value={volume} onChange={e => { setVolume(e.target.value); clear("volume"); }} className={errors.volume ? INPUT_INVALID : INPUT} aria-label="Pack size or volume" aria-required="true" aria-invalid={Boolean(errors.volume)} aria-describedby={errors.volume ? `${rowId}-volume` : undefined} />
      </Small>
      <Small label="SKU" required hint='Your own code, unique per size, e.g. "SHINE-500"' error={errors.sku} errorId={`${rowId}-sku`}>
        <input value={sku} onChange={e => { setSku(e.target.value); clear("sku"); }} className={errors.sku ? INPUT_INVALID : INPUT} aria-label="SKU" aria-required="true" aria-invalid={Boolean(errors.sku)} aria-describedby={errors.sku ? `${rowId}-sku` : undefined} />
      </Small>

      <Small label="Price, Rs." required={active} hint={active ? 'Must be above 0 while "For sale" is ticked' : 'Needed once you tick "For sale"'} error={errors.priceRupees} errorId={`${rowId}-price`}>
        <input
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => { setPrice(e.target.value); clear("priceRupees"); }}
          className={`${errors.priceRupees ? INPUT_INVALID : INPUT} tabular`}
          aria-label="Price in rupees"
          aria-required={active}
          aria-invalid={Boolean(errors.priceRupees)}
          aria-describedby={errors.priceRupees ? `${rowId}-price` : undefined}
        />
      </Small>

      <Small label="Display order" hint="Lower shows first" error={errors.sortOrder} errorId={`${rowId}-order`}>
        <input type="number" min={0} max={999} step={1} value={sortOrder} onChange={e => { setSortOrder(e.target.value); clear("sortOrder"); }} className={errors.sortOrder ? INPUT_INVALID : INPUT} aria-label="Display order" aria-invalid={Boolean(errors.sortOrder)} aria-describedby={errors.sortOrder ? `${rowId}-order` : undefined} />
      </Small>
      <label className="flex h-10 items-center gap-2 text-[0.8125rem] text-charcoal">
        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="h-4 w-4 accent-[var(--color-forest)]" />
        Preselected size
      </label>

      <Small label="Stock" hint="Units on hand; 0 shows as sold out" error={errors.stock} errorId={`${rowId}-stock`}>
        <input
          type="number"
          min={0}
          step={1}
          value={stock}
          onChange={(e) => { setStock(e.target.value); clear("stock"); }}
          className={`${errors.stock ? INPUT_INVALID : INPUT} tabular`}
          aria-label="Units in stock"
          aria-invalid={Boolean(errors.stock)}
          aria-describedby={errors.stock ? `${rowId}-stock` : undefined}
        />
      </Small>

      <label className="flex h-10 items-center gap-2 text-[0.8125rem] text-charcoal">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-forest)]"
        />
        For sale
      </label>

      <Button size="sm" disabled={!dirty || pending} onClick={save}>
        <span>{pending ? "Saving..." : isNew ? "Create size" : dirty ? "Save" : "Saved"}</span>
      </Button>

      <p className="tabular text-[0.75rem] text-muted sm:col-span-2 lg:col-span-4">
        {isNew ? (
          <>
            <span className="text-terracotta">*</span> Size, pack size / volume and SKU are
            required. Price is required once &ldquo;For sale&rdquo; is ticked; stock and
            display order can be left as they are.
          </>
        ) : `SKU ${variant.sku} . currently set to ${formatNpr(variant.priceMinor)}`}
        {variant.isDefault ? " . pre-selected on the storefront" : ""}
      </p>
    </li>
  );
}

function NewVariant({ product, onDone }: { product: Product; onDone: Notify }) {
  const [draft, setDraft] = useState<ProductVariant | null>(null);
  return <div className="border-t border-charcoal/12 p-5">
    {!product.variants.length && <p className="mb-4 text-sm text-muted">No sizes are configured. Add a size and price to make this product available for purchase.</p>}
    {draft ? <><ul><VariantRow productId={product.id} variant={draft} siblings={product.variants} isNew onDone={onDone} onCreated={() => setDraft(null)} /></ul><Button variant="secondary" onClick={() => setDraft(null)}>Discard new size</Button></> : <Button variant="secondary" onClick={() => setDraft({ id: crypto.randomUUID(), label: "", volume: "", sku: "", priceMinor: 0, compareAtPriceMinor: null, stock: 0, active: false, isDefault: product.variants.length === 0, sortOrder: Math.min(999, product.variants.length ? Math.max(...product.variants.map(item => item.sortOrder)) + 1 : 0) })}>Add size</Button>}
  </div>;
}

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

const INPUT_INVALID =
  "h-10 w-full rounded-[9px] border border-terracotta bg-paper px-3 text-[0.875rem] text-charcoal focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";

/**
 * Product photography. The first image is the one the storefront uses as the
 * hero bottle, so ordering matters and is stated plainly.
 */
function ImageManager({
  productId,
  images,
  onDone,
}: {
  productId: string;
  images: string[];
  onDone: Notify;
}) {
  const [list, setList] = useState<string[]>(images);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = JSON.stringify(list) !== JSON.stringify(images);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminMedia(file, "products");
      setList((l) => [...l, url]);
      onDone({ tone: "success", text: "Uploaded. Press Save images to publish." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Could not upload that image." });
    } finally {
      setUploading(false);
    }
  };

  const save = () =>
    start(async () => {
      const r = await saveProductImages(productId, list);
      onDone(
        r.ok
          ? { tone: "success", text: "Product images saved." }
          : { tone: "error", text: r.error ?? "That did not save." },
      );
      if (r.ok) router.refresh();
    });

  return (
    <div className="border-t border-charcoal/12 p-5">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        Product images
      </h3>

      <ul className="mt-4 flex flex-wrap gap-3">
        {list.map((src, i) => (
          <li key={src} className="relative">
            <Image
              src={src}
              alt=""
              width={84}
              height={104}
              unoptimized
              className="h-[104px] w-[84px] rounded-[10px] border border-charcoal/12 bg-stone object-contain p-1"
            />
            {i === 0 && (
              <span className="mt-1 block text-center text-[0.625rem] font-semibold text-brass-ink">
                Main
              </span>
            )}
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => setList((l) => l.filter((x) => x !== src))}
                aria-label="Remove this image"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-charcoal/15 bg-paper text-charcoal shadow-sm hover:bg-charcoal hover:text-paper"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor={`product-img-${productId}`}
          className="cursor-pointer rounded-[10px] border border-charcoal/18 bg-paper px-4 py-2 text-[0.8125rem] font-semibold text-charcoal hover:border-charcoal/45"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </label>
        <input
          id={`product-img-${productId}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button size="sm" disabled={!dirty || pending} onClick={save}>
          <span>{pending ? "Saving..." : dirty ? "Save images" : "Saved"}</span>
        </Button>
      </div>

      <p className="mt-3 text-[0.75rem] text-muted">
        The first image is the one used across the storefront. Transparent PNGs
        work best: the bottle sits on the page without a background.
      </p>
    </div>
  );
}

/**
 * Field wrapper for the variant row. Required and optional are both stated
 * outright: a blank SKU is rejected by the server, and without a marker the
 * only clue is an error that arrives after the save is attempted.
 */
function Small({
  label,
  required,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
        {required ? (
          <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
        ) : (
          <span className="ml-1 font-medium lowercase tracking-normal text-charcoal/35">
            optional
          </span>
        )}
      </span>
      {children}
      {/* The complaint replaces the hint: once a box is wrong, the example is
          no longer the thing worth reading. */}
      {error ? (
        <span id={errorId} role="alert" className="mt-1 block text-[0.6875rem] font-medium leading-snug text-terracotta">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[0.6875rem] leading-snug text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
