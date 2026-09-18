import { DEFAULT_BENEFITS, DEFAULT_COMPARISONS, DEFAULT_FAQS, DEFAULT_PRODUCT, DEFAULT_PRODUCT_FEATURES, DEFAULT_SETTINGS, DEFAULT_STEPS, DEFAULT_SURFACES } from "./defaults";

const en = {
  nav: { product: "Our cleaner", benefits: "Why Super Shine", howItWorks: "How to use", results: "The difference", faq: "Questions", contact: "Contact", buyNow: "Buy Now", cart: "Cart", menu: "Menu" },
  hero: DEFAULT_SETTINGS.hero,
  intro: DEFAULT_SETTINGS.intro,
  surfaces: { eyebrow: "Copper & brass", headline: "Everyday pieces. Special memories.", body: "From your kitchen shelf to your puja space. Check the product label for suitability before use.", items: Object.fromEntries(DEFAULT_SURFACES.map(s => [s.id, { name: s.name, body: s.body }])) as Record<string, { name: string; body: string }> },
  results: { eyebrow: "A closer look", headline: "A little care. Quite a difference.", body: "Explore the supplied comparison images. Slide across to see each finish; results depend on the condition and use of your piece.", before: "Before", after: "After", items: Object.fromEntries(DEFAULT_COMPARISONS.map(s => [s.id, { label: s.label, caption: s.caption }])) as Record<string, { label: string; caption: string }> },
  benefits: { eyebrow: "Why Super Shine", headline: "Good care, kept simple.", body: "A dedicated liquid cleaner for the copper and brass in your home.", items: Object.fromEntries(DEFAULT_BENEFITS.map(s => [s.id, { title: s.title, body: s.body }])) as Record<string, { title: string; body: string }> },
  product: { badge: "A place in your cleaning cupboard", name: DEFAULT_PRODUCT.name, description: DEFAULT_PRODUCT.description, selectSize: "Choose your size", inStock: "In stock", outOfStock: "Sold out", addToCart: "Add to cart", buyNow: "Buy Now", deliveryBadge: "Delivery options at checkout", codBadge: "Cash on delivery available", qrBadge: "QR payment accepted", totalPrice: "Price per bottle", quantity: "Quantity", variants: {} as Record<string, string>,
    detail: {
      cue: "Click here for detail", open: "Open product details", close: "Close details", prev: "Previous", next: "Next",
      labelNote: "Claims as printed on the product label.",
      sizesNote: "Pick a size here and it carries across to your order.",
      surfacesNote: "Check the label for suitability before use on coated, plated or antique pieces.",
      sizesEmpty: "Sizes and pricing coming soon.", faqLink: "Read the questions", sku: "SKU",
      pages: { features: "On the label", sizes: "Every size", surfaces: "What it cleans", usage: "How to use", care: "Care note" },
      features: Object.fromEntries(DEFAULT_PRODUCT_FEATURES.map(f => [f.id, { title: f.title, body: f.body }])) as Record<string, { title: string; body: string }>,
    } },
  howToUse: { eyebrow: "The care routine", headline: "A simple way to shine.", noteTitle: "Care note", usageNote: DEFAULT_SETTINGS.usageNote!, items: Object.fromEntries(DEFAULT_STEPS.map(s => [s.id, { title: s.title, body: s.body }])) as Record<string, { title: string; body: string }> },
  why: { eyebrow: "Super Shine", ...DEFAULT_SETTINGS.why },
  faq: { eyebrow: "A few helpful answers", headline: "Before you bring it home.", deliveryTitle: "Delivery", paymentTitle: "Payment", items: Object.fromEntries(DEFAULT_FAQS.map(s => [s.id, { question: s.question, answer: s.answer }])) as Record<string, { question: string; answer: string }> },
  cta: { eyebrow: "For the things you love", headline: "Make room for a little shine.", body: "Your copper. Your brass. Your everyday favourites.", button: "Shop Super Shine" },
  footer: { tagline: "A little care for the copper and brass you love. Super Shine Pitambari Liquid.", contact: "Get in touch", rights: "All rights reserved." },
};

const ne: typeof en = {
  ...en,
  nav: { product: "हाम्रो क्लिनर", benefits: "किन सुपर शाइन", howItWorks: "प्रयोग विधि", results: "अन्तर हेर्नुहोस्", faq: "प्रश्नहरू", contact: "सम्पर्क", buyNow: "अहिले किन्नुहोस्", cart: "कार्ट", menu: "मेनु" },
  hero: { ...en.hero, eyebrow: "सुपर शाइन पिताम्बरी लिक्विड", headline: ["फेरि फर्काउनुहोस्", "त्यो सुन्दर चमक।"], body: "तपाईंले जोगाउनुभएको पित्तल। दैनिक प्रयोग हुने तामा। आफ्ना प्रिय भाँडाकुँडालाई फेरि चम्काउनुहोस्।", primaryCta: "सुपर शाइन किन्नुहोस्", secondaryCta: "अन्तर हेर्नुहोस्", support: "तामा र पित्तलका लागि" },
  intro: { ...en.intro, eyebrow: "तपाईंको घरको हिस्सा", headline: "केही कुरा सधैँ सुन्दर रहून्।", body: "परिवारसँग खाना खाने थाल। भान्साको तामाको कचौरा। हरेक चाडमा बल्ने पित्तलको दियो। यी प्रिय वस्तुहरूको नियमित हेरचाह गर्नुहोस्।" },
  surfaces: { ...en.surfaces, eyebrow: "तामा र पित्तल", headline: "दैनिक प्रयोग। विशेष सम्झना।", body: "भान्सादेखि पूजाकोठासम्म। प्रयोगअघि बोतलमा लेखिएको जानकारी पढ्नुहोस्।", items: { brass: { name: "पित्तल", body: "थाल, भाँडा र विशेष अवसरका लागि राखिएका वस्तुहरू।" }, copper: { name: "तामा", body: "कचौरा, थाल र दैनिक प्रयोगका प्रिय भाँडाहरू।" } } },
  results: { ...en.results, eyebrow: "नजिकबाट हेर्नुहोस्", headline: "थोरै हेरचाह। देखिने अन्तर।", body: "उपलब्ध गराइएका तुलना चित्रहरू हेर्न स्लाइडर सार्नुहोस्। नतिजा वस्तुको अवस्था र प्रयोगमा भर पर्छ।", before: "पहिले", after: "पछि", items: { thali: { label: "पित्तलको थाल", caption: "मनपर्ने थालको चमक हेर्नुहोस्।" }, bowl: { label: "तामाको कचौरा", caption: "तामाको सुन्दर रङ हेर्नुहोस्।" }, dish: { label: "पित्तलको भाँडा", caption: "बुट्टाहरू नजिकबाट हेर्नुहोस्।" }, plate: { label: "तामाको थाल", caption: "पहिले र पछिका चित्र तुलना गर्नुहोस्।" } } },
  benefits: { ...en.benefits, eyebrow: "किन सुपर शाइन", headline: "सहज र नियमित हेरचाह।", body: "घरका तामा र पित्तलका लागि तरल क्लिनर।", items: { metals: { title: "तामा र पित्तलका लागि", body: "दुई प्रिय धातुको हेरचाहका लागि एउटै क्लिनर।" }, liquid: { title: "नियमित प्रयोगमा सहज", body: "बोतलमा लेखिएअनुसार उपयुक्त कपडा वा साधनले लगाउनुहोस्।" }, shine: { title: "जोगाइराख्ने चमक", body: "आफ्ना प्रिय धातुका वस्तुहरूको नियमित हेरचाह गर्नुहोस्।" } } },
  product: { ...en.product, badge: "घरको हेरचाहका लागि", name: "सुपर शाइन पिताम्बरी लिक्विड", description: "दैनिक भाँडादेखि पूजाका सामग्रीसम्म, तामा र पित्तलको सफाइका लागि सुपर शाइन। हरेक प्रयोगमा बोतलको निर्देशन पालना गर्नुहोस्।", selectSize: "साइज छान्नुहोस्", inStock: "स्टकमा उपलब्ध", outOfStock: "स्टक सकियो", addToCart: "कार्टमा थप्नुहोस्", buyNow: "अहिले किन्नुहोस्", totalPrice: "प्रति बोतल मूल्य", quantity: "संख्या",
    // The four feature titles stay in English: they are quotations of what is
    // printed on the bottle, so translating them would misreport the label.
    detail: {
      cue: "विवरण हेर्न यहाँ क्लिक गर्नुहोस्", open: "उत्पादन विवरण खोल्नुहोस्", close: "विवरण बन्द गर्नुहोस्", prev: "अघिल्लो", next: "अर्को",
      labelNote: "बोतलको लेबलमा छापिएअनुसार।",
      sizesNote: "यहाँ साइज छान्नुभयो भने अर्डरमा पनि त्यही लागू हुन्छ।",
      surfacesNote: "लेप, प्लेटिङ वा पुराना वस्तुमा प्रयोगअघि लेबलमा उपयुक्तता जाँच गर्नुहोस्।",
      sizesEmpty: "साइज र मूल्य छिट्टै उपलब्ध हुनेछ।", faqLink: "प्रश्नहरू हेर्नुहोस्", sku: "SKU",
      pages: { features: "लेबलमा", sizes: "सबै साइज", surfaces: "के सफा गर्ने", usage: "प्रयोग विधि", care: "ध्यान दिनुहोस्" },
      features: {
        quality: { title: "Stative Quality", body: "हरेक बोतलको अगाडि लेखिएको गुणस्तरको चिन्ह।" },
        quick: { title: "Quick Action", body: "धेरै पर्खिनु नपर्ने गरी दाग हटाउन बनाइएको।" },
        lasting: { title: "Lasting shine", body: "सफाइबीचको समयमा पनि चमक कायम राख्ने हेरचाह।" },
        gentle: { title: "Soft on Hands", body: "भान्सामा नियमित प्रयोगका लागि बनाइएको तरल।" },
      },
    } },
  howToUse: { ...en.howToUse, eyebrow: "हेरचाहको विधि", headline: "चमक ल्याउने सरल तरिका।", noteTitle: "ध्यान दिनुहोस्", usageNote: "बोतलमा लेखिएका प्रयोग, धुने र सुरक्षा निर्देशन पालना गर्नुहोस्। पहिले नदेखिने सानो ठाउँमा परीक्षण गर्नुहोस्। लेप वा प्लेटिङ भएका र पुराना वस्तुमा उपयुक्तता जाँच गर्नुहोस्।", items: { prepare: { title: "वस्तु जाँच गर्नुहोस्", body: "धातु उपयुक्त छ कि छैन जाँच गरी बोतलको निर्देशन पढ्नुहोस्।" }, apply: { title: "ध्यान दिएर लगाउनुहोस्", body: "लेबलमा लेखिएको मात्रा र विधि पालना गर्नुहोस्।" }, finish: { title: "निर्देशनअनुसार सक्नुहोस्", body: "फेरि प्रयोग गर्नुअघि धुने र सुकाउने निर्देशन पालना गर्नुहोस्।" } } },
  why: { eyebrow: "सुपर शाइन", headline: "आफ्ना प्रिय वस्तुको हेरचाह।", body: ["तामा र पित्तलको सरल सफाइका लागि सुपर शाइन।", "साइज छान्नुहोस्, डेलिभरी रोज्नुहोस् र अर्डरको अवस्था हेर्नुहोस्।"] },
  faq: { ...en.faq, eyebrow: "केही उपयोगी उत्तर", headline: "किन्नुअघि जान्नुहोस्।", deliveryTitle: "डेलिभरी", paymentTitle: "भुक्तानी", items: {
    surfaces: { question: "सुपर शाइनले के सफा गर्न सकिन्छ?", answer: "यो तामा र पित्तलको क्लिनर हो। लेप, प्लेटिङ वा पुराना वस्तुमा प्रयोगअघि उपयुक्तता जाँच गर्नुहोस्।" },
    how: { question: "कसरी प्रयोग गर्ने?", answer: "बोतलमा लेखिएका प्रयोग, धुने र सुरक्षा निर्देशन पालना गर्नुहोस्। पहिले सानो ठाउँमा परीक्षण गर्नुहोस्। अन्य क्लिनरसँग नमिसाउनुहोस्।" },
    outside: { question: "मेरो ठेगानामा डेलिभरी हुन्छ?", answer: "चेकआउटमा प्रदेश र जिल्ला राख्नुहोस्। उपलब्ध डेलिभरी, शुल्क र अनुमानित समय देखिनेछ।" },
    payment: { question: "कसरी भुक्तानी गर्ने?", answer: "पसलले खुला गरेका विधि चेकआउटमा देखिन्छन्। नगद, QR वा बैंक ट्रान्सफर हुन सक्छ। म्यानुअल भुक्तानी पसलले पुष्टि गर्छ।" },
    track: { question: "अर्डर कसरी हेर्ने वा रद्द गर्ने?", answer: "अर्डर नम्बर र फोन नम्बर प्रयोग गरी Track an order खोल्नुहोस्। योग्य अर्डर रद्द गर्न अनुरोध गर्न सकिन्छ।" },
  } },
  cta: { eyebrow: "प्रिय वस्तुहरूका लागि", headline: "घरमा ल्याउनुहोस् चमक।", body: "तपाईंको तामा। तपाईंको पित्तल। दैनिक प्रिय वस्तुहरू।", button: "सुपर शाइन किन्नुहोस्" },
  footer: { tagline: "तपाईंका प्रिय तामा र पित्तलका लागि सुपर शाइन पिताम्बरी लिक्विड।", contact: "सम्पर्क", rights: "सर्वाधिकार सुरक्षित।" },
};
export const TRANSLATIONS = { en, ne };
