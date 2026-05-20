export const STORE_WHATSAPP =
  import.meta.env.VITE_STORE_WHATSAPP || "966508983003";

export const EMAILJS_SERVICE_ID =
  import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_t04scol";
export const EMAILJS_TEMPLATE_ID =
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_v9wzhwf";
export const EMAILJS_PUBLIC_KEY =
  import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "c8wX_e15GQ-c3xseZ";

export const defaultSettings = {
  storeName: "GREEN DIXAM",
  tagline: "rare nature, refined living",

  primaryColor: "#0F3D2E",
  accentColor: "#C2A968",
  backgroundColor: "#F5F1E8",
  cardColor: "#FFFFFF",
  fontFamily: "Cairo",
  logo: "",

  heroTitle: "نباتات طبيعية تضيف حياة لمساحتك 🌿",
  heroSubtitle:
    "اختر نبتتك بسهولة – نباتات داخلية مختارة بعناية، تغليف أنيق، وتوصيل سريع داخل السعودية.",
  heroBadge: "Green Dixam Boutique",
  heroButtonText: "تسوق الآن",
  heroImage:
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80",
  heroHeight: 520,
  heroStatsProducts: "منتجات",
  heroStatsPackaging: "تغليف فاخر",
  heroStatsCustomers: "حسابات عملاء",

  bannerTitle: "عرض الإطلاق",
  bannerSubtitle: "استخدم كوبون GREEN10 واحصل على خصم خاص على أول طلب.",
  bannerImage: "",
  productImageHeight: 280,

  homeHeaderTitle: "GREEN DIXAM",
  homeHeaderSubtitle: "RARE NATURE, REFINED LIVING",
  homeHeaderImage: "",
  homeHeaderBg: "#F5F1E8",
  homeHeaderText: "#0F3D2E",
  homeHeaderLang: "AR",
  homeHeaderWhatsapp: "966508983003",
  homeHeaderInstagram: "",
  homeHeaderTiktok: "",
  homeHeaderSnapchat: "",
  homeHeaderX: "",
  homeHeaderTopBar: "شحن سريع داخل السعودية 🚚",
  homeTopBarEnabled: true,
  homeTopBarBg: "#0F3D2E",
  homeTopBarText: "#FFFFFF",
  homeHeaderCtaText: "اطلب الآن",
  homeHeaderSticky: true,
  homePagesTitle: "الصفحات",
  homePages: [
    { label: "النباتات", href: "/page/products", visible: true },
    { label: "العروض", href: "/page/offers", visible: true },
    { label: "دليل العناية", href: "/page/care-guide", visible: true },
  ],

  homeHeroTitle: "نباتات طبيعية تضيف حياة لمساحتك 🌿",
  homeHeroDesc:
    "اختر نبتتك بسهولة – نباتات داخلية مختارة بعناية، تغليف أنيق، وتوصيل سريع داخل السعودية.",
  homeHeroImage: "",
  homeHeroBgImage: "",
  homeHeroImagePosition: "left",
  homeHeroVideo: "",
  homeHeroLayout: "split",
  homeHeroButton: "تسوق الآن",
  homeHeroButtonLink: "#products",

  homePlantSectionsTitle: "اختر طابعك الأخضر",
  homePlantSectionsDesc:
    "نباتات داخلية، نباتات سهلة العناية، وأصص وإكسسوارات بطابع فاخر.",
  homePlantSectionsImage: "",

  homeCareTitle: "عناية هادئة لنباتات تدوم",
  homeCareDesc:
    "اختر الإضاءة المناسبة، اسقِ النبات بدون إفراط، واستخدم أصيص بتصريف جيد.",
  homeCareImage: "",

  homeOfferTitle: "عرض الإطلاق",
  homeOfferDesc: "استخدم كوبون GREEN10 واحصل على خصم خاص على أول طلب.",
  homeOfferImage: "",

  homeProductsTitle: "نباتات نادرة ومنتجات فاخرة مختارة بعناية",
  homeProductsDesc: "منتجات مختارة بعناية لتناسب المنزل والمكتب والهدايا.",
};

export const defaultProducts = [
  {
    id: "1",
    name: "شجرة دم الأخوين المصغرة",
    brand: "Socotra Inspired",
    category: "نباتات نادرة",
    price: 299,
    oldPrice: 349,
    rating: 4.9,
    sizes: "صغير,متوسط",
    tag: "Rare",
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "2",
    name: "مونستيرا فاخرة",
    brand: "Monstera",
    category: "نباتات داخلية",
    price: 189,
    oldPrice: 239,
    rating: 4.9,
    sizes: "متوسط,كبير",
    tag: "Luxury",
    image:
      "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "3",
    name: "زاميا كلاسيكية",
    brand: "ZZ Plant",
    category: "سهلة العناية",
    price: 139,
    oldPrice: 169,
    rating: 4.8,
    sizes: "صغير,متوسط,كبير",
    tag: "Organic",
    image:
      "https://images.unsplash.com/photo-1593482892290-f54927ae2b65?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "4",
    name: "سانسيفيريا ذهبية",
    brand: "Sansevieria",
    category: "تنقية الهواء",
    price: 129,
    oldPrice: 159,
    rating: 4.8,
    sizes: "صغير,متوسط",
    tag: "Timeless",
    image:
      "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "5",
    name: "فيكس ليراتا كبير",
    brand: "Fiddle Leaf Fig",
    category: "نباتات فاخرة",
    price: 269,
    oldPrice: 329,
    rating: 4.9,
    sizes: "كبير",
    tag: "Exclusive",
    image:
      "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "6",
    name: "كالاثيا أوربيفوليا",
    brand: "Calathea",
    category: "نباتات داخلية",
    price: 169,
    oldPrice: 209,
    rating: 4.7,
    sizes: "متوسط",
    tag: "Refined",
    image:
      "https://images.unsplash.com/photo-1616500163718-4f8e4dc7598f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "7",
    name: "أصيص سيراميك ذهبي",
    brand: "Golden Ceramic",
    category: "أصص فاخرة",
    price: 89,
    oldPrice: 119,
    rating: 4.8,
    sizes: "S,M,L",
    tag: "Gold",
    image:
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "8",
    name: "مجموعة عناية راقية",
    brand: "Plant Rare",
    category: "العناية",
    price: 99,
    oldPrice: 129,
    rating: 4.8,
    sizes: "مجموعة كاملة",
    tag: "Rare",
    image:
      "https://images.unsplash.com/photo-1615218287208-84135e0c4f08?auto=format&fit=crop&w=1200&q=80",
  },
];

export const palettes = [
  {
    name: "هدايا خضراء Black Gold",
    primaryColor: "#0F3D2E",
    accentColor: "#C2A968",
    backgroundColor: "#F5F1E8",
    cardColor: "#FFFFFF",
  },
  {
    name: "Navy Silver",
    primaryColor: "#0f172a",
    accentColor: "#c0c7d1",
    backgroundColor: "#f4f7fb",
    cardColor: "#FFFFFF",
  },
  {
    name: "Coffee Cream",
    primaryColor: "#3b2f2f",
    accentColor: "#c8a46a",
    backgroundColor: "#f7efe5",
    cardColor: "#fffaf4",
  },
  {
    name: "Sport Red",
    primaryColor: "#111827",
    accentColor: "#ef4444",
    backgroundColor: "#f8fafc",
    cardColor: "#FFFFFF",
  },
];
