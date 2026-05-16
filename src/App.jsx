import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Heart, Star, Truck, ShieldCheck, RotateCcw, X, Plus, Minus,
  Trash2, LayoutDashboard, Palette, PackagePlus, LogOut, Pencil,
  Save, Users, Lock, Mail, User, MapPin, Phone, Home,
  ClipboardList, Download, Bell, Settings, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink, Clock, Languages
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, serverTimestamp,
  addDoc, query, orderBy, where
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { STORE_WHATSAPP, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, defaultSettings, defaultProducts, palettes } from "./data/storeData";
import { formatPrice, formatOrderDate, orderTimestamp, getTrackingUrl, orderStatusLabel, couponUsedByCustomer, sizesArray, uid, makePageSlug, normalizePageHref, getTrafficSource, formatDuration, getGoogleDriveFileId, normalizeVideoUrl, isGoogleDriveVideo, firebaseError } from "./utils/helpers";








async function sendOrderStatusEmail(order, status) {
  const email = order?.customerEmail || order?.email;
  if (!email) return false;

  const company =
    order?.shippingCompany === "other"
      ? (order?.customShipping || "أخرى")
      : (order?.shippingCompany || "لم تحدد بعد");

  const trackingUrl = order?.trackingNumber
    ? getTrackingUrl(order.shippingCompany, order.trackingNumber, order.customShipping)
    : "لم يصدر رقم التتبع بعد";

  const params = {
    name: order?.customerName || order?.name || "عميل Green Dixam",
    email,
    order_id: order?.id || "",
    status: orderStatusLabel(status || order?.status),
    company,
    tracking_number: order?.trackingNumber || "—",
    tracking_url: trackingUrl
  };

  try {
    const emailjs = await import("@emailjs/browser");
    await emailjs.default.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      params,
      EMAILJS_PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("EmailJS send failed:", error);
    return false;
  }
}



function fileToDataUrl(file, options = {}) {
  const {
    maxWidth = 900,
    maxHeight = 900,
    quality = 0.82,
    mimeType = "image/jpeg"
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    if (!file.type || !file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#F5F1E8";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}






async function getVisitorGeo() {
  try {
    const cached = localStorage.getItem("gdVisitorGeo");
    if (cached) return JSON.parse(cached);

    const res = await fetch("https://ipwho.is/");
    const data = await res.json();

    const geo = {
      city: data.city || "",
      country: data.country || "",
      countryCode: data.country_code || "",
      latitude: Number(data.latitude || 0),
      longitude: Number(data.longitude || 0),
      timezone: data.timezone?.id || ""
    };

    localStorage.setItem("gdVisitorGeo", JSON.stringify(geo));
    return geo;
  } catch {
    return {
      city: "",
      country: "",
      countryCode: "",
      latitude: 0,
      longitude: 0,
      timezone: ""
    };
  }
}





async function trackFunnelStep(step, extra = {}) {
  try {
    const visitorId = localStorage.getItem("gdVisitorId");
    if (!visitorId) return;

    const eventTime = Date.now();

    await setDoc(doc(db, "funnelEvents", `${visitorId}-${step}-${eventTime}`), {
      visitorId,
      step,
      createdAtMs: eventTime,
      createdAt: serverTimestamp(),
      path: window.location.pathname || "/",
      ...extra
    }, { merge: true });
  } catch {}
}








export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [authUser, setAuthUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [products, setProducts] = useState(defaultProducts);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const go = (url) => {
    window.history.pushState({}, "", url);
    setPath(url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!settings?.logo) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.logo;
  }, [settings?.logo]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      setCustomer(null);
      setIsAdmin(false);
      if (u) {
        const adminDoc = await getDoc(doc(db, "admins", u.uid));
        setIsAdmin(adminDoc.exists());
        const customerDoc = await getDoc(doc(db, "customers", u.uid));
        if (customerDoc.exists()) setCustomer({ id: u.uid, ...customerDoc.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "store", "settings"), async (snap) => {
      if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() });
      else await setDoc(doc(db, "store", "settings"), defaultSettings);
    });

    const unsubProducts = onSnapshot(collection(db, "products"), async (snap) => {
      if (snap.empty) {
        await Promise.all(defaultProducts.map(p => setDoc(doc(db, "products", p.id), p)));
      } else {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    return () => {
      unsubSettings();
      unsubProducts();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setCustomers([]);
      return;
    }

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return unsubCustomers;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !authUser) {
      setOrders([]);
      return;
    }

    const ordersQuery = isAdmin
      ? query(collection(db, "orders"), orderBy("createdAt", "desc"))
      : query(collection(db, "orders"), where("customerId", "==", authUser.uid));

    let fallbackUnsub = null;
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {
      if (isAdmin && !fallbackUnsub) {
        fallbackUnsub = onSnapshot(collection(db, "orders"), (snap) => {
          const rows = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));
          setOrders(rows);
        });
      }
    });

    return () => {
      unsubOrders();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [authUser, isAdmin]);

  useEffect(() => {
    if (!isAdmin && path !== "/account") {
      setCoupons([]);
      return;
    }

    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return unsubCoupons;
  }, [isAdmin, path]);

  if (loading) return <div className="loading">جاري التحميل...</div>;

  if (path.startsWith("/admin")) {
    if (!authUser || !isAdmin) return <AdminLogin go={go} settings={settings} />;
    return (
      <Admin
        settings={settings}
        setSettings={setSettings}
        products={products}
        customers={customers}
        orders={orders}
        coupons={coupons}
        go={go}
      />
    );
  }

  return (
    <Store
      settings={settings}
      products={products}
      authUser={authUser}
      customer={customer}
      setCustomer={setCustomer}
      orders={orders}
      coupons={coupons}
      go={go}
      path={path}
    />
  );
}

function AdminLogin({ go, settings }) {
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const adminSnap = await getDoc(doc(db, "admins", cred.user.uid));

      if (!adminSnap.exists()) {
        await signOut(auth);
        setMessage("هذا الحساب غير مصرح له بدخول لوحة التحكم.");
        return;
      }
    } catch (err) {
      setMessage(firebaseError(err));
    }
  }

  return (
    <AuthShell
      settings={settings}
      title="دخول لوحة التحكم"
      subtitle="لوحة التحكم مخصصة لحسابات الأدمن المصرح لها فقط."
    >
      <form onSubmit={submit} className="login-form">
        <label><span><Mail size={16}/> الإيميل</span><input name="email" type="email" required /></label>
        <label><span><Lock size={16}/> كلمة المرور</span><input name="password" type="password" required minLength="6" /></label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary">دخول</button>
        <button type="button" className="admin-secondary" onClick={() => go("/")}>رجوع للمتجر</button>
      </form>
    </AuthShell>
  );
}

function CustomerAuth({ go, settings }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const name = e.target.name.value.trim();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "customers", cred.user.uid), {
          name,
          email,
          phone: "",
          city: "",
          address: "",
          createdAt: serverTimestamp(),
          ordersCount: 0
        });
      }
      go("/account");
    } catch (err) {
      setMessage(firebaseError(err));
    }
  }

  return (
    <AuthShell settings={settings} title={mode === "login" ? "دخول العميل" : "إنشاء حساب عميل"} subtitle="سجل حسابك لحفظ بياناتك واستخدامها في الطلبات القادمة.">
      <form onSubmit={submit} className="login-form">
        {mode === "signup" && <label><span><User size={16}/> الاسم</span><input name="name" required /></label>}
        <label><span><Mail size={16}/> الإيميل</span><input name="email" type="email" required /></label>
        <label><span><Lock size={16}/> كلمة المرور</span><input name="password" type="password" required minLength="6" /></label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary">{mode === "login" ? "دخول" : "إنشاء حساب"}</button>
        <button type="button" className="admin-secondary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "إنشاء حساب جديد" : "عندي حساب"}
        </button>
        <button type="button" className="admin-secondary" onClick={() => go("/")}>رجوع للمتجر</button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children, settings }) {
  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-brand-mark">
          {settings?.logo ? <img src={settings.logo} alt="logo" loading="eager" decoding="async" /> : <span>{settings?.storeName || "GREEN DIXAM"}</span>}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function Store({ settings, products, authUser, customer, setCustomer, orders = [], coupons = [], go, path }) {
  const [queryText, setQueryText] = useState("");
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

  useEffect(() => {
    let visitorId = localStorage.getItem("gdVisitorId");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("gdVisitorId", visitorId);
    }

    const visitorRef = doc(db, "liveVisitors", visitorId);

    const touchVisitor = async () => {
      try {
        const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
        const now = Date.now();
        const geo = await getVisitorGeo();

        let sessionStart = Number(localStorage.getItem("gdSessionStart") || 0);
        if (!sessionStart) {
          sessionStart = now;
          localStorage.setItem("gdSessionStart", String(sessionStart));
        }

        await setDoc(visitorRef, {
          firstSeen: sessionStart,
          lastSeen: now,
          sessionDuration: now - sessionStart,
          source: localStorage.getItem("gdTrafficSource") || getTrafficSource(),
          path: window.location.pathname || "/",
          pageTitle: document.title || "",
          cartCount,
          cartItems: cart.slice(0, 5).map(item => ({
            name: item.name || "منتج",
            qty: Number(item.qty || 1)
          })),
          language: navigator.language || "",
          timezone: geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          city: geo.city || "",
          country: geo.country || "",
          countryCode: geo.countryCode || "",
          latitude: Number(geo.latitude || 0),
          longitude: Number(geo.longitude || 0),
          screen: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
          lastAction: cartCount > 0 ? "لديه منتجات في السلة" : "يتصفح المتجر",
          updatedAt: serverTimestamp()
        }, { merge: true });

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
      return localStorage.getItem("green-dixam-lang") || settings.homeHeaderLang || "AR";
    } catch {
      return settings.homeHeaderLang || "AR";
    }
  });

  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("green-dixam-lang", siteLang);
    } catch {}
  }, [siteLang]);

  const brands = ["All", ...new Set(products.map(p => p.brand).filter(Boolean))];
  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = useMemo(() => products.filter(p => (p.status || "active") !== "hidden").filter(p => {
    const q = queryText.toLowerCase().trim();
    const searchable = `${p.name || ""} ${p.brand || ""} ${p.category || ""}`.toLowerCase();
    return (!q || searchable.includes(q)) &&
      (brand === "All" || p.brand === brand) &&
      (category === "All" || p.category === category);
  }), [products, queryText, brand, category]);

  const cartCount = cart.reduce((n, i) => n + Number(i.qty || 0), 0);
  const subtotal = cart.reduce((n, i) => n + Number(i.qty || 0) * Number(i.price || 0), 0);
  const shippingFee = subtotal ? 35 : 0;
  const discount = appliedCoupon ? Math.round(subtotal * (Number(appliedCoupon.percent || 0) / 100)) : 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;
  const filteredProducts = useMemo(() => products
    .filter((p) => (p.status || "active") !== "hidden")
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase().includes(q);
    }), [products, searchQuery]);

  const visibleHomePages = (settings.homePages || [
    { label: "النباتات", href: "/page/products", visible: true },
    { label: "العروض", href: "/page/offers", visible: true },
    { label: "دليل العناية", href: "/page/care-guide", visible: true }
  ]).filter(page => page.visible !== false);

  const currentStorePage = path.startsWith("/page/")
    ? visibleHomePages.find((page, index) => normalizePageHref(page, index) === path)
    : null;

  if (path.startsWith("/login")) return <CustomerAuth go={go} settings={settings} />;
  if (path.startsWith("/account")) {
    return authUser
      ? <Account customer={customer} setCustomer={setCustomer} orders={orders} coupons={coupons} go={go} settings={settings} />
      : <CustomerAuth go={go} settings={settings} />;
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMessage("اكتب كود الخصم أولاً");
      return;
    }

    const couponSnap = await getDoc(doc(db, "coupons", code));
    const coupon = couponSnap.exists() ? { id: couponSnap.id, ...couponSnap.data() } : null;
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

  function addToCart(product) {
    const size = selectedSize[product.id] || sizesArray(product.sizes)[0] || "Free";
    setCart(prev => {
      const found = prev.find(i => i.id === product.id && i.size === size);
      if (found) return prev.map(i => i.id === product.id && i.size === size ? { ...i, qty: Number(i.qty || 0) + 1 } : i);
      return [...prev, { ...product, size, qty: 1 }];
    });

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();

        setDoc(doc(db, "liveVisitors", visitorId), {
          lastAction: `أضاف للسلة: ${product.name || "منتج"}`,
          lastAddedProduct: product.name || "",
          lastCartAt: eventTime,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setDoc(doc(db, "liveEvents", `${visitorId}-${eventTime}`), {
          type: "cart",
          title: `أضاف للسلة: ${product.name || "منتج"}`,
          path: window.location.pathname || "/",
          visitorId,
          createdAtMs: eventTime,
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    } catch {}

    trackFunnelStep("add_to_cart", { productId: product.id, productName: product.name });

    setCartOpen(true);
  }

  async function checkoutWhatsApp() {
    if (!authUser) {
      setCouponMessage("سجل دخولك كعميل أولاً لإتمام الطلب");
      go("/login");
      return;
    }
    if (!customer?.name || !customer?.phone || !customer?.city || !customer?.address) {
      setCouponMessage("أكمل بيانات حسابك أولاً: الاسم، الجوال، المدينة، العنوان");
      go("/account");
      return;
    }
    if (!cart.length) return;

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();
        await setDoc(doc(db, "liveEvents", `${visitorId}-${eventTime}`), {
          type: "checkout",
          title: "وصل إلى إتمام الطلب",
          path: window.location.pathname || "/checkout",
          visitorId,
          createdAtMs: eventTime,
          createdAt: serverTimestamp()
        }, { merge: true });
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
      items: cart.map(i => ({
        id: i.id, name: i.name, brand: i.brand, size: i.size, qty: i.qty, price: i.price
      })),
      subtotal,
      shippingFee,
      discount,
      couponCode: appliedCoupon?.code || "",
      couponPercent: appliedCoupon?.percent || 0,
      total,
      status: "new",
      createdAt: serverTimestamp()
    };
    const orderRef = await addDoc(collection(db, "orders"), order);

    if (appliedCoupon?.code) {
      await setDoc(doc(db, "coupons", String(appliedCoupon.code).toUpperCase()), {
        usedBy: { [authUser.uid]: { orderId: orderRef.id, usedAt: serverTimestamp() } },
        usedEmails: { [authUser.email]: { orderId: orderRef.id, usedAt: serverTimestamp() } },
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await setDoc(doc(db, "customers", authUser.uid), {
      ...customer,
      ordersCount: Number(customer.ordersCount || 0) + 1,
      lastOrderAt: serverTimestamp()
    }, { merge: true });

    const items = cart.map((item) => `• ${item.name}\nالالحجم: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`).join("\n\n");
    const message = `🛒 طلب جديد من المتجر:\n\n👤 العميل: ${customer.name}\n📱 الجوال: ${customer.phone}\n📧 الإيميل: ${customer.email || authUser.email}\n📍 المدينة: ${customer.city}\n🏠 العنوان: ${customer.address}\n\n${items}\n\n💰 الإجمالي: ${formatPrice(total)} ر.س\n\n📦 الرجاء تأكيد الطلب`;
    window.open(`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
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
    "--topbar-text": settings.homeTopBarText || "#FFFFFF"
  };

  return (
    <div className="store" style={theme} dir={siteLang === "EN" ? "ltr" : "rtl"}>
      <HeroStyle />
      <header
        className={`store-header ${settings.homeHeaderSticky === false ? "" : "header-sticky-pro"}`}
        style={{
          background: settings.homeHeaderBg || undefined
        }}
      >

        {settings.homeTopBarEnabled !== false && (settings.homeHeaderTopBar || "").trim() && (
          <div
            className="top-announcement-bar"
            style={{
              background: settings.homeTopBarBg || "#0F3D2E",
              color: settings.homeTopBarText || "#FFFFFF"
            }}
          >
            <span>{settings.homeHeaderTopBar}</span>
          </div>
        )}

<div className="container luxe-nav">
          <div className="luxe-nav-right">
            <button className="luxe-logo" onClick={() => go("/")}>
              {settings.homeHeaderImage ? (
                <img src={settings.homeHeaderImage} alt="logo" loading="eager" decoding="async" />
              ) : (
                <b>{settings.homeHeaderTitle || settings.storeName}</b>
              )}
            </button>
          </div>

          <nav className="luxe-nav-center">
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  const productsEl = document.getElementById("products");
                  productsEl?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
<input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={siteLang === "EN" ? "Search products..." : "ابحث عن منتج..."}
              />
              <button type="submit" className="search-icon-submit" aria-label={siteLang === "EN" ? "Search" : "بحث"}><Search size={18} /></button>
            </form>
          </nav>

          <div className="luxe-nav-left">

<div className="language-menu-wrap">
              <button
                className="language-toggle"
                type="button"
                title={siteLang === "EN" ? "Language" : "اللغة"}
                onClick={() => setLangMenuOpen(v => !v)}
              >
                🌐
              </button>

              {langMenuOpen && (
                <div className="language-dropdown">
                  <button
                    type="button"
                    className={siteLang === "AR" ? "active" : ""}
                    onClick={() => {
                      setSiteLang("AR");
                      setLangMenuOpen(false);
                    }}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    className={siteLang === "EN" ? "active" : ""}
                    onClick={() => {
                      setSiteLang("EN");
                      setLangMenuOpen(false);
                    }}
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            <button
              className="luxe-icon-btn"
              aria-label="حسابي"
              onClick={() => go(authUser ? "/account" : "/login")}
              title={siteLang === "EN" ? (authUser ? "Account" : "Login") : (authUser ? "حسابي" : "دخول العميل")}
            >
              👤
            </button>

            <button
              className="luxe-cart-icon"
              aria-label={siteLang === "EN" ? "Cart" : "السلة"}
              onClick={() => setCartOpen(true)}
              title={siteLang === "EN" ? "Cart" : "السلة"}
            >
              🛒
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
          </div>
        </div>


        <section className="home-pages-strip">
                <div className="container home-pages-inner">
                  <span>{settings.homePagesTitle || "الصفحات"}</span>
                  <div className="home-pages-links">
                    {visibleHomePages.map((page, index) => (
                      <a
                        key={index}
                        href={normalizePageHref(page, index)}
                        className={currentStorePage === page ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          go(normalizePageHref(page, index));
                        }}
                      >
                        {page.label}
                      </a>
                    ))}
                  </div>
                </div>
              </section>
      </header>


{currentStorePage ? (
        <StoreCustomPage page={currentStorePage} products={products} go={go} />
      ) : (
        <>
<HeroSection settings={settings} products={products} />

      <section className="container feature-grid">
        <Feature icon={<Truck/>} title="توصيل سريع" text="تغليف فاخر للنباتات مع تغليف يحافظ عليها." />
        <Feature icon={<ShieldCheck/>} title="حسابات عملاء" text=" يحفظ بياناته وطلباته لتجربة أسهل." />
        <Feature icon={<RotateCcw/>} title="طلبات منظمة" text="كل طلب محفوظ ومنظم داخل لوحة التحكم." />
      </section>

      <section className="container plant-categories">
        <div className="section-title">
          <span>Brand Essence</span>
          <h2>{settings.homePlantSectionsTitle || "اختر طابعك الأخضر"}</h2>
          <p className="home-section-desc">{settings.homePlantSectionsDesc || "نباتات داخلية، نباتات سهلة العناية، وأصص وإكسسوارات بطابع فاخر."}</p>
        </div>

        {settings.homePlantSectionsImage && (
          <div className="home-admin-section-image">
            <img src={settings.homePlantSectionsImage} alt="أقسام النباتات" loading="lazy" decoding="async" />
          </div>
        )}

        <div className="plant-category-grid">
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80" alt="نباتات داخلية" loading="lazy" decoding="async" />
            <div><b>نباتات داخلية</b><span>نباتات راقية للمنازل والمكاتب</span></div>
          </a>
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80" alt="نباتات سهلة العناية" loading="lazy" decoding="async" />
            <div><b>سهلة العناية</b><span>اختيارات هادئة وسهلة العناية</span></div>
          </a>
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80" alt="أصص وإكسسوارات" loading="lazy" decoding="async" />
            <div><b>أصص وإكسسوارات</b><span>أصص وإكسسوارات بطابع فاخر</span></div>
          </a>
        </div>
      </section>

      <section className="container care-strip cms-care-strip" style={{ backgroundImage: settings.homeCareImage ? `linear-gradient(135deg, rgba(15,61,46,.90), rgba(23,77,57,.82)), url(${settings.homeCareImage})` : undefined }}>
        <div>
          <span>Care Guide</span>
          <h2>{settings.homeCareTitle || "عناية هادئة لنباتات تدوم"}</h2>
          <p>{settings.homeCareDesc || "اختر الإضاءة المناسبة، اسقِ النبات بدون إفراط، واستخدم أصيص بتصريف جيد."}</p>
        </div>
        <div className="care-items">
          <div><b>01</b><span>اختر الإضاءة المناسبة</span></div>
          <div><b>02</b><span>اسقِ النبات بانتظام بدون إفراط</span></div>
          <div><b>03</b><span>استخدم أصيص بتصريف جيد</span></div>
        </div>
      </section>

      <section className="container promo" style={{ backgroundImage: (settings.homeOfferImage || settings.bannerImage) ? `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${settings.homeOfferImage || settings.bannerImage})` : undefined }}>
        <div>
          <span>Exclusive Campaign</span>
          <h2>{settings.homeOfferTitle || settings.bannerTitle}</h2>
          <p>{settings.homeOfferDesc || settings.bannerSubtitle}</p>
        </div>
      </section>

      <section className="container filters">
        <div className="search-box"><Search size={18}/><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="ابحث عن منتج أو براند..." /></div>
        <select value={brand} onChange={e=>setBrand(e.target.value)}>{brands.map(b => <option key={b} value={b}>{b==="All"?"كل النوع/الموردات":b}</option>)}</select>
        <select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c==="All"?"كل النباتات":c}</option>)}</select>
      </section>
<section id="products" className="container product-section">
        <div className="section-title"><span>Rare Catalogue</span><h2>{settings.homeProductsTitle || "نباتات نادرة ومنتجات فاخرة مختارة بعناية"}</h2><p className="home-section-desc">{settings.homeProductsDesc || "منتجات مختارة بعناية لتناسب المنزل والمكتب والهدايا."}</p></div>
        <div className="products-grid">
          {filtered.map(p => {
            const sizes = sizesArray(p.sizes);
            return (
              <article className="product" key={p.id}>
                <div className="product-img">
                  <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
                  <span>{p.tag}</span>
                  <button onClick={() => setFavorites(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : [...prev,p.id])}><Heart className={favorites.includes(p.id) ? "heart-on" : ""}/></button>
                </div>
                <div className="product-body">
                  <div className="product-top"><div><small>{p.brand}</small><h3>{p.name}</h3></div><em>{p.category}</em></div>
                  <div className="rating"><Star size={15} fill="currentColor"/> {p.rating}</div>
                  <div className="sizes">{sizes.map(s => <button className={(selectedSize[p.id] || sizes[0]) === s ? "active" : ""} key={s} onClick={() => setSelectedSize(prev => ({...prev, [p.id]: s}))}>{s}</button>)}</div>
                  <div className="product-foot"><div><b>{formatPrice(p.price)} ر.س</b><del>{formatPrice(p.oldPrice)} ر.س</del></div><button onClick={() => addToCart(p)}>أضف</button></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

        </>
      )}

      <Footer settings={settings} />

      {cartOpen && (
        <div className="cart-overlay">
          <div className="cart-bg" onClick={() => setCartOpen(false)} />
          <aside className="cart-panel">
            <div className="cart-head"><h3>سلة الشراء</h3><button onClick={() => setCartOpen(false)}><X/></button></div>
            <div className="cart-body">
              {cart.length === 0 ? <div className="empty">السلة فارغة</div> :
                cart.map((item, i) => (
                  <div className="cart-item" key={`${item.id}-${i}`}>
                    <img src={item.image} alt={item.name || "منتج"} loading="lazy" decoding="async" />
                    <div>
                      <b>{item.name}</b><span>الحجم: {item.size}</span><span>{formatPrice(item.price)} ر.س</span>
                      <div className="qty"><button onClick={() => setCart(c => c.map((x,idx)=>idx===i?{...x, qty: Math.max(1,x.qty-1)}:x))}><Minus size={14}/></button><b>{item.qty}</b><button onClick={() => setCart(c => c.map((x,idx)=>idx===i?{...x, qty:x.qty+1}:x))}><Plus size={14}/></button><button onClick={() => setCart(c => c.filter((_,idx)=>idx!==i))}><Trash2 size={14}/></button></div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="cart-foot">
              <div className="coupon-box">
                <label>{t("discountCode")}</label>
                <div className="coupon-input-row">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="مثال: GREEN10"
                  />
                  <button type="button" onClick={applyCoupon}>تطبيق</button>
                </div>
                {couponMessage && <span className={appliedCoupon ? "coupon-success" : "coupon-error"}>{couponMessage}</span>}
                {appliedCoupon && <button type="button" className="remove-coupon" onClick={removeCoupon}>إزالة الكوبون</button>}
              </div>

              <div className="cart-summary-lines">
                <p><span>المجموع الفرعي</span><b>{formatPrice(subtotal)} ر.س</b></p>
                {appliedCoupon && <p className="discount-line"><span>خصم {appliedCoupon.percent}%</span><b>- {formatPrice(discount)} ر.س</b></p>}
                <p><span>الشحن</span><b>{formatPrice(shippingFee)} ر.س</b></p>
                <p className="total-line"><span>الإجمالي</span><b>{formatPrice(total)} ر.س</b></p>
              </div>

              <button onClick={checkoutWhatsApp}>إتمام الطلب عبر واتساب</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}


function HeroSection({ settings, products }) {
  const layout = settings.homeHeroLayout || "split";
  const title = settings.homeHeroTitle || "";
  const desc = settings.homeHeroDesc || "";
  const buttonText = settings.homeHeroButton ?? "تسوق الآن";
  const buttonLink = settings.homeHeroButtonLink || "#products";
  const image = settings.homeHeroImage || "";
  const bgImage = settings.homeHeroBgImage || "";
  const imagePosition = settings.homeHeroImagePosition || "left";
  const rawVideo = settings.homeHeroVideo || "";
  const video = normalizeVideoUrl(rawVideo);
  const driveVideo = isGoogleDriveVideo(rawVideo);

  const content = (
    <div className="hero-copy hero-dynamic-copy">
      <h1>{title}</h1>
      <p>{desc}</p>
      {buttonText?.trim() && (
        <div className="hero-actions">
          <a href={buttonLink} className="primary">{buttonText}</a>
        </div>
      )}
    </div>
  );

  if (layout === "video") {
    return (
      <section className="hero-full-media hero-video-mode">
        {video ? (
          driveVideo ? (
            <iframe
              className="hero-full-video hero-drive-video"
              src={video}
              title={title || "Hero Video"}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <video className="hero-full-video" src={video} autoPlay muted loop playsInline />
          )
        ) : image ? (
          <img className="hero-full-video" src={image} alt={title} loading="eager" decoding="async" />
        ) : (
          <div className="hero-full-placeholder">ارفع فيديو الهيرو من لوحة التحكم</div>
        )}
        <div className="hero-media-overlay" />
        <div className="container hero-media-content">{content}</div>
      </section>
    );
  }

  if (layout === "banner") {
    return (
      <section className="hero-full-media hero-banner-mode">
        {image ? (
          <img className="hero-full-video" src={image} alt={title} loading="eager" decoding="async" />
        ) : (
          <div className="hero-full-placeholder">ارفع بنر الهيرو من لوحة التحكم</div>
        )}
        <div className="hero-media-overlay light" />
        <div className="container hero-media-content centered">{content}</div>
      </section>
    );
  }

  return (
    <section
      className={`hero-layered hero-layered-${imagePosition}`}
      style={{
        backgroundImage: bgImage ? `linear-gradient(90deg, rgba(245,241,232,.86), rgba(245,241,232,.48)), url(${bgImage})` : undefined
      }}
    >
      <div className="container hero-layered-inner">
        <div className="hero-layered-text">{content}</div>

        <div className="hero-layered-image-card">
          {image ? (
            <img src={image} alt={title} loading="eager" decoding="async" />
          ) : (
            <div className="hero-full-placeholder">ارفع الصورة الأمامية للهيرو</div>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStyle() {
  return (
    <style>{`
      .hero-full-media {
        position: relative;
        width: 100%;
        min-height: min(760px, 86vh);
        overflow: hidden;
        display: grid;
        align-items: center;
        background: #0F3D2E;
      }

      .hero-full-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hero-media-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(0,0,0,.64), rgba(0,0,0,.18), rgba(0,0,0,.48));
        z-index: 1;
      }

      .hero-media-overlay.light {
        background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.46));
      }

      .hero-media-content {
        position: relative;
        z-index: 2;
        padding-top: 90px;
        padding-bottom: 90px;
      }

      .hero-media-content .hero-dynamic-copy {
        max-width: 620px;
        color: #fff;
      }

      .hero-media-content.centered {
        display: flex;
        justify-content: center;
        text-align: center;
      }

      .hero-media-content.centered .hero-dynamic-copy {
        align-items: center;
        margin: 0 auto;
      }

      .hero-media-content .pill {
        background: rgba(255,255,255,.16);
        color: #fff;
        border-color: rgba(255,255,255,.28);
      }

      .hero-media-content h1,
      .hero-media-content p,
      .hero-media-content .stats span,
      .hero-media-content .stats b {
        color: #fff;
      }

      .hero-full-placeholder {
        min-height: 360px;
        display: grid;
        place-items: center;
        color: rgba(255,255,255,.85);
        background: linear-gradient(135deg, #0F3D2E, #174d39);
        font-weight: 900;
        text-align: center;
        padding: 24px;
      }

      .hero-split-mode .hero-full-placeholder {
        width: 100%;
        height: 100%;
        min-height: 360px;
        border-radius: 28px;
      }


      .hero-admin-compact-form {
        max-width: 1180px !important;
        margin-inline: auto !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 14px !important;
        align-items: end !important;
      }

      .hero-admin-compact-form > .control:first-child,
      .hero-admin-compact-form > .control:nth-child(2) {
        grid-column: span 1 !important;
      }

      .hero-admin-compact-form textarea {
        min-height: 86px !important;
        resize: vertical !important;
      }

      .hero-admin-options-grid,
      .hero-admin-image-tools {
        grid-column: 1 / -1 !important;
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px !important;
        align-items: end !important;
      }

      .hero-admin-compact-form .section-image-preview {
        grid-column: 1 / -1 !important;
        max-height: 170px !important;
        object-fit: cover !important;
        border-radius: 14px !important;
      }

      .hero-admin-compact-form .control,
      .hero-admin-options-grid .control,
      .hero-admin-image-tools .control {
        margin: 0 !important;
      }

      .hero-admin-compact-form input,
      .hero-admin-compact-form select,
      .hero-admin-compact-form textarea {
        min-height: 48px !important;
      }

      @media (max-width: 900px) {
        .hero-admin-compact-form,
        .hero-admin-options-grid,
        .hero-admin-image-tools {
          grid-template-columns: 1fr !important;
        }
      }


      .hero-layered {
        position: relative;
        width: 100%;
        min-height: min(760px, 86vh);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display: grid;
        align-items: center;
        overflow: hidden;
        padding: 70px 0;
      }

      .hero-layered:not([style*="background-image"]) {
        background: linear-gradient(135deg, #fbf8ef, #eef4ef);
      }

      .hero-layered-inner {
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 42px;
        align-items: center;
        position: relative;
        z-index: 2;
      }

      .hero-layered-right .hero-layered-inner {
        grid-template-columns: 1.1fr 1fr;
      }

      .hero-layered-right .hero-layered-image-card { order: 2; }
      .hero-layered-right .hero-layered-text { order: 1; }
      .hero-layered-left .hero-layered-image-card { order: 1; }
      .hero-layered-left .hero-layered-text { order: 2; }

      .hero-layered-image-card {
        border-radius: 34px;
        overflow: hidden;
        background: rgba(255,255,255,.72);
        padding: 14px;
        box-shadow: 0 28px 70px rgba(15,61,46,.14);
        border: 1px solid rgba(194,169,104,.26);
        min-height: 420px;
      }

      .hero-layered-image-card img {
        width: 100%;
        height: 100%;
        min-height: 420px;
        object-fit: cover;
        border-radius: 24px;
        display: block;
      }

      .hero-layered-text {
        display: flex;
        justify-content: center;
      }

      .hero-layered-text .hero-dynamic-copy {
        max-width: 640px;
      }

      .hero-layered-text h1 {
        font-size: clamp(42px, 5vw, 78px);
        line-height: 1.08;
      }

      .hero-layered-text p {
        font-size: clamp(16px, 1.4vw, 21px);
      }

      .hero-admin-compact-form {
        max-width: 1180px !important;
        margin-inline: auto !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 14px !important;
        align-items: end !important;
      }

      .hero-admin-compact-form textarea {
        min-height: 86px !important;
        resize: vertical !important;
      }

      .hero-admin-options-grid,
      .hero-admin-image-tools,
      .hero-admin-bg-tools {
        grid-column: 1 / -1 !important;
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px !important;
        align-items: end !important;
      }

      .hero-admin-compact-form .control,
      .hero-admin-options-grid .control,
      .hero-admin-image-tools .control,
      .hero-admin-bg-tools .control {
        margin: 0 !important;
      }

      .hero-admin-compact-form input,
      .hero-admin-compact-form select,
      .hero-admin-compact-form textarea {
        min-height: 48px !important;
      }

      @media (max-width: 900px) {
        .hero-layered {
          min-height: auto;
          padding: 42px 0;
        }

        .hero-layered-inner,
        .hero-layered-right .hero-layered-inner {
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .hero-layered-image-card,
        .hero-layered-image-card img {
          min-height: 320px;
        }

        .hero-layered-left .hero-layered-image-card,
        .hero-layered-right .hero-layered-image-card,
        .hero-layered-left .hero-layered-text,
        .hero-layered-right .hero-layered-text {
          order: initial;
        }

        .hero-admin-compact-form,
        .hero-admin-options-grid,
        .hero-admin-image-tools,
        .hero-admin-bg-tools {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 780px) {
        .hero-full-media {
          min-height: 620px;
        }

        .hero-media-content {
          padding-top: 60px;
          padding-bottom: 60px;
        }

        .hero-media-content .hero-dynamic-copy {
          max-width: 100%;
        }
      }
    `}</style>
  );
}


function StoreCustomPage({ page, products, go }) {
  const label = page?.label || "صفحة";
  const slug = makePageSlug(page?.href || label);
  const keyword = label.toLowerCase();

  const pageProducts = products.filter((product) => {
    const text = `${product.name || ""} ${product.category || ""} ${product.brand || ""} ${product.description || ""}`.toLowerCase();

    if (slug.includes("offer") || keyword.includes("عرض") || keyword.includes("العروض")) {
      return Number(product.oldPrice || 0) > Number(product.price || 0);
    }

    if (slug.includes("product") || keyword.includes("نبات") || keyword.includes("منتج")) {
      return true;
    }

    return text.includes(keyword) || text.includes(slug.replace(/-/g, " "));
  });

  return (
    <main className="container store-page-view">
      <button type="button" className="primary store-page-back" onClick={() => go("/")}>← رجوع للرئيسية</button>

      <div className="store-page-hero">
        <span>Store Page</span>
        <h1>{label}</h1>
        <p>هذه صفحة مستقلة داخل المتجر ويمكن التحكم باسمها ورابطها وظهورها من قسم الصفحات في لوحة التحكم.</p>
      </div>

      {pageProducts.length > 0 ? (
        <div className="products-grid store-page-products">
          {pageProducts.map(product => (
            <article className="product" key={product.id}>
              <div className="product-img">
                <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                <span>{product.tag}</span>
              </div>
              <div className="product-body">
                <div className="product-top">
                  <div>
                    <small>{product.brand}</small>
                    <h3>{product.name}</h3>
                  </div>
                  <em>{product.category}</em>
                </div>
                <div className="rating"><Star size={15} fill="currentColor"/> {product.rating}</div>
                <div className="product-foot">
                  <div>
                    <b>{formatPrice(product.price)} ر.س</b>
                    {product.oldPrice && <del>{formatPrice(product.oldPrice)} ر.س</del>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="store-page-empty">
          <h2>{label}</h2>
          <p>لا يوجد محتوى مخصص لهذه الصفحة حتى الآن. تقدر تغيّر اسم الصفحة أو رابطها من لوحة التحكم.</p>
        </div>
      )}
    </main>
  );
}


function Account({ customer, setCustomer, orders = [], coupons = [], go, settings }) {
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("profile");

  const currentEmail = auth.currentUser?.email || customer?.email || "";
  const currentUid = auth.currentUser?.uid || customer?.id || "";

  const myOrders = (orders || [])
    .filter(order =>
      (currentEmail && (order.customerEmail === currentEmail || order.email === currentEmail)) ||
      (currentUid && (order.customerId === currentUid || order.uid === currentUid))
    )
    .map(order => ({
      ...order,
      status: order.status || "new",
      total: Number(order.total || 0),
      items: order.items || []
    }))
    .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));

  const statusText = {
    new: "تم استلام الطلب",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  const couponStatus = (coupon) => {
    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    if (couponUsedByCustomer(coupon, currentUid, currentEmail)) return "مستخدم";
    if (!coupon.active) return "غير مفعل";
    if (expired) return "منتهي";
    return "متاح";
  };

  const couponClass = (coupon) => {
    const status = couponStatus(coupon);
    if (status === "متاح") return "available";
    if (status === "مستخدم") return "used";
    if (status === "منتهي") return "expired";
    return "disabled";
  };

  async function saveProfile(e) {
    e.preventDefault();
    const data = {
      name: e.target.name.value,
      email: auth.currentUser.email,
      phone: e.target.phone.value,
      city: e.target.city.value,
      address: e.target.address.value,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "customers", auth.currentUser.uid), data, { merge: true });
    setCustomer({ id: auth.currentUser.uid, ...customer, ...data });
    setMessage("تم حفظ بياناتك");
    setTimeout(() => setMessage(""), 2200);
  }

  return (
    <div className="store account-page" dir="rtl">
      <header className="store-header header-sticky-pro">
        <div className="container luxe-nav account-nav">
          <button className="luxe-logo" onClick={() => go("/")}>
            {settings?.logo ? <img src={settings.logo} alt="logo" loading="eager" decoding="async" /> : <b>حسابي</b>}
            <span>Customer Profile</span>
          </button>
          <nav className="luxe-nav-center">
            <button onClick={() => go("/")}>المتجر</button>
            <button onClick={() => signOut(auth)}>تسجيل خروج</button>
          </nav>
        </div>
      </header>

      <main className="container account-wrap account-tabs-wrap">
        <div className="account-dashboard-card">
          <div className="account-dashboard-head">
            <div>
              <span>Customer Center</span>
              <h1>حساب العميل</h1>
              <p>إدارة بياناتك، متابعة طلباتك، الكوبونات والمحفظة من مكان واحد.</p>
            </div>

            <div className="account-mini-stats">
              <div><b>{myOrders.length}</b><small>طلب</small></div>
              <div><b>{formatPrice(myOrders.reduce((sum, o) => sum + o.total, 0))}</b><small>إجمالي مشتريات</small></div>
            </div>
          </div>

          <div className="account-tabs-pro">
            <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>بياناتي</button>
            <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>طلباتي</button>
            <button className={tab === "appearance" ? "active" : ""} onClick={() => setTab("appearance")}>المظهر</button>
            <button className={tab === "coupons" ? "active" : ""} onClick={() => setTab("coupons")}>الكوبونات</button>
            <button className={tab === "wallet" ? "active" : ""} onClick={() => setTab("wallet")}>المحفظة</button>
          </div>

          {message && <div className="notice">{message}</div>}

          <div className="account-tab-content">
            {tab === "profile" && (
              <section className="account-tab-panel">
                <div className="account-section-title">
                  <span>Profile</span>
                  <h2>بياناتي</h2>
                  <p>أكمل بياناتك حتى نستخدمها تلقائياً عند إتمام الطلب.</p>
                </div>

                <form onSubmit={saveProfile} className="profile-form account-profile-grid">
                  <label><span><User/> الاسم</span><input name="name" defaultValue={customer?.name || auth.currentUser?.displayName || ""} required /></label>
                  <label><span><Mail/> الإيميل</span><input value={auth.currentUser?.email || ""} disabled /></label>
                  <label><span><Phone/> رقم الجوال</span><input name="phone" defaultValue={customer?.phone || ""} placeholder="+9665XXXXXXXX" required /></label>
                  <label><span><MapPin/> المدينة</span><input name="city" defaultValue={customer?.city || ""} placeholder="الرياض" required /></label>
                  <label className="wide"><span><Home/> العنوان</span><textarea name="address" defaultValue={customer?.address || ""} placeholder="الحي، الشارع، رقم المبنى" required /></label>
                  <button className="primary">حفظ البيانات</button>
                </form>
              </section>
            )}

            {tab === "orders" && (
              <section className="account-tab-panel">
                <div className="account-section-title">
                  <span>Orders</span>
                  <h2>طلباتي</h2>
                  <p>تابع حالة الطلب، شركة الشحن ورقم التتبع.</p>
                </div>

                <div className="customer-orders-grid">
                  {myOrders.map(order => (
                    <article className="customer-order-pro" key={order.id}>
                      <div className="customer-order-head">
                        <div>
                          <span>#{String(order.id || "").slice(0, 8)}</span>
                          <h3>{formatPrice(order.total)} ر.س</h3>
                          <p>{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <em className={`customer-order-status ${order.status}`}>{statusText[order.status] || order.status}</em>
                      </div>

                      <div className="customer-order-items">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index}>
                            {item.image && <img src={item.image} alt={item.name || "product"} loading="lazy" decoding="async" />}
                            <span>{item.name || "منتج"}</span>
                            <b>{item.qty || 1}x</b>
                          </div>
                        ))}
                        {order.items.length > 3 && <small>+{order.items.length - 3} منتجات أخرى</small>}
                      </div>

                      <div className="customer-shipping-grid">
                        <div><span>شركة الشحن</span><b>{order.shippingCompany === "other" ? (order.customShipping || "أخرى") : (order.shippingCompany || "لم تحدد بعد")}</b></div>
                        <div><span>رقم التتبع</span><b>{order.trackingNumber || "لم يصدر بعد"}</b></div>
                      </div>

                      {order.trackingNumber && (
                        <a
                          className="tracking-link-customer"
                          href={getTrackingUrl(order.shippingCompany, order.trackingNumber, order.customShipping)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          تتبع الشحنة
                        </a>
                      )}
                    </article>
                  ))}

                  {myOrders.length === 0 && (
                    <div className="account-empty-state">
                      <h3>لا توجد طلبات بعد</h3>
                      <p>بعد إتمام أول طلب سيظهر هنا مع حالة الطلب والشحن والتتبع.</p>
                      <button className="secondary product-flat-top-btn" onClick={() => go("/")}>تصفح المنتجات</button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {tab === "appearance" && (
              <section className="account-tab-panel">
                <div className="account-section-title">
                  <span>Appearance</span>
                  <h2>المظهر</h2>
                  <p>إعدادات المظهر الخاصة بك.</p>
                </div>
                <div className="account-placeholder-card">
                  <b>قريبًا</b>
                  <span>سنضيف خيارات مثل الوضع الليلي وتفضيلات العرض لاحقًا.</span>
                </div>
              </section>
            )}

            {tab === "coupons" && (
              <section className="account-tab-panel">
                <div className="account-section-title">
                  <span>Coupons</span>
                  <h2>الكوبونات</h2>
                  <p>كل الكوبونات المتاحة والمنتهية تظهر هنا بوضوح.</p>
                </div>

                <div className="customer-coupons-grid">
                  {coupons.length ? coupons
                    .slice()
                    .sort((a,b) => String(a.code || "").localeCompare(String(b.code || "")))
                    .map(coupon => (
                      <div className={`customer-coupon-card ${couponClass(coupon)}`} key={coupon.id}>
                        <div>
                          <span>{t("discountCode")}</span>
                          <h3>{coupon.code}</h3>
                          <p>خصم {coupon.percent}%</p>
                        </div>
                        <div className="coupon-status-pill">{couponStatus(coupon)}</div>
                        <div className="coupon-meta">
                          <span>الاستخدام: مرة واحدة لكل عميل</span>
                          {couponUsedByCustomer(coupon, currentUid, currentEmail) && <span>تم استخدامه سابقًا</span>}
                          <span>ينتهي: {coupon.expiresAt || "بدون تاريخ"}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="account-placeholder-card">
                        <b>لا توجد كوبونات حاليًا</b>
                        <span>عند إضافة كوبونات من الأدمن ستظهر هنا.</span>
                      </div>
                    )}
                </div>
              </section>
            )}

            {tab === "wallet" && (
              <section className="account-tab-panel">
                <div className="account-section-title">
                  <span>Wallet</span>
                  <h2>المحفظة</h2>
                  <p>رصيدك ونقاطك المستقبلية.</p>
                </div>
                <div className="wallet-card">
                  <span>الرصيد الحالي</span>
                  <b>0 ر.س</b>
                  <small>سيتم تفعيل نظام الرصيد والنقاط لاحقًا.</small>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


function Footer({ settings }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          {settings.logo ? <img src={settings.logo} alt="logo" loading="eager" decoding="async" /> : <b>{settings.storeName}</b>}
          <p>{settings.tagline}</p>
        </div>
        <div><b>النباتات</b><p>نباتات داخلية<br/>أصص<br/>هدايا خضراء</p></div>
        <div><b>الدعم</b><p>الشحن<br/>الدفع<br/>الاستبدال</p></div>
        <div><b>تواصل</b><p>support@greenhaven.com<br/>الرياض، السعودية</p></div>
      </div>
    </footer>
  );
}

function Feature({icon, title, text}) {
  return <div className="feature"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>;
}

function Admin({ settings, setSettings, products, customers, orders, coupons = [], go }) {
  const [tab, setTab] = useState("dashboard");
  const [openSection, setOpenSection] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(true);
  const [adminLanguage, setAdminLanguage] = useState(() => localStorage.getItem("adminLanguage") || "ar");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const adminI18n = {
    ar: {
      dashboard: "لوحة التحكم",
      home: "الرئيسية",
      reports: "التقارير",
      identity: "هوية المتجر",
      storeTheme: "ثيم المتجر",
      orders: "الطلبات",
      customers: "العملاء",
      products: "المنتجات",
      productManagement: "إدارة المنتجات",
      coupons: "الكوبونات",
      users: "المستخدمين",
      settings: "الإعدادات",
      notifications: "الإشعارات",
      adminPanel: "لوحة الإدارة",
      pulse: "نبض المتجر",
      activeNow: "زائر نشط الآن",
      logout: "خروج",
      language: "لغة لوحة التحكم",
      arabic: "العربية",
      english: "English",
      currentAdminLanguage: "لغة لوحة التحكم الحالية",
      adminPanelLanguage: "Admin panel language",
      preview: "معاينة",
      previewStore: "معاينة المتجر",
      active: "نشط",
      unsaved: "التغييرات غير محفوظة حتى تضغط حفظ",
      unsavedDesc: "أي تعديل في هوية المتجر أو ثيم المتجر لن يظهر في المتجر إلا بعد الحفظ.",
      cancelChanges: "إلغاء التغييرات",
      saveChanges: "حفظ التغييرات",
      dashboardIntro: "نظرة سريعة على أداء المتجر والطلبات والمبيعات.",
      lastUpdate: "آخر تحديث",
      visitorsNow: "الزوار الآن",
      ordersToday: "طلبات اليوم",
      newOrderToday: "طلب جديد اليوم",
      salesToday: "مبيعات اليوم",
      salesTodayDesc: "إجمالي قيمة طلبات اليوم",
      last7Days: "آخر 7 أيام",
      ordersWeek: "طلب خلال الأسبوع",
      totalSales: "إجمالي المبيعات",
      totalSalesDesc: "من كل الطلبات المسجلة",
      conversionFunnel: "مسار التحويل",
      visitedStore: "زار المتجر",
      openedProduct: "فتح منتج",
      addedCart: "أضاف للسلة",
      reachedPayment: "وصل الدفع",
      orderCompleted: "تم الطلب",
      liveAnalytics: "تحليلات مباشرة",
      topPages: "أكثر الصفحات عليها زوار",
      noData: "لا توجد بيانات حالياً",
      trafficSource: "مصدر الدخول",
      sessionDuration: "مدة الجلسة",
      sessionDurationDesc: "متوسط مدة بقاء الزوار النشطين الآن.",
      liveNotifications: "إشعارات مباشرة",
      noLiveEvents: "لا توجد أحداث مباشرة حالياً",
      topProduct: "أفضل منتج",
      noSalesYet: "لا توجد مبيعات بعد",
      recentOrders: "أحدث الطلبات",
      noOrdersYet: "لا توجد طلبات حتى الآن",
      quickNumbers: "أرقام سريعة",
      inventory: "المخزون",
      reportsCenter: "مركز التقارير",
      reportsIntro: "قراءة سريعة لأداء المتجر، المبيعات، الطلبات، المنتجات، والتنبيهات المهمة.",
      exportCsv: "تصدير التقرير CSV",
      thisMonth: "هذا الشهر",
      allPeriod: "كل الفترة",
      advancedFiltersLater: "سيتم ربط الفلاتر المتقدمة لاحقاً بدون التأثير على البيانات الحالية.",
      needsFollowUp: "تحتاج متابعة",
      newOrProcessing: "طلبات جديدة أو قيد المعالجة",
      averageOrder: "متوسط الطلب",
      averageOrderDesc: "قيمة الطلب الواحد",
      lowStock: "مخزون منخفض",
      lowStockDesc: "منتجات تحتاج إعادة تعبئة",
      salesLast7Days: "مبيعات آخر 7 أيام",
      orderStatus: "حالة الطلبات",
      bestSelling: "الأكثر مبيعاً",
      topCities: "المدن الأكثر طلباً",
      noCityData: "لا توجد بيانات مدن بعد",
      importantAlerts: "تنبيهات مهمة",
      ordersNeedFollow: "طلبات تحتاج متابعة",
      lowStockProducts: "منتجات منخفضة المخزون",
      newCustomersWeek: "عملاء جدد خلال الأسبوع",
      couponUses: "استخدامات الكوبونات",
      manageCoupons: "إدارة الكوبونات",
      couponIntro: "أنشئ كوبونات خصم بنسبة مئوية. كل كوبون مخصص للاستخدام مرة واحدة لكل عميل.",
      coupon: "كوبون",
      addCoupon: "إضافة كوبون",
      activeCoupon: "كوبون مفعل",
      saveCoupon: "حفظ الكوبون",
      discountCode: "كود الخصم",
      delete: "حذف",
      noCoupons: "لا توجد كوبونات بعد",
      readyColors: "ألوان جاهزة",
      editIdentity: "تعديل هوية المتجر",
      logo: "الشعار",
      logoHint: "يفضل رفع شعار PNG أو JPG بحجم صغير. سيتم ضغطه تلقائيًا قبل الحفظ.",
      productIntro: "أضف، استورد، وابحث عن المنتجات من نفس المكان بدون نماذج مفتوحة داخل الصفحة.",
      newProduct: "منتج جديد",
      excelTemplate: "قالب Excel",
      uploadExcel: "رفع Excel",
      allProducts: "كل المنتجات",
      visibleProducts: "الظاهرة",
      lowStockOnly: "منخفضة المخزون",
      categories: "الأقسام",
      importedPreview: "معاينة المنتجات المستوردة",
      cancelImport: "إلغاء الاستيراد",
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      hidden: "مخفي",
      visible: "ظاهر",
      info: "المعلومات",
      pricingStock: "الأسعار والمخزون",
      images: "الصور",
      options: "الخيارات",
      seo: "SEO"
    },
    en: {
      dashboard: "Dashboard",
      home: "Home",
      reports: "Reports",
      identity: "Store identity",
      storeTheme: "Store theme",
      orders: "Orders",
      customers: "Customers",
      products: "Products",
      productManagement: "Product management",
      coupons: "Coupons",
      users: "Users",
      settings: "Settings",
      notifications: "Notifications",
      adminPanel: "Admin Panel",
      pulse: "Store pulse",
      activeNow: "active visitor now",
      logout: "Logout",
      language: "Admin language",
      arabic: "Arabic",
      english: "English",
      currentAdminLanguage: "Current admin panel language",
      adminPanelLanguage: "Admin panel language",
      preview: "Preview",
      previewStore: "Preview store",
      active: "Active",
      unsaved: "Changes are not saved until you click save",
      unsavedDesc: "Store identity or theme changes will not appear in the store until saved.",
      cancelChanges: "Discard changes",
      saveChanges: "Save changes",
      dashboardIntro: "A quick overview of store performance, orders, and sales.",
      lastUpdate: "Last update",
      visitorsNow: "Visitors now",
      ordersToday: "Orders today",
      newOrderToday: "new order today",
      salesToday: "Sales today",
      salesTodayDesc: "Total value of today’s orders",
      last7Days: "Last 7 days",
      ordersWeek: "orders this week",
      totalSales: "Total sales",
      totalSalesDesc: "From all recorded orders",
      conversionFunnel: "Conversion funnel",
      visitedStore: "Visited store",
      openedProduct: "Opened product",
      addedCart: "Added to cart",
      reachedPayment: "Reached payment",
      orderCompleted: "Order completed",
      liveAnalytics: "Live analytics",
      topPages: "Top active pages",
      noData: "No data yet",
      trafficSource: "Traffic source",
      sessionDuration: "Session duration",
      sessionDurationDesc: "Average duration for active visitors now.",
      liveNotifications: "Live notifications",
      noLiveEvents: "No live events yet",
      topProduct: "Top product",
      noSalesYet: "No sales yet",
      recentOrders: "Recent orders",
      noOrdersYet: "No orders yet",
      quickNumbers: "Quick numbers",
      inventory: "Inventory",
      reportsCenter: "Reports center",
      reportsIntro: "A quick read of sales, orders, products, and important alerts.",
      exportCsv: "Export CSV report",
      thisMonth: "This month",
      allPeriod: "All time",
      advancedFiltersLater: "Advanced filters will be connected later without affecting current data.",
      needsFollowUp: "Needs follow-up",
      newOrProcessing: "New or processing orders",
      averageOrder: "Average order",
      averageOrderDesc: "Value per order",
      lowStock: "Low stock",
      lowStockDesc: "Products need restocking",
      salesLast7Days: "Sales last 7 days",
      orderStatus: "Order status",
      bestSelling: "Best selling",
      topCities: "Top cities",
      noCityData: "No city data yet",
      importantAlerts: "Important alerts",
      ordersNeedFollow: "Orders need follow-up",
      lowStockProducts: "Low-stock products",
      newCustomersWeek: "New customers this week",
      couponUses: "Coupon uses",
      manageCoupons: "Manage coupons",
      couponIntro: "Create percentage discount coupons. Each coupon is limited to one use per customer.",
      coupon: "Coupon",
      addCoupon: "Add coupon",
      activeCoupon: "Active coupon",
      saveCoupon: "Save coupon",
      discountCode: "Discount code",
      delete: "Delete",
      noCoupons: "No coupons yet",
      readyColors: "Ready colors",
      editIdentity: "Edit store identity",
      logo: "Logo",
      logoHint: "PNG or JPG logo is recommended. It will be compressed before saving.",
      productIntro: "Add, import, and search products from one clean place without open forms on the page.",
      newProduct: "New product",
      excelTemplate: "Excel template",
      uploadExcel: "Upload Excel",
      allProducts: "All products",
      visibleProducts: "Visible",
      lowStockOnly: "Low stock",
      categories: "Categories",
      importedPreview: "Imported products preview",
      cancelImport: "Cancel import",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      hidden: "Hidden",
      visible: "Visible",
      info: "Info",
      pricingStock: "Pricing & stock",
      images: "Images",
      options: "Options",
      seo: "SEO"
    }
  };

  const t = (key) => adminI18n[adminLanguage]?.[key] || adminI18n.ar[key] || key;
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [draftSettings, setDraftSettings] = useState(settings);
  const [imagePreview, setImagePreview] = useState(editing?.image || "");
  const [galleryImages, setGalleryImages] = useState([]);
  const [pendingImport, setPendingImport] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSort, setProductSort] = useState("newest");
  const [productOptions, setProductOptions] = useState([{ size: "", color: "", stock: "", price: "", sku: "" }]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productFormTab, setProductFormTab] = useState("info");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [liveVisitorRows, setLiveVisitorRows] = useState([]);
  const [showLiveVisitors, setShowLiveVisitors] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [funnelStats, setFunnelStats] = useState({ visit_store:0, view_product:0, add_to_cart:0, checkout:0, purchase:0 });

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "liveVisitors"), (snapshot) => {
      const now = Date.now();
      const rows = snapshot.docs
        .map((visitorDoc) => ({ id: visitorDoc.id, ...(visitorDoc.data() || {}) }))
        .filter((visitor) => Number(visitor.lastSeen || 0) > now - 60000)
        .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));

      setLiveVisitorRows(rows);
      setLiveVisitors(rows.length);
    });

    return () => unsubscribe();
  }, []);



  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "liveEvents"), (snapshot) => {
      const since = Date.now() - 1000 * 60 * 60 * 6;
      const rows = snapshot.docs
        .map((eventDoc) => ({ id: eventDoc.id, ...(eventDoc.data() || {}) }))
        .filter((event) => Number(event.createdAtMs || 0) > since)
        .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
        .slice(0, 12);

      setLiveEvents(rows);
    });

    return () => unsubscribe();
  }, []);



  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "funnelEvents"), (snapshot) => {
      const stats = {
        visit_store: 0,
        view_product: 0,
        add_to_cart: 0,
        checkout: 0,
        purchase: 0
      };

      snapshot.docs.forEach((eventDoc) => {
        const data = eventDoc.data() || {};
        if (stats[data.step] !== undefined) {
          stats[data.step] += 1;
        }
      });

      setFunnelStats(stats);
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    setImagePreview(editing?.image || "");
    setGalleryImages(Array.isArray(editing?.gallery) ? editing.gallery : []);
    const currentOptions = Array.isArray(editing?.options) && editing.options.length
      ? editing.options
      : [{ size: "", color: "", stock: "", price: "", sku: "" }];
    setProductOptions(currentOptions.map(option => ({
      size: option.size || "",
      color: option.color || "",
      stock: option.stock ?? "",
      price: option.price ?? "",
      oldPrice: option.oldPrice ?? "",
      sku: option.sku || ""
    })));
  }, [editing]);

  const updateDraft = (key, value) => {
    setDraftSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveDraftSettings = async () => {
    const ok = await saveSettings(draftSettings);
    if (ok) setDraftSettings(prev => ({ ...prev }));
  };

  const resetDraftSettings = () => {
    setDraftSettings(settings);
    setNotice("تم إلغاء التغييرات غير المحفوظة");
    setTimeout(() => setNotice(""), 1800);
  };

  const adminProductCategories = useMemo(() => ["all", ...new Set(products.map(product => product.category).filter(Boolean))], [products]);

  const filteredAdminProducts = products
    .filter(product => {
      const q = productSearch.trim().toLowerCase();
      const searchable = `${product.name || ""} ${product.category || ""} ${product.brand || ""} ${product.sku || ""}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);

      const matchesCategory = productCategoryFilter === "all" || product.category === productCategoryFilter;

      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "active" && product.status !== "hidden") ||
        (productStatusFilter === "hidden" && product.status === "hidden") ||
        (productStatusFilter === "featured" && product.featured) ||
        (productStatusFilter === "out" && Number(product.stock || 0) <= 0);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (productSort === "price_high") return Number(b.price || 0) - Number(a.price || 0);
      if (productSort === "price_low") return Number(a.price || 0) - Number(b.price || 0);
      if (productSort === "stock_low") return Number(a.stock || 0) - Number(b.stock || 0);
      if (productSort === "name") return String(a.name || "").localeCompare(String(b.name || ""), "ar");
      if (productSort === "newest") return String(b.id || "").localeCompare(String(a.id || ""));
      return Number(a.order ?? 999999) - Number(b.order ?? 999999);
    });

  const toggleProductSelection = (id) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleAllVisibleProducts = () => {
    const visibleIds = filteredAdminProducts.map(product => product.id);
    const allSelected = visibleIds.length && visibleIds.every(id => selectedProducts.includes(id));

    setSelectedProducts(prev => {
      if (allSelected) return prev.filter(id => !visibleIds.includes(id));
      return [...new Set([...prev, ...visibleIds])];
    });
  };

  const clearProductSelection = () => setSelectedProducts([]);

  const bulkUpdateProducts = async (patch, successMessage) => {
    if (!selectedProducts.length) return;

    try {
      await Promise.all(selectedProducts.map(id => setDoc(doc(db, "products", id), patch, { merge: true })));
      setNotice(successMessage);
      setTimeout(() => setNotice(""), 2600);
      clearProductSelection();
    } catch (error) {
      console.error("Bulk update products failed:", error);
      setNotice("تعذر تنفيذ العملية على المنتجات المحددة");
      setTimeout(() => setNotice(""), 3500);
    }
  };

  const deleteSelectedProducts = async () => {
    if (!selectedProducts.length) return;

    const ok = window.confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج محدد؟`);
    if (!ok) return;

    try {
      await Promise.all(selectedProducts.map(id => deleteDoc(doc(db, "products", id))));
      setNotice("تم حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 2600);
      clearProductSelection();
    } catch (error) {
      console.error("Delete selected products failed:", error);
      setNotice("تعذر حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 3500);
    }
  };

  const quickUpdateProduct = async (id, patch) => {
    try {
      await setDoc(doc(db, "products", id), patch, { merge: true });
      setNotice("تم التحديث السريع");
      setTimeout(() => setNotice(""), 1600);
    } catch (error) {
      console.error("Quick update failed:", error);
      setNotice("تعذر تحديث المنتج");
      setTimeout(() => setNotice(""), 2800);
    }
  };

  const duplicateProduct = async (product) => {
    const id = uid();
    const copy = {
      ...product,
      name: `${product.name || "منتج"} - نسخة`,
      sku: product.sku ? `${product.sku}-COPY` : "",
      status: "hidden",
      featured: false,
      order: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    delete copy.id;

    try {
      await setDoc(doc(db, "products", id), copy, { merge: true });
      setNotice("تم نسخ المنتج وحفظه كمخفي");
      setTimeout(() => setNotice(""), 2600);
    } catch (error) {
      console.error("Duplicate product failed:", error);
      setNotice("تعذر نسخ المنتج");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const reorderProducts = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const current = [...filteredAdminProducts];
    const fromIndex = current.findIndex(product => product.id === sourceId);
    const toIndex = current.findIndex(product => product.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    try {
      await Promise.all(current.map((product, index) =>
        setDoc(doc(db, "products", product.id), { order: index + 1, updatedAt: serverTimestamp() }, { merge: true })
      ));
      setProductSort("custom");
      setNotice("تم ترتيب المنتجات");
      setTimeout(() => setNotice(""), 1800);
    } catch (error) {
      console.error("Reorder products failed:", error);
      setNotice("تعذر حفظ ترتيب المنتجات");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const deleteAllProducts = async () => {
    if (!products.length) {
      setNotice("لا توجد منتجات لحذفها");
      setTimeout(() => setNotice(""), 2200);
      return;
    }

    const ok = window.confirm(`هل أنت متأكد من حذف كل المنتجات؟ سيتم حذف ${products.length} منتج نهائيًا.`);
    if (!ok) return;

    try {
      await Promise.all(products.map(product => deleteDoc(doc(db, "products", product.id))));
      setEditing(null);
      setImagePreview("");
      setGalleryImages([]);
      clearProductSelection();
      setNotice("تم حذف كل المنتجات بنجاح");
      setTimeout(() => setNotice(""), 3000);
    } catch (error) {
      console.error("Delete all products failed:", error);
      setNotice("تعذر حذف كل المنتجات. حاول مرة أخرى.");
      setTimeout(() => setNotice(""), 4000);
    }
  };

  const totalValue = products.reduce((n,p)=>n+Number(p.price || 0),0);

  const saveSettings = async (patch) => {
    try {
      await setDoc(doc(db, "store", "settings"), { ...settings, ...patch }, { merge: true });
      setSettings(s => ({ ...s, ...patch }));
      setNotice("تم حفظ التغييرات بنجاح");
      setTimeout(() => setNotice(""), 2200);
      return true;
    } catch (error) {
      console.error("Save settings failed:", error);
      setNotice("تعذر الحفظ. غالبًا حجم الصورة كبير، جرّب شعار أصغر أو ارفعه مرة ثانية.");
      setTimeout(() => setNotice(""), 5000);
      return false;
    }
  };

  const uploadSettingImage = async (key, file) => {
    if (!file) return;

    if (key === "homeHeroVideo") {
      const maxVideoSize = 750 * 1024;
      if (file.size > maxVideoSize) {
        setNotice("حجم الفيديو كبير جدًا للرفع المباشر. استخدم رابط فيديو خارجي أو ارفع فيديو أقل من 750KB.");
        setTimeout(() => setNotice(""), 6000);
        return;
      }
    }

    const data = await fileToDataUrl(file, key === "logo" ? {
      maxWidth: 520,
      maxHeight: 220,
      quality: 0.78
    } : {
      maxWidth: 1400,
      maxHeight: 900,
      quality: 0.82
    });
    updateDraft(key, data);
  };

  const uploadGalleryImages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      const uploaded = [];
      for (const file of files) {
        const data = await fileToDataUrl(file, { maxWidth: 1200, maxHeight: 1000, quality: 0.82 });
        uploaded.push(data);
      }

      setGalleryImages(prev => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Upload gallery failed:", error);
      setNotice("تعذر رفع صور المعرض");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const makeGalleryImagePrimary = (image) => {
    setImagePreview(image);
  };

  const updateProductOption = (index, key, value) => {
    setProductOptions(prev => prev.map((option, i) => i === index ? { ...option, [key]: value } : option));
  };

  const addProductOption = () => {
    setProductOptions(prev => [...prev, { size: "", color: "", stock: "", price: "", sku: "" }]);
  };

  const removeProductOption = (index) => {
    setProductOptions(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ size: "", color: "", stock: "", price: "", sku: "" }]);
  };

  const resetProductEditor = () => {
    setEditing(null);
    setImagePreview("");
    setGalleryImages([]);
    setProductOptions([{ size: "", color: "", stock: "", price: "", sku: "" }]);
    setProductFormTab("info");
    setProductModalOpen(false);
  };

  const openProductEditor = (product = null) => {
    setEditing(product);
    setProductFormTab("info");
    setProductModalOpen(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const f = e.target;
    let image = f.imageUrl.value.trim();
    if (f.imageFile.files[0]) image = await fileToDataUrl(f.imageFile.files[0], { maxWidth: 1100, maxHeight: 900, quality: 0.82 });
    const id = editing?.id || uid();
    const cleanOptions = productOptions
      .map(option => ({
        size: String(option.size || "").trim(),
        color: String(option.color || "").trim(),
        stock: option.stock === "" ? "" : Number(option.stock || 0),
        price: option.price === "" ? "" : Number(option.price || 0),
        oldPrice: option.oldPrice === "" || option.oldPrice == null ? "" : Number(option.oldPrice || 0),
        sku: String(option.sku || "").trim()
      }))
      .filter(option => option.size || option.color || option.stock !== "" || option.price !== "" || option.oldPrice !== "" || option.sku);

    const sizes = cleanOptions.length
      ? [...new Set(cleanOptions.map(option => option.size).filter(Boolean))]
      : String(f.sizes.value || "").split(",").map(item => item.trim()).filter(Boolean);

    const colors = cleanOptions.length
      ? [...new Set(cleanOptions.map(option => option.color).filter(Boolean))]
      : String(f.colors.value || "").split(",").map(item => item.trim()).filter(Boolean);

    const gallery = [...new Set([image || editing?.image || "", ...galleryImages].filter(Boolean))];

    const product = {
      name: f.name.value.trim(),
      brand: f.brand.value.trim(),
      category: f.category.value.trim(),
      price: Number(f.price.value),
      oldPrice: Number(f.oldPrice.value || f.price.value),
      rating: Number(f.rating.value || 5),
      sizes,
      colors,
      options: cleanOptions,
      tag: f.tag.value.trim(),
      description: f.description.value.trim(),
      stock: Number(f.stock.value || 0),
      sku: f.sku.value.trim(),
      status: f.status.value,
      featured: f.featured.checked,
      image: image || editing?.image || "",
      gallery,
      order: editing?.order ?? Date.now(),
      createdAt: editing?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "products", id), product, { merge: true });
    setNotice(editing ? "تم تعديل المنتج بنجاح" : "تم إضافة المنتج بنجاح");
    setTimeout(() => setNotice(""), 2200);
    resetProductEditor();
    f.reset();
    setTab("products");
  };

  const normalizeExcelProduct = (row) => {
    const pick = (...keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return row[key];
      }
      return "";
    };

    const name = String(pick("name", "اسم المنتج", "المنتج")).trim();
    if (!name) return null;

    const price = Number(pick("price", "السعر") || 0);
    const oldPriceRaw = pick("oldPrice", "السعر قبل الخصم");
    const image = String(pick("image", "رابط الصورة", "الصورة")).trim();

    return {
      name,
      brand: String(pick("brand", "النوع/المورد", "المورد") || "GREEN DIXAM").trim(),
      category: String(pick("category", "القسم") || "نباتات داخلية").trim(),
      price,
      oldPrice: Number(oldPriceRaw || price),
      rating: Number(pick("rating", "التقييم") || 4.8),
      sizes: String(pick("sizes", "الأحجام/الخيارات", "الخيارات") || "صغير,متوسط,كبير").trim(),
      tag: String(pick("tag", "الشارة") || "Rare").trim(),
      description: String(pick("description", "الوصف") || "").trim(),
      stock: Number(pick("stock", "المخزون") || 0),
      sku: String(pick("sku", "SKU") || "").trim(),
      status: String(pick("status", "الحالة") || "active").trim(),
      featured: String(pick("featured", "مميز") || "").toLowerCase() === "true" || String(pick("featured", "مميز") || "") === "نعم",
      image,
      gallery: galleryImages,
      colors: f.colors?.value?.split(",").map(v => v.trim()).filter(Boolean) || [],
      seoTitle: f.seoTitle?.value?.trim() || "",
      seoDescription: f.seoDescription?.value?.trim() || "",
      updatedAt: serverTimestamp()
    };
  };

  const downloadProductsTemplate = async () => {
    const rows = [
      {
        "اسم المنتج": "مونستيرا فاخرة",
        "النوع/المورد": "Monstera",
        "القسم": "نباتات داخلية",
        "السعر": 189,
        "السعر قبل الخصم": 239,
        "المخزون": 12,
        "SKU": "GD-PLANT-001",
        "الحالة": "active",
        "التقييم": 4.9,
        "الشارة": "Luxury",
        "الأحجام/الخيارات": "صغير,متوسط,كبير",
        "رابط الصورة": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1200&q=80",
        "الوصف": "نبتة داخلية فاخرة تضيف لمسة طبيعية راقية.",
        "مميز": "نعم"
      },
      {
        "اسم المنتج": "أصيص سيراميك ذهبي",
        "النوع/المورد": "Golden Ceramic",
        "القسم": "أصص فاخرة",
        "السعر": 89,
        "السعر قبل الخصم": 119,
        "المخزون": 25,
        "SKU": "GD-POT-002",
        "الحالة": "active",
        "التقييم": 4.8,
        "الشارة": "Gold",
        "الأحجام/الخيارات": "S,M,L",
        "رابط الصورة": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80",
        "الوصف": "أصيص أنيق يناسب النباتات الداخلية.",
        "مميز": "لا"
      }
    ];

    const helpRows = [
      ["تعليمات"],
      ["لا تغيّر أسماء الأعمدة حتى يتم الاستيراد بشكل صحيح."],
      ["الحالة: active للظهور أو hidden للإخفاء."],
      ["مميز: اكتب نعم أو true إذا تريد المنتج مميز."],
      ["رابط الصورة يجب أن يكون رابط مباشر لصورة."],
      ["السعر والمخزون والتقييم أرقام فقط."]
    ];

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    const help = XLSX.utils.aoa_to_sheet(helpRows);
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.utils.book_append_sheet(wb, help, "Instructions");
    XLSX.writeFile(wb, "green-dixam-products-template.xlsx");
  };

  const importProductsFromExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const productsToImport = rows.map(normalizeExcelProduct).filter(Boolean);

      if (!productsToImport.length) {
        setNotice("لم يتم العثور على منتجات صالحة داخل ملف Excel");
        setTimeout(() => setNotice(""), 3500);
        return;
      }

      setPendingImport(productsToImport);
      setNotice(`تم تجهيز ${productsToImport.length} منتج للمعاينة. اضغط حفظ المنتجات المستوردة للتأكيد.`);
      setTimeout(() => setNotice(""), 4500);
      event.target.value = "";
    } catch (error) {
      console.error("Excel import failed:", error);
      setNotice("تعذر قراءة الملف. تأكد أنه ملف Excel وبنفس قالب الأعمدة.");
      setTimeout(() => setNotice(""), 5000);
    }
  };

  const savePendingImport = async () => {
    if (!pendingImport.length) {
      setNotice("لا توجد منتجات مستوردة للحفظ");
      setTimeout(() => setNotice(""), 2500);
      return;
    }

    try {
      for (const product of pendingImport) {
        const id = product.sku || uid();
        await setDoc(doc(db, "products", String(id)), product, { merge: true });
      }

      setNotice(`تم حفظ ${pendingImport.length} منتج في المتجر`);
      setPendingImport([]);
      setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      console.error("Save pending import failed:", error);
      setNotice("تعذر حفظ المنتجات المستوردة. حاول مرة أخرى.");
      setTimeout(() => setNotice(""), 5000);
    }
  };

  const clearPendingImport = () => {
    setPendingImport([]);
    setNotice("تم إلغاء المنتجات المستوردة غير المحفوظة");
    setTimeout(() => setNotice(""), 2500);
  };

  const saveCoupon = async (e) => {
    e.preventDefault();
    const f = e.target;
    const code = String(f.code.value || "").trim().toUpperCase();
    const percent = Number(f.percent.value || 0);
    const expiresAt = f.expiresAt.value || "";

    if (!code || percent <= 0 || percent > 100) {
      setNotice("تأكد من إدخال كود صحيح ونسبة بين 1 و 100");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    await setDoc(doc(db, "coupons", code), {
      code,
      percent,
      active: f.active.checked,
      usage: "once_per_customer",
      type: "percent",
      expiresAt,
      updatedAt: serverTimestamp()
    }, { merge: true });

    setNotice("تم حفظ الكوبون");
    setTimeout(() => setNotice(""), 2500);
    f.reset();
  };

  const toggleCoupon = async (coupon) => {
    await setDoc(doc(db, "coupons", coupon.id), {
      active: !coupon.active,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };


  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const dashboardOrders = orders.map(o => ({
    ...o,
    total: Number(o.total || 0),
    items: o.items || []
  }));

  const todayOrders = dashboardOrders.filter(o => orderTimestamp(o.createdAt) >= todayStart.getTime());
  const weekOrders = dashboardOrders.filter(o => orderTimestamp(o.createdAt) >= weekStart.getTime());
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSales = dashboardOrders.reduce((sum, o) => sum + o.total, 0);

  const productSalesMap = {};
  dashboardOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.name || "منتج غير معروف";
      if (!productSalesMap[key]) productSalesMap[key] = { name: key, qty: 0, value: 0, image: item.image || "" };
      productSalesMap[key].qty += Number(item.qty || 1);
      productSalesMap[key].value += Number(item.price || 0) * Number(item.qty || 1);
      if (!productSalesMap[key].image && item.image) productSalesMap[key].image = item.image;
    });
  });

  const topProduct = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty)[0];

  const adminBestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const pendingOrdersCount = dashboardOrders.filter(o => ["new", "processing"].includes(o.status || "new")).length;
  const lowStockProducts = products.filter(p => Number(p.stock || 0) <= 3 && p.status !== "hidden");
  const activeProductsCount = products.filter(p => p.status !== "hidden").length;
  const averageOrderValue = dashboardOrders.length ? Math.round(totalSales / dashboardOrders.length) : 0;

  const reportStatusLabels = {
    new: "جديد",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي",
    canceled: "ملغي"
  };

  const reportStatusRows = Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const key = order.status || "new";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    status,
    label: reportStatusLabels[status] || status,
    count,
    percent: dashboardOrders.length ? Math.round((count / dashboardOrders.length) * 100) : 0
  }));

  const reportCityRows = Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const city = order.city || order.shippingCity || order.address?.city || "غير محدد";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const reportSalesRows = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const value = dashboardOrders
      .filter(order => {
        const time = orderTimestamp(order.createdAt);
        return time >= day.getTime() && time < nextDay.getTime();
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      label: day.toLocaleDateString("ar-SA", { weekday: "short" }),
      value
    };
  });

  const maxReportSales = Math.max(...reportSalesRows.map(row => row.value), 1);
  const newCustomersCount = customers.filter(customer => orderTimestamp(customer.createdAt) >= weekStart.getTime()).length;
  const usedCouponsCount = coupons.reduce((sum, coupon) => sum + Object.keys(coupon.usedBy || {}).length, 0);

  const exportReportsCsv = () => {
    const headers = ["metric", "value"];
    const rows = [
      ["total_sales", totalSales],
      ["today_sales", todaySales],
      ["total_orders", dashboardOrders.length],
      ["week_orders", weekOrders.length],
      ["average_order", averageOrderValue],
      ["pending_orders", pendingOrdersCount],
      ["low_stock_products", lowStockProducts.length],
      ["new_customers_week", newCustomersCount],
      ["coupon_uses", usedCouponsCount]
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `green-dixam-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("تم تصدير تقرير الأداء");
    setTimeout(() => setNotice(""), 2200);
  };
  const adminHealthCards = [
    { label: "طلبات تحتاج متابعة", value: pendingOrdersCount, tone: pendingOrdersCount ? "warning" : "good", icon: <Bell size={18}/> },
    { label: "منتجات منخفضة المخزون", value: lowStockProducts.length, tone: lowStockProducts.length ? "warning" : "good", icon: <AlertTriangle size={18}/> },
    { label: "منتجات ظاهرة", value: activeProductsCount, tone: "neutral", icon: <CheckCircle2 size={18}/> },
    { label: "متوسط الطلب", value: `${formatPrice(averageOrderValue)} ر.س`, tone: "neutral", icon: <TrendingUp size={18}/> }
  ];


  const livePageStats = liveVisitorRows.reduce((acc, visitor) => {
    const key = visitor.path || "/";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topLivePages = Object.entries(livePageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sourceStats = liveVisitorRows.reduce((acc, visitor) => {
    const key = visitor.source || "مباشر";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topSources = Object.entries(sourceStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const averageSessionDuration = liveVisitorRows.length
    ? Math.round(liveVisitorRows.reduce((sum, visitor) => sum + Number(visitor.sessionDuration || 0), 0) / liveVisitorRows.length)
    : 0;

  const themeSections = [
    { id: "header", label: "الهيدر", titleKey: "homeHeaderTitle", descKey: "homeHeaderSubtitle", imageKey: "homeHeaderImage", headerExtra: true },
    { id: "hero", label: "الهيرو", titleKey: "homeHeroTitle", descKey: "homeHeroDesc", imageKey: "homeHeroImage", buttonKey: "homeHeroButton", heroExtra: true },
    { id: "pages", label: "الصفحات", titleKey: "homePagesTitle", descKey: "", imageKey: "", pagesExtra: true },
    { id: "plants", label: "أقسام النباتات", titleKey: "homePlantSectionsTitle", descKey: "homePlantSectionsDesc", imageKey: "homePlantSectionsImage" },
    { id: "care", label: "شريط العناية", titleKey: "homeCareTitle", descKey: "homeCareDesc", imageKey: "homeCareImage" },
    { id: "offer", label: "بنر العروض", titleKey: "homeOfferTitle", descKey: "homeOfferDesc", imageKey: "homeOfferImage" },
    { id: "products", label: "المنتجات", titleKey: "homeProductsTitle", descKey: "homeProductsDesc", imageKey: "" }
  ];

  const selectedThemeSection = themeSections.find(section => section.id === openSection);
  const changeAdminLanguage = (language) => {
    setAdminLanguage(language);
    localStorage.setItem("adminLanguage", language);
    setLanguageMenuOpen(false);
    setNotice(language === "ar" ? "تم اختيار اللغة العربية" : "English language selected");
    setTimeout(() => setNotice(""), 1800);
  };

return (
    <div className={`admin admin-lang-${adminLanguage}`} dir={adminLanguage === "ar" ? "rtl" : "ltr"}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          {settings.logo ? <img className="admin-brand-logo" src={settings.logo} alt="logo" loading="eager" decoding="async" /> : <b>{settings.storeName}</b>}
          <span>{t("adminPanel")}</span>
        </div>
        <button className={tab==="dashboard"?"on":""} onClick={()=>setTab("dashboard")}><LayoutDashboard/> {t("home")}</button>
        <button className={tab==="reports"?"on":""} onClick={()=>setTab("reports")}><TrendingUp/> {t("reports")}</button>
        <button className={tab==="identity"?"on":""} onClick={()=>setTab("identity")}><Palette/> {t("identity")}</button>
        <div className="admin-menu-group">
          <button
            className={tab==="homepage"?"on":""}
            onClick={() => {
              setTab("homepage");
              setThemeMenuOpen(!themeMenuOpen);
            }}
          >
            <Home/> {t("storeTheme")} <span className="admin-menu-chevron">{themeMenuOpen ? "−" : "+"}</span>
          </button>
          {themeMenuOpen && (
            <div className="admin-submenu">
              {themeSections.map(section => (
                <button
                  key={section.id}
                  className={tab==="homepage" && openSection===section.id ? "on" : ""}
                  onClick={() => goToThemeSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className={tab==="orders"?"on":""} onClick={()=>setTab("orders")}><ClipboardList/> {t("orders")}</button>
        <button className={tab==="customers"?"on":""} onClick={()=>setTab("customers")}><Users/> {t("customers")}</button>
        <button className={tab==="products"?"on":""} onClick={()=>setTab("products")}><PackagePlus/> {t("products")}</button>
        <button className={tab==="coupons"?"on":""} onClick={()=>setTab("coupons")}><Palette/> {t("coupons")}</button>
        <button className={tab==="users"?"on":""} onClick={()=>setTab("users")}><Users/> {t("users")}</button>
        <button className={tab==="settings"?"on":""} onClick={()=>setTab("settings")}><Settings/> {t("settings")}</button>
        <button className={tab==="notifications"?"on":""} onClick={()=>setTab("notifications")}><Bell/> {t("notifications")}</button>

        <div className="admin-sidebar-card">
          <span>{t("pulse")}</span>
          <b>{liveVisitors}</b>
          <small>{t("activeNow")}</small>
        </div>

        <div className="side-bottom"><button onClick={()=>signOut(auth)}><LogOut/> {t("logout")}</button></div>
      </aside>

      <main className="admin-main">
        {tab === "dashboard" && (
<header className="admin-top modern-admin-top">
          <div className="modern-admin-title">
            <span>{t("dashboard")}</span>
            <h1>{titleFor(tab, adminLanguage)}</h1>
          </div>
          <div className="modern-admin-actions">
            <div className="admin-language-switcher">
              <button
                type="button"
                className="modern-admin-icon-btn admin-language-trigger"
                onClick={() => setLanguageMenuOpen((open) => !open)}
                title={t("language")}
              >
                <Languages size={18}/>
                <span>{adminLanguage === "ar" ? t("arabic") : t("english")}</span>
              </button>
              {languageMenuOpen && (
                <div className="admin-language-menu">
                  <button
                    type="button"
                    className={adminLanguage === "ar" ? "active" : ""}
                    onClick={() => changeAdminLanguage("ar")}
                  >
                    <span>ع</span>
                    <div>
                      <b>{t("arabic")}</b>
                      <small>{t("currentAdminLanguage")}</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={adminLanguage === "en" ? "active" : ""}
                    onClick={() => changeAdminLanguage("en")}
                  >
                    <span>EN</span>
                    <div>
                      <b>{t("english")}</b>
                      <small>{t("adminPanelLanguage")}</small>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="modern-admin-icon-btn" onClick={() => go("/")} title={t("previewStore")}>
              <ExternalLink size={18}/>
              <span>{t("preview")}</span>
            </button>
            <div className="modern-admin-pill">
              <Clock size={16}/>
              <span>{formatOrderDate(new Date())}</span>
            </div>
            <div className="modern-admin-live">
              <span className="live-dot"/>
              <b>{liveVisitors}</b>
              <small>{t("active")}</small>
            </div>
          </div>
        </header>
)}
        {notice && <div className="notice">{notice}</div>}
        {(tab === "identity" || tab === "homepage") && (
          <div className="admin-save-bar">
            <div>
              <b>{t("unsaved")}</b>
              <span>{t("unsavedDesc")}</span>
            </div>
            <div className="save-bar-actions">
              <button className="admin-secondary" onClick={resetDraftSettings}>{t("cancelChanges")}</button>
              <button className="admin-primary" onClick={saveDraftSettings}>{t("saveChanges")}</button>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <section className="dashboard-pro-page">
            <div className="admin-health-grid">
              {adminHealthCards.map(card => (
                <div className={`admin-health-card ${card.tone}`} key={card.label}>
                  <div>{card.icon}</div>
                  <span>{card.label}</span>
                  <b>{card.value}</b>
                </div>
              ))}
            </div>

            <div className="dashboard-stats-grid">
              <button type="button" className="dash-stat-card live-visitors-card live-visitors-clickable" onClick={() => setShowLiveVisitors(true)}>
                <span>{t("visitorsNow")}</span>
                <b>{liveVisitors}</b>
                <small><i></i> مباشر الآن</small>
              </button>

              <div className="dash-stat-card">
                <span>{t("ordersToday")}</span>
                <b>{todayOrders.length}</b>
                <small>{t("newOrderToday")}</small>
              </div>

              <div className="dash-stat-card gold">
                <span>{t("salesToday")}</span>
                <b>{formatPrice(todaySales)} ر.س</b>
                <small>{t("salesTodayDesc")}</small>
              </div>

              <div className="dash-stat-card">
                <span>{t("last7Days")}</span>
                <b>{weekOrders.length}</b>
                <small>{t("ordersWeek")}</small>
              </div>

              <div className="dash-stat-card">
                <span>{t("totalSales")}</span>
                <b>{formatPrice(totalSales)} ر.س</b>
                <small>{t("totalSalesDesc")}</small>
              </div>
            </div>

            
            <div className="admin-card funnel-panel">
              <div className="panel-head">
                <div>
                  <span>{t("conversionFunnel")}</span>
                  <h2>{t("conversionFunnel")}</h2>
                </div>
              </div>

              <div className="funnel-grid">
                <div className="funnel-step">
                  <b>{funnelStats.visit_store}</b>
                  <span>{t("visitedStore")}</span>
                </div>

                <div className="funnel-arrow">→</div>

                <div className="funnel-step">
                  <b>{funnelStats.view_product}</b>
                  <span>{t("openedProduct")}</span>
                </div>

                <div className="funnel-arrow">→</div>

                <div className="funnel-step">
                  <b>{funnelStats.add_to_cart}</b>
                  <span>{t("addedCart")}</span>
                </div>

                <div className="funnel-arrow">→</div>

                <div className="funnel-step">
                  <b>{funnelStats.checkout}</b>
                  <span>{t("reachedPayment")}</span>
                </div>

                <div className="funnel-arrow">→</div>

                <div className="funnel-step success">
                  <b>{funnelStats.purchase}</b>
                  <span>{t("orderCompleted")}</span>
                </div>
              </div>
            </div>

<div className="admin-card live-analytics-panel">
              <div className="panel-head">
                <div>
                  <span>Live Analytics</span>
                  <h2>{t("liveAnalytics")}</h2>
                </div>
              </div>

              <div className="live-analytics-grid">
                <div className="live-analytics-box">
                  <h3>{t("topPages")}</h3>
                  {topLivePages.length ? topLivePages.map(([page, count]) => (
                    <div className="live-mini-row" key={page}>
                      <span>{page}</span>
                      <b>{count}</b>
                    </div>
                  )) : <p>{t("noData")}</p>}
                </div>

                <div className="live-analytics-box">
                  <h3>{t("trafficSource")}</h3>
                  {topSources.length ? topSources.map(([source, count]) => (
                    <div className="live-mini-row" key={source}>
                      <span>{source}</span>
                      <b>{count}</b>
                    </div>
                  )) : <p>{t("noData")}</p>}
                </div>

                <div className="live-analytics-box">
                  <h3>{t("sessionDuration")}</h3>
                  <div className="live-duration-big">{formatDuration(averageSessionDuration)}</div>
                  <p>{t("sessionDurationDesc")}</p>
                </div>

                <div className="live-analytics-box live-events-box">
                  <h3>{t("liveNotifications")}</h3>
                  {liveEvents.length ? liveEvents.slice(0, 5).map(event => (
                    <div className={`live-event-row ${event.type || ""}`} key={event.id}>
                      <span>{event.title || "نشاط مباشر"}</span>
                      <small>{event.path || "/"}</small>
                    </div>
                  )) : <p>{t("noLiveEvents")}</p>}
                </div>
              </div>
            </div>

            {showLiveVisitors && (
              <LiveVisitorsModal
                visitors={liveVisitorRows}
                onClose={() => setShowLiveVisitors(false)}
              />
            )}

            <div className="dashboard-main-grid">
              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Best Seller</span>
                    <h2>{t("topProduct")}</h2>
                  </div>
                </div>

                {topProduct ? (
                  <div className="top-product-card">
                    {topProduct.image ? <img src={topProduct.image} alt={topProduct.name || "منتج"} loading="lazy" decoding="async" /> : <div className="top-product-placeholder">🌿</div>}
                    <div>
                      <h3>{topProduct.name}</h3>
                      <p>تم بيع {topProduct.qty} قطعة</p>
                      <b>{formatPrice(topProduct.value)} ر.س</b>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-empty">{t("noSalesYet")}</div>
                )}
              </div>

              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Recent Orders</span>
                    <h2>{t("recentOrders")}</h2>
                  </div>
                </div>

                <div className="recent-orders-list">
                  {dashboardOrders
                    .slice()
                    .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt))
                    .slice(0, 5)
                    .map(o => (
                      <div className="recent-order-row" key={o.id}>
                        <div>
                          <b>{o.name || o.customerName || "طلب عميل"}</b>
                          <span>{formatOrderDate(o.createdAt)}</span>
                        </div>
                        <em>{formatPrice(o.total)} ر.س</em>
                      </div>
                    ))}

                  {dashboardOrders.length === 0 && (
                    <div className="dashboard-empty">{t("noOrdersYet")}</div>
                  )}
                </div>
              </div>

              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Quick Numbers</span>
                    <h2>{t("quickNumbers")}</h2>
                  </div>
                </div>

                <div className="quick-numbers">
                  <div><span>{t("products")}</span><b>{products.length}</b></div>
                  <div><span>{t("customers")}</span><b>{customers.length}</b></div>
                  <div><span>{t("orders")}</span><b>{orders.length}</b></div>
                  <div><span>{t("inventory")}</span><b>{products.reduce((sum,p)=>sum + Number(p.stock || 0), 0)}</b></div>
                </div>
              </div>
            </div>
          </section>
        )}


        {tab === "reports" && (
          <section className="reports-pro-page">
            <div className="reports-hero-card admin-card">
              <div>
                <span>Reports Center</span>
                <h2>{t("reportsCenter")}</h2>
                <p>{t("reportsIntro")}</p>
              </div>
              <div className="reports-hero-actions">
                <button className="admin-secondary" type="button" onClick={exportReportsCsv}>{t("exportCsv")}</button>
                <div className="reports-update-pill">
                  <b>{formatOrderDate(new Date())}</b>
                  <small>{t("lastUpdate")}</small>
                </div>
              </div>
            </div>

            <div className="reports-filter-strip admin-card">
              <button className="active" type="button">{t("last7Days")}</button>
              <button type="button">{t("thisMonth")}</button>
              <button type="button">{t("allPeriod")}</button>
              <span>{t("advancedFiltersLater")}</span>
            </div>

            <div className="reports-kpi-grid">
              <div className="reports-kpi-card admin-card">
                <span>{t("totalSales")}</span>
                <b>{formatPrice(totalSales)} ر.س</b>
                <small>كل الطلبات المسجلة</small>
              </div>
              <div className="reports-kpi-card admin-card">
                <span>{t("salesToday")}</span>
                <b>{formatPrice(todaySales)} ر.س</b>
                <small>{todayOrders.length} طلب اليوم</small>
              </div>
              <div className="reports-kpi-card admin-card">
                <span>طلبات الأسبوع</span>
                <b>{weekOrders.length}</b>
                <small>{t("last7Days")}</small>
              </div>
              <div className="reports-kpi-card admin-card warning">
                <span>{t("needsFollowUp")}</span>
                <b>{pendingOrdersCount}</b>
                <small>{t("newOrProcessing")}</small>
              </div>
              <div className="reports-kpi-card admin-card">
                <span>{t("averageOrder")}</span>
                <b>{formatPrice(averageOrderValue)} ر.س</b>
                <small>{t("averageOrderDesc")}</small>
              </div>
              <div className="reports-kpi-card admin-card danger">
                <span>{t("lowStock")}</span>
                <b>{lowStockProducts.length}</b>
                <small>{t("lowStockDesc")}</small>
              </div>
            </div>

            <div className="reports-layout-grid">
              <div className="admin-card reports-chart-card">
                <div className="panel-head">
                  <div>
                    <span>Sales Trend</span>
                    <h2>{t("salesLast7Days")}</h2>
                  </div>
                </div>
                <div className="reports-bars">
                  {reportSalesRows.map(row => (
                    <div className="reports-bar-item" key={row.label}>
                      <div className="reports-bar-track"><i style={{ height: `${Math.max(8, Math.round((row.value / maxReportSales) * 100))}%` }} /></div>
                      <b>{formatPrice(row.value)}</b>
                      <span>{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-card reports-panel-card">
                <div className="panel-head">
                  <div>
                    <span>Order Status</span>
                    <h2>{t("orderStatus")}</h2>
                  </div>
                </div>
                <div className="reports-status-list">
                  {reportStatusRows.length ? reportStatusRows.map(row => (
                    <div className="reports-status-row" key={row.status}>
                      <div><b>{row.label}</b><span>{row.count} طلب</span></div>
                      <div className="reports-progress"><i style={{ width: `${row.percent}%` }} /></div>
                      <em>{row.percent}%</em>
                    </div>
                  )) : <div className="dashboard-empty">لا توجد طلبات بعد</div>}
                </div>
              </div>
            </div>

            <div className="reports-layout-grid three">
              <div className="admin-card reports-panel-card">
                <div className="panel-head">
                  <div>
                    <span>Best Sellers</span>
                    <h2>{t("bestSelling")}</h2>
                  </div>
                </div>
                <div className="reports-list">
                  {adminBestSellers.length ? adminBestSellers.map((product, index) => (
                    <div className="reports-list-row" key={product.name}>
                      <strong>{index + 1}</strong>
                      <div><b>{product.name}</b><span>{product.qty} قطعة مباعة</span></div>
                      <em>{formatPrice(product.value)} ر.س</em>
                    </div>
                  )) : <div className="dashboard-empty">{t("noSalesYet")}</div>}
                </div>
              </div>

              <div className="admin-card reports-panel-card">
                <div className="panel-head">
                  <div>
                    <span>Top Cities</span>
                    <h2>{t("topCities")}</h2>
                  </div>
                </div>
                <div className="reports-list">
                  {reportCityRows.length ? reportCityRows.map(([city, count]) => (
                    <div className="reports-list-row" key={city}>
                      <strong>•</strong>
                      <div><b>{city}</b><span>{count} طلب</span></div>
                    </div>
                  )) : <div className="dashboard-empty">{t("noCityData")}</div>}
                </div>
              </div>

              <div className="admin-card reports-panel-card reports-alerts-card">
                <div className="panel-head">
                  <div>
                    <span>Admin Alerts</span>
                    <h2>{t("importantAlerts")}</h2>
                  </div>
                </div>
                <div className="reports-alert-list">
                  <div><b>{pendingOrdersCount}</b><span>{t("ordersNeedFollow")}</span></div>
                  <div><b>{lowStockProducts.length}</b><span>{t("lowStockProducts")}</span></div>
                  <div><b>{newCustomersCount}</b><span>{t("newCustomersWeek")}</span></div>
                  <div><b>{usedCouponsCount}</b><span>{t("couponUses")}</span></div>
                </div>
              </div>
            </div>

            <div className="admin-card reports-panel-card">
              <div className="panel-head">
                <div>
                  <span>Recent Orders</span>
                  <h2>آخر الطلبات</h2>
                </div>
              </div>
              <div className="reports-table">
                {dashboardOrders.slice().sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt)).slice(0, 6).map(order => (
                  <div className="reports-table-row" key={order.id}>
                    <b>{order.name || order.customerName || "طلب عميل"}</b>
                    <span>{formatOrderDate(order.createdAt)}</span>
                    <span>{reportStatusLabels[order.status || "new"] || order.status || "جديد"}</span>
                    <em>{formatPrice(order.total)} ر.س</em>
                  </div>
                ))}
                {dashboardOrders.length === 0 && <div className="dashboard-empty">{t("noOrdersYet")}</div>}
              </div>
            </div>
          </section>
        )}

        {tab === "coupons" && (
          <section className="coupons-admin-page">
            <div className="admin-card coupons-admin-hero">
              <div>
                <span>Coupons</span>
                <h2>{t("manageCoupons")}</h2>
                <p>{t("couponIntro")}</p>
              </div>
              <div className="coupon-admin-stat">
                <b>{coupons.length}</b>
                <small>{t("coupon")}</small>
              </div>
            </div>

            <div className="coupons-admin-grid">
              <div className="admin-card coupon-form-card">
                <div className="pro-card-head">
                  <div>
                    <span>Create Coupon</span>
                    <h2>{t("addCoupon")}</h2>
                  </div>
                </div>

                <form onSubmit={saveCoupon} className="coupon-form">
                  <Control label="كود الكوبون">
                    <input name="code" placeholder="GREEN10" required />
                  </Control>

                  <Control label="نسبة الخصم %">
                    <input name="percent" type="number" min="1" max="100" placeholder="10" required />
                  </Control>

                  <Control label="تاريخ الانتهاء">
                    <input name="expiresAt" type="date" />
                  </Control>

                  <Control label="عنوان SEO">
                    <input name="seoTitle" defaultValue={editing?.seoTitle || ""} placeholder="عنوان يظهر في Google" />
                  </Control>

                  <Control label="وصف SEO">
                    <textarea name="seoDescription" defaultValue={editing?.seoDescription || ""} placeholder="وصف مختصر لمحركات البحث" />
                  </Control>

                  <label className="feature-toggle">
                    <input name="active" type="checkbox" defaultChecked />
                    <span>{t("activeCoupon")}</span>
                  </label>

                  <button className="admin-primary">{t("saveCoupon")}</button>
                </form>
              </div>

              <div className="admin-card coupons-list-card">
                <div className="pro-card-head">
                  <div>
                    <span>Coupons List</span>
                    <h2>الكوبونات</h2>
                  </div>
                  <b className="products-count">{coupons.length} كوبون</b>
                </div>

                <div className="admin-coupons-list">
                  {coupons.map(coupon => {
                    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                    return (
                      <div className={`admin-coupon-card ${coupon.active ? "active" : "disabled"} ${expired ? "expired" : ""}`} key={coupon.id}>
                        <div>
                          <span>{t("discountCode")}</span>
                          <h3>{coupon.code}</h3>
                          <p>خصم {coupon.percent}% • استخدام مرة واحدة لكل عميل</p>
                          <small>تم استخدامه: {Object.keys(coupon.usedBy || {}).length} مرة</small>
                          <small>ينتهي: {coupon.expiresAt || "بدون تاريخ"}</small>
                        </div>

                        <div className="coupon-actions">
                          <button className="admin-secondary" onClick={() => toggleCoupon(coupon)}>
                            {coupon.active ? "إيقاف" : "تفعيل"}
                          </button>
                          <button className="danger-action" onClick={() => deleteDoc(doc(db, "coupons", coupon.id))}>
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {coupons.length === 0 && (
                    <div className="dashboard-empty">{t("noCoupons")}</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}


        {tab === "identity" && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>{t("readyColors")}</h2>
              <div className="palette-grid">
                {palettes.map(p => <button key={p.name} onClick={()=>setDraftSettings(s=>({...s,...p}))}><span>{p.name}</span><i style={{background:p.primaryColor}}/><i style={{background:p.accentColor}}/><i style={{background:p.backgroundColor}}/></button>)}
              </div>
            </div>
            <div className="admin-card">
              <h2>{t("editIdentity")}</h2>
              <Control label="اسم المتجر"><input value={draftSettings.storeName} onChange={e=>updateDraft("storeName",e.target.value)} /></Control>
              <Control label="الوصف القصير"><input value={draftSettings.tagline} onChange={e=>updateDraft("tagline",e.target.value)} /></Control>
              <Control label="الخط"><select value={draftSettings.fontFamily} onChange={e=>updateDraft("fontFamily",e.target.value)}><option>Cairo</option><option>Tajawal</option></select></Control>
              <Control label="اللون الأساسي"><input type="color" value={draftSettings.primaryColor} onChange={e=>updateDraft("primaryColor",e.target.value)} /></Control>
              <Control label="لون اللمسة"><input type="color" value={draftSettings.accentColor} onChange={e=>updateDraft("accentColor",e.target.value)} /></Control>
              <Control label="لون الخلفية"><input type="color" value={draftSettings.backgroundColor} onChange={e=>updateDraft("backgroundColor",e.target.value)} /></Control>
            </div>
            <div className="admin-card">
              <h2>{t("logo")}</h2>
              <Control label="رابط الشعار"><input value={draftSettings.logo} onChange={e=>updateDraft("logo",e.target.value)} /></Control>
              <Control label="أو ارفع الشعار"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("logo", e.target.files[0])} /></Control><p className="admin-help-text">{t("logoHint")}</p>
              {draftSettings.logo && <img className="admin-image-preview small" src={draftSettings.logo} alt="معاينة الشعار" loading="lazy" decoding="async" />}
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="admin-products-stacked">
            <div className="admin-products-command-center">
              <div className="products-command-main">
                <div className="products-command-title">
                  <span className="eyebrow">Products workspace</span>
                  <h2>{t("productManagement")}</h2>
                  <p>{t("productIntro")}</p>
                </div>

                <div className="products-command-actions">
                  <button className="admin-primary command-primary product-flat-top-btn" type="button" onClick={() => openProductEditor(null)}>
                    <Plus size={18}/> منتج جديد
                  </button>
                  <button className="admin-secondary command-secondary product-flat-top-btn" type="button" onClick={downloadProductsTemplate}>
                    <Download size={16}/> قالب Excel
                  </button>
                  <label className="excel-upload-btn command-upload product-flat-top-btn">
                    <Download size={16}/> رفع Excel
                    <input type="file" accept=".xlsx,.xls" onChange={importProductsFromExcel} />
                  </label>
                </div>
              </div>

              <div className="products-command-stats">
                <div><span>{t("allProducts")}</span><b>{products.length}</b></div>
                <div><span>{t("visibleProducts")}</span><b>{activeProductsCount}</b></div>
                <div><span>{t("lowStockOnly")}</span><b>{lowStockProducts.length}</b></div>
                <div><span>{t("categories")}</span><b>{Math.max(adminProductCategories.length - 1, 0)}</b></div>
              </div>

              {pendingImport.length > 0 && (
                <div className="pending-import-box command-import-preview">
                  <div className="pending-head">
                    <div>
                      <b>{t("importedPreview")}</b>
                      <span>{pendingImport.length} منتج جاهز للحفظ</span>
                    </div>
                    <div className="pending-actions">
                      <button className="admin-secondary" type="button" onClick={clearPendingImport}>{t("cancelImport")}</button>
                      <button className="admin-primary" type="button" onClick={savePendingImport}>حفظ المنتجات المستوردة</button>
                    </div>
                  </div>

                  <div className="pending-table">
                    {pendingImport.slice(0, 8).map((p, i) => (
                      <div className="pending-row" key={i}>
                        <img src={p.image || "https://via.placeholder.com/120"} alt={p.name || "منتج"} loading="lazy" decoding="async" />
                        <div>
                          <b>{p.name}</b>
                          <span>{p.category} • {p.price} ر.س • المخزون {p.stock}</span>
                        </div>
                        <em>{p.status === "hidden" ? "مخفي" : "ظاهر"}</em>
                      </div>
                    ))}
                  </div>

                  {pendingImport.length > 8 && <p className="pending-more">ويتم حفظ باقي المنتجات أيضًا: +{pendingImport.length - 8}</p>}
                </div>
              )}
            </div>

            {productModalOpen && (
              <div className="product-modal-backdrop" onClick={resetProductEditor}>
                <div className="product-modal-shell" onClick={e => e.stopPropagation()}>
            <div className="admin-card product-form-card pro-form-card full-product-form-card products-form-compact-final">
              <div className="pro-card-head">
                <div>
                  <span>Product editor</span>
                  <h2>{editing ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
                </div>
                <button type="button" className="modal-close-btn" onClick={resetProductEditor}>×</button>
              </div>

              <div className="product-modal-tabs" role="tablist">
                <button type="button" className={productFormTab === "info" ? "active" : ""} onClick={() => setProductFormTab("info")}>١ المعلومات</button>
                <button type="button" className={productFormTab === "pricing" ? "active" : ""} onClick={() => setProductFormTab("pricing")}>٢ الأسعار والمخزون</button>
                <button type="button" className={productFormTab === "images" ? "active" : ""} onClick={() => setProductFormTab("images")}>٣ الصور</button>
                <button type="button" className={productFormTab === "options" ? "active" : ""} onClick={() => setProductFormTab("options")}>٤ الخيارات</button>
                <button type="button" className={productFormTab === "seo" ? "active" : ""} onClick={() => setProductFormTab("seo")}>٥ SEO</button>
              </div>

              <form id="product-editor-form" onSubmit={saveProduct} className={`product-form products-six-card-form product-editor-tabs-form active-tab-${productFormTab}`}>
                <div className="product-options-master-card">
                  <div className="product-options-master-head">
                    <div>
                      <span>نظام خيارات المنتج</span>
                      <h3>إدارة خيارات المقاسات والألوان والأسعار والمخزون</h3>
                    </div>
                    <span className="product-section-icon"><Settings size={18}/></span>
                  </div>

                  <div className="options-master-grid">
                    <div className="options-preview-panel">
                      <div className="options-subhead">
                        <b>معاينة الخيارات</b>
                        <small>{productOptions.length} خيارات</small>
                      </div>
                      <div className="option-stats-row">
                        <div><span>الخيارات الكلية</span><b>{productOptions.length}</b></div>
                        <div><span>المقاسات</span><b>{new Set(productOptions.map(o => o.size).filter(Boolean)).size}</b></div>
                        <div><span>الألوان</span><b>{new Set(productOptions.map(o => o.color).filter(Boolean)).size}</b></div>
                        <div><span>إجمالي المخزون</span><b>{productOptions.reduce((sum, o) => sum + Number(o.stock || 0), 0)}</b></div>
                      </div>
                      <div className="option-preview-table">
                        <div className="option-preview-head"><span>اللون</span><span>المقاس</span><span>السعر</span><span>بعد الخصم</span><span>{t("inventory")}</span><span>SKU</span></div>
                        {productOptions.length ? productOptions.map((option, index) => (
                          <div className="option-preview-row" key={`preview-${index}`}>
                            <span>{option.color || "—"}</span>
                            <span>{option.size || "—"}</span>
                            <span>{option.price || editing?.price || "—"}</span>
                            <span>{option.oldPrice || editing?.oldPrice || "—"}</span>
                            <span>{option.stock || 0}</span>
                            <span>{option.sku || "—"}</span>
                          </div>
                        )) : <div className="option-preview-empty">أضف خيارًا ليظهر هنا</div>}
                      </div>
                      <div className="option-available-note"><CheckCircle2 size={15}/> سيظهر المنتج بهذا الشكل للعملاء حسب الخيارات المتاحة</div>
                    </div>

                    <div className="options-editor-panel">
                      <div className="option-chip-section">
                        <div className="option-chip-head"><b>إدارة الألوان</b></div>
                        <div className="option-chip-row">
                          {[...new Set(productOptions.map(o => o.color).filter(Boolean))].map(color => <span className="option-chip" key={color}>{color}<button type="button">×</button></span>)}
                          <button type="button" className="option-add-chip" onClick={addProductOption}><Plus size={14}/> إضافة لون</button>
                        </div>
                      </div>

                      <div className="option-chip-section">
                        <div className="option-chip-head"><b>إدارة المقاسات</b></div>
                        <div className="option-chip-row">
                          {[...new Set(productOptions.map(o => o.size).filter(Boolean))].map(size => <span className="option-chip" key={size}>{size}<button type="button">×</button></span>)}
                          <button type="button" className="option-add-chip" onClick={addProductOption}><Plus size={14}/> إضافة مقاس</button>
                        </div>
                      </div>

                      <div className="option-combinations-title">الخيارات (المقاس × اللون)</div>
                      <div className="product-options-builder refined-options-builder">
                        {productOptions.map((option, index) => (
                          <div className="product-option-row refined-option-row" key={index}>
                            <input value={option.color} onChange={e => updateProductOption(index, "color", e.target.value)} placeholder="اللون" />
                            <input value={option.size} onChange={e => updateProductOption(index, "size", e.target.value)} placeholder="المقاس" />
                            <input value={option.sku} onChange={e => updateProductOption(index, "sku", e.target.value)} placeholder="SKU اختياري" />
                            <input type="number" min="0" value={option.price} onChange={e => updateProductOption(index, "price", e.target.value)} placeholder="السعر" />
                            <input type="number" min="0" value={option.oldPrice || ""} onChange={e => updateProductOption(index, "oldPrice", e.target.value)} placeholder="السعر بعد الخصم" />
                            <input type="number" min="0" value={option.stock} onChange={e => updateProductOption(index, "stock", e.target.value)} placeholder="المخزون" />
                            <button type="button" className="admin-danger-soft" onClick={() => removeProductOption(index)}><Trash2 size={14}/></button>
                          </div>
                        ))}
                        <button type="button" className="option-add-row-btn" onClick={addProductOption}><Plus size={15}/> إضافة خيار جديد</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="products-six-card-grid">
                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">📝</span> معلومات المنتج</h3>
                    <Control label="اسم المنتج"><input name="name" defaultValue={editing?.name || ""} placeholder="مثال: مونستيرا فاخرة" /></Control>
                    <Control label="الوصف"><textarea name="description" defaultValue={editing?.description || ""} placeholder="اكتب وصف مختصر وجميل للمنتج" /></Control>
                    <div className="two">
                      <Control label="النوع/المورد"><input name="brand" defaultValue={editing?.brand || ""} placeholder="Monstera" /></Control>
                      <Control label="القسم"><input name="category" defaultValue={editing?.category || "نباتات داخلية"} /></Control>
                    </div>
                  </div>

                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">🏷️</span> السعر والمخزون</h3>
                    <div className="two">
                      <Control label="السعر"><input name="price" type="number" min="0" step="1" defaultValue={editing?.price || ""} /></Control>
                      <Control label="السعر قبل الخصم"><input name="oldPrice" type="number" min="0" step="1" defaultValue={editing?.oldPrice || ""} /></Control>
                    </div>
                    <div className="two">
                      <Control label="المخزون"><input name="stock" type="number" min="0" step="1" defaultValue={editing?.stock || 0} /></Control>
                      <Control label="SKU"><input name="sku" defaultValue={editing?.sku || ""} placeholder="GD-PLANT-001" /></Control>
                    </div>
                    <div className="two">
                      <Control label="حالة المنتج">
                        <select name="status" defaultValue={editing?.status || "active"}>
                          <option value="active">ظاهر في المتجر</option>
                          <option value="hidden">{t("hidden")}</option>
                        </select>
                      </Control>
                      <Control label="التقييم"><input name="rating" type="number" step="0.1" max="5" min="0" defaultValue={editing?.rating || 4.8} /></Control>
                    </div>
                  </div>

                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">🖼️</span> الخيارات والصورة</h3>
                    <div className="three">
                      <Control label="الشارة"><input name="tag" defaultValue={editing?.tag || "Rare"} /></Control>
                      <Control label="الأحجام العامة"><input name="sizes" defaultValue={Array.isArray(editing?.sizes) ? editing.sizes.join(",") : (editing?.sizes || "صغير,متوسط,كبير")} placeholder="صغير, متوسط, كبير" /></Control>
                      <Control label="الألوان العامة"><input name="colors" defaultValue={Array.isArray(editing?.colors) ? editing.colors.join(",") : (editing?.colors || "")} placeholder="أخضر, أبيض, أسود" /></Control>
                    </div>

                    <div className="product-options-mini-note">تم نقل إدارة خيارات المنتج إلى كرت مستقل ومرتب أعلى النموذج.</div>
                    <Control label="رابط الصورة"><input name="imageUrl" defaultValue={editing?.image || ""} onChange={e=>setImagePreview(e.target.value)} placeholder="ضع رابط صورة المنتج هنا" /></Control>
                    <Control label="أو ارفع صورة"><input name="imageFile" type="file" accept="image/*" onChange={async e=>{ const file=e.target.files[0]; if(file) setImagePreview(await fileToDataUrl(file, { maxWidth: 1100, maxHeight: 900, quality: 0.82 })); }} /></Control>
                    <Control label="رفع صور متعددة للمعرض">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => uploadGalleryImages(e.target.files)}
                      />
                    </Control>
                    {imagePreview && <div className="product-image-preview pro-preview compact-preview"><span>الصورة الأساسية</span><img src={imagePreview} alt="معاينة المنتج" loading="lazy" decoding="async" /></div>}
                  </div>

                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">⭐</span> منتجات مميزة</h3>
                    <p className="product-card-help">فعّل ظهور المنتج ضمن المنتجات البارزة في واجهة المتجر.</p>
                    <label className="feature-toggle compact-feature-toggle">
                      <input name="featured" type="checkbox" defaultChecked={editing?.featured || false} />
                      <span>منتج مميز في الواجهة</span>
                    </label>
                    <div className="product-card-note">يعتمد على نفس خيار المنتج المميز الحالي.</div>
                  </div>

                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">%</span> المنتجات بخصم</h3>
                    <p className="product-card-help">أي منتج له سعر قبل الخصم سيظهر كمنتج عليه عرض.</p>
                    <div className="two">
                      <Control label="السعر الحالي"><input name="priceDisplayOnly" type="text" value={editing?.price || ""} readOnly placeholder="من حقل السعر" /></Control>
                      <Control label="سعر قبل الخصم"><input name="oldPriceDisplayOnly" type="text" value={editing?.oldPrice || ""} readOnly placeholder="من حقل السعر قبل الخصم" /></Control>
                    </div>
                    <div className="product-card-note">عدّل الخصم من كرت السعر والمخزون.</div>
                  </div>

                  <div className="pro-form-section product-six-card">
                    <h3><span className="product-section-icon">🔎</span> SEO</h3>
                    <p className="product-card-help">تحسين تلقائي يعتمد على اسم المنتج والوصف والصورة.</p>
                    <div className="seo-preview-box">
                      <b>{editing?.name || "اسم المنتج"}</b>
                      <span>{editing?.description || "وصف المنتج يظهر هنا بعد الحفظ"}</span>
                    </div>
                    <div className="product-card-note">لا يغيّر بنية البيانات الحالية.</div>
                  </div>
                </div>

                {galleryImages.length > 0 && (
                  <div className="gallery-manager compact-gallery-manager">
                    <div className="gallery-manager-head">
                      <b>معرض الصور</b>
                      <small>{galleryImages.length} صورة</small>
                    </div>

                    <div className="gallery-grid">
                      {galleryImages.map((img, index) => (
                        <div className={`gallery-item ${imagePreview === img ? "primary" : ""}`} key={`${img}-${index}`}>
                          <img src={img} alt={`gallery-${index}`} loading="lazy" decoding="async" />
                          <div className="gallery-actions">
                            <button type="button" onClick={() => makeGalleryImagePrimary(img)}>أساسية</button>
                            <button type="button" className="danger" onClick={() => removeGalleryImage(index)}>{t("delete")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </form>

              <div className="admin-card product-live-preview-panel">
                <div className="product-live-preview-head">
                  <span>Live Preview</span>
                  <h3>معاينة المنتج</h3>
                </div>
                <div className="live-product-preview">
                  <div className="live-product-image">
                    {imagePreview ? (
                      <img src={imagePreview} alt="معاينة المنتج" loading="lazy" decoding="async" />
                    ) : (
                      <span>صورة المنتج</span>
                    )}
                  </div>
                  <div className="live-product-preview-body">
                    <b>{editing?.name || "اسم المنتج"}</b>
                    <small>{editing?.category || "القسم"}</small>
                    <strong>{editing?.price ? `${formatPrice(editing.price)} ر.س` : "السعر"}</strong>
                  </div>
                </div>
              </div>
            </div>

              <div className="product-modal-footer">
                <button type="button" className="admin-secondary" onClick={resetProductEditor}>{t("cancel")}</button>
                <div className="product-modal-footer-actions">
                  <button type="button" className="admin-secondary" onClick={() => setProductFormTab("info")}>مراجعة المعلومات</button>
                  <button type="submit" form="product-editor-form" className="admin-primary"><Save size={16}/> {editing ? "حفظ التعديل" : "حفظ وإضافة المنتج"}</button>
                </div>
              </div>

                </div>
              </div>
            )}

            <div className="admin-card products-manager pro-products-manager full-products-manager products-list-compact-final">
              <div className="pro-card-head products-manager-head">
                <div>
                  <span>Catalogue</span>
                  <h2>المنتجات المضافة</h2>
                  <small>{filteredAdminProducts.length} ظاهر من أصل {products.length} منتج</small>
                </div>

                <div className="products-head-actions">
                  <b className="products-count">{products.length} منتج</b>
                  {products.length > 0 && (
                    <button type="button" className="admin-danger-soft" onClick={deleteAllProducts}>
                      <Trash2 size={16}/> حذف كل المنتجات
                    </button>
                  )}
                </div>
              </div>

              <div className="products-best-sellers">
                <div>
                  <span>Best Sellers</span>
                  <h3>الأكثر مبيعًا</h3>
                </div>

                <div className="best-seller-mini-list">
                  {adminBestSellers.length ? adminBestSellers.map((item, index) => (
                    <div className="best-seller-mini" key={item.name}>
                      <b>#{index + 1}</b>
                      {item.image ? <img src={item.image} alt={item.name} loading="lazy" decoding="async" /> : <span className="best-seller-placeholder">🌿</span>}
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.qty} مبيع • {formatPrice(item.value)} ر.س</small>
                      </div>
                    </div>
                  )) : (
                    <p>{t("noSalesYet")}</p>
                  )}
                </div>
              </div>

              <div className="products-toolbar">
                <div className="products-search-box">
                  <Search size={17}/>
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="ابحث باسم المنتج، القسم، المورد أو SKU"
                  />
                </div>

                <select value={productStatusFilter} onChange={e => setProductStatusFilter(e.target.value)}>
                  <option value="all">{t("allProducts")}</option>
                  <option value="active">{t("visibleProducts")}</option>
                  <option value="hidden">المخفية</option>
                  <option value="featured">المميزة</option>
                  <option value="out">نفد المخزون</option>
                </select>

                <select value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)}>
                  {adminProductCategories.map(category => (
                    <option key={category} value={category}>{category === "all" ? "كل الأقسام" : category}</option>
                  ))}
                </select>

                <select value={productSort} onChange={e => setProductSort(e.target.value)}>
                  <option value="custom">الترتيب اليدوي</option>
                  <option value="newest">الأحدث</option>
                  <option value="price_high">السعر الأعلى</option>
                  <option value="price_low">السعر الأقل</option>
                  <option value="stock_low">المخزون الأقل</option>
                  <option value="name">الاسم</option>
                </select>
              </div>

              {products.length > 0 && (
                <div className="products-bulk-bar">
                  <label>
                    <input
                      type="checkbox"
                      checked={filteredAdminProducts.length > 0 && filteredAdminProducts.every(product => selectedProducts.includes(product.id))}
                      onChange={toggleAllVisibleProducts}
                    />
                    تحديد الظاهر
                  </label>

                  <span>{selectedProducts.length} محدد</span>

                  <div>
                    <button type="button" className="admin-secondary" disabled={!selectedProducts.length} onClick={() => bulkUpdateProducts({ status: "active" }, "تم إظهار المنتجات المحددة")}>إظهار</button>
                    <button type="button" className="admin-secondary" disabled={!selectedProducts.length} onClick={() => bulkUpdateProducts({ status: "hidden" }, "تم إخفاء المنتجات المحددة")}>إخفاء</button>
                    <button type="button" className="admin-danger-soft" disabled={!selectedProducts.length} onClick={deleteSelectedProducts}><Trash2 size={15}/> حذف المحدد</button>
                  </div>
                </div>
              )}

              <div className="admin-product-cards">
                {filteredAdminProducts.map(p => (
                  <div
                    className={`admin-product-card ${selectedProducts.includes(p.id) ? "selected" : ""} ${draggedProductId === p.id ? "dragging" : ""}`}
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggedProductId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { reorderProducts(draggedProductId, p.id); setDraggedProductId(null); }}
                    onDragEnd={() => setDraggedProductId(null)}
                  >
                    <label className="product-select-check">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => toggleProductSelection(p.id)}
                      />
                    </label>
                    <button type="button" className="product-drag-handle" title="اسحب لترتيب المنتج">↕</button>
                    <div className="admin-product-thumb">
                      <img src={p.image} alt={p.name || "منتج"} loading="lazy" decoding="async" />
                      <span className={p.status === "hidden" ? "status hidden" : "status active"}>
                        {p.status === "hidden" ? "مخفي" : "ظاهر"}
                      </span>
                    </div>

                    <div className="admin-product-info">
                      <div>
                        <small>{p.category}</small>
                        <h3>{p.name}</h3>
                        <div className="admin-product-badges">
                          <span>{p.category || "بدون قسم"}</span>
                          {p.featured && <span>مميز</span>}
                          {Array.isArray(p.options) && p.options.length > 0 && <span>{p.options.length} خيارات</span>}
                          {Array.isArray(p.gallery) && p.gallery.length > 1 && <span>{p.gallery.length} صور</span>}
                        </div>
                        <p>{p.description || p.brand}</p>
                      </div>

                      <div className="admin-product-meta">
                        <span>{formatPrice(p.price)} ر.س</span>
                        <span>المخزون: {p.stock ?? 0}</span>
                        {p.sku && <span>SKU: {p.sku}</span>}
                      </div>

                      <div className="quick-product-edit">
                        <label>
                          <span>السعر</span>
                          <input
                            type="number"
                            defaultValue={p.price || 0}
                            onBlur={e => quickUpdateProduct(p.id, { price: Number(e.target.value || 0), updatedAt: serverTimestamp() })}
                          />
                        </label>

                        <label>
                          <span>{t("inventory")}</span>
                          <input
                            type="number"
                            defaultValue={p.stock || 0}
                            onBlur={e => quickUpdateProduct(p.id, { stock: Number(e.target.value || 0), updatedAt: serverTimestamp() })}
                          />
                        </label>

                        <label>
                          <span>القسم</span>
                          <input
                            defaultValue={p.category || ""}
                            onBlur={e => quickUpdateProduct(p.id, { category: e.target.value.trim(), updatedAt: serverTimestamp() })}
                          />
                        </label>

                        <label>
                          <span>الحالة</span>
                          <select
                            defaultValue={p.status || "active"}
                            onChange={e => quickUpdateProduct(p.id, { status: e.target.value, updatedAt: serverTimestamp() })}
                          >
                            <option value="active">{t("visible")}</option>
                            <option value="hidden">{t("hidden")}</option>
                          </select>
                        </label>
                      </div>

                      {Array.isArray(p.options) && p.options.length > 0 && (
                        <div className="admin-product-options-list">
                          {p.options.slice(0, 4).map((option, index) => (
                            <span key={index}>
                              {[option.size, option.color].filter(Boolean).join(" / ") || "خيار"}
                              {option.stock !== "" && option.stock !== undefined ? ` • ${option.stock} مخزون` : ""}
                            </span>
                          ))}
                          {p.options.length > 4 && <span>+{p.options.length - 4}</span>}
                        </div>
                      )}

                      <div className="admin-product-actions">
                        <button onClick={()=>openProductEditor(p)}><Pencil size={16}/> تعديل كامل</button>
                        <button type="button" onClick={()=>duplicateProduct(p)}><Plus size={16}/> نسخ</button>
                        <button className="danger" onClick={()=>deleteDoc(doc(db, "products", p.id))}><Trash2 size={16}/> حذف</button>
                      </div>
                    </div>
                  </div>
                ))}

                {!filteredAdminProducts.length && (
                  <div className="products-empty-state">
                    <b>لا توجد منتجات مطابقة</b>
                    <span>جرّب تغيير البحث أو الفلتر.</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "homepage" && (
          <section className="homepage-admin-page">

            <div className="homepage-sections-list">
              {(selectedThemeSection ? [selectedThemeSection] : themeSections).map((section) => (
                <div key={section.id} className="homepage-section-row">
                  <div
                    className="section-header"
                    onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                  >
                    <div>
                      <span>{section.label}</span>
                      <small>{draftSettings[section.titleKey] || "اضغط للتعديل"}</small>
                    </div>
                    <b>{openSection === section.id ? "−" : "+"}</b>
                  </div>

                  {(openSection === section.id || selectedThemeSection?.id === section.id) && (
                    <div className={`section-form section-form-pro ${section.headerExtra ? "header-admin-clean-form" : ""} ${section.heroExtra ? "hero-admin-compact-form" : ""}`}>
                      <Control label="العنوان">
                        <input
                          value={draftSettings[section.titleKey] || ""}
                          onChange={e => updateDraft(section.titleKey, e.target.value)}
                          placeholder="عنوان القسم"
                        />
                      </Control>

                      {section.headerExtra && (
                        <>
                          <Control label="اللغة">
                            <select
                              value={draftSettings.homeHeaderLang || "AR"}
                              onChange={e => updateDraft("homeHeaderLang", e.target.value)}
                            >
                              <option value="AR">AR</option>
                              <option value="EN">EN</option>
                            </select>
                          </Control>

                          <div className="header-sticky-wrapper">
                            <span className="header-sticky-label">تثبيت الهيدر</span>
                            <label className="header-sticky-inline-control" aria-label="تثبيت الهيدر">
                              <input
                                type="checkbox"
                                checked={draftSettings.homeHeaderSticky !== false}
                                onChange={e => updateDraft("homeHeaderSticky", e.target.checked)}
                              />
                              <span>تثبيت الهيدر</span>
                            </label>
                          </div>
                        </>
                      )}


                      {!section.pagesExtra && !section.headerExtra && (
                        <Control label="الوصف">
                          <textarea
                            value={draftSettings[section.descKey] || ""}
                            onChange={e => updateDraft(section.descKey, e.target.value)}
                            placeholder="وصف القسم"
                          />
                        </Control>
                      )}

                      {section.heroExtra && (
                        <>
                          <div className="hero-admin-options-grid">
                            <Control label="شكل الهيرو">
                              <select
                                value={draftSettings.homeHeroLayout || "split"}
                                onChange={e => updateDraft("homeHeroLayout", e.target.value)}
                              >
                                <option value="video">فيديو بعرض الصفحة</option>
                                <option value="banner">بنر صورة بعرض الصفحة</option>
                                <option value="split">مقسم: بنر + صورة + نص</option>
                              </select>
                            </Control>

                            <Control label="نص الزر">
                              <input
                                value={draftSettings.homeHeroButton || ""}
                                onChange={e => updateDraft("homeHeroButton", e.target.value)}
                                placeholder="تسوق الآن"
                              />
                            </Control>

                            <Control label="رابط زر الهيرو">
                              <input
                                value={draftSettings.homeHeroButtonLink || "#products"}
                                onChange={e => updateDraft("homeHeroButtonLink", e.target.value)}
                                placeholder="#products أو /page/offers"
                              />
                            </Control>

                            {draftSettings.homeHeroLayout === "split" && (
                              <Control label="مكان الصورة الأمامية">
                                <select
                                  value={draftSettings.homeHeroImagePosition || "left"}
                                  onChange={e => updateDraft("homeHeroImagePosition", e.target.value)}
                                >
                                  <option value="left">يسار</option>
                                  <option value="right">يمين</option>
                                </select>
                              </Control>
                            )}
                          </div>

                          {draftSettings.homeHeroLayout === "video" && (
                            <div className="hero-admin-options-grid">
                              <Control label="رابط فيديو الهيرو">
                                <input
                                  value={draftSettings.homeHeroVideo || ""}
                                  onChange={e => updateDraft("homeHeroVideo", e.target.value)}
                                  placeholder="رابط MP4 أو رابط Google Drive"
                                />
                                <small className="hero-upload-note">يدعم Google Drive كرابط معاينة. للتشغيل الصامت التلقائي الأفضل استخدم رابط MP4 مباشر مثل Cloudinary.</small>
                              </Control>

                              <Control label="أو ارفع فيديو">
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/*"
                                  onChange={e => uploadSettingImage("homeHeroVideo", e.target.files[0])}
                                />
                                <small className="hero-upload-note">الرفع المباشر محدود بـ 750KB فقط. للأفضل استخدم رابط فيديو خارجي.</small>
                              </Control>
                            </div>
                          )}

                          {draftSettings.homeHeroLayout === "split" && (
                            <div className="hero-admin-bg-tools">
                              <Control label="رابط بنر الخلفية">
                                <input
                                  value={draftSettings.homeHeroBgImage || ""}
                                  onChange={e => updateDraft("homeHeroBgImage", e.target.value)}
                                  placeholder="https://..."
                                />
                              </Control>

                              <Control label="أو ارفع بنر الخلفية">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => uploadSettingImage("homeHeroBgImage", e.target.files[0])}
                                />
                              </Control>
                            </div>
                          )}
                        </>
                      )}

                      {!section.heroExtra && section.buttonKey && (
                        <Control label="نص الزر">
                          <input
                            value={draftSettings[section.buttonKey] || ""}
                            onChange={e => updateDraft(section.buttonKey, e.target.value)}
                            placeholder="تسوق الآن"
                          />
                        </Control>
                      )}

                      {section.imageKey && !(section.heroExtra && draftSettings.homeHeroLayout === "video") && (
                        <div className={`section-image-tools ${section.heroExtra ? "hero-admin-image-tools" : ""}`}>
                          <Control label="رابط الصورة">
                            <input
                              value={draftSettings[section.imageKey] || ""}
                              onChange={e => updateDraft(section.imageKey, e.target.value)}
                              placeholder="https://..."
                            />
                          </Control>

                          <Control label="أو ارفع صورة">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => uploadSettingImage(section.imageKey, e.target.files[0])}
                            />
                          </Control>


                        </div>
                      )}

                      {section.headerExtra && (
                        <div className="header-extra-tools">
                          <Control label="لون خلفية الهيدر">
                            <input
                              type="color"
                              value={draftSettings.homeHeaderBg || "#F5F1E8"}
                              onChange={e => updateDraft("homeHeaderBg", e.target.value)}
                            />
                          </Control>
                          <Control label="الشريط العلوي">
                            <input
                              value={draftSettings.homeHeaderTopBar || ""}
                              onChange={e => updateDraft("homeHeaderTopBar", e.target.value)}
                              placeholder="شحن سريع داخل السعودية 🚚"
                            />
                          </Control>
                          <Control label="لون الشريط العلوي">
                            <input
                              type="color"
                              value={draftSettings.homeTopBarBg || "#0F3D2E"}
                              onChange={e => updateDraft("homeTopBarBg", e.target.value)}
                            />
                          </Control>
                          <Control label="لون نص الشريط">
                            <input
                              type="color"
                              value={draftSettings.homeTopBarText || "#FFFFFF"}
                              onChange={e => updateDraft("homeTopBarText", e.target.value)}
                            />
                          </Control>
                          <div className="topbar-toggle-wrapper">
                            <span className="topbar-toggle-label">إظهار الشريط</span>
                            <label className="topbar-toggle-control" aria-label="إظهار الشريط العلوي">
                              <input
                                type="checkbox"
                                checked={draftSettings.homeTopBarEnabled !== false}
                                onChange={e => updateDraft("homeTopBarEnabled", e.target.checked)}
                              />
                              <span>إظهار الشريط</span>
                            </label>
                          </div>
</div>
                      )}

                      {section.pagesExtra && (
                        <div className="pages-admin-tools">

                          <div className="pages-admin-list">
                            {(draftSettings.homePages || []).map((page, pageIndex) => (
                              <div className="page-row-editor" key={pageIndex}>
                                <label className="page-visible-toggle">
                                  <input
                                    type="checkbox"
                                    checked={page.visible !== false}
                                    onChange={e => {
                                      const next = [...(draftSettings.homePages || [])];
                                      next[pageIndex] = { ...next[pageIndex], visible: e.target.checked };
                                      updateDraft("homePages", next);
                                    }}
                                  />
                                  <span>{page.visible === false ? "مخفي" : "ظاهر"}</span>
                                </label>

                                <input
                                  value={page.label || ""}
                                  onChange={e => {
                                    const next = [...(draftSettings.homePages || [])];
                                    next[pageIndex] = { ...next[pageIndex], label: e.target.value, visible: next[pageIndex]?.visible !== false };
                                    updateDraft("homePages", next);
                                  }}
                                  placeholder="اسم الصفحة"
                                />
                                <input
                                  value={page.href || ""}
                                  onChange={e => {
                                    const next = [...(draftSettings.homePages || [])];
                                    next[pageIndex] = { ...next[pageIndex], href: e.target.value, visible: next[pageIndex]?.visible !== false };
                                    updateDraft("homePages", next);
                                  }}
                                  placeholder="/page/products"
                                />
                                <button
                                  type="button"
                                  className="admin-secondary"
                                  onClick={() => {
                                    const next = [...(draftSettings.homePages || [])];
                                    next.splice(pageIndex, 1);
                                    updateDraft("homePages", next);
                                  }}
                                >
                                  حذف
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="admin-primary add-page-btn"
                            onClick={() => updateDraft("homePages", [
                              ...(draftSettings.homePages || []),
                              { label: "صفحة جديدة", href: "/page/new-page", visible: true }
                            ])}
                          >
                            إضافة صفحة
                          </button>
                        </div>
                      )}


                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="admin-card admin-placeholder-page">
            <div className="pro-card-head">
              <div>
                <span>Admin Users</span>
                <h2>المستخدمين</h2>
                <p>إدارة مستخدمي لوحة التحكم والصلاحيات ستضاف هنا.</p>
              </div>
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="admin-card admin-placeholder-page">
            <div className="pro-card-head">
              <div>
                <span>Store Settings</span>
                <h2>الإعدادات</h2>
                <p>إعدادات المتجر العامة وطرق التشغيل ستضاف هنا.</p>
              </div>
            </div>
          </section>
        )}

        {tab === "notifications" && (
          <section className="admin-card admin-placeholder-page">
            <div className="pro-card-head">
              <div>
                <span>Notifications Center</span>
                <h2>الإشعارات</h2>
                <p>إدارة تنبيهات الطلبات والعملاء والتحديثات ستضاف هنا.</p>
              </div>
            </div>
          </section>
        )}

        {tab === "customers" && <CustomersPanel customers={customers} orders={orders} />}
        {tab === "orders" && <OrdersPanel orders={orders} t={t} onNotice={(msg, ms = 3000) => { setNotice(msg); setTimeout(() => setNotice(""), ms); }} />}
      </main>
    </div>
  );
}


function LiveVisitorsModal({ visitors = [], onClose }) {
  const formatLiveTime = (value) => {
    const stamp = Number(value || 0);
    if (!stamp) return "غير معروف";
    const diff = Math.max(0, Math.round((Date.now() - stamp) / 1000));
    if (diff < 10) return "الآن";
    if (diff < 60) return `قبل ${diff} ثانية`;
    return `قبل ${Math.round(diff / 60)} دقيقة`;
  };

  const activeCartVisitors = visitors.filter(v => Number(v.cartCount || 0) > 0);
  const timezones = [...new Set(visitors.map(v => v.timezone).filter(Boolean))];

  return (
    <div className="live-modal-backdrop" onClick={onClose}>
      <div className="live-modal-card" onClick={e => e.stopPropagation()}>
        <div className="live-modal-head">
          <div>
            <span>Live Visitors</span>
            <h2>الزوار المباشرون</h2>
            <p>متابعة الزوار النشطين خلال آخر دقيقة، بدون تخزين بيانات شخصية حساسة.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="live-modal-summary">
          <div><b>{visitors.length}</b><span>زائر نشط</span></div>
          <div><b>{activeCartVisitors.length}</b><span>لديهم منتجات بالسلة</span></div>
          <div><b>{timezones.length || 1}</b><span>منطقة زمنية</span></div>
        </div>

        <div className="live-modal-map real-map-layout">
          <div className="live-real-map-card">
            {(() => {
              const located = visitors.filter(v => Number(v.latitude || 0) && Number(v.longitude || 0));
              const center = located[0];
              const lat = Number(center?.latitude || 24.7136);
              const lon = Number(center?.longitude || 46.6753);
              const bbox = `${lon - 8},${lat - 5},${lon + 8},${lat + 5}`;
              const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

              return (
                <>
                  <iframe
                    title="خريطة الزوار المباشرين"
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="live-real-map-note">
                    <b>خريطة فعلية تقريبية</b>
                    <span>تعتمد على IP الزائر، لذلك الموقع تقريبي وليس عنوانًا دقيقًا.</span>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="live-zone-list">
            <h3>أماكن تواجد الزوار</h3>
            {visitors.length ? visitors.map((visitor, index) => (
              <div key={visitor.id}>
                <span>{visitor.city || visitor.country ? `${visitor.city || "مدينة غير معروفة"}${visitor.country ? `، ${visitor.country}` : ""}` : visitor.timezone || "موقع غير معروف"}</span>
                <b>#{index + 1}</b>
              </div>
            )) : (
              <p>لا توجد بيانات موقع بعد</p>
            )}
          </div>
        </div>

        <div className="live-visitors-table">
          <div className="live-table-head">
            <span>الزائر</span>
            <span>آخر صفحة</span>
            <span>السلة</span>
            <span>آخر نشاط</span>
            <span>آخر ظهور</span>
          </div>

          {visitors.length ? visitors.map((visitor, index) => (
            <div className="live-table-row" key={visitor.id}>
              <span>زائر #{index + 1}</span>
              <span>{visitor.path || "/"}</span>
              <span>{visitor.city || visitor.country ? `${visitor.city || ""} ${visitor.country || ""}` : `${Number(visitor.cartCount || 0)} منتج`}</span>
              <span>{visitor.lastAction || "يتصفح المتجر"} • {visitor.source || "مباشر"}</span>
              <span>{formatLiveTime(visitor.lastSeen)} • {formatDuration(visitor.sessionDuration)}</span>
            </div>
          )) : (
            <div className="live-empty">لا يوجد زوار نشطون الآن</div>
          )}
        </div>
      </div>
    </div>
  );
}


function CustomersPanel({ customers, orders }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(c => {
    const text = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.city || ""} ${c.address || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const selectedOrders = selected ? orders.filter(o => o.customerId === selected.id || o.customerEmail === selected.email) : [];

  return (
    <section className="customers-pro-page">
      <div className="admin-card customers-pro-hero">
        <div>
          <span>Customers CRM</span>
          <h2>إدارة العملاء</h2>
          <p>استعرض بيانات العملاء المسجلين وابحث بسرعة بالاسم أو الإيميل أو الجوال أو المدينة.</p>
        </div>

        <div className="customers-pro-stats">
          <div><b>{customers.length}</b><small>إجمالي العملاء</small></div>
          <div><b>{filteredCustomers.length}</b><small>نتائج البحث</small></div>
        </div>
      </div>

      <div className="admin-card customers-pro-search">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن عميل..."
        />
        {search && <button className="admin-secondary" onClick={() => setSearch("")}>مسح البحث</button>}
      </div>

      <div className="customers-pro-layout">
        <div className="admin-card customers-pro-list">
          <div className="pro-card-head">
            <div>
              <span>Customer List</span>
              <h2>قائمة العملاء</h2>
            </div>
            <b className="products-count">{filteredCustomers.length} عميل</b>
          </div>

          <div className="customers-pro-grid">
            {filteredCustomers.map(c => (
              <button
                className={`customer-pro-card ${selected?.id === c.id ? "selected" : ""}`}
                key={c.id}
                onClick={() => setSelected(c)}
              >
                <div className="customer-pro-avatar">{(c.name || c.email || "?")[0]}</div>
                <div className="customer-pro-info">
                  <b>{c.name || "عميل بدون اسم"}</b>
                  <span>{c.email || "لا يوجد إيميل"}</span>
                  <em>{c.phone || "لا يوجد رقم"}</em>
                </div>
                <small>{c.city || "غير محدد"}</small>
              </button>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="empty-state">لا يوجد عملاء مطابقين للبحث</div>
            )}
          </div>
        </div>

        <div className="admin-card customers-pro-details">
          {!selected ? (
            <div className="customer-pro-empty">
              <div className="customer-pro-avatar large">👤</div>
              <h2>اختر عميلًا</h2>
              <p>اضغط على أي عميل من القائمة لعرض بياناته هنا.</p>
            </div>
          ) : (
            <>
              <div className="customer-details-head">
                <div className="customer-pro-avatar large">{(selected.name || selected.email || "?")[0]}</div>
                <div>
                  <span>Customer Details</span>
                  <h2>{selected.name || "عميل بدون اسم"}</h2>
                  <p>{selected.email || "لا يوجد إيميل"}</p>
                </div>
              </div>

              <div className="customer-detail-grid-pro">
                <div><span>الجوال</span><b>{selected.phone || "غير متوفر"}</b></div>
                <div><span>المدينة</span><b>{selected.city || "غير محدد"}</b></div>
                <div className="wide"><span>العنوان</span><b>{selected.address || "غير متوفر"}</b></div>
                <div><span>عدد الطلبات</span><b>{selectedOrders.length}</b></div>
                <div><span>الحالة</span><b>مسجل</b></div>
              </div>

              <div className="customer-orders-preview">
                <h3>طلبات العميل</h3>
                {selectedOrders.length ? selectedOrders.map(o => (
                  <div className="mini-order" key={o.id}>{formatPrice(o.total)} ر.س • {o.status}</div>
                )) : <p className="muted">لا توجد طلبات بعد.</p>}
              </div>

              <div className="customer-detail-actions-pro">
                <button className="admin-secondary" onClick={() => setSelected(null)}>إغلاق التفاصيل</button>
                <button
                  className="danger-action"
                  onClick={async () => {
                    if (confirm("هل تريد حذف هذا العميل من قائمة العملاء؟")) {
                      await deleteDoc(doc(db, "customers", selected.id));
                      setSelected(null);
                    }
                  }}
                >
                  حذف العميل
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function OrdersPanel({ orders, onNotice, t = (key) => key }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const statusLabels = {
    new: "جديد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  const statusOptions = [
    { value: "all", label: "كل الطلبات" },
    { value: "new", label: "جديد" },
    { value: "processing", label: "قيد التجهيز" },
    { value: "shipped", label: "تم الشحن" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" }
  ];

  const normalizedOrders = orders.map(o => ({
    ...o,
    status: o.status || "new",
    total: Number(o.total || 0),
    items: o.items || []
  })).sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));

  const isWithinDate = (order) => {
    if (dateFilter === "all") return true;

    const time = orderTimestamp(order.createdAt);
    if (!time) return false;

    const orderDate = new Date(time);
    const now = new Date();

    if (dateFilter === "today") {
      return orderDate.toDateString() === now.toDateString();
    }

    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo;
    }

    if (dateFilter === "month") {
      return orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear();
    }

    return true;
  };

  const filteredOrders = normalizedOrders.filter(o => {
    const statusOk = statusFilter === "all" || o.status === statusFilter;
    const text = `${o.name || ""} ${o.customerName || ""} ${o.email || ""} ${o.customerEmail || ""} ${o.phone || ""} ${o.city || ""} ${o.id || ""}`.toLowerCase();
    return statusOk && isWithinDate(o) && text.includes(search.toLowerCase());
  });

  const totals = normalizedOrders.reduce((acc, o) => {
    acc.count += 1;
    acc.value += o.total;
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, { count: 0, value: 0 });

  const updateShippingInfo = async (orderId, patch) => {
    await setDoc(doc(db, "orders", orderId), {
      ...patch,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const updateOrderStatus = async (orderId, status) => {
    await setDoc(doc(db, "orders", orderId), { status, updatedAt: serverTimestamp() }, { merge: true });

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const sent = await sendOrderStatusEmail({ ...order, id: orderId }, status);
      onNotice?.(sent ? "تم تحديث حالة الطلب وإرسال إيميل للعميل" : "تم تحديث حالة الطلب، لكن لم يتم إرسال الإيميل", 3500);
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm("هل تريد حذف هذا الطلب؟")) {
      await deleteDoc(doc(db, "orders", orderId));
    }
  };

  const exportOrdersCsv = () => {
    const headers = ["order_id", "customer", "email", "phone", "city", "status", "total", "coupon", "created_at", "shipping_company", "tracking_number"];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredOrders.map(order => [
      order.id,
      order.name || order.customerName || "",
      order.email || order.customerEmail || "",
      order.phone || "",
      order.city || "",
      statusLabels[order.status] || order.status,
      order.total,
      order.couponCode || "",
      formatOrderDate(order.createdAt),
      order.shippingCompany === "other" ? order.customShipping : order.shippingCompany,
      order.trackingNumber || ""
    ]);

    const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `green-dixam-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice?.("تم تصدير الطلبات الحالية", 2200);
  };

  return (
    <section className="orders-pro-page">
      <div className="admin-card orders-pro-hero">
        <div>
          <span>Orders Management</span>
          <h2>إدارة الطلبات</h2>
          <p>تابع الطلبات، حدث حالتها، وابحث عن طلبات العملاء بسرعة.</p>
        </div>

        <div className="orders-pro-stats">
          <div><b>{totals.count}</b><small>طلب</small></div>
          <div><b>{formatPrice(totals.value)}</b><small>{t("totalSales")}</small></div>
          <div><b>{totals.new || 0}</b><small>طلبات جديدة</small></div>
        </div>
      </div>

      <div className="admin-card orders-toolbar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل، الإيميل، الجوال، المدينة..."
        />

        <button type="button" className="admin-secondary export-orders-btn" onClick={exportOrdersCsv}>
          <Download size={16}/> تصدير النتائج
        </button>

        <div className="orders-date-filters">
          <button className={dateFilter === "all" ? "active" : ""} onClick={() => setDateFilter("all")}>الكل</button>
          <button className={dateFilter === "today" ? "active" : ""} onClick={() => setDateFilter("today")}>اليوم</button>
          <button className={dateFilter === "week" ? "active" : ""} onClick={() => setDateFilter("week")}>الأسبوع</button>
          <button className={dateFilter === "month" ? "active" : ""} onClick={() => setDateFilter("month")}>الشهر</button>
        </div>

        <div className="orders-filter-tabs">
          {statusOptions.map(s => (
            <button
              key={s.value}
              className={statusFilter === s.value ? "active" : ""}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-pro-grid">
        {filteredOrders.map(order => (
          <div className="order-pro-card" key={order.id}>
            <div className="order-pro-head">
              <div>
                <span>#{String(order.id).slice(0, 8)}</span>
                <h3>{order.name || order.customerName || "طلب عميل"}</h3>
                <p>{order.email || order.customerEmail || ""}</p>
              </div>

              <em className={`order-status ${order.status}`}>
                {statusLabels[order.status] || order.status}
              </em>
            </div>

            <div className="order-pro-info">
              <div><span>الجوال</span><b>{order.phone || "غير متوفر"}</b></div>
              <div><span>المدينة</span><b>{order.city || "غير محدد"}</b></div>
              <div><span>الإجمالي</span><b>{formatPrice(order.total)} ر.س</b></div>
              <div><span>الكوبون</span><b>{order.couponCode ? `${order.couponCode} (${order.couponPercent || 0}%)` : "لا يوجد"}</b></div>
              <div><span>عدد المنتجات</span><b>{order.items.length}</b></div>
              <div className="wide"><span>تاريخ الطلب</span><b>{formatOrderDate(order.createdAt)}</b></div>
            </div>

            {order.address && (
              <div className="order-address">
                <span>العنوان</span>
                <b>{order.address}</b>
              </div>
            )}

            <div className="order-items-pro">
              {order.items.slice(0, 4).map((item, index) => (
                <div key={index}>
                  {item.image && <img src={item.image} alt={item.name || "منتج"} loading="lazy" decoding="async" />}
                  <span>{item.name}</span>
                  <b>{item.qty || 1}x</b>
                </div>
              ))}
              {order.items.length > 4 && <small>+{order.items.length - 4} منتجات أخرى</small>}
            </div>

            <div className="order-shipping-box">
              <div className="shipping-head">
                <span>بيانات الشحن</span>
                <b>{order.shippingCompany === "other" ? (order.customShipping || "أخرى") : (order.shippingCompany || "لم يتم التحديد")}</b>
              </div>

              <div className="shipping-fields-grid">
                <select
                  value={order.shippingCompany || ""}
                  onChange={e => updateShippingInfo(order.id, { shippingCompany: e.target.value })}
                >
                  <option value="">اختر شركة الشحن</option>
                  <option value="Aramex">Aramex</option>
                  <option value="SMSA">SMSA</option>
                  <option value="DHL">DHL</option>
                  <option value="FedEx">FedEx</option>
                  <option value="other">أخرى</option>
                </select>

                <input
                  placeholder="رقم التتبع"
                  value={order.trackingNumber || ""}
                  onChange={e => updateShippingInfo(order.id, { trackingNumber: e.target.value })}
                />
              </div>

              {order.shippingCompany === "other" && (
                <input
                  className="custom-shipping-input"
                  placeholder="اكتب اسم شركة الشحن"
                  value={order.customShipping || ""}
                  onChange={e => updateShippingInfo(order.id, { customShipping: e.target.value })}
                />
              )}
            </div>

            {order.trackingNumber && (
              <a
                className="tracking-link-admin"
                href={getTrackingUrl(order.shippingCompany, order.trackingNumber, order.customShipping)}
                target="_blank"
                rel="noreferrer"
              >
                فتح تتبع الشحنة
              </a>
            )}

            <div className="order-actions-pro">
              <button type="button" className="admin-secondary order-details-btn" onClick={() => setSelectedOrder(order)}>تفاصيل</button>
              <select
                value={order.status}
                onChange={e => updateOrderStatus(order.id, e.target.value)}
              >
                <option value="new">جديد</option>
                <option value="processing">قيد التجهيز</option>
                <option value="shipped">تم الشحن</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>

              <button className="danger-action" onClick={() => deleteOrder(order.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="admin-card empty-orders-pro">
            لا توجد طلبات مطابقة
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-head">
              <div>
                <span>Order Details</span>
                <h2>تفاصيل الطلب</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>×</button>
            </div>

            <div className="order-modal-info">
              <div><span>رقم الطلب</span><b>#{String(selectedOrder.id || "").slice(0, 10)}</b></div>
              <div><span>الحالة</span><b>{selectedOrder.status || "new"}</b></div>
              <div><span>العميل</span><b>{selectedOrder.name || selectedOrder.customerName || "غير محدد"}</b></div>
              <div><span>الجوال</span><b>{selectedOrder.phone || "غير متوفر"}</b></div>
              <div><span>الإيميل</span><b>{selectedOrder.email || selectedOrder.customerEmail || "غير متوفر"}</b></div>
              <div><span>الكوبون</span><b>{selectedOrder.couponCode ? `${selectedOrder.couponCode} (${selectedOrder.couponPercent || 0}%)` : "لا يوجد"}</b></div>
              <div><span>الخصم</span><b>{formatPrice(Number(selectedOrder.discount || 0))} ر.س</b></div>
              <div><span>الإجمالي</span><b>{formatPrice(Number(selectedOrder.total || 0))} ر.س</b></div>
              <div><span>تاريخ الطلب</span><b>{formatOrderDate(selectedOrder.createdAt)}</b></div>
              <div className="wide"><span>العنوان</span><b>{selectedOrder.address || "غير متوفر"}</b></div>
            </div>

            <div className="order-modal-products">
              <h3>{t("products")}</h3>
              {(selectedOrder.items || []).length ? (
                (selectedOrder.items || []).map((item, i) => (
                  <div className="order-modal-item" key={i}>
                    {item.image ? <img src={item.image} alt={item.name || "product"} loading="lazy" decoding="async" /> : <div className="order-modal-no-img">🌿</div>}
                    <div>
                      <b>{item.name || "منتج"}</b>
                      <span>{item.selectedSize || item.size || item.category || ""}</span>
                    </div>
                    <em>{item.qty || 1}x</em>
                  </div>
                ))
              ) : (
                <p className="order-modal-empty">لا توجد منتجات داخل هذا الطلب.</p>
              )}
            </div>

            <button type="button" className="admin-primary modal-close-main" onClick={() => setSelectedOrder(null)}>
              إغلاق
            </button>
          </div>
        </div>
      )}

</section>
  );
}


function Control({label, children}) {
  return <label className="control"><span>{label}</span>{children}</label>;
}
function Stat({label, value}) {
  return <div className="stat"><span>{label}</span><b>{value}</b></div>;
}
function titleFor(tab, lang = "ar") {
  const titles = {
    ar: {
      dashboard:"الرئيسية",
      reports:"التقارير",
      identity:"هوية المتجر",
      products:"إدارة المنتجات",
      customers:"العملاء",
      orders:"الطلبات",
      coupons:"الكوبونات",
      users:"المستخدمين",
      settings:"الإعدادات",
      notifications:"الإشعارات",
      homepage:"ثيم المتجر"
    },
    en: {
      dashboard:"Home",
      reports:"Reports",
      identity:"Store identity",
      products:"Product management",
      customers:"Customers",
      orders:"Orders",
      coupons:"Coupons",
      users:"Users",
      settings:"Settings",
      notifications:"Notifications",
      homepage:"Store theme"
    }
  };
  return (titles[lang] || titles.ar)[tab] || tab;
}
