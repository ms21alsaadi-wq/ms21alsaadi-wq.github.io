import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Gift,
  Heart,
  Headphones,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import {
  couponUsedByCustomer,
  formatPrice,
  getTrafficSource,
  makePageSlug,
  normalizePageHref,
  sizesArray,
} from "../../utils/helpers.js";
import { findProductByPath } from "../SEOManager.jsx";
import { getVisitorGeo, trackFunnelStep } from "../../services/analytics.js";
import Navbar from "../common/Navbar.jsx";
import Footer from "../common/Footer.jsx";
import CartDrawer from "../common/CartDrawer.jsx";
import HeroSection from "../common/HeroSection.jsx";
import Feature from "../common/Feature.jsx";
import StoreReturnPolicy from "../common/StoreReturnPolicy.jsx";
import ProductDetailPage from "../products/ProductDetailPage.jsx";
import ProductGrid from "../products/ProductGrid.jsx";
import Account from "./AccountPage.jsx";
import StoreCustomPage from "./StoreCustomPage.jsx";

const featureIconMap = {
  truck: Truck,
  shield: ShieldCheck,
  rotate: RotateCcw,
  star: Star,
  heart: Heart,
  gift: Gift,
  card: CreditCard,
  support: Headphones,
  sparkles: Sparkles,
};

function Store({
  settings,
  products,
  authUser,
  customer,
  setCustomer,
  orders = [],
  coupons = [],
  go,
  path,
}) {
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("green-dixam-cart") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("green-dixam-cart", JSON.stringify(cart));
  }, [cart]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState("");

  useEffect(() => {
    let visitorId = localStorage.getItem("gdVisitorId");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("gdVisitorId", visitorId);
    }

    const visitorRef = doc(db, "liveVisitors", visitorId);

    const touchVisitor = async () => {
      try {
        const cartCount = cart.reduce(
          (sum, item) => sum + Number(item.qty || 1),
          0,
        );
        const now = Date.now();
        const geo = await getVisitorGeo();

        let sessionStart = Number(localStorage.getItem("gdSessionStart") || 0);
        if (!sessionStart) {
          sessionStart = now;
          localStorage.setItem("gdSessionStart", String(sessionStart));
        }

        await setDoc(
          visitorRef,
          {
            firstSeen: sessionStart,
            lastSeen: now,
            sessionDuration: now - sessionStart,
            source:
              localStorage.getItem("gdTrafficSource") || getTrafficSource(),
            path: window.location.pathname || "/",
            pageTitle: document.title || "",
            cartCount,
            cartItems: cart.slice(0, 5).map((item) => ({
              name: item.name || "منتج",
              qty: Number(item.qty || 1),
            })),
            language: navigator.language || "",
            timezone:
              geo.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "",
            city: geo.city || "",
            country: geo.country || "",
            countryCode: geo.countryCode || "",
            latitude: Number(geo.latitude || 0),
            longitude: Number(geo.longitude || 0),
            screen: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
            lastAction: cartCount > 0 ? "لديه منتجات في السلة" : "يتصفح المتجر",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        if (!localStorage.getItem("gdTrafficSource")) {
          localStorage.setItem("gdTrafficSource", getTrafficSource());
        }
      } catch (error) {
        console.warn("Live visitor heartbeat failed:", error);
      }
    };

    touchVisitor();
    const interval = setInterval(touchVisitor, 15000);

    const onFocus = () => touchVisitor();
    const onVisibility = () => {
      if (!document.hidden) touchVisitor();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [path, cart]);

  useEffect(() => {
    trackFunnelStep("visit_store");
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [siteLang, setSiteLang] = useState(() => {
    try {
      return (
        localStorage.getItem("green-dixam-lang") ||
        settings.homeHeaderLang ||
        "AR"
      );
    } catch {
      return settings.homeHeaderLang || "AR";
    }
  });

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const renderFeatureIcon = (iconName, fallbackName) => {
    const Icon = featureIconMap[iconName] || featureIconMap[fallbackName] || Truck;
    return <Icon />;
  };
  const featureCards = [
    {
      icon: renderFeatureIcon(settings.homeFeatureOneIcon, "truck"),
      title: settings.homeFeatureOneTitle || "توصيل سريع",
      text:
        settings.homeFeatureOneText ||
        "تغليف فاخر للنباتات مع تغليف يحافظ عليها.",
    },
    {
      icon: renderFeatureIcon(settings.homeFeatureTwoIcon, "shield"),
      title: settings.homeFeatureTwoTitle || "حسابات عملاء",
      text:
        settings.homeFeatureTwoText ||
        "يحفظ بياناته وطلباته لتجربة أسهل.",
    },
    {
      icon: renderFeatureIcon(settings.homeFeatureThreeIcon, "rotate"),
      title: settings.homeFeatureThreeTitle || "طلبات منظمة",
      text:
        settings.homeFeatureThreeText ||
        "كل طلب محفوظ ومنظم داخل لوحة التحكم.",
    },
  ];

  useEffect(() => {
    try {
      localStorage.setItem("green-dixam-lang", siteLang);
    } catch {}
  }, [siteLang]);

  const brands = [
    "All",
    ...new Set(products.map((p) => p.brand).filter(Boolean)),
  ];
  const categories = [
    "All",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];
  const filtered = useMemo(
    () =>
      products
        .filter((p) => (p.status || "active") !== "hidden")
        .filter((p) => {
          const q = searchQuery.toLowerCase().trim();
          const searchable =
            `${p.name || ""} ${p.brand || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase();
          return (
            (!q || searchable.includes(q)) &&
            (brand === "All" || p.brand === brand) &&
            (category === "All" || p.category === category)
          );
        }),
    [products, searchQuery, brand, category],
  );
  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (brand !== "All" ? 1 : 0) +
    (category !== "All" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const cartCount = cart.reduce((n, i) => n + Number(i.qty || 0), 0);
  const subtotal = cart.reduce(
    (n, i) => n + Number(i.qty || 0) * Number(i.price || 0),
    0,
  );
  const configuredShippingFee = Math.max(0, Number(settings.shippingFee ?? 35));
  const freeShippingThreshold = Math.max(
    0,
    Number(settings.freeShippingThreshold || 0),
  );
  const minimumOrderTotal = Math.max(0, Number(settings.minimumOrderTotal || 0));
  const shippingFee =
    subtotal && (!freeShippingThreshold || subtotal < freeShippingThreshold)
      ? configuredShippingFee
      : 0;
  const discount = appliedCoupon
    ? Math.round(subtotal * (Number(appliedCoupon.percent || 0) / 100))
    : 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;
  const paymentProviders = useMemo(() => {
    const savedProviders = Array.isArray(settings.paymentProviders)
      ? settings.paymentProviders
      : [];
    return savedProviders.length
      ? savedProviders
      : [
          {
            id: "cod",
            name: "الدفع عند الاستلام",
            badge: "COD",
            enabled: true,
            visible: true,
            mode: "live",
            minAmount: 0,
            maxAmount: 0,
            note: "لا يحتاج بوابة دفع، وسيتم تأكيد الطلب عبر واتساب.",
          },
        ];
  }, [settings.paymentProviders]);
  const availablePaymentProviders = useMemo(
    () =>
      paymentProviders.filter((provider) => {
        if (!provider.enabled || provider.visible === false) return false;
        const minAmount = Math.max(0, Number(provider.minAmount || 0));
        const maxAmount = Math.max(0, Number(provider.maxAmount || 0));
        if (minAmount && total < minAmount) return false;
        if (maxAmount && total > maxAmount) return false;
        return true;
      }),
    [paymentProviders, total],
  );
  const availablePaymentIds = availablePaymentProviders
    .map((provider) => provider.id)
    .join("|");
  const selectedPaymentProvider =
    availablePaymentProviders.find(
      (provider) => provider.id === selectedPaymentId,
    ) ||
    availablePaymentProviders[0] ||
    null;

  useEffect(() => {
    if (!availablePaymentProviders.length) {
      if (selectedPaymentId) setSelectedPaymentId("");
      return;
    }
    if (
      !selectedPaymentId ||
      !availablePaymentProviders.some(
        (provider) => provider.id === selectedPaymentId,
      )
    ) {
      setSelectedPaymentId(availablePaymentProviders[0].id);
    }
  }, [availablePaymentIds, availablePaymentProviders, selectedPaymentId]);
  const visibleHomePages = (
    settings.homePages || [
      { label: "النباتات", href: "/page/products", visible: true },
      { label: "العروض", href: "/page/offers", visible: true },
      { label: "دليل العناية", href: "/page/care-guide", visible: true },
    ]
  ).filter((page) => page.visible !== false);
  const footerPages = (settings.footerSections || []).flatMap(
    (section, sectionIndex) =>
      (section.links || [])
        .filter((link) => {
          const href = String(link.href || "").trim();
          const label = String(link.label || "").trim();
          const isHomeLink = /الرئيسية|الرئيسيه|home/i.test(label);
          return (
            label &&
            href !== "whatsapp" &&
            !href.startsWith("http") &&
            !href.startsWith("mailto:") &&
            !href.startsWith("#") &&
            !(href === "/" && isHomeLink)
          );
        })
        .map((link, linkIndex) => {
          const href = String(link.href || "").trim();
          return {
            label: link.label,
            href:
              !href || href === "/"
                ? `/page/${makePageSlug(link.label, `footer-${sectionIndex + 1}-${linkIndex + 1}`)}`
                : href,
            content: link.content || "",
            source: "footer",
          };
        }),
  );
  const storePages = [...visibleHomePages, ...footerPages];

  const currentStorePage = path.startsWith("/page/")
    ? storePages.find(
        (page, index) => normalizePageHref(page, index) === path,
      )
    : null;
  const currentProduct = path.startsWith("/product/")
    ? findProductByPath(products, path)
    : null;
  const isProductPath = path.startsWith("/product/");

  if (path.startsWith("/login"))
    return <CustomerAuth go={go} settings={settings} />;
  if (path.startsWith("/account")) {
    return authUser ? (
      <Account
        customer={customer}
        setCustomer={setCustomer}
        orders={orders}
        coupons={coupons}
        go={go}
        settings={settings}
      />
    ) : (
      <CustomerAuth go={go} settings={settings} />
    );
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMessage("اكتب كود الخصم أولاً");
      return;
    }

    const couponSnap = await getDoc(doc(db, "coupons", code));
    const coupon = couponSnap.exists()
      ? { id: couponSnap.id, ...couponSnap.data() }
      : null;
    if (!coupon) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون غير موجود");
      return;
    }

    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    if (!coupon.active) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون غير مفعل حالياً");
      return;
    }

    if (expired) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون منتهي");
      return;
    }

    if (couponUsedByCustomer(coupon, authUser?.uid, authUser?.email)) {
      setAppliedCoupon(null);
      setCouponMessage("تم استخدام هذا الكوبون من قبل");
      return;
    }

    setAppliedCoupon(coupon);
    setCouponMessage(`تم تطبيق خصم ${coupon.percent}%`);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  }

  function resetStoreFilters() {
    setSearchQuery("");
    setBrand("All");
    setCategory("All");
  }

  function hasManagedStock(product) {
    return product?.stock !== undefined && product?.stock !== "";
  }

  function isOutOfStock(product) {
    return hasManagedStock(product) && Number(product.stock || 0) <= 0;
  }

  function addToCart(product) {
    if (isOutOfStock(product)) {
      setCouponMessage("هذا المنتج غير متوفر حالياً");
      setCartOpen(true);
      return;
    }

    const size =
      selectedSize[product.id] || sizesArray(product.sizes)[0] || "Free";
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id && i.size === size);
      const stockLimit = hasManagedStock(product)
        ? Math.max(0, Number(product.stock || 0))
        : Infinity;
      if (found)
        return prev.map((i) =>
          i.id === product.id && i.size === size
            ? {
                ...i,
                qty: Math.min(stockLimit, Number(i.qty || 0) + 1),
              }
            : i,
        );
      return [...prev, { ...product, size, qty: 1 }];
    });

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();

        setDoc(
          doc(db, "liveVisitors", visitorId),
          {
            lastAction: `أضاف للسلة: ${product.name || "منتج"}`,
            lastAddedProduct: product.name || "",
            lastCartAt: eventTime,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        setDoc(
          doc(db, "liveEvents", `${visitorId}-${eventTime}`),
          {
            type: "cart",
            title: `أضاف للسلة: ${product.name || "منتج"}`,
            path: window.location.pathname || "/",
            visitorId,
            createdAtMs: eventTime,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {}

    trackFunnelStep("add_to_cart", {
      productId: product.id,
      productName: product.name,
    });

    setCartOpen(true);
  }

  async function checkoutWhatsApp() {
    if (!authUser) {
      setCouponMessage("سجل دخولك كعميل أولاً لإتمام الطلب");
      go("/login");
      return;
    }
    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.city ||
      !customer?.address
    ) {
      setCouponMessage(
        "أكمل بيانات حسابك أولاً: الاسم، الجوال، المدينة، العنوان",
      );
      go("/account");
      return;
    }
    if (!cart.length) return;
    if (!selectedPaymentProvider) {
      setCouponMessage("اختر طريقة الدفع أولاً");
      return;
    }

    const onlinePaymentGateways = ["moyasar", "tabby", "tamara"];
    if (onlinePaymentGateways.includes(selectedPaymentProvider.id)) {
      setCouponMessage(
        `${selectedPaymentProvider.name} تحتاج ربط مفاتيح الدفع قبل استخدامها فعلياً. اختر الدفع عند الاستلام أو التحويل البنكي مؤقتاً.`,
      );
      return;
    }

    if (settings.checkoutEnabled === false || settings.storeStatus !== "open") {
      setCouponMessage(
        settings.maintenanceMessage ||
          "الطلبات متوقفة مؤقتًا. تواصل معنا عبر الواتساب للمساعدة.",
      );
      return;
    }

    if (minimumOrderTotal > 0 && subtotal < minimumOrderTotal) {
      setCouponMessage(
        `الحد الأدنى للطلب هو ${formatPrice(minimumOrderTotal)} ر.س`,
      );
      return;
    }

    const unavailableItem = cart.find((item) => isOutOfStock(item));
    if (unavailableItem) {
      setCouponMessage(`المنتج "${unavailableItem.name}" غير متوفر حالياً`);
      return;
    }

    const overStockItem = cart.find(
      (item) =>
        hasManagedStock(item) &&
        Number(item.qty || 0) > Number(item.stock || 0),
    );
    if (overStockItem) {
      setCouponMessage(
        `الكمية المطلوبة من "${overStockItem.name}" أكبر من المخزون المتاح`,
      );
      return;
    }

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();
        await setDoc(
          doc(db, "liveEvents", `${visitorId}-${eventTime}`),
          {
            type: "checkout",
            title: "وصل إلى إتمام الطلب",
            path: window.location.pathname || "/checkout",
            visitorId,
            createdAtMs: eventTime,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {}

    trackFunnelStep("checkout", { cartItems: cart.length });

    const order = {
      customerId: authUser.uid,
      customerName: customer.name,
      customerEmail: customer.email || authUser.email,
      customerPhone: customer.phone,
      customerCity: customer.city,
      customerAddress: customer.address,
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        size: i.size,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
      shippingFee,
      discount,
      couponCode: appliedCoupon?.code || "",
      couponPercent: appliedCoupon?.percent || 0,
      total,
      paymentMethodId: selectedPaymentProvider.id,
      paymentMethodName: selectedPaymentProvider.name,
      paymentMode: selectedPaymentProvider.mode || "live",
      paymentStatus:
        selectedPaymentProvider.id === "cod"
          ? "cod"
          : selectedPaymentProvider.id === "bank"
            ? "awaiting_transfer"
            : "pending_payment",
      status: "new",
      orderPrefix: settings.orderPrefix || "GD",
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    };
    const orderRef = await addDoc(collection(db, "orders"), order);

    try {
      await setDoc(
        doc(db, "liveEvents", `order-${orderRef.id}`),
        {
          type: "order",
          title: `طلب جديد من ${customer.name || "عميل"}`,
          path: "/admin/orders",
          orderId: orderRef.id,
          total,
          createdAtMs: Date.now(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {}

    if (appliedCoupon?.code) {
      await setDoc(
        doc(db, "coupons", String(appliedCoupon.code).toUpperCase()),
        {
          usedBy: {
            [authUser.uid]: { orderId: orderRef.id, usedAt: serverTimestamp() },
          },
          usedEmails: {
            [authUser.email]: {
              orderId: orderRef.id,
              usedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await setDoc(
      doc(db, "customers", authUser.uid),
      {
        ...customer,
        ordersCount: Number(customer.ordersCount || 0) + 1,
        lastOrderAt: serverTimestamp(),
      },
      { merge: true },
    );

    const items = cart
      .map(
        (item) =>
          `• ${item.name}\nالحجم: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`,
      )
      .join("\n\n");
    const orderNumber = `${settings.orderPrefix || "GD"}-${orderRef.id.slice(0, 6).toUpperCase()}`;
    const message = `طلب جديد من ${settings.storeName || "المتجر"}\n\nرقم الطلب: ${orderNumber}\nطريقة الدفع: ${selectedPaymentProvider.name}\n\nبيانات العميل:\nالاسم: ${customer.name}\nالجوال: ${customer.phone}\nالإيميل: ${customer.email || authUser.email}\nالمدينة: ${customer.city}\nالعنوان: ${customer.address}\n\nالمنتجات:\n${items}\n\nملخص الطلب:\nالمجموع الفرعي: ${formatPrice(subtotal)} ر.س\nالخصم: ${formatPrice(discount)} ر.س\nالشحن: ${formatPrice(shippingFee)} ر.س\nالإجمالي: ${formatPrice(total)} ر.س\n\nالرجاء تأكيد الطلب وتجهيزه.`;
    window.open(
      `https://wa.me/${settings.homeHeaderWhatsapp || STORE_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    setCartOpen(false);
  }

  const theme = {
    "--primary": settings.primaryColor,
    "--accent": settings.accentColor,
    "--bg": settings.backgroundColor,
    "--card": settings.cardColor,
    "--font": `"${settings.fontFamily}", system-ui, sans-serif`,
    "--hero-h": `${settings.heroHeight}px`,
    "--product-h": `${settings.productImageHeight}px`,
    "--home-header-bg": settings.homeHeaderBg || "#F5F1E8",
    "--topbar-bg": settings.homeTopBarBg || "#0F3D2E",
    "--topbar-text": settings.homeTopBarText || "#FFFFFF",
  };

  return (
    <div
      className="store"
      style={theme}
      dir={siteLang === "EN" ? "ltr" : "rtl"}
    >
      {(settings.storeStatus && settings.storeStatus !== "open") ||
      settings.checkoutEnabled === false ? (
        <div className="store-operation-banner">
          <b>{settings.maintenanceTitle || "تنبيه المتجر"}</b>
          <span>
            {settings.maintenanceMessage ||
              "الطلبات متوقفة مؤقتًا. يمكنك تصفح المنتجات وسيعود استقبال الطلبات قريبًا."}
          </span>
        </div>
      ) : null}
      <Navbar
        settings={settings}
        go={go}
        siteLang={siteLang}
        setSiteLang={setSiteLang}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        langMenuOpen={langMenuOpen}
        setLangMenuOpen={setLangMenuOpen}
        authUser={authUser}
        cartCount={cartCount}
        setCartOpen={setCartOpen}
        visibleHomePages={visibleHomePages}
        currentStorePage={currentStorePage}
      />

      {isProductPath ? (
        <ProductDetailPage
          product={currentProduct}
          products={products}
          settings={settings}
          go={go}
          addToCart={addToCart}
          setCartOpen={setCartOpen}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
        />
      ) : currentStorePage ? (
        <StoreCustomPage page={currentStorePage} products={products} go={go} />
      ) : (
        <>
          <HeroSection settings={settings} />

          <section className="container plant-categories">
            <div className="section-title">
              <span>Brand Essence</span>
              <h2>{settings.homePlantSectionsTitle || "اختر طابعك الأخضر"}</h2>
              <p className="home-section-desc">
                {settings.homePlantSectionsDesc ||
                  "نباتات داخلية، نباتات سهلة العناية، وأصص وإكسسوارات بطابع فاخر."}
              </p>
            </div>

            {settings.homePlantSectionsImage && (
              <div className="home-admin-section-image">
                <img
                  src={settings.homePlantSectionsImage}
                  alt="أقسام النباتات"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}

            <div className="plant-category-grid">
              <a href="#products" className="plant-category-card">
                <img
                  src="https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80"
                  alt="نباتات داخلية"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <b>نباتات داخلية</b>
                  <span>نباتات راقية للمنازل والمكاتب</span>
                </div>
              </a>
              <a href="#products" className="plant-category-card">
                <img
                  src="https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80"
                  alt="نباتات سهلة العناية"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <b>سهلة العناية</b>
                  <span>اختيارات هادئة وسهلة العناية</span>
                </div>
              </a>
              <a href="#products" className="plant-category-card">
                <img
                  src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80"
                  alt="أصص وإكسسوارات"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <b>أصص وإكسسوارات</b>
                  <span>أصص وإكسسوارات بطابع فاخر</span>
                </div>
              </a>
            </div>
          </section>

          <section
            className="container care-strip cms-care-strip"
            style={{
              backgroundImage: settings.homeCareImage
                ? `linear-gradient(135deg, rgba(15,61,46,.90), rgba(23,77,57,.82)), url(${settings.homeCareImage})`
                : undefined,
            }}
          >
            <div>
              <span>Care Guide</span>
              <h2>{settings.homeCareTitle || "عناية هادئة لنباتات تدوم"}</h2>
              <p>
                {settings.homeCareDesc ||
                  "اختر الإضاءة المناسبة، اسقِ النبات بدون إفراط، واستخدم أصيص بتصريف جيد."}
              </p>
            </div>
            <div className="care-items">
              <div>
                <b>01</b>
                <span>اختر الإضاءة المناسبة</span>
              </div>
              <div>
                <b>02</b>
                <span>اسقِ النبات بانتظام بدون إفراط</span>
              </div>
              <div>
                <b>03</b>
                <span>استخدم أصيص بتصريف جيد</span>
              </div>
            </div>
          </section>

          <section
            className="container promo"
            style={{
              backgroundImage:
                settings.homeOfferImage || settings.bannerImage
                  ? `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${settings.homeOfferImage || settings.bannerImage})`
                  : undefined,
            }}
          >
            <div>
              <span>Exclusive Campaign</span>
              <h2>{settings.homeOfferTitle || settings.bannerTitle}</h2>
              <p>{settings.homeOfferDesc || settings.bannerSubtitle}</p>
            </div>
          </section>

          <section className="container filters">
            <div className="search-box">
              <Search size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج أو براند..."
              />
            </div>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "كل النوع/الموردات" : b}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "كل النباتات" : c}
                </option>
              ))}
            </select>
            <button
              className="store-filter-reset"
              type="button"
              disabled={!hasActiveFilters}
              onClick={resetStoreFilters}
            >
              مسح الفلاتر
            </button>
          </section>
          <section id="products" className="container product-section">
            <div className="section-title">
              <span>Rare Catalogue</span>
              <h2>
                {settings.homeProductsTitle ||
                  "نباتات نادرة ومنتجات فاخرة مختارة بعناية"}
              </h2>
              <p className="home-section-desc">
                {settings.homeProductsDesc ||
                  "منتجات مختارة بعناية لتناسب المنزل والمكتب والهدايا."}
              </p>
            </div>
            <div className="store-results-bar">
              <b>{filtered.length} منتج</b>
              <span>
                {hasActiveFilters
                  ? "هذه النتائج حسب البحث والفلاتر المختارة."
                  : "كل المنتجات الظاهرة في المتجر."}
              </span>
            </div>
            {filtered.length ? (
              <ProductGrid
                products={filtered}
                go={go}
                addToCart={addToCart}
                favorites={favorites}
                setFavorites={setFavorites}
                selectedSize={selectedSize}
                setSelectedSize={setSelectedSize}
              />
            ) : (
              <div className="store-products-empty">
                <b>ما لقينا منتجات مطابقة</b>
                <span>جرّب كلمة بحث مختلفة أو امسح الفلاتر الحالية.</span>
                <button type="button" onClick={resetStoreFilters}>
                  عرض كل المنتجات
                </button>
              </div>
            )}
          </section>

          <section className="container store-features-section">
            <div className="section-title">
              <span>Store Benefits</span>
              <h2>{settings.homeFeaturesTitle || "مزايا المتجر"}</h2>
              <p className="home-section-desc">
                {settings.homeFeaturesDesc ||
                  "تجربة شراء مرتبة وواضحة من اختيار المنتج حتى متابعة الطلب."}
              </p>
            </div>
            <div className="feature-grid">
              {featureCards.map((feature) => (
                <Feature
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  text={feature.text}
                />
              ))}
            </div>
          </section>

          <StoreReturnPolicy settings={settings} />
        </>
      )}

      <Footer
        settings={settings}
        go={go}
        visibleHomePages={visibleHomePages}
      />

      {cartOpen && (
        <CartDrawer
          cart={cart}
          setCart={setCart}
          setCartOpen={setCartOpen}
          authUser={authUser}
          customer={customer}
          hasManagedStock={hasManagedStock}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          applyCoupon={applyCoupon}
          couponMessage={couponMessage}
          appliedCoupon={appliedCoupon}
          removeCoupon={removeCoupon}
          subtotal={subtotal}
          discount={discount}
          shippingFee={shippingFee}
          total={total}
          checkoutWhatsApp={checkoutWhatsApp}
          paymentProviders={availablePaymentProviders}
          selectedPaymentId={selectedPaymentId}
          setSelectedPaymentId={setSelectedPaymentId}
          selectedPaymentProvider={selectedPaymentProvider}
        />
      )}
    </div>
  );
}


export default Store;
