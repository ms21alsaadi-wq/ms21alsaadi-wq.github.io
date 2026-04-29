import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Search, Heart, Star, Truck, ShieldCheck, RotateCcw, X, Plus, Minus,
  Trash2, LayoutDashboard, Palette, PackagePlus, Image as ImageIcon, LogOut, Pencil,
  Save, Eye, Users, Lock, Mail, Settings, RotateCw, User, MapPin, Phone, Home,
  ClipboardList
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
  addDoc, query, orderBy
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import * as XLSX from "xlsx";

const STORE_WHATSAPP = "966508983003";

const defaultSettings = {
  storeName: "GREEN DIXAM",
  tagline: "rare nature, refined living",
  heroTitle: "Rare Nature, Refined Living",
  heroSubtitle: "مجموعة نباتات نادرة وأصص فاخرة وإكسسوارات عناية مستوحاة من جمال سقطرى، مصممة لمساحات هادئة وراقية.",
  primaryColor: "#0F3D2E",
  accentColor: "#C2A968",
  backgroundColor: "#F5F1E8",
  cardColor: "#FFFFFF",
  fontFamily: "Cairo",
  logo: "",
  heroImage: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80",
  heroHeight: 520,
  bannerTitle: "Inspired by Socotra",
  bannerSubtitle: "نباتات نادرة، هدايا فاخرة، وأصص مصممة لأسلوب حياة هادئ وخالد.",
  bannerImage: "",
  productImageHeight: 280
};

const defaultProducts = [
  { id: "1", name: "شجرة دم الأخوين المصغرة", brand: "Socotra Inspired", category: "نباتات نادرة", price: 299, oldPrice: 349, rating: 4.9, sizes: "صغير,متوسط", tag: "Rare", image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80" },
  { id: "2", name: "مونستيرا فاخرة", brand: "Monstera", category: "نباتات داخلية", price: 189, oldPrice: 239, rating: 4.9, sizes: "متوسط,كبير", tag: "Luxury", image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1200&q=80" },
  { id: "3", name: "زاميا كلاسيكية", brand: "ZZ Plant", category: "سهلة العناية", price: 139, oldPrice: 169, rating: 4.8, sizes: "صغير,متوسط,كبير", tag: "Organic", image: "https://images.unsplash.com/photo-1593482892290-f54927ae2b65?auto=format&fit=crop&w=1200&q=80" },
  { id: "4", name: "سانسيفيريا ذهبية", brand: "Sansevieria", category: "تنقية الهواء", price: 129, oldPrice: 159, rating: 4.8, sizes: "صغير,متوسط", tag: "Timeless", image: "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?auto=format&fit=crop&w=1200&q=80" },
  { id: "5", name: "فيكس ليراتا كبير", brand: "Fiddle Leaf Fig", category: "نباتات فاخرة", price: 269, oldPrice: 329, rating: 4.9, sizes: "كبير", tag: "Exclusive", image: "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?auto=format&fit=crop&w=1200&q=80" },
  { id: "6", name: "كالاثيا أوربيفوليا", brand: "Calathea", category: "نباتات داخلية", price: 169, oldPrice: 209, rating: 4.7, sizes: "متوسط", tag: "Refined", image: "https://images.unsplash.com/photo-1616500163718-4f8e4dc7598f?auto=format&fit=crop&w=1200&q=80" },
  { id: "7", name: "أصيص سيراميك ذهبي", brand: "Golden Ceramic", category: "أصص فاخرة", price: 89, oldPrice: 119, rating: 4.8, sizes: "S,M,L", tag: "Gold", image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80" },
  { id: "8", name: "مجموعة عناية راقية", brand: "Plant Rare", category: "العناية", price: 99, oldPrice: 129, rating: 4.8, sizes: "مجموعة كاملة", tag: "Rare", image: "https://images.unsplash.com/photo-1615218287208-84135e0c4f08?auto=format&fit=crop&w=1200&q=80" }
];

const palettes = [
  { name: "هدايا خضراء Black Gold", primaryColor: "#0F3D2E", accentColor: "#C2A968", backgroundColor: "#F5F1E8", cardColor: "#FFFFFF" },
  { name: "Navy Silver", primaryColor: "#0f172a", accentColor: "#c0c7d1", backgroundColor: "#f4f7fb", cardColor: "#FFFFFF" },
  { name: "Coffee Cream", primaryColor: "#3b2f2f", accentColor: "#c8a46a", backgroundColor: "#f7efe5", cardColor: "#fffaf4" },
  { name: "Sport Red", primaryColor: "#111827", accentColor: "#ef4444", backgroundColor: "#f8fafc", cardColor: "#FFFFFF" }
];

function formatPrice(value) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
}

function formatOrderDate(value) {
  if (!value) return "غير متوفر";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function orderTimestamp(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
function sizesArray(sizes) {
  return String(sizes || "").split(",").map(s => s.trim()).filter(Boolean);
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
function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function firebaseError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential")) return "بيانات الدخول غير صحيحة";
  if (code.includes("email-already-in-use")) return "الإيميل مستخدم مسبقاً";
  if (code.includes("weak-password")) return "كلمة المرور ضعيفة";
  if (code.includes("operation-not-allowed")) return "فعّل طريقة الدخول من Firebase Authentication";
  return err?.message || "حدث خطأ غير معروف";
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
        for (const p of defaultProducts) await setDoc(doc(db, "products", p.id), p);
      } else {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {
      onSnapshot(collection(db, "orders"), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => {
      unsubSettings(); unsubProducts(); unsubCustomers(); unsubOrders();
    };
  }, []);

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
      go={go}
      path={path}
    />
  );
}

function AdminLogin({ go, settings }) {
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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "admins", cred.user.uid), {
          email,
          role: "Owner",
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      setMessage(firebaseError(err));
    }
  }

  return (
    <AuthShell settings={settings} title={mode === "login" ? "دخول لوحة التحكم" : "إنشاء أول أدمن"} subtitle="لوحة التحكم مخصصة لإدارة المنتجات والعملاء والطلبات.">
      <form onSubmit={submit} className="login-form">
        <label><span><Mail size={16}/> الإيميل</span><input name="email" type="email" required /></label>
        <label><span><Lock size={16}/> كلمة المرور</span><input name="password" type="password" required minLength="6" /></label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary">{mode === "login" ? "دخول" : "إنشاء أدمن"}</button>
        <button type="button" className="admin-secondary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "أول مرة؟ أنشئ أدمن" : "عندي حساب"}
        </button>
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
          {settings?.logo ? <img src={settings.logo} alt="logo" /> : <span>{settings?.storeName || "GREEN DIXAM"}</span>}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function Store({ settings, products, authUser, customer, setCustomer, go, path }) {
  if (path.startsWith("/login")) return <CustomerAuth go={go} settings={settings} />;
  if (path.startsWith("/account")) return authUser ? <Account customer={customer} setCustomer={setCustomer} go={go} settings={settings} /> : <CustomerAuth go={go} settings={settings} />;

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

  const brands = ["All", ...new Set(products.map(p => p.brand).filter(Boolean))];
  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = useMemo(() => products.filter(p => (p.status || "active") !== "hidden").filter(p => {
    const q = queryText.toLowerCase().trim();
    return (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
      (brand === "All" || p.brand === brand) &&
      (category === "All" || p.category === category);
  }), [products, queryText, brand, category]);

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = cart.reduce((n, i) => n + i.qty * Number(i.price || 0), 0);
  const total = subtotal + (subtotal ? 35 : 0);

  function addToCart(product) {
    const size = selectedSize[product.id] || sizesArray(product.sizes)[0] || "Free";
    setCart(prev => {
      const found = prev.find(i => i.id === product.id && i.size === size);
      if (found) return prev.map(i => i.id === product.id && i.size === size ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, size, qty: 1 }];
    });
    setCartOpen(true);
  }

  async function checkoutWhatsApp() {
    if (!authUser) {
      alert("سجل دخولك كعميل أولاً لإتمام الطلب");
      go("/login");
      return;
    }
    if (!customer?.name || !customer?.phone || !customer?.city || !customer?.address) {
      alert("أكمل بيانات حسابك أولاً: الاسم، الجوال، المدينة، العنوان");
      go("/account");
      return;
    }
    if (!cart.length) return;

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
      total,
      status: "new",
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "orders"), order);
    await setDoc(doc(db, "customers", authUser.uid), {
      ...customer,
      ordersCount: Number(customer.ordersCount || 0) + 1,
      lastOrderAt: serverTimestamp()
    }, { merge: true });

    const items = cart.map((item) => `• ${item.name}\nالالحجم: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`).join("\n\n");
    const message = `🛒 طلب جديد من المتجر:\n\n👤 العميل: ${customer.name}\n📱 الجوال: ${customer.phone}\n📧 الإيميل: ${customer.email || authUser.email}\n📍 المدينة: ${customer.city}\n🏠 العنوان: ${customer.address}\n\n${items}\n\n💰 الإجمالي: ${formatPrice(total)} ر.س\n\n📦 الرجاء تأكيد الطلب`;
    window.open(`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
    setCart([]);
    setCartOpen(false);
  }

  const theme = {
    "--primary": settings.primaryColor,
    "--accent": settings.accentColor,
    "--bg": settings.backgroundColor,
    "--card": settings.cardColor,
    "--font": `"${settings.fontFamily}", system-ui, sans-serif`,
    "--hero-h": `${settings.heroHeight}px`,
    "--product-h": `${settings.productImageHeight}px`
  };

  return (
    <div className="store" style={theme} dir="rtl">
      <header className="store-header">
        <div className="container luxe-nav">
          <div className="luxe-nav-right">
            <button className="luxe-logo" onClick={() => go("/")}>
              {settings.logo ? <img src={settings.logo} alt="logo" /> : <b>{settings.storeName}</b>}
              <span>{settings.tagline}</span>
            </button>
          </div>

          <nav className="luxe-nav-center">
            <a href="#products">النباتات</a>
            <a href="#products">العروض</a>
            <a href="#community">دليل العناية</a>
          </nav>

          <div className="luxe-nav-left">
            <button
              className="luxe-icon-btn"
              aria-label="حسابي"
              onClick={() => go(authUser ? "/account" : "/login")}
              title={authUser ? "حسابي" : "دخول العميل"}
            >
              👤
            </button>

            <button
              className="luxe-cart-icon"
              aria-label="السلة"
              onClick={() => setCartOpen(true)}
              title="السلة"
            >
              🛒
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <section className="container hero">
        <div className="hero-copy">
          <div className="pill">Rare Nature Boutique</div>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroSubtitle}</p>
          <div className="hero-actions">
            <a href="#products" className="primary">تسوق الآن</a>
            <button className="secondary" onClick={() => go(authUser ? "/account" : "/login")}>حساب العميل</button>
          </div>
          <div className="stats">
            <div><b>{products.length}+</b><span>منتجات</span></div>
            <div><b>24H</b><span>تغليف فاخر</span></div>
            <div><b>Rare</b><span>حسابات عملاء</span></div>
          </div>
        </div>
        <div className="hero-image"><img src={settings.heroImage} alt="hero" /></div>
      </section>

      <section className="container feature-grid">
        <Feature icon={<Truck/>} title="توصيل سريع" text="تغليف فاخر للنباتات مع تغليف يحافظ عليها." />
        <Feature icon={<ShieldCheck/>} title="حسابات عملاء" text="حساب العميل يحفظ بياناته وطلباته لتجربة أسهل." />
        <Feature icon={<RotateCcw/>} title="طلبات منظمة" text="كل طلب محفوظ ومنظم داخل لوحة التحكم." />
      </section>

      <section className="container plant-categories">
        <div className="section-title">
          <span>Brand Essence</span>
          <h2>اختر طابعك الأخضر</h2>
        </div>
        <div className="plant-category-grid">
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80" alt="نباتات داخلية" />
            <div><b>نباتات داخلية</b><span>نباتات راقية للمنازل والمكاتب</span></div>
          </a>
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80" alt="نباتات سهلة العناية" />
            <div><b>سهلة العناية</b><span>اختيارات هادئة وسهلة العناية</span></div>
          </a>
          <a href="#products" className="plant-category-card">
            <img src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80" alt="أصص وإكسسوارات" />
            <div><b>أصص وإكسسوارات</b><span>أصص وإكسسوارات بطابع فاخر</span></div>
          </a>
        </div>
      </section>

      <section className="container care-strip">
        <div>
          <span>Refined Rare</span>
          <h2>عناية هادئة لنباتات تدوم</h2>
        </div>
        <div className="care-items">
          <div><b>01</b><span>اختر الإضاءة المناسبة</span></div>
          <div><b>02</b><span>اسقِ النبات بانتظام بدون إفراط</span></div>
          <div><b>03</b><span>استخدم أصيص بتصريف جيد</span></div>
        </div>
      </section>

      <section className="container promo" style={{ backgroundImage: settings.bannerImage ? `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${settings.bannerImage})` : undefined }}>
        <div><span>Exclusive Campaign</span><h2>{settings.bannerTitle}</h2><p>{settings.bannerSubtitle}</p></div>
      </section>

      <section className="container filters">
        <div className="search-box"><Search size={18}/><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="ابحث عن منتج أو براند..." /></div>
        <select value={brand} onChange={e=>setBrand(e.target.value)}>{brands.map(b => <option key={b} value={b}>{b==="All"?"كل النوع/الموردات":b}</option>)}</select>
        <select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c==="All"?"كل النباتات":c}</option>)}</select>
      </section>

      <section id="products" className="container product-section">
        <div className="section-title"><span>Rare Catalogue</span><h2>نباتات نادرة ومنتجات فاخرة مختارة بعناية</h2></div>
        <div className="products-grid">
          {filtered.map(p => {
            const sizes = sizesArray(p.sizes);
            return (
              <article className="product" key={p.id}>
                <div className="product-img">
                  <img src={p.image} alt={p.name} />
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
                    <img src={item.image} />
                    <div>
                      <b>{item.name}</b><span>الحجم: {item.size}</span><span>{formatPrice(item.price)} ر.س</span>
                      <div className="qty"><button onClick={() => setCart(c => c.map((x,idx)=>idx===i?{...x, qty: Math.max(1,x.qty-1)}:x))}><Minus size={14}/></button><b>{item.qty}</b><button onClick={() => setCart(c => c.map((x,idx)=>idx===i?{...x, qty:x.qty+1}:x))}><Plus size={14}/></button><button onClick={() => setCart(c => c.filter((_,idx)=>idx!==i))}><Trash2 size={14}/></button></div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="cart-foot"><p><span>الإجمالي</span><b>{formatPrice(total)} ر.س</b></p><button onClick={checkoutWhatsApp}>إتمام الطلب عبر واتساب</button></div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Account({ customer, setCustomer, go, settings }) {
  const [message, setMessage] = useState("");

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
  }

  return (
    <div className="store account-page" dir="rtl">
      <header className="store-header">
        <div className="container luxe-nav account-nav">
          <button className="luxe-logo" onClick={() => go("/")}>
            {settings?.logo ? <img src={settings.logo} alt="logo" /> : <b>حسابي</b>}
            <span>Customer Profile</span>
          </button>
          <nav className="luxe-nav-center">
            <button onClick={() => go("/")}>المتجر</button>
            <button onClick={() => signOut(auth)}>تسجيل خروج</button>
          </nav>
        </div>
      </header>
      <main className="container account-wrap">
        <div className="account-card">
          <h1>بيانات العميل</h1>
          <p>أكمل بياناتك حتى نستخدمها تلقائياً عند إتمام الطلب.</p>
          {message && <div className="notice">{message}</div>}
          <form onSubmit={saveProfile} className="profile-form">
            <label><span><User/> الاسم</span><input name="name" defaultValue={customer?.name || auth.currentUser?.displayName || ""} required /></label>
            <label><span><Mail/> الإيميل</span><input value={auth.currentUser?.email || ""} disabled /></label>
            <label><span><Phone/> رقم الجوال</span><input name="phone" defaultValue={customer?.phone || ""} placeholder="+9665XXXXXXXX" required /></label>
            <label><span><MapPin/> المدينة</span><input name="city" defaultValue={customer?.city || ""} placeholder="الرياض" required /></label>
            <label><span><Home/> العنوان</span><textarea name="address" defaultValue={customer?.address || ""} placeholder="الحي، الشارع، رقم المبنى" required /></label>
            <button className="primary">حفظ البيانات</button>
          </form>
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
          {settings.logo ? <img src={settings.logo} alt="logo" /> : <b>{settings.storeName}</b>}
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

function Admin({ settings, setSettings, products, customers, orders, go }) {
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [draftSettings, setDraftSettings] = useState(settings);
  const [imagePreview, setImagePreview] = useState(editing?.image || "");
  const [pendingImport, setPendingImport] = useState([]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setImagePreview(editing?.image || "");
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

  const saveProduct = async (e) => {
    e.preventDefault();
    const f = e.target;
    let image = f.imageUrl.value.trim();
    if (f.imageFile.files[0]) image = await fileToDataUrl(f.imageFile.files[0], { maxWidth: 1100, maxHeight: 900, quality: 0.82 });
    const id = editing?.id || uid();
    const product = {
      name: f.name.value,
      brand: f.brand.value,
      category: f.category.value,
      price: Number(f.price.value),
      oldPrice: Number(f.oldPrice.value || f.price.value),
      rating: Number(f.rating.value || 5),
      sizes: f.sizes.value,
      tag: f.tag.value,
      description: f.description.value,
      stock: Number(f.stock.value || 0),
      sku: f.sku.value,
      status: f.status.value,
      featured: f.featured.checked,
      image: image || editing?.image || "",
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "products", id), product, { merge: true });
    setNotice(editing ? "تم تعديل المنتج بنجاح" : "تم إضافة المنتج بنجاح");
    setTimeout(() => setNotice(""), 2200);
    setEditing(null);
    setImagePreview("");
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
      updatedAt: serverTimestamp()
    };
  };

  const downloadProductsTemplate = () => {
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

return (
    <div className="admin" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          {settings.logo ? <img className="admin-brand-logo" src={settings.logo} alt="logo" /> : <b>{settings.storeName}</b>}
          <span>Admin Panel</span>
        </div>
        <button className={tab==="dashboard"?"on":""} onClick={()=>setTab("dashboard")}><LayoutDashboard/> الرئيسية</button>
        <button className={tab==="identity"?"on":""} onClick={()=>setTab("identity")}><Palette/> الهوية</button>
        <button className={tab==="banners"?"on":""} onClick={()=>setTab("banners")}><ImageIcon/> البنرات والصور</button>
        <button className={tab==="products"?"on":""} onClick={()=>setTab("products")}><PackagePlus/> المنتجات</button>
        <button className={tab==="customers"?"on":""} onClick={()=>setTab("customers")}><Users/> العملاء</button>
        <button className={tab==="orders"?"on":""} onClick={()=>setTab("orders")}><ClipboardList/> الطلبات</button>
        <div className="side-bottom"><button onClick={()=>go("/")}><Eye/> معاينة المتجر</button><button onClick={()=>signOut(auth)}><LogOut/> خروج</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-top">
          <div><span>لوحة التحكم</span><h1>{titleFor(tab)}</h1></div>
          <div className="admin-actions"><button onClick={()=>go("/")}><Eye size={16}/> معاينة</button><button onClick={()=>setDoc(doc(db,"store","settings"), defaultSettings)}><RotateCw size={16}/> إعادة الهوية</button></div>
        </header>
        {notice && <div className="notice">{notice}</div>}
        {(tab === "identity" || tab === "banners") && (
          <div className="admin-save-bar">
            <div>
              <b>التغييرات غير محفوظة حتى تضغط حفظ</b>
              <span>أي تعديل في الهوية أو البنرات لن يظهر في المتجر إلا بعد الحفظ.</span>
            </div>
            <div className="save-bar-actions">
              <button className="admin-secondary" onClick={resetDraftSettings}>إلغاء التغييرات</button>
              <button className="admin-primary" onClick={saveDraftSettings}>حفظ التغييرات</button>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <section className="dashboard-pro-page">
            <div className="admin-card dashboard-hero">
              <div>
                <span>Store Overview</span>
                <h2>Dashboard</h2>
                <p>نظرة سريعة على أداء متجر GREEN DIXAM والطلبات والمبيعات.</p>
              </div>
              <div className="dashboard-hero-badge">
                <b>{formatOrderDate(new Date())}</b>
                <small>آخر تحديث</small>
              </div>
            </div>

            <div className="dashboard-stats-grid">
              <div className="dash-stat-card">
                <span>طلبات اليوم</span>
                <b>{todayOrders.length}</b>
                <small>طلب جديد اليوم</small>
              </div>

              <div className="dash-stat-card gold">
                <span>مبيعات اليوم</span>
                <b>{formatPrice(todaySales)} ر.س</b>
                <small>إجمالي قيمة طلبات اليوم</small>
              </div>

              <div className="dash-stat-card">
                <span>آخر 7 أيام</span>
                <b>{weekOrders.length}</b>
                <small>طلب خلال الأسبوع</small>
              </div>

              <div className="dash-stat-card">
                <span>إجمالي المبيعات</span>
                <b>{formatPrice(totalSales)} ر.س</b>
                <small>من كل الطلبات المسجلة</small>
              </div>
            </div>

            <div className="dashboard-main-grid">
              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Best Seller</span>
                    <h2>أفضل منتج</h2>
                  </div>
                </div>

                {topProduct ? (
                  <div className="top-product-card">
                    {topProduct.image ? <img src={topProduct.image} /> : <div className="top-product-placeholder">🌿</div>}
                    <div>
                      <h3>{topProduct.name}</h3>
                      <p>تم بيع {topProduct.qty} قطعة</p>
                      <b>{formatPrice(topProduct.value)} ر.س</b>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-empty">لا توجد مبيعات بعد</div>
                )}
              </div>

              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Recent Orders</span>
                    <h2>أحدث الطلبات</h2>
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
                    <div className="dashboard-empty">لا توجد طلبات حتى الآن</div>
                  )}
                </div>
              </div>

              <div className="admin-card dashboard-panel">
                <div className="panel-head">
                  <div>
                    <span>Quick Numbers</span>
                    <h2>أرقام سريعة</h2>
                  </div>
                </div>

                <div className="quick-numbers">
                  <div><span>المنتجات</span><b>{products.length}</b></div>
                  <div><span>العملاء</span><b>{customers.length}</b></div>
                  <div><span>الطلبات</span><b>{orders.length}</b></div>
                  <div><span>المخزون</span><b>{products.reduce((sum,p)=>sum + Number(p.stock || 0), 0)}</b></div>
                </div>
              </div>
            </div>
          </section>
        )}

        

        {tab === "identity" && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>ألوان جاهزة</h2>
              <div className="palette-grid">
                {palettes.map(p => <button key={p.name} onClick={()=>setDraftSettings(s=>({...s,...p}))}><span>{p.name}</span><i style={{background:p.primaryColor}}/><i style={{background:p.accentColor}}/><i style={{background:p.backgroundColor}}/></button>)}
              </div>
            </div>
            <div className="admin-card">
              <h2>تعديل الهوية</h2>
              <Control label="اسم المتجر"><input value={draftSettings.storeName} onChange={e=>updateDraft("storeName",e.target.value)} /></Control>
              <Control label="الوصف القصير"><input value={draftSettings.tagline} onChange={e=>updateDraft("tagline",e.target.value)} /></Control>
              <Control label="الخط"><select value={draftSettings.fontFamily} onChange={e=>updateDraft("fontFamily",e.target.value)}><option>Cairo</option><option>Tajawal</option></select></Control>
              <Control label="اللون الأساسي"><input type="color" value={draftSettings.primaryColor} onChange={e=>updateDraft("primaryColor",e.target.value)} /></Control>
              <Control label="لون اللمسة"><input type="color" value={draftSettings.accentColor} onChange={e=>updateDraft("accentColor",e.target.value)} /></Control>
              <Control label="لون الخلفية"><input type="color" value={draftSettings.backgroundColor} onChange={e=>updateDraft("backgroundColor",e.target.value)} /></Control>
            </div>
            <div className="admin-card">
              <h2>الشعار</h2>
              <Control label="رابط الشعار"><input value={draftSettings.logo} onChange={e=>updateDraft("logo",e.target.value)} /></Control>
              <Control label="أو ارفع الشعار"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("logo", e.target.files[0])} /></Control><p className="admin-help-text">يفضل رفع شعار PNG أو JPG بحجم صغير. سيتم ضغطه تلقائيًا قبل الحفظ.</p>
              {draftSettings.logo && <img className="admin-image-preview small" src={draftSettings.logo} />}
            </div>
          </section>
        )}

        {tab === "banners" && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>الهيرو الرئيسي</h2>
              <Control label="عنوان الهيرو"><input value={draftSettings.heroTitle} onChange={e=>updateDraft("heroTitle",e.target.value)} /></Control>
              <Control label="وصف الهيرو"><textarea value={draftSettings.heroSubtitle} onChange={e=>updateDraft("heroSubtitle",e.target.value)} /></Control>
              <Control label="رابط صورة الهيرو"><input value={draftSettings.heroImage} onChange={e=>updateDraft("heroImage",e.target.value)} /></Control>
              <Control label="أو ارفع صورة"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("heroImage", e.target.files[0])} /></Control>
              <Control label={`ارتفاع البنر: ${draftSettings.heroHeight}px`}><input type="range" min="320" max="760" value={draftSettings.heroHeight} onChange={e=>updateDraft("heroHeight",Number(e.target.value))} /></Control>
            </div>
            <div className="admin-card">
              <h2>بنر العروض</h2>
              <Control label="عنوان البنر"><input value={draftSettings.bannerTitle} onChange={e=>updateDraft("bannerTitle",e.target.value)} /></Control>
              <Control label="وصف البنر"><textarea value={draftSettings.bannerSubtitle} onChange={e=>updateDraft("bannerSubtitle",e.target.value)} /></Control>
              <Control label="رابط صورة البنر"><input value={draftSettings.bannerImage} onChange={e=>updateDraft("bannerImage",e.target.value)} /></Control>
              <Control label="أو ارفع صورة"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("bannerImage", e.target.files[0])} /></Control>
            </div>
            <div className="admin-card">
              <h2>أحجام الصور</h2>
              <Control label={`ارتفاع صور المنتجات: ${draftSettings.productImageHeight}px`}><input type="range" min="180" max="420" value={draftSettings.productImageHeight} onChange={e=>updateDraft("productImageHeight",Number(e.target.value))} /></Control>
              <img className="admin-image-preview" src={draftSettings.heroImage} />
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="admin-products-stacked">
            <div className="admin-card excel-wide-card">
              <div className="excel-wide-content">
                <div>
                  <span>Bulk import</span>
                  <h2>إضافة منتجات عبر Excel</h2>
                  <p>حمّل القالب، عبّئ المنتجات، ارفع الملف، راجع المعاينة، ثم اضغط حفظ. لن يتم تغيير أي شيء قبل الحفظ.</p>
                </div>
                <div className="excel-wide-actions">
                  <button className="admin-secondary" type="button" onClick={downloadProductsTemplate}>تحميل قالب Excel</button>
                  <label className="excel-upload-btn">
                    رفع ملف Excel
                    <input type="file" accept=".xlsx,.xls" onChange={importProductsFromExcel} />
                  </label>
                </div>
              </div>

              {pendingImport.length > 0 && (
                <div className="pending-import-box">
                  <div className="pending-head">
                    <div>
                      <b>معاينة المنتجات المستوردة</b>
                      <span>{pendingImport.length} منتج جاهز للحفظ</span>
                    </div>
                    <div className="pending-actions">
                      <button className="admin-secondary" type="button" onClick={clearPendingImport}>إلغاء الاستيراد</button>
                      <button className="admin-primary" type="button" onClick={savePendingImport}>حفظ المنتجات المستوردة</button>
                    </div>
                  </div>

                  <div className="pending-table">
                    {pendingImport.slice(0, 8).map((p, i) => (
                      <div className="pending-row" key={i}>
                        <img src={p.image || "https://via.placeholder.com/120"} />
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

            <div className="admin-card product-form-card pro-form-card full-product-form-card">
              <div className="pro-card-head">
                <div>
                  <span>Product editor</span>
                  <h2>{editing ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
                </div>
                {editing && <button className="admin-secondary" onClick={()=>{setEditing(null); setImagePreview("");}}>منتج جديد</button>}
              </div>

              <form onSubmit={saveProduct} className="product-form pro-product-form pro-product-form-horizontal">
                <div className="pro-form-section">
                  <h3>معلومات المنتج</h3>
                  <Control label="اسم المنتج"><input name="name" defaultValue={editing?.name || ""} required placeholder="مثال: مونستيرا فاخرة" /></Control>
                  <Control label="الوصف"><textarea name="description" defaultValue={editing?.description || ""} placeholder="اكتب وصف مختصر وجميل للمنتج" /></Control>
                  <div className="two">
                    <Control label="النوع/المورد"><input name="brand" defaultValue={editing?.brand || ""} required placeholder="Monstera" /></Control>
                    <Control label="القسم"><input name="category" defaultValue={editing?.category || "نباتات داخلية"} required /></Control>
                  </div>
                </div>

                <div className="pro-form-section">
                  <h3>السعر والمخزون</h3>
                  <div className="two">
                    <Control label="السعر"><input name="price" type="number" min="0" step="1" defaultValue={editing?.price || ""} required /></Control>
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
                        <option value="hidden">مخفي</option>
                      </select>
                    </Control>
                    <Control label="التقييم"><input name="rating" type="number" step="0.1" max="5" min="0" defaultValue={editing?.rating || 4.8} /></Control>
                  </div>
                </div>

                <div className="pro-form-section">
                  <h3>الخيارات والصورة</h3>
                  <div className="two">
                    <Control label="الشارة"><input name="tag" defaultValue={editing?.tag || "Rare"} /></Control>
                    <Control label="الأحجام/الخيارات"><input name="sizes" defaultValue={editing?.sizes || "صغير,متوسط,كبير"} /></Control>
                  </div>
                  <Control label="رابط الصورة"><input name="imageUrl" defaultValue={editing?.image || ""} onChange={e=>setImagePreview(e.target.value)} placeholder="ضع رابط صورة المنتج هنا" /></Control>
                  <Control label="أو ارفع صورة"><input name="imageFile" type="file" accept="image/*" onChange={async e=>{ const file=e.target.files[0]; if(file) setImagePreview(await fileToDataUrl(file, { maxWidth: 1100, maxHeight: 900, quality: 0.82 })); }} /></Control>
                  {imagePreview && <div className="product-image-preview pro-preview"><span>معاينة الصورة</span><img src={imagePreview} alt="معاينة المنتج" /></div>}
                  <label className="feature-toggle">
                    <input name="featured" type="checkbox" defaultChecked={editing?.featured || false} />
                    <span>منتج مميز في الواجهة</span>
                  </label>
                </div>

                <div className="form-actions pro-actions">
                  <button className="admin-primary"><Save size={16}/> {editing ? "حفظ التعديل" : "إضافة المنتج"}</button>
                  {editing && <button type="button" className="admin-secondary" onClick={()=>{setEditing(null); setImagePreview("");}}>إلغاء التعديل</button>}
                </div>
              </form>
            </div>

            <div className="admin-card products-manager pro-products-manager full-products-manager">
              <div className="pro-card-head">
                <div>
                  <span>Catalogue</span>
                  <h2>المنتجات المضافة</h2>
                </div>
                <b className="products-count">{products.length} منتج</b>
              </div>

              <div className="admin-product-cards">
                {products.map(p => (
                  <div className="admin-product-card" key={p.id}>
                    <div className="admin-product-thumb">
                      <img src={p.image} />
                      <span className={p.status === "hidden" ? "status hidden" : "status active"}>
                        {p.status === "hidden" ? "مخفي" : "ظاهر"}
                      </span>
                    </div>

                    <div className="admin-product-info">
                      <div>
                        <small>{p.category}</small>
                        <h3>{p.name}</h3>
                        <p>{p.description || p.brand}</p>
                      </div>

                      <div className="admin-product-meta">
                        <span>{formatPrice(p.price)} ر.س</span>
                        <span>المخزون: {p.stock ?? 0}</span>
                        {p.sku && <span>SKU: {p.sku}</span>}
                      </div>

                      <div className="admin-product-actions">
                        <button onClick={()=>setEditing(p)}><Pencil size={16}/> تعديل</button>
                        <button className="danger" onClick={()=>deleteDoc(doc(db, "products", p.id))}><Trash2 size={16}/> حذف</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "customers" && <CustomersPanel customers={customers} orders={orders} />}
        {tab === "orders" && <OrdersPanel orders={orders} />}
      </main>
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

function OrdersPanel({ orders }) {
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

  const updateOrderStatus = async (orderId, status) => {
    await setDoc(doc(db, "orders", orderId), {
      status,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const deleteOrder = async (orderId) => {
    if (confirm("هل تريد حذف هذا الطلب؟")) {
      await deleteDoc(doc(db, "orders", orderId));
    }
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
          <div><b>{formatPrice(totals.value)}</b><small>إجمالي المبيعات</small></div>
          <div><b>{totals.new || 0}</b><small>طلبات جديدة</small></div>
        </div>
      </div>

      <div className="admin-card orders-toolbar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل، الإيميل، الجوال، المدينة..."
        />

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
                  {item.image && <img src={item.image} />}
                  <span>{item.name}</span>
                  <b>{item.qty || 1}x</b>
                </div>
              ))}
              {order.items.length > 4 && <small>+{order.items.length - 4} منتجات أخرى</small>}
            </div>

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
              <div><span>الإجمالي</span><b>{formatPrice(Number(selectedOrder.total || 0))} ر.س</b></div>
              <div><span>تاريخ الطلب</span><b>{formatOrderDate(selectedOrder.createdAt)}</b></div>
              <div className="wide"><span>العنوان</span><b>{selectedOrder.address || "غير متوفر"}</b></div>
            </div>

            <div className="order-modal-products">
              <h3>المنتجات</h3>
              {(selectedOrder.items || []).length ? (
                (selectedOrder.items || []).map((item, i) => (
                  <div className="order-modal-item" key={i}>
                    {item.image ? <img src={item.image} alt={item.name || "product"} /> : <div className="order-modal-no-img">🌿</div>}
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
function titleFor(tab) {
  return {
    dashboard:"الرئيسية",
    identity:"الهوية والألوان",
    banners:"البنرات والصور",
    products:"إدارة المنتجات",
    customers:"العملاء",
    orders:"الطلبات"
  }[tab];
}
