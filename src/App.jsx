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

const STORE_WHATSAPP = "966508983003";

const defaultSettings = {
  storeName: "LUXE SOLE",
  tagline: "global footwear",
  heroTitle: "متجر شوزات بتصميم فاخر",
  heroSubtitle: "اختر من أشهر البراندات العالمية مع تجربة تسوق راقية، فلاتر ذكية، مقاسات، وسلة شراء أنيقة.",
  primaryColor: "#000000",
  accentColor: "#d4af37",
  backgroundColor: "#f6f3ee",
  cardColor: "#ffffff",
  fontFamily: "Cairo",
  logo: "",
  heroImage: "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1400&q=80",
  heroHeight: 520,
  bannerTitle: "عروض موسمية على البراندات المميزة",
  bannerSubtitle: "خصومات حصرية على مجموعات مختارة من الشوزات العالمية.",
  bannerImage: "",
  productImageHeight: 280
};

const defaultProducts = [
  { id: "1", name: "Nike Air Max Pulse", brand: "Nike", category: "Running", price: 749, oldPrice: 899, rating: 4.8, sizes: "40,41,42,43,44", tag: "Best Seller", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80" },
  { id: "2", name: "Adidas Ultraboost Light", brand: "Adidas", category: "Running", price: 829, oldPrice: 999, rating: 4.9, sizes: "40,41,42,43", tag: "Premium", image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=1200&q=80" },
  { id: "3", name: "Jordan 1 Retro High", brand: "Jordan", category: "Sneakers", price: 1299, oldPrice: 1499, rating: 5, sizes: "41,42,43,44,45", tag: "Collectors", image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=80" },
  { id: "4", name: "Gucci Ace Leather", brand: "Gucci", category: "Luxury", price: 2499, oldPrice: 2899, rating: 4.9, sizes: "40,41,42,43", tag: "Luxury", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80" }
];

const palettes = [
  { name: "Luxury Black Gold", primaryColor: "#000000", accentColor: "#d4af37", backgroundColor: "#f6f3ee", cardColor: "#ffffff" },
  { name: "Navy Silver", primaryColor: "#0f172a", accentColor: "#c0c7d1", backgroundColor: "#f4f7fb", cardColor: "#ffffff" },
  { name: "Coffee Cream", primaryColor: "#3b2f2f", accentColor: "#c8a46a", backgroundColor: "#f7efe5", cardColor: "#fffaf4" },
  { name: "Sport Red", primaryColor: "#111827", accentColor: "#ef4444", backgroundColor: "#f8fafc", cardColor: "#ffffff" }
];

function formatPrice(value) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
}
function sizesArray(sizes) {
  return String(sizes || "").split(",").map(s => s.trim()).filter(Boolean);
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
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
    if (!authUser || !isAdmin) return <AdminLogin go={go} />;
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

function AdminLogin({ go }) {
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
    <AuthShell title={mode === "login" ? "دخول لوحة التحكم" : "إنشاء أول أدمن"} subtitle="لوحة التحكم مخصصة لإدارة المنتجات والعملاء والطلبات.">
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

function CustomerAuth({ go }) {
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
    <AuthShell title={mode === "login" ? "دخول العميل" : "إنشاء حساب عميل"} subtitle="سجل حسابك لحفظ بياناتك واستخدامها في الطلبات القادمة.">
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

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-icon"><Lock /></div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function Store({ settings, products, authUser, customer, setCustomer, go, path }) {
  if (path.startsWith("/login")) return <CustomerAuth go={go} />;
  if (path.startsWith("/account")) return authUser ? <Account customer={customer} setCustomer={setCustomer} go={go} /> : <CustomerAuth go={go} />;

  const [queryText, setQueryText] = useState("");
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState({});
  const [favorites, setFavorites] = useState([]);

  const brands = ["All", ...new Set(products.map(p => p.brand).filter(Boolean))];
  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = useMemo(() => products.filter(p => {
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

    const items = cart.map((item) => `• ${item.name}\nالمقاس: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`).join("\n\n");
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
            <a href="#products">الأقسام</a>
            <a href="#products">الخصومات</a>
            <a href="#community">المنتدى</a>
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
          <div className="pill">Premium Global Footwear</div>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroSubtitle}</p>
          <div className="hero-actions">
            <a href="#products" className="primary">تسوق الآن</a>
            <button className="secondary" onClick={() => go(authUser ? "/account" : "/login")}>حساب العميل</button>
          </div>
          <div className="stats">
            <div><b>{products.length}+</b><span>منتجات</span></div>
            <div><b>24H</b><span>شحن سريع</span></div>
            <div><b>CRM</b><span>بيانات عملاء</span></div>
          </div>
        </div>
        <div className="hero-image"><img src={settings.heroImage} alt="hero" /></div>
      </section>

      <section className="container feature-grid">
        <Feature icon={<Truck/>} title="توصيل سريع" text="تجربة متجر منظمة لعرض الشحن والتوصيل." />
        <Feature icon={<ShieldCheck/>} title="بيانات عملاء" text="العميل يسجل بياناته وتحفظ في لوحة التحكم." />
        <Feature icon={<RotateCcw/>} title="طلبات واتساب" text="الطلب يصل واتساب ويحفظ داخل Firebase." />
      </section>

      <section className="container promo" style={{ backgroundImage: settings.bannerImage ? `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${settings.bannerImage})` : undefined }}>
        <div><span>Exclusive Campaign</span><h2>{settings.bannerTitle}</h2><p>{settings.bannerSubtitle}</p></div>
      </section>

      <section className="container filters">
        <div className="search-box"><Search size={18}/><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="ابحث عن منتج أو براند..." /></div>
        <select value={brand} onChange={e=>setBrand(e.target.value)}>{brands.map(b => <option key={b} value={b}>{b==="All"?"كل البراندات":b}</option>)}</select>
        <select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c==="All"?"كل الأقسام":c}</option>)}</select>
      </section>

      <section id="products" className="container product-section">
        <div className="section-title"><span>Featured Catalogue</span><h2>منتجات مختارة بعناية</h2></div>
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
                      <b>{item.name}</b><span>مقاس: {item.size}</span><span>{formatPrice(item.price)} ر.س</span>
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

function Account({ customer, setCustomer, go }) {
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
            <b>حسابي</b>
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
        <div><b>{settings.storeName}</b><p>{settings.tagline}</p></div>
        <div><b>الأقسام</b><p>Running<br/>Sneakers<br/>Luxury</p></div>
        <div><b>الدعم</b><p>الشحن<br/>الدفع<br/>الاستبدال</p></div>
        <div><b>تواصل</b><p>support@luxesole.com<br/>Riyadh, Saudi Arabia</p></div>
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
  const totalValue = products.reduce((n,p)=>n+Number(p.price || 0),0);

  const saveSettings = async (patch) => {
    await setDoc(doc(db, "store", "settings"), { ...settings, ...patch }, { merge: true });
    setSettings(s => ({ ...s, ...patch }));
    setNotice("تم الحفظ");
    setTimeout(() => setNotice(""), 1800);
  };

  const uploadSettingImage = async (key, file) => {
    if (!file) return;
    const data = await fileToDataUrl(file);
    await saveSettings({ [key]: data });
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const f = e.target;
    let image = f.imageUrl.value.trim();
    if (f.imageFile.files[0]) image = await fileToDataUrl(f.imageFile.files[0]);
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
      image: image || editing?.image || "",
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "products", id), product, { merge: true });
    setEditing(null);
    f.reset();
    setTab("products");
  };

  return (
    <div className="admin" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand"><b>{settings.storeName}</b><span>Admin Panel</span></div>
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

        {tab === "dashboard" && (
          <section className="dash-grid">
            <Stat label="عدد المنتجات" value={products.length} />
            <Stat label="عدد العملاء" value={customers.length} />
            <Stat label="عدد الطلبات" value={orders.length} />
            <Stat label="إجمالي أسعار المنتجات" value={`${formatPrice(totalValue)} ر.س`} />
          </section>
        )}

        {tab === "identity" && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>ألوان جاهزة</h2>
              <div className="palette-grid">
                {palettes.map(p => <button key={p.name} onClick={()=>saveSettings(p)}><span>{p.name}</span><i style={{background:p.primaryColor}}/><i style={{background:p.accentColor}}/><i style={{background:p.backgroundColor}}/></button>)}
              </div>
            </div>
            <div className="admin-card">
              <h2>تعديل الهوية</h2>
              <Control label="اسم المتجر"><input value={settings.storeName} onChange={e=>saveSettings({storeName:e.target.value})} /></Control>
              <Control label="الوصف القصير"><input value={settings.tagline} onChange={e=>saveSettings({tagline:e.target.value})} /></Control>
              <Control label="الخط"><select value={settings.fontFamily} onChange={e=>saveSettings({fontFamily:e.target.value})}><option>Cairo</option><option>Tajawal</option></select></Control>
              <Control label="اللون الأساسي"><input type="color" value={settings.primaryColor} onChange={e=>saveSettings({primaryColor:e.target.value})} /></Control>
              <Control label="لون اللمسة"><input type="color" value={settings.accentColor} onChange={e=>saveSettings({accentColor:e.target.value})} /></Control>
              <Control label="لون الخلفية"><input type="color" value={settings.backgroundColor} onChange={e=>saveSettings({backgroundColor:e.target.value})} /></Control>
            </div>
            <div className="admin-card">
              <h2>الشعار</h2>
              <Control label="رابط الشعار"><input value={settings.logo} onChange={e=>saveSettings({logo:e.target.value})} /></Control>
              <Control label="أو ارفع الشعار"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("logo", e.target.files[0])} /></Control>
              {settings.logo && <img className="admin-image-preview small" src={settings.logo} />}
            </div>
          </section>
        )}

        {tab === "banners" && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>الهيرو الرئيسي</h2>
              <Control label="عنوان الهيرو"><input value={settings.heroTitle} onChange={e=>saveSettings({heroTitle:e.target.value})} /></Control>
              <Control label="وصف الهيرو"><textarea value={settings.heroSubtitle} onChange={e=>saveSettings({heroSubtitle:e.target.value})} /></Control>
              <Control label="رابط صورة الهيرو"><input value={settings.heroImage} onChange={e=>saveSettings({heroImage:e.target.value})} /></Control>
              <Control label="أو ارفع صورة"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("heroImage", e.target.files[0])} /></Control>
              <Control label={`ارتفاع البنر: ${settings.heroHeight}px`}><input type="range" min="320" max="760" value={settings.heroHeight} onChange={e=>saveSettings({heroHeight:Number(e.target.value)})} /></Control>
            </div>
            <div className="admin-card">
              <h2>بنر العروض</h2>
              <Control label="عنوان البنر"><input value={settings.bannerTitle} onChange={e=>saveSettings({bannerTitle:e.target.value})} /></Control>
              <Control label="وصف البنر"><textarea value={settings.bannerSubtitle} onChange={e=>saveSettings({bannerSubtitle:e.target.value})} /></Control>
              <Control label="رابط صورة البنر"><input value={settings.bannerImage} onChange={e=>saveSettings({bannerImage:e.target.value})} /></Control>
              <Control label="أو ارفع صورة"><input type="file" accept="image/*" onChange={e=>uploadSettingImage("bannerImage", e.target.files[0])} /></Control>
            </div>
            <div className="admin-card">
              <h2>أحجام الصور</h2>
              <Control label={`ارتفاع صور المنتجات: ${settings.productImageHeight}px`}><input type="range" min="180" max="420" value={settings.productImageHeight} onChange={e=>saveSettings({productImageHeight:Number(e.target.value)})} /></Control>
              <img className="admin-image-preview" src={settings.heroImage} />
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="admin-grid">
            <div className="admin-card product-form-card">
              <h2>{editing ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
              <form onSubmit={saveProduct} className="product-form">
                <Control label="اسم المنتج"><input name="name" defaultValue={editing?.name || ""} required /></Control>
                <Control label="البراند"><input name="brand" defaultValue={editing?.brand || ""} required /></Control>
                <Control label="القسم"><input name="category" defaultValue={editing?.category || "Sneakers"} required /></Control>
                <div className="two"><Control label="السعر"><input name="price" type="number" defaultValue={editing?.price || ""} required /></Control><Control label="السعر قبل الخصم"><input name="oldPrice" type="number" defaultValue={editing?.oldPrice || ""} /></Control></div>
                <div className="two"><Control label="التقييم"><input name="rating" type="number" step="0.1" max="5" defaultValue={editing?.rating || 4.8} /></Control><Control label="الشارة"><input name="tag" defaultValue={editing?.tag || "New"} /></Control></div>
                <Control label="المقاسات مفصولة بفواصل"><input name="sizes" defaultValue={editing?.sizes || "40,41,42,43"} /></Control>
                <Control label="رابط الصورة"><input name="imageUrl" defaultValue={editing?.image || ""} /></Control>
                <Control label="أو ارفع صورة"><input name="imageFile" type="file" accept="image/*" /></Control>
                <div className="form-actions"><button className="admin-primary"><Save size={16}/> حفظ المنتج</button>{editing && <button type="button" className="admin-secondary" onClick={()=>setEditing(null)}>إلغاء</button>}</div>
              </form>
            </div>
            <div className="admin-card products-manager">
              <h2>قائمة المنتجات</h2>
              <div className="admin-products-list">
                {products.map(p => (
                  <div className="admin-product-row" key={p.id}>
                    <img src={p.image} />
                    <div><b>{p.name}</b><span>{p.brand} • {formatPrice(p.price)} ر.س</span></div>
                    <button onClick={()=>setEditing(p)}><Pencil size={16}/></button>
                    <button onClick={()=>deleteDoc(doc(db, "products", p.id))}><Trash2 size={16}/></button>
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
  const selectedOrders = selected ? orders.filter(o => o.customerId === selected.id) : [];
  return (
    <section className="admin-grid">
      <div className="admin-card products-manager">
        <h2>بيانات العملاء</h2>
        <div className="admin-products-list">
          {customers.map(c => (
            <button className="customer-row" key={c.id} onClick={() => setSelected(c)}>
              <div className="avatar">{(c.name || c.email || "?")[0]}</div>
              <div><b>{c.name || "بدون اسم"}</b><span>{c.email} • {c.phone || "لا يوجد جوال"} • {c.city || "لا توجد مدينة"}</span></div>
              <em>{c.ordersCount || 0} طلب</em>
            </button>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <h2>تفاصيل العميل</h2>
        {!selected ? <p className="muted">اختر عميل من القائمة.</p> : (
          <div className="details">
            <p><b>الاسم:</b> {selected.name}</p>
            <p><b>الإيميل:</b> {selected.email}</p>
            <p><b>الجوال:</b> {selected.phone}</p>
            <p><b>المدينة:</b> {selected.city}</p>
            <p><b>العنوان:</b> {selected.address}</p>
            <h3>طلبات العميل</h3>
            {selectedOrders.length ? selectedOrders.map(o => <div className="mini-order" key={o.id}>{formatPrice(o.total)} ر.س • {o.status}</div>) : <p className="muted">لا توجد طلبات بعد.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function OrdersPanel({ orders }) {
  return (
    <section className="admin-card">
      <h2>الطلبات</h2>
      <div className="orders-list">
        {orders.map(o => (
          <div className="order-card" key={o.id}>
            <div><b>{o.customerName}</b><span>{o.customerPhone} • {o.customerCity}</span></div>
            <div><b>{formatPrice(o.total)} ر.س</b><span>{o.status || "new"}</span></div>
            <div className="order-items">{(o.items || []).map((i, idx) => <span key={idx}>{i.name} × {i.qty} • مقاس {i.size}</span>)}</div>
          </div>
        ))}
      </div>
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
