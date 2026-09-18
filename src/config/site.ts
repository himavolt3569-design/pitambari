export const SITE = {
  name: "Super Shine", legalName: "Super Shine", tagline: "Pitambari Liquid · Copper & Brass Cleaner",
  title: "Super Shine | Pitambari Copper & Brass Cleaner in Nepal",
  description: "A little care for the copper and brass you love. Discover Super Shine Pitambari Liquid, see the difference and order online in Nepal.",
  locale: "en_NP", currency: "NPR", country: "NP",
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000",
} as const;
export const NAV_LINKS = [
  { href: "#product", label: "Our cleaner" },
  { href: "#results", label: "The difference" },
  { href: "#how-it-works", label: "How to use" },
  { href: "#faq", label: "Questions" },
] as const;
