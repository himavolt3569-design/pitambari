import type { Benefit, ComparisonEntry, DeliveryMethod, Faq, PaymentMethod, Product, ProductFeature, SiteSettings, SurfaceEntry, UsageStep } from "@/types";

export const PRODUCT_IMAGE = "/shine/01_Product/super-shine-pitambari-liquid-transparent.png";
export const HERO_IMAGE = "/shine/03_Website_Visuals/super-shine-website-hero-banner.png";
export const SCENE_IMAGE = "/shine/03_Website_Visuals/super-shine-warm-product-scene.png";

/**
 * The intro band reuses the banner photograph.
 *
 * The hero composes its own scene from the cut-out bottle, so the banner is
 * otherwise never rendered anywhere. It also keeps the bottle from appearing
 * three times before the visitor reaches the product.
 */
export const INTRO_IMAGE = HERO_IMAGE;

const resultImage = (name: string) => `/shine/02_Before_and_After/${name}.png`;

// The superadmin creates the real sizes, prices and stock. No demo offers are seeded.
export const DEFAULT_PRODUCT: Product = {
  id: "super-shine", slug: "super-shine", name: "Super Shine Pitambari Liquid",
  shortDescription: "Copper and brass cleaner for the pieces you love.",
  description: "A little care for the copper and brass that make a home. Super Shine Pitambari Liquid is made for cleaning these metals, from everyday utensils to your favourite puja pieces. Follow the directions on your bottle for each use.",
  active: true, featured: true, category: "Copper and brass cleaner",
  surfaceTypes: ["Copper", "Brass"], images: [PRODUCT_IMAGE], variants: [],
};

export const DEFAULT_SETTINGS: SiteSettings = {
  announcement: "A little care. A beautiful shine.", announcementEnabled: true,
  hero: {
    image: HERO_IMAGE, eyebrow: "Super Shine Pitambari Liquid",
    headline: ["Bring back", "the beautiful."],
    body: "For the brass you treasure. The copper you use every day. Give your favourite pieces their shine again.",
    primaryCta: "Shop Super Shine", secondaryCta: "See the difference",
    support: "Made for copper & brass",
  },
  intro: {
    image: INTRO_IMAGE, eyebrow: "Part of your home",
    headline: "Some things deserve to stay beautiful.",
    body: "The thali brought out for family meals. A copper bowl on the kitchen shelf. The brass diya that lights every celebration. Give the things you reach for a little care, so they can keep being part of your everyday.",
  },
  why: {
    headline: "Care for what you keep.",
    body: ["Super Shine brings a simple cleaning routine to copper and brass.", "Choose your bottle, select delivery for your address, and follow your order all the way home."],
  },
  contact: { phone: "", whatsapp: "", email: "", address: "Nepal", mapUrl: null },
  social: [], usageNote: "Follow the application, rinsing and safety instructions on the bottle. Test an inconspicuous area first. Check suitability before using on lacquered, plated or antique pieces.",
};

export const DEFAULT_BENEFITS: Benefit[] = [
  { id: "metals", title: "Made for copper & brass", body: "One dedicated cleaner for two much-loved metals.", sortOrder: 1 },
  { id: "liquid", title: "A liquid that fits your routine", body: "Apply as directed on the bottle, using the recommended cloth or applicator.", sortOrder: 2 },
  { id: "shine", title: "A shine worth caring for", body: "Make looking after your favourite metal pieces part of your regular routine.", sortOrder: 3 },
];
/**
 * The four marks printed across the front of the bottle, quoted as they appear.
 * "Stative Quality" is reproduced exactly as printed. The bodies restate each
 * claim for the storefront; none of them add a performance promise the label
 * does not make.
 */
export const DEFAULT_PRODUCT_FEATURES: ProductFeature[] = [
  { id: "quality", title: "Stative Quality", body: "The quality mark carried across the front of every bottle.", sortOrder: 1 },
  { id: "quick", title: "Quick Action", body: "Made to work through tarnish without a long wait.", sortOrder: 2 },
  { id: "lasting", title: "Lasting shine", body: "Care that keeps your pieces bright between cleans.", sortOrder: 3 },
  { id: "gentle", title: "Soft on Hands", body: "A liquid meant for regular use around the kitchen.", sortOrder: 4 },
];
export const DEFAULT_SURFACES: SurfaceEntry[] = [
  { id: "brass", name: "Brass", body: "Thalis, dishes and the pieces saved for special occasions.", image: resultImage("01-brass-thali-plate-after"), sortOrder: 1 },
  { id: "copper", name: "Copper", body: "Bowls, plates and the everyday favourites on your shelf.", image: resultImage("02-hammered-copper-bowl-after"), sortOrder: 2 },
];
export const DEFAULT_STEPS: UsageStep[] = [
  { id: "prepare", title: "Check your piece", body: "Confirm the material is suitable and read the directions on the bottle.", sortOrder: 1 },
  { id: "apply", title: "Apply with care", body: "Use the amount and method recommended on the product label.", sortOrder: 2 },
  { id: "finish", title: "Finish as directed", body: "Follow the bottle’s rinsing and drying instructions before using your piece again.", sortOrder: 3 },
];
export const DEFAULT_COMPARISONS: ComparisonEntry[] = [
  { id: "thali", label: "Brass thali", caption: "A familiar favourite, with a brighter finish.", beforeImage: resultImage("01-brass-thali-plate-before"), afterImage: resultImage("01-brass-thali-plate-after"), sortOrder: 1 },
  { id: "bowl", label: "Copper bowl", caption: "See the warmth of copper come through.", beforeImage: resultImage("02-hammered-copper-bowl-before"), afterImage: resultImage("02-hammered-copper-bowl-after"), sortOrder: 2 },
  { id: "dish", label: "Brass dish", caption: "A closer look at the details.", beforeImage: resultImage("03-scalloped-brass-dish-before"), afterImage: resultImage("03-scalloped-brass-dish-after"), sortOrder: 3 },
  { id: "plate", label: "Copper plate", caption: "Compare the supplied before and after views.", beforeImage: resultImage("04-copper-dinner-plate-before"), afterImage: resultImage("04-copper-dinner-plate-after"), sortOrder: 4 },
];
export const DEFAULT_FAQS: Faq[] = [
  { id: "surfaces", question: "What can I clean with Super Shine?", answer: "Super Shine Pitambari Liquid is labelled as a copper and brass cleaner. Follow the bottle’s directions and check suitability for coated, plated or antique items before use.", sortOrder: 1, active: true },
  { id: "how", question: "How do I use it?", answer: "Follow the application, rinsing and safety directions printed on your bottle. Test a small, inconspicuous area first. Do not mix with other cleaners.", sortOrder: 2, active: true },
  { id: "outside", question: "Can you deliver to my address?", answer: "Enter your province and district at checkout. Available delivery methods, fees and estimated times will appear before you order.", sortOrder: 3, active: true },
  { id: "payment", question: "How can I pay?", answer: "Checkout shows the payment methods currently enabled by the store. These may include cash on delivery, QR payment or bank transfer. Manual payments are confirmed by the store.", sortOrder: 4, active: true },
  { id: "track", question: "How do I track or cancel an order?", answer: "Open Track an order using your order number and phone number. View progress and request cancellation when the order is eligible.", sortOrder: 5, active: true },
];
export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cod", kind: "cod", name: "Cash on delivery", description: "Pay the courier when your order arrives.", enabled: false, sortOrder: 1, requiresVerification: false },
  { id: "qr", kind: "qr", name: "QR payment", description: "Scan the store’s QR code and share your payment reference.", enabled: false, sortOrder: 2, requiresVerification: true, accountTitle: "", instructions: "Pay the exact order total and provide the transaction reference or payment screenshot." },
  { id: "bank", kind: "bank_transfer", name: "Bank transfer", description: "Transfer to the account shown at checkout.", enabled: false, sortOrder: 3, requiresVerification: true },
  { id: "esewa", kind: "esewa", name: "eSewa", description: "Pay through eSewa.", enabled: false, sortOrder: 4, requiresVerification: false, gatewayConfigured: false },
  { id: "khalti", kind: "khalti", name: "Khalti", description: "Pay through Khalti.", enabled: false, sortOrder: 5, requiresVerification: false, gatewayConfigured: false },
];
export const DEFAULT_DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "valley", kind: "valley", name: "Kathmandu Valley", description: "Home delivery within supported valley districts.", feeMinor: 0, estimate: "Confirmed by the store", enabled: false, sortOrder: 1, provinces: ["Bagmati"], districts: ["Kathmandu", "Lalitpur", "Bhaktapur"], minimumOrderMinor: null, freeDeliveryThresholdMinor: null },
  { id: "outside", kind: "outside_valley", name: "Outside the valley", description: "Courier delivery to supported locations.", feeMinor: 0, estimate: "Confirmed by the store", enabled: false, sortOrder: 2, provinces: [], districts: [], minimumOrderMinor: null, freeDeliveryThresholdMinor: null },
];
