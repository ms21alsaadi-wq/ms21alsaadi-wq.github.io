import React, { useEffect, useMemo, useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  Search,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  X,
  Plus,
  Minus,
  Trash2,
  LayoutDashboard,
  Palette,
  PackagePlus,
  LogOut,
  Pencil,
  Save,
  Users,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Mail,
  User,
  MapPin,
  Phone,
  Home,
  ClipboardList,
  Download,
  Bell,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  Languages,
  Grid3X3,
  Rows3,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase.js";
import {
  STORE_WHATSAPP,
  defaultSettings,
  defaultProducts,
  palettes,
} from "./data/storeData";
import {
  formatPrice,
  formatOrderDate,
  orderTimestamp,
  getTrackingUrl,
  couponUsedByCustomer,
  sizesArray,
  uid,
  makePageSlug,
  normalizePageHref,
  getTrafficSource,
  formatDuration,
  normalizeVideoUrl,
  isGoogleDriveVideo,
  firebaseError,
} from "./utils/helpers";
import {
  SEOManager,
  findProductByPath,
  productPath,
} from "./components/SEOManager.jsx";
import {
  ADMIN_PERMISSION_DESCRIPTIONS,
  ADMIN_PERMISSION_LABELS,
  ADMIN_ROLE_DEFAULTS,
  generateStaffTemporaryPassword,
  isStaffDeleted,
  isStaffDisabled,
  normalizeStaffPermissions,
} from "./data/adminPermissions.js";
import { getVisitorGeo, trackFunnelStep } from "./services/analytics.js";
import { sendOrderStatusEmail } from "./services/orderNotifications.js";
import {
  activateStaffTemporaryPassword,
  disableStaffAuthUser,
  setStaffAuthPassword,
  upsertStaffAuthUser,
} from "./services/staffAuthApi.js";
import { fileToDataUrl } from "./utils/media.js";

const ADMIN_ROUTE_TABS = [
  "dashboard",
  "reports",
  "identity",
  "homepage",
  "products",
  "orders",
  "customers",
  "coupons",
  "users",
  "settings",
  "notifications",
];

function adminTabFromPath(pathname = "") {
  const segment = String(pathname || "")
    .replace(/^\/admin\/?/, "")
    .split("/")[0];
  return ADMIN_ROUTE_TABS.includes(segment) ? segment : "dashboard";
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
        const adminData = adminDoc.exists() ? adminDoc.data() || {} : null;
        let adminAllowed = Boolean(
          adminDoc.exists() && !isStaffDisabled(adminData),
        );
        if (adminAllowed && adminData?.staffUser) {
          const staffByUid = await getDoc(doc(db, "staffUsers", u.uid));
          let staffRecord = staffByUid.exists()
            ? { id: u.uid, ...(staffByUid.data() || {}) }
            : null;
          if (!staffRecord && u.email) {
            const staffByEmail = await getDocs(
              query(
                collection(db, "staffUsers"),
                where("email", "==", String(u.email).toLowerCase()),
              ),
            );
            staffRecord =
              staffByEmail.docs
                .map((staffDoc) => ({
                  id: staffDoc.id,
                  ...(staffDoc.data() || {}),
                }))
                .find((item) => !isStaffDisabled(item)) || null;
          }
          adminAllowed = Boolean(staffRecord && !isStaffDisabled(staffRecord));
        }
        setIsAdmin(adminAllowed);
        const customerDoc = await getDoc(doc(db, "customers", u.uid));
        if (customerDoc.exists())
          setCustomer({ id: u.uid, ...customerDoc.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, "store", "settings"),
      async (snap) => {
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() });
        else await setDoc(doc(db, "store", "settings"), defaultSettings);
      },
    );

    const unsubProducts = onSnapshot(
      collection(db, "products"),
      async (snap) => {
        const seedRef = doc(db, "store", "productsSeed");

        if (snap.empty) {
          const seedSnap = await getDoc(seedRef);

          if (!seedSnap.exists()) {
            await Promise.all([
              ...defaultProducts.map((p) =>
                setDoc(doc(db, "products", p.id), p),
              ),
              setDoc(
                seedRef,
                { seeded: true, seededAt: serverTimestamp() },
                { merge: true },
              ),
            ]);
          } else {
            setProducts([]);
          }

          return;
        }

        await setDoc(
          seedRef,
          { seeded: true, updatedAt: serverTimestamp() },
          { merge: true },
        );
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );

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
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      : query(
          collection(db, "orders"),
          where("customerId", "==", authUser.uid),
        );

    let fallbackUnsub = null;
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {
        if (isAdmin && !fallbackUnsub) {
          fallbackUnsub = onSnapshot(collection(db, "orders"), (snap) => {
            const rows = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort(
                (a, b) =>
                  orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt),
              );
            setOrders(rows);
          });
        }
      },
    );

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
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsubCoupons;
  }, [isAdmin, path]);

  if (loading) return <div className="loading">جاري التحميل...</div>;

  if (path.startsWith("/admin")) {
    if (!authUser || !isAdmin) {
      return (
        <>
          <SEOManager path={path} settings={settings} products={products} />
          <AdminLogin go={go} settings={settings} />
        </>
      );
    }
    return (
      <>
        <SEOManager path={path} settings={settings} products={products} />
        <Admin
          settings={settings}
          setSettings={setSettings}
          products={products}
          customers={customers}
          orders={orders}
          coupons={coupons}
          go={go}
          path={path}
        />
      </>
    );
  }

  return (
    <>
      <SEOManager path={path} settings={settings} products={products} />
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
    </>
  );
}

function AdminLogin({ go, settings }) {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function finishLogin(cred, email) {
    const normalizedEmail = String(email || cred.user.email || "")
      .trim()
      .toLowerCase();
    const adminSnap = await getDoc(doc(db, "admins", cred.user.uid));
    const adminData = adminSnap.exists() ? adminSnap.data() || {} : null;
    const adminBlocked = Boolean(
      adminData?.disabled ||
        adminData?.isDeleted ||
        adminData?.deleted ||
        adminData?.status === "deleted" ||
        adminData?.status === "disabled",
    );

    const staffByUidSnap = await getDoc(doc(db, "staffUsers", cred.user.uid));
    let staffRecord = staffByUidSnap.exists()
      ? { id: cred.user.uid, ...staffByUidSnap.data() }
      : null;

    const staffByEmailSnap = await getDocs(
      query(collection(db, "staffUsers"), where("email", "==", normalizedEmail)),
    );
    const emailStaffRecords = staffByEmailSnap.docs.map((staffDoc) => ({
      id: staffDoc.id,
      ...(staffDoc.data() || {}),
    }));
    const activeEmailStaff = emailStaffRecords.find(
      (item) => !isStaffDisabled(item),
    );
    if (!staffRecord || isStaffDisabled(staffRecord)) {
      staffRecord = activeEmailStaff || staffRecord;
    }

    const canEnterAsStaff = Boolean(
      staffRecord && !isStaffDisabled(staffRecord),
    );
    const isStaffAdminAccount = Boolean(adminData?.staffUser || staffRecord);

    if (
      (adminBlocked && !canEnterAsStaff) ||
      (!adminSnap.exists() && !canEnterAsStaff) ||
      (isStaffAdminAccount && !canEnterAsStaff)
    ) {
      await signOut(auth);
      setMessage("هذا الحساب غير مصرح له بدخول لوحة التحكم أو تم حذفه/تعطيله.");
      return false;
    }

    if (canEnterAsStaff) {
      const permissions = normalizeStaffPermissions(staffRecord.permissions);
      await setDoc(
        doc(db, "staffUsers", cred.user.uid),
        {
          ...staffRecord,
          email: normalizedEmail,
          authUid: cred.user.uid,
          status: "active",
          disabled: false,
          isDeleted: false,
          deleted: false,
          invitationStatus: "accepted",
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "admins", cred.user.uid),
        {
          email: normalizedEmail,
          role: staffRecord.role || "staff",
          permissions,
          staffUser: true,
          status: "active",
          disabled: false,
          isDeleted: false,
          deleted: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setMessage("");
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setMessage("");
    setBusy(true);

    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await finishLogin(cred, email);
    } catch (err) {
      const code = String(err?.code || "").toLowerCase();
      const canTryTemporaryCode =
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-disabled") ||
        code.includes("user-not-found");

      if (canTryTemporaryCode) {
        try {
          setMessage("جاري تفعيل الرمز المؤقت...");
          await activateStaffTemporaryPassword({ email, password });
          const cred = await signInWithEmailAndPassword(auth, email, password);
          await finishLogin(cred, email);
          return;
        } catch (temporaryError) {
          setMessage(temporaryError?.message || firebaseError(err));
          return;
        }
      }

      setMessage(firebaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      settings={settings}
      title="دخول لوحة التحكم"
      subtitle="لوحة التحكم مخصصة لحسابات الأدمن المصرح لها فقط."
    >
      <form onSubmit={submit} className="login-form">
        <label>
          <span>
            <Mail size={16} /> الإيميل
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue={
              new URLSearchParams(window.location.search).get("email") || ""
            }
          />
        </label>
        <label>
          <span>
            <Lock size={16} /> كلمة المرور
          </span>
          <div className="password-input-wrap admin-login-password-wrap">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength="6"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-visibility-button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={2.4} /> : <Eye size={20} strokeWidth={2.4} />}
            </button>
          </div>
        </label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary" disabled={busy}>
          {busy ? "جاري الدخول..." : "دخول"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => go("/")}
          disabled={busy}
        >
          رجوع للمتجر
        </button>
      </form>
    </AuthShell>
  );
}

function StaffTemporaryPasswordGate({ staffProfile, settings }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const newPassword = event.target.newPassword.value;
    const confirmPassword = event.target.confirmPassword.value;

    if (newPassword.length < 8) {
      setMessage("كلمة المرور الجديدة يجب أن تكون 8 أحرف أو أكثر");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("تأكيد كلمة المرور غير مطابق");
      return;
    }

    try {
      setBusy(true);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("no-current-user");

      await updatePassword(currentUser, newPassword);
      await setDoc(
        doc(db, "staffUsers", currentUser.uid),
        {
          mustChangePassword: false,
          invitePassword: "",
          invitationStatus: "accepted",
          passwordChangedAtMs: Date.now(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "admins", currentUser.uid),
        {
          mustChangePassword: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setMessage("تم تغيير كلمة المرور بنجاح. جاري فتح لوحة التحكم...");
    } catch (error) {
      if (error?.code === "auth/requires-recent-login") {
        setMessage(
          "انتهت صلاحية جلسة الدخول. سجّل خروج ثم ادخل بكلمة المرور المؤقتة وحاول مرة أخرى.",
        );
      } else {
        setMessage(firebaseError(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="staff-password-modal-lock"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-password-title"
    >
      <div className="staff-password-modal-backdrop" />
      <div className="staff-password-modal-card staff-password-card">
        <div className="login-brand-mark">
          {settings?.logo ? (
            <img src={settings.logo} alt="logo" />
          ) : (
            <ShieldCheck size={34} />
          )}
        </div>
        <span className="staff-password-eyebrow">حماية الحساب</span>
        <h1 id="staff-password-title">غيّر كلمة المرور المؤقتة</h1>
        <p>
          مرحبًا {staffProfile?.name || auth.currentUser?.email || ""}، دخلت
          بنجاح. قبل استخدام لوحة التحكم لازم تختار كلمة مرور جديدة خاصة بك.
        </p>
        <form onSubmit={submit} className="login-form staff-password-form">
          <label>
            <span>
              <Lock size={16} /> كلمة المرور الجديدة
            </span>
            <input
              name="newPassword"
              type="password"
              minLength="8"
              required
              placeholder="8 أحرف أو أكثر"
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label>
            <span>
              <Lock size={16} /> تأكيد كلمة المرور
            </span>
            <input
              name="confirmPassword"
              type="password"
              minLength="8"
              required
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
            />
          </label>
          <button className="admin-primary" disabled={busy}>
            {busy ? "جاري الحفظ..." : "تغيير كلمة المرور والمتابعة"}
          </button>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => signOut(auth)}
          >
            تسجيل خروج
          </button>
          {message && <p className="auth-message">{message}</p>}
        </form>
      </div>
    </div>
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
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "customers", cred.user.uid), {
          name,
          email,
          phone: "",
          city: "",
          address: "",
          createdAt: serverTimestamp(),
          ordersCount: 0,
        });
      }
      go("/account");
    } catch (err) {
      setMessage(firebaseError(err));
    }
  }

  return (
    <AuthShell
      settings={settings}
      title={mode === "login" ? "دخول العميل" : "إنشاء حساب عميل"}
      subtitle="سجل حسابك لحفظ بياناتك واستخدامها في الطلبات القادمة."
    >
      <form onSubmit={submit} className="login-form">
        {mode === "signup" && (
          <label>
            <span>
              <User size={16} /> الاسم
            </span>
            <input name="name" required />
          </label>
        )}
        <label>
          <span>
            <Mail size={16} /> الإيميل
          </span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>
            <Lock size={16} /> كلمة المرور
          </span>
          <input name="password" type="password" required minLength="6" />
        </label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary">
          {mode === "login" ? "دخول" : "إنشاء حساب"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "إنشاء حساب جديد" : "عندي حساب"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => go("/")}
        >
          رجوع للمتجر
        </button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children, settings }) {
  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-brand-mark">
          {settings?.logo ? (
            <img
              src={settings.logo}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span>{settings?.storeName || "GREEN DIXAM"}</span>
          )}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

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
          const q = queryText.toLowerCase().trim();
          const searchable =
            `${p.name || ""} ${p.brand || ""} ${p.category || ""}`.toLowerCase();
          return (
            (!q || searchable.includes(q)) &&
            (brand === "All" || p.brand === brand) &&
            (category === "All" || p.category === category)
          );
        }),
    [products, queryText, brand, category],
  );

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
  const filteredProducts = useMemo(
    () =>
      products
        .filter((p) => (p.status || "active") !== "hidden")
        .filter((p) => {
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return `${p.name || ""} ${p.category || ""} ${p.description || ""}`
            .toLowerCase()
            .includes(q);
        }),
    [products, searchQuery],
  );

  const visibleHomePages = (
    settings.homePages || [
      { label: "النباتات", href: "/page/products", visible: true },
      { label: "العروض", href: "/page/offers", visible: true },
      { label: "دليل العناية", href: "/page/care-guide", visible: true },
    ]
  ).filter((page) => page.visible !== false);

  const currentStorePage = path.startsWith("/page/")
    ? visibleHomePages.find(
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

  function addToCart(product) {
    const size =
      selectedSize[product.id] || sizesArray(product.sizes)[0] || "Free";
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id && i.size === size);
      if (found)
        return prev.map((i) =>
          i.id === product.id && i.size === size
            ? { ...i, qty: Number(i.qty || 0) + 1 }
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
          `• ${item.name}\nالالحجم: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`,
      )
      .join("\n\n");
    const message = `🛒 طلب جديد من المتجر:\n\n👤 العميل: ${customer.name}\n📱 الجوال: ${customer.phone}\n📧 الإيميل: ${customer.email || authUser.email}\n📍 المدينة: ${customer.city}\n🏠 العنوان: ${customer.address}\n\n${items}\n\n💰 الإجمالي: ${formatPrice(total)} ر.س\n\n📦 الرجاء تأكيد الطلب`;
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
      <HeroStyle />
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
      <header
        className={`store-header ${settings.homeHeaderSticky === false ? "" : "header-sticky-pro"}`}
        style={{
          background: settings.homeHeaderBg || undefined,
        }}
      >
        {settings.homeTopBarEnabled !== false &&
          (settings.homeHeaderTopBar || "").trim() && (
            <div
              className="top-announcement-bar"
              style={{
                background: settings.homeTopBarBg || "#0F3D2E",
                color: settings.homeTopBarText || "#FFFFFF",
              }}
            >
              <span>{settings.homeHeaderTopBar}</span>
            </div>
          )}

        <div className="container luxe-nav">
          <div className="luxe-nav-right">
            <button className="luxe-logo" onClick={() => go("/")}>
              {settings.homeHeaderImage ? (
                <img
                  src={settings.homeHeaderImage}
                  alt="logo"
                  loading="eager"
                  decoding="async"
                />
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
                placeholder={
                  siteLang === "EN" ? "Search products..." : "ابحث عن منتج..."
                }
              />
              <button
                type="submit"
                className="search-icon-submit"
                aria-label={siteLang === "EN" ? "Search" : "بحث"}
              >
                <Search size={18} />
              </button>
            </form>
          </nav>

          <div className="luxe-nav-left">
            <div className="language-menu-wrap">
              <button
                className="language-toggle"
                type="button"
                title={siteLang === "EN" ? "Language" : "اللغة"}
                onClick={() => setLangMenuOpen((v) => !v)}
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
              title={
                siteLang === "EN"
                  ? authUser
                    ? "Account"
                    : "Login"
                  : authUser
                    ? "حسابي"
                    : "دخول العميل"
              }
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

      {isProductPath ? (
        <ProductDetailPage
          product={currentProduct}
          products={products}
          settings={settings}
          go={go}
          addToCart={addToCart}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
        />
      ) : currentStorePage ? (
        <StoreCustomPage page={currentStorePage} products={products} go={go} />
      ) : (
        <>
          <HeroSection settings={settings} products={products} />

          <section className="container feature-grid">
            <Feature
              icon={<Truck />}
              title="توصيل سريع"
              text="تغليف فاخر للنباتات مع تغليف يحافظ عليها."
            />
            <Feature
              icon={<ShieldCheck />}
              title="حسابات عملاء"
              text=" يحفظ بياناته وطلباته لتجربة أسهل."
            />
            <Feature
              icon={<RotateCcw />}
              title="طلبات منظمة"
              text="كل طلب محفوظ ومنظم داخل لوحة التحكم."
            />
          </section>

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
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
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
            <div className="products-grid">
              {filtered.map((p) => {
                const sizes = sizesArray(p.sizes);
                return (
                  <article
                    className="product product-link-card"
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => go(productPath(p))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") go(productPath(p));
                    }}
                  >
                    <div className="product-img">
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                      />
                      <span>{p.tag}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavorites((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id],
                          );
                        }}
                      >
                        <Heart
                          className={favorites.includes(p.id) ? "heart-on" : ""}
                        />
                      </button>
                    </div>
                    <div className="product-body">
                      <div className="product-top">
                        <div>
                          <small>{p.brand}</small>
                          <h3>{p.name}</h3>
                        </div>
                        <em>{p.category}</em>
                      </div>
                      <div className="rating">
                        <Star size={15} fill="currentColor" /> {p.rating}
                      </div>
                      <div className="sizes">
                        {sizes.map((s) => (
                          <button
                            className={
                              (selectedSize[p.id] || sizes[0]) === s
                                ? "active"
                                : ""
                            }
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSize((prev) => ({
                                ...prev,
                                [p.id]: s,
                              }));
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="product-foot">
                        <div>
                          <b>{formatPrice(p.price)} ر.س</b>
                          <del>{formatPrice(p.oldPrice)} ر.س</del>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p);
                          }}
                        >
                          أضف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <StoreReturnPolicy settings={settings} />
        </>
      )}

      <Footer settings={settings} />

      {cartOpen && (
        <div className="cart-overlay">
          <div className="cart-bg" onClick={() => setCartOpen(false)} />
          <aside className="cart-panel">
            <div className="cart-head">
              <h3>سلة الشراء</h3>
              <button onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty">السلة فارغة</div>
              ) : (
                cart.map((item, i) => (
                  <div className="cart-item" key={`${item.id}-${i}`}>
                    <img
                      src={item.image}
                      alt={item.name || "منتج"}
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <b>{item.name}</b>
                      <span>الحجم: {item.size}</span>
                      <span>{formatPrice(item.price)} ر.س</span>
                      <div className="qty">
                        <button
                          onClick={() =>
                            setCart((c) =>
                              c.map((x, idx) =>
                                idx === i
                                  ? { ...x, qty: Math.max(1, x.qty - 1) }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <b>{item.qty}</b>
                        <button
                          onClick={() =>
                            setCart((c) =>
                              c.map((x, idx) =>
                                idx === i ? { ...x, qty: x.qty + 1 } : x,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setCart((c) => c.filter((_, idx) => idx !== i))
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="cart-foot">
              <div className="coupon-box">
                <label>كود الخصم</label>
                <div className="coupon-input-row">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="مثال: GREEN10"
                  />
                  <button type="button" onClick={applyCoupon}>
                    تطبيق
                  </button>
                </div>
                {couponMessage && (
                  <span
                    className={
                      appliedCoupon ? "coupon-success" : "coupon-error"
                    }
                  >
                    {couponMessage}
                  </span>
                )}
                {appliedCoupon && (
                  <button
                    type="button"
                    className="remove-coupon"
                    onClick={removeCoupon}
                  >
                    إزالة الكوبون
                  </button>
                )}
              </div>

              <div className="cart-summary-lines">
                <p>
                  <span>المجموع الفرعي</span>
                  <b>{formatPrice(subtotal)} ر.س</b>
                </p>
                {appliedCoupon && (
                  <p className="discount-line">
                    <span>خصم {appliedCoupon.percent}%</span>
                    <b>- {formatPrice(discount)} ر.س</b>
                  </p>
                )}
                <p>
                  <span>الشحن</span>
                  <b>{formatPrice(shippingFee)} ر.س</b>
                </p>
                <p className="total-line">
                  <span>الإجمالي</span>
                  <b>{formatPrice(total)} ر.س</b>
                </p>
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
          <a href={buttonLink} className="primary">
            {buttonText}
          </a>
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
            <video
              className="hero-full-video"
              src={video}
              autoPlay
              muted
              loop
              playsInline
            />
          )
        ) : image ? (
          <img
            className="hero-full-video"
            src={image}
            alt={title}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="hero-full-placeholder">
            ارفع فيديو الهيرو من لوحة التحكم
          </div>
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
          <img
            className="hero-full-video"
            src={image}
            alt={title}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="hero-full-placeholder">
            ارفع بنر الهيرو من لوحة التحكم
          </div>
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
        backgroundImage: bgImage
          ? `linear-gradient(90deg, rgba(245,241,232,.86), rgba(245,241,232,.48)), url(${bgImage})`
          : undefined,
      }}
    >
      <div className="container hero-layered-inner">
        <div className="hero-layered-text">{content}</div>

        <div className="hero-layered-image-card">
          {image ? (
            <img src={image} alt={title} loading="eager" decoding="async" />
          ) : (
            <div className="hero-full-placeholder">
              ارفع الصورة الأمامية للهيرو
            </div>
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

function ProductDetailPage({
  product,
  products = [],
  settings,
  go,
  addToCart,
  selectedSize,
  setSelectedSize,
}) {
  const [activeImage, setActiveImage] = useState(product?.image || "");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setActiveImage(product?.image || "");
    setQty(1);
  }, [product?.id, product?.image]);

  const relatedProducts = (products || [])
    .filter(
      (item) =>
        item?.id !== product?.id && (item?.status || "active") !== "hidden",
    )
    .filter((item) => !product?.category || item.category === product.category)
    .slice(0, 4);

  if (!product) {
    return (
      <main className="container product-detail-page product-not-found">
        <button
          type="button"
          className="primary store-page-back"
          onClick={() => go("/")}
        >
          ← رجوع للمتجر
        </button>
        <div className="store-page-empty">
          <h1>المنتج غير موجود</h1>
          <p>الرابط غير صحيح أو المنتج مخفي من لوحة التحكم.</p>
        </div>
      </main>
    );
  }

  const gallery = [
    ...new Set(
      [
        product.image,
        ...(Array.isArray(product.gallery) ? product.gallery : []),
      ].filter(Boolean),
    ),
  ];
  const sizes = sizesArray(
    Array.isArray(product.sizes) ? product.sizes.join(",") : product.sizes,
  );
  const selected = selectedSize[product.id] || sizes[0] || "Free";
  const oldPrice = Number(product.oldPrice || 0);
  const price = Number(product.price || 0);
  const stock = Number(product.stock || 0);
  const hasDiscount = oldPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;
  const rating = Number(product.rating || 5);
  const reviewCount = Number(product.reviewCount || product.reviews || 24);
  const safeQty = Math.max(1, Math.min(Number(qty || 1), stock || 1));
  const storeName = settings?.storeName || "GREEN DIXAM";
  const productDescription =
    product.longDescription ||
    product.description ||
    "منتج مختار بعناية من المتجر.";
  const productFeatures = Array.isArray(product.features)
    ? product.features.filter(Boolean)
    : String(product.features || "")
        .split(/[\n،,]+/)
        .map((x) => x.trim())
        .filter(Boolean);
  const fallbackFeatures = productFeatures.length
    ? productFeatures
    : [
        "مختار بعناية ليناسب الهدايا والاستخدام اليومي",
        "تغليف أنيق يحافظ على جودة المنتج أثناء التوصيل",
        "خيار مناسب للمنزل أو المكتب أو المناسبات",
      ];
  const deliveryNote =
    product.deliveryInfo ||
    settings?.deliveryInfo ||
    "تجهيز الطلب خلال 24 إلى 48 ساعة، وتظهر تكلفة الشحن في السلة حسب الطلب.";
  const careNote =
    product.careGuide ||
    product.usage ||
    "يحفظ في مكان مناسب بعيدًا عن الظروف القاسية، واتبع تعليمات العناية المرفقة إن وجدت.";
  const handleAddQtyToCart = () => {
    for (let i = 0; i < safeQty; i += 1) addToCart(product);
  };

  return (
    <main className="product-detail-page product-commerce-page">
      <div className="container">
        <div className="product-breadcrumbs">
          <button type="button" onClick={() => go("/")}>
            المتجر
          </button>
          <span>/</span>
          {product.category && (
            <>
              <button
                type="button"
                onClick={() => go(`/page/${makePageSlug(product.category)}`)}
              >
                {product.category}
              </button>
              <span>/</span>
            </>
          )}
          <b>{product.name}</b>
        </div>

        <section className="product-commerce-shell">
          <aside className="product-gallery-column">
            <div className="product-gallery-rail" aria-label="صور المنتج">
              {(gallery.length ? gallery : [product.image])
                .slice(0, 6)
                .map((img, index) => (
                  <button
                    type="button"
                    key={`${img || "empty"}-${index}`}
                    className={
                      activeImage === img || (!activeImage && index === 0)
                        ? "active"
                        : ""
                    }
                    onClick={() => setActiveImage(img)}
                    aria-label={`عرض صورة ${index + 1}`}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={`${product.name || "منتج"} ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <PackagePlus size={22} />
                    )}
                  </button>
                ))}
            </div>

            <div className="product-main-photo">
              {hasDiscount && (
                <span className="product-sale-ribbon">
                  خصم {discountPercent}%
                </span>
              )}
              {product.tag && (
                <span className="product-tag-ribbon">{product.tag}</span>
              )}
              {activeImage || product.image ? (
                <img
                  src={activeImage || product.image}
                  alt={product.name || "منتج"}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="product-photo-placeholder">
                  <PackagePlus size={44} />
                  <span>لا توجد صورة</span>
                </div>
              )}
            </div>
          </aside>

          <section className="product-summary-column">
            <div className="product-brand-line">
              <span>{product.brand || storeName}</span>
              {product.category && <em>{product.category}</em>}
            </div>
            <h1>{product.name}</h1>
            <div className="product-rating-line">
              <span className="stars">
                <Star size={16} fill="currentColor" /> {rating.toFixed(1)}
              </span>
              <button type="button">{reviewCount} تقييم</button>
              {stock > 0 ? (
                <b className="in-stock">متوفر الآن</b>
              ) : (
                <b className="out-stock">غير متوفر</b>
              )}
            </div>
            <p className="product-short-description">
              {product.description || "منتج مختار بعناية من المتجر."}
            </p>

            <div className="product-feature-list">
              {fallbackFeatures.slice(0, 3).map((feature, index) => (
                <span key={`${feature}-${index}`}>✓ {feature}</span>
              ))}
            </div>

            <div className="product-compact-specs" aria-label="ملخص المنتج">
              <p>
                <span>التوصيل</span>
                <b>24 - 48 ساعة</b>
              </p>
              <p>
                <span>الاسترجاع</span>
                <b>حسب سياسة المتجر</b>
              </p>
              <p>
                <span>التوفر</span>
                <b>{stock > 0 ? "متوفر" : "غير متوفر"}</b>
              </p>
              {product.sku && (
                <p>
                  <span>الكود</span>
                  <b>{product.sku}</b>
                </p>
              )}
            </div>
          </section>

          <aside className="product-buy-box">
            <div className="product-buy-price">
              <b>{formatPrice(price)} ر.س</b>
              {hasDiscount && (
                <>
                  <del>{formatPrice(oldPrice)} ر.س</del>
                  <span>وفّر {formatPrice(oldPrice - price)} ر.س</span>
                </>
              )}
            </div>

            <div className="product-buy-benefits">
              <div>
                <Truck size={18} />
                <span>توصيل سريع</span>
              </div>
              <div>
                <ShieldCheck size={18} />
                <span>دفع آمن</span>
              </div>
              <div>
                <RotateCcw size={18} />
                <span>استرجاع حسب سياسة المتجر</span>
              </div>
            </div>

            {sizes.length > 0 && (
              <div className="product-detail-options product-commerce-options">
                <span>اختر الخيار</span>
                <div className="sizes">
                  {sizes.map((size) => (
                    <button
                      type="button"
                      key={size}
                      className={selected === size ? "active" : ""}
                      onClick={() =>
                        setSelectedSize((prev) => ({
                          ...prev,
                          [product.id]: size,
                        }))
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="product-quantity-row">
              <span>الكمية</span>
              <div className="quantity-stepper">
                <button
                  type="button"
                  onClick={() =>
                    setQty((prev) => Math.max(1, Number(prev || 1) - 1))
                  }
                >
                  −
                </button>
                <b>{safeQty}</b>
                <button
                  type="button"
                  onClick={() =>
                    setQty((prev) =>
                      Math.min(stock || 99, Number(prev || 1) + 1),
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className="product-action-row">
              <button
                type="button"
                className="product-detail-add product-cart-cta"
                onClick={handleAddQtyToCart}
                disabled={stock === 0}
              >
                {stock === 0 ? "غير متوفر" : "أضف إلى السلة"}
              </button>
              <button
                type="button"
                className="product-buy-now"
                onClick={handleAddQtyToCart}
                disabled={stock === 0}
              >
                اشتري الآن
              </button>
            </div>

            <div className="product-mini-meta">
              {product.sku && (
                <p>
                  <span>SKU</span>
                  <b>{product.sku}</b>
                </p>
              )}
              <p>
                <span>المخزون</span>
                <b>{stock > 0 ? `${stock} قطعة` : "غير متوفر"}</b>
              </p>
            </div>
          </aside>
        </section>

        <section className="product-detail-panels">
          <article>
            <h2>تفاصيل المنتج</h2>
            <p>{productDescription}</p>
          </article>
          <article>
            <h2>المميزات</h2>
            <ul>
              {fallbackFeatures.map((feature, index) => (
                <li key={`${feature}-panel-${index}`}>{feature}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2>العناية والاستخدام</h2>
            <p>{careNote}</p>
          </article>
          <article>
            <h2>الشحن والتسليم</h2>
            <p>{deliveryNote}</p>
          </article>
        </section>
      </div>

      {relatedProducts.length > 0 && (
        <section className="container product-detail-related">
          <div className="section-title">
            <span>منتجات مشابهة</span>
            <h2>قد يعجبك أيضًا</h2>
          </div>
          <div className="products-grid">
            {relatedProducts.map((item) => (
              <article
                className="product product-link-card"
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => go(productPath(item))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") go(productPath(item));
                }}
              >
                <div className="product-img">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{item.tag}</span>
                </div>
                <div className="product-body">
                  <div className="product-top">
                    <div>
                      <small>{item.brand}</small>
                      <h3>{item.name}</h3>
                    </div>
                    <em>{item.category}</em>
                  </div>
                  <div className="product-foot">
                    <div>
                      <b>{formatPrice(item.price)} ر.س</b>
                      {item.oldPrice && (
                        <del>{formatPrice(item.oldPrice)} ر.س</del>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function StoreCustomPage({ page, products, go }) {
  const label = page?.label || "صفحة";
  const slug = makePageSlug(page?.href || label);
  const keyword = label.toLowerCase();

  const pageProducts = products.filter((product) => {
    const text =
      `${product.name || ""} ${product.category || ""} ${product.brand || ""} ${product.description || ""}`.toLowerCase();

    if (
      slug.includes("offer") ||
      keyword.includes("عرض") ||
      keyword.includes("العروض")
    ) {
      return Number(product.oldPrice || 0) > Number(product.price || 0);
    }

    if (
      slug.includes("product") ||
      keyword.includes("نبات") ||
      keyword.includes("منتج")
    ) {
      return true;
    }

    return text.includes(keyword) || text.includes(slug.replace(/-/g, " "));
  });

  return (
    <main className="container store-page-view">
      <button
        type="button"
        className="primary store-page-back"
        onClick={() => go("/")}
      >
        ← رجوع للرئيسية
      </button>

      <div className="store-page-hero">
        <span>Store Page</span>
        <h1>{label}</h1>
        <p>
          هذه صفحة مستقلة داخل المتجر ويمكن التحكم باسمها ورابطها وظهورها من قسم
          الصفحات في لوحة التحكم.
        </p>
      </div>

      {pageProducts.length > 0 ? (
        <div className="products-grid store-page-products">
          {pageProducts.map((product) => (
            <article
              className="product product-link-card"
              key={product.id}
              role="button"
              tabIndex={0}
              onClick={() => go(productPath(product))}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(productPath(product));
              }}
            >
              <div className="product-img">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                />
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
                <div className="rating">
                  <Star size={15} fill="currentColor" /> {product.rating}
                </div>
                <div className="product-foot">
                  <div>
                    <b>{formatPrice(product.price)} ر.س</b>
                    {product.oldPrice && (
                      <del>{formatPrice(product.oldPrice)} ر.س</del>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="store-page-empty">
          <h2>{label}</h2>
          <p>
            لا يوجد محتوى مخصص لهذه الصفحة حتى الآن. تقدر تغيّر اسم الصفحة أو
            رابطها من لوحة التحكم.
          </p>
        </div>
      )}
    </main>
  );
}

function Account({
  customer,
  setCustomer,
  orders = [],
  coupons = [],
  go,
  settings,
}) {
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("profile");

  const currentEmail = auth.currentUser?.email || customer?.email || "";
  const currentUid = auth.currentUser?.uid || customer?.id || "";

  const myOrders = (orders || [])
    .filter(
      (order) =>
        (currentEmail &&
          (order.customerEmail === currentEmail ||
            order.email === currentEmail)) ||
        (currentUid &&
          (order.customerId === currentUid || order.uid === currentUid)),
    )
    .map((order) => ({
      ...order,
      status: order.status || "new",
      total: Number(order.total || 0),
      items: order.items || [],
    }))
    .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));

  const statusText = {
    new: "تم استلام الطلب",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي",
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
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "customers", auth.currentUser.uid), data, {
      merge: true,
    });
    setCustomer({ id: auth.currentUser.uid, ...customer, ...data });
    setMessage("تم حفظ بياناتك");
    setTimeout(() => setMessage(""), 2200);
  }

  return (
    <div className="store account-page" dir="rtl">
      <header className="store-header header-sticky-pro">
        <div className="container luxe-nav account-nav">
          <button className="luxe-logo" onClick={() => go("/")}>
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt="logo"
                loading="eager"
                decoding="async"
              />
            ) : (
              <b>حسابي</b>
            )}
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
              <p>
                إدارة بياناتك، متابعة طلباتك، الكوبونات والمحفظة من مكان واحد.
              </p>
            </div>

            <div className="account-mini-stats">
              <div>
                <b>{myOrders.length}</b>
                <small>طلب</small>
              </div>
              <div>
                <b>
                  {formatPrice(myOrders.reduce((sum, o) => sum + o.total, 0))}
                </b>
                <small>إجمالي مشتريات</small>
              </div>
            </div>
          </div>

          <div className="account-tabs-pro">
            <button
              className={tab === "profile" ? "active" : ""}
              onClick={() => setTab("profile")}
            >
              بياناتي
            </button>
            <button
              className={tab === "orders" ? "active" : ""}
              onClick={() => setTab("orders")}
            >
              طلباتي
            </button>
            <button
              className={tab === "appearance" ? "active" : ""}
              onClick={() => setTab("appearance")}
            >
              المظهر
            </button>
            <button
              className={tab === "coupons" ? "active" : ""}
              onClick={() => setTab("coupons")}
            >
              الكوبونات
            </button>
            <button
              className={tab === "wallet" ? "active" : ""}
              onClick={() => setTab("wallet")}
            >
              المحفظة
            </button>
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

                <form
                  onSubmit={saveProfile}
                  className="profile-form account-profile-grid"
                >
                  <label>
                    <span>
                      <User /> الاسم
                    </span>
                    <input
                      name="name"
                      defaultValue={
                        customer?.name || auth.currentUser?.displayName || ""
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>
                      <Mail /> الإيميل
                    </span>
                    <input value={auth.currentUser?.email || ""} disabled />
                  </label>
                  <label>
                    <span>
                      <Phone /> رقم الجوال
                    </span>
                    <input
                      name="phone"
                      defaultValue={customer?.phone || ""}
                      placeholder="+9665XXXXXXXX"
                      required
                    />
                  </label>
                  <label>
                    <span>
                      <MapPin /> المدينة
                    </span>
                    <input
                      name="city"
                      defaultValue={customer?.city || ""}
                      placeholder="الرياض"
                      required
                    />
                  </label>
                  <label className="wide">
                    <span>
                      <Home /> العنوان
                    </span>
                    <textarea
                      name="address"
                      defaultValue={customer?.address || ""}
                      placeholder="الحي، الشارع، رقم المبنى"
                      required
                    />
                  </label>
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
                  {myOrders.map((order) => (
                    <article className="customer-order-pro" key={order.id}>
                      <div className="customer-order-head">
                        <div>
                          <span>#{String(order.id || "").slice(0, 8)}</span>
                          <h3>{formatPrice(order.total)} ر.س</h3>
                          <p>{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <em className={`customer-order-status ${order.status}`}>
                          {statusText[order.status] || order.status}
                        </em>
                      </div>

                      <div className="customer-order-items">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index}>
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name || "product"}
                                loading="lazy"
                                decoding="async"
                              />
                            )}
                            <span>{item.name || "منتج"}</span>
                            <b>{item.qty || 1}x</b>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <small>+{order.items.length - 3} منتجات أخرى</small>
                        )}
                      </div>

                      <div className="customer-shipping-grid">
                        <div>
                          <span>شركة الشحن</span>
                          <b>
                            {order.shippingCompany === "other"
                              ? order.customShipping || "أخرى"
                              : order.shippingCompany || "لم تحدد بعد"}
                          </b>
                        </div>
                        <div>
                          <span>رقم التتبع</span>
                          <b>{order.trackingNumber || "لم يصدر بعد"}</b>
                        </div>
                      </div>

                      {order.trackingNumber && (
                        <a
                          className="tracking-link-customer"
                          href={getTrackingUrl(
                            order.shippingCompany,
                            order.trackingNumber,
                            order.customShipping,
                          )}
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
                      <p>
                        بعد إتمام أول طلب سيظهر هنا مع حالة الطلب والشحن
                        والتتبع.
                      </p>
                      <button
                        className="secondary product-flat-top-btn"
                        onClick={() => go("/")}
                      >
                        تصفح المنتجات
                      </button>
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
                  <span>
                    سنضيف خيارات مثل الوضع الليلي وتفضيلات العرض لاحقًا.
                  </span>
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
                  {coupons.length ? (
                    coupons
                      .slice()
                      .sort((a, b) =>
                        String(a.code || "").localeCompare(
                          String(b.code || ""),
                        ),
                      )
                      .map((coupon) => (
                        <div
                          className={`customer-coupon-card ${couponClass(coupon)}`}
                          key={coupon.id}
                        >
                          <div>
                            <span>كود الخصم</span>
                            <h3>{coupon.code}</h3>
                            <p>خصم {coupon.percent}%</p>
                          </div>
                          <div className="coupon-status-pill">
                            {couponStatus(coupon)}
                          </div>
                          <div className="coupon-meta">
                            <span>الاستخدام: مرة واحدة لكل عميل</span>
                            {couponUsedByCustomer(
                              coupon,
                              currentUid,
                              currentEmail,
                            ) && <span>تم استخدامه سابقًا</span>}
                            <span>
                              ينتهي: {coupon.expiresAt || "بدون تاريخ"}
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
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

function StoreReturnPolicy({ settings = {} }) {
  const returnDays = Number(settings.returnPolicyDays || 7);
  const items = [
    {
      title: "مدة الاسترجاع",
      text:
        settings.returnPolicyText ||
        `يمكن طلب الاسترجاع أو الاستبدال خلال ${returnDays} أيام من استلام الطلب.`,
    },
    {
      title: "حالة المنتج",
      text: "يشترط أن يكون المنتج بحالته الأصلية وغير مستخدم ومع كامل التغليف إن وجد.",
    },
    {
      title: "المنتجات المستثناة",
      text: "قد لا يشمل الاسترجاع المنتجات المتضررة بسبب سوء العناية أو المنتجات المخصصة حسب الطلب.",
    },
    {
      title: "طريقة الطلب",
      text: "للاسترجاع أو الاستبدال تواصل معنا عبر الواتساب مع رقم الطلب وصور المنتج.",
    },
  ];

  return (
    <section className="container store-return-policy" id="return-policy">
      <div className="store-return-policy-head">
        <span>Return Policy</span>
        <h2>سياسة الاسترجاع والاستبدال</h2>
        <p>
          {settings.privacyNote ||
            "حرصًا على تجربة شراء واضحة، هذه السياسة توضح أهم شروط الاسترجاع والاستبدال قبل إتمام الطلب."}
        </p>
      </div>
      <div className="store-return-policy-grid">
        {items.map((item) => (
          <div className="store-return-policy-card" key={item.title}>
            <CheckCircle2 size={20} />
            <div>
              <b>{item.title}</b>
              <p>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer({ settings }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <b>{settings.storeName}</b>
          )}
          <p>{settings.tagline}</p>
        </div>
        <div>
          <b>النباتات</b>
          <p>
            نباتات داخلية
            <br />
            أصص
            <br />
            هدايا خضراء
          </p>
        </div>
        <div>
          <b>الدعم</b>
          <p>
            الشحن
            <br />
            الدفع
            <br />
            الاستبدال
          </p>
        </div>
        <div>
          <b>تواصل</b>
          <p>
            support@greenhaven.com
            <br />
            الرياض، السعودية
          </p>
        </div>
      </div>
    </footer>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Admin({
  settings,
  setSettings,
  products,
  customers,
  orders,
  coupons = [],
  go,
  path = "/admin",
}) {
  const [tab, setTab] = useState(() => adminTabFromPath(path));
  const [openSection, setOpenSection] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(true);
  const [adminLanguage, setAdminLanguage] = useState(
    () => localStorage.getItem("adminLanguage") || "ar",
  );
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [productsViewMode, setProductsViewMode] = useState(
    () => localStorage.getItem("productsViewMode") || "cards",
  );

  useEffect(() => {
    const nextTab = adminTabFromPath(path);
    setTab((current) => (current === nextTab ? current : nextTab));
  }, [path]);

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
      unsavedDesc:
        "أي تعديل في هوية المتجر أو ثيم المتجر لن يظهر في المتجر إلا بعد الحفظ.",
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
      reportsIntro:
        "قراءة سريعة لأداء المتجر، المبيعات، الطلبات، المنتجات، والتنبيهات المهمة.",
      exportCsv: "تصدير التقرير CSV",
      thisMonth: "هذا الشهر",
      allPeriod: "كل الفترة",
      advancedFiltersLater:
        "سيتم ربط الفلاتر المتقدمة لاحقاً بدون التأثير على البيانات الحالية.",
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
      couponIntro:
        "أنشئ كوبونات خصم بنسبة مئوية. كل كوبون مخصص للاستخدام مرة واحدة لكل عميل.",
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
      logoHint:
        "يفضل رفع شعار PNG أو JPG بحجم صغير. سيتم ضغطه تلقائيًا قبل الحفظ.",
      productIntro:
        "أضف، استورد، وابحث عن المنتجات من نفس المكان بدون نماذج مفتوحة داخل الصفحة.",
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
      seo: "SEO",
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
      unsavedDesc:
        "Store identity or theme changes will not appear in the store until saved.",
      cancelChanges: "Discard changes",
      saveChanges: "Save changes",
      dashboardIntro:
        "A quick overview of store performance, orders, and sales.",
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
      reportsIntro:
        "A quick read of sales, orders, products, and important alerts.",
      exportCsv: "Export CSV report",
      thisMonth: "This month",
      allPeriod: "All time",
      advancedFiltersLater:
        "Advanced filters will be connected later without affecting current data.",
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
      couponIntro:
        "Create percentage discount coupons. Each coupon is limited to one use per customer.",
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
      logoHint:
        "PNG or JPG logo is recommended. It will be compressed before saving.",
      productIntro:
        "Add, import, and search products from one clean place without open forms on the page.",
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
      seo: "SEO",
    },
  };

  const t = (key) =>
    adminI18n[adminLanguage]?.[key] || adminI18n.ar[key] || key;
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
  const [productOptions, setProductOptions] = useState([
    { size: "", color: "", stock: "", price: "", sku: "" },
  ]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productFormTab, setProductFormTab] = useState("info");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [liveVisitorRows, setLiveVisitorRows] = useState([]);
  const [showLiveVisitors, setShowLiveVisitors] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [funnelStats, setFunnelStats] = useState({
    visit_store: 0,
    view_product: 0,
    add_to_cart: 0,
    checkout: 0,
    purchase: 0,
  });
  const [staffUsers, setStaffUsers] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationState, setNotificationState] = useState({ readKeys: {} });
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return window.Notification.permission;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "staffUsers"),
      async (snapshot) => {
        if (snapshot.empty) {
          const currentAdmin = auth.currentUser;
          if (currentAdmin?.uid) {
            await setDoc(
              doc(db, "staffUsers", currentAdmin.uid),
              {
                name: currentAdmin.displayName || "مالك المتجر",
                email: currentAdmin.email || "",
                phone: "",
                role: "owner",
                permissions: Object.keys(ADMIN_PERMISSION_LABELS),
                status: "active",
                isOwner: true,
                lastLogin: Date.now(),
                createdAtMs: Date.now(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
          setStaffUsers([]);
          return;
        }

        const rows = snapshot.docs
          .map((staffDoc) => ({ id: staffDoc.id, ...(staffDoc.data() || {}) }))
          .filter((staffUser) => !isStaffDeleted(staffUser))
          .sort((a, b) => {
            if (a.isOwner && !b.isOwner) return -1;
            if (!a.isOwner && b.isOwner) return 1;
            return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
          });

        setStaffUsers(rows);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "liveVisitors"),
      (snapshot) => {
        const now = Date.now();
        const rows = snapshot.docs
          .map((visitorDoc) => ({
            id: visitorDoc.id,
            ...(visitorDoc.data() || {}),
          }))
          .filter((visitor) => Number(visitor.lastSeen || 0) > now - 60000)
          .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));

        setLiveVisitorRows(rows);
        setLiveVisitors(rows.length);
      },
    );

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
    const unsubscribe = onSnapshot(doc(db, "store", "notificationState"), (snap) => {
      setNotificationState(
        snap.exists() ? { readKeys: {}, ...(snap.data() || {}) } : { readKeys: {} },
      );
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setBrowserPermission(window.Notification.permission);
  }, [settings.notificationsBrowser]);

  useEffect(() => {
    if (notificationFilter === "unread") return;
    const validFilters = ["all", "orders", "stock", "customers", "live", "system"];
    if (!validFilters.includes(notificationFilter)) setNotificationFilter("all");
  }, [notificationFilter]);

  useEffect(() => {
    const count = Number(notificationState?.lastUnreadCount || 0);
    if (!count) return;
    document.title = `(${count}) ${settings?.storeName || "GREEN DIXAM"}`;
    return () => {
      document.title = settings?.storeName || "GREEN DIXAM";
    };
  }, [notificationState?.lastUnreadCount, settings?.storeName]);

  useEffect(() => {
    setDoc(
      doc(db, "store", "notificationState"),
      { lastSeenAtMs: Date.now() },
      { merge: true },
    ).catch(() => {});
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setDoc(
        doc(db, "store", "notificationState"),
        { adminOnline: navigator.onLine, updatedAtMs: Date.now() },
        { merge: true },
      ).catch(() => {});
    };

    if (typeof window === "undefined") return undefined;
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "funnelEvents"),
      (snapshot) => {
        const stats = {
          visit_store: 0,
          view_product: 0,
          add_to_cart: 0,
          checkout: 0,
          purchase: 0,
        };

        snapshot.docs.forEach((eventDoc) => {
          const data = eventDoc.data() || {};
          if (stats[data.step] !== undefined) {
            stats[data.step] += 1;
          }
        });

        setFunnelStats(stats);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setImagePreview(editing?.image || "");
    setGalleryImages(Array.isArray(editing?.gallery) ? editing.gallery : []);
    const currentOptions =
      Array.isArray(editing?.options) && editing.options.length
        ? editing.options
        : [{ size: "", color: "", stock: "", price: "", sku: "" }];
    setProductOptions(
      currentOptions.map((option) => ({
        size: option.size || "",
        color: option.color || "",
        stock: option.stock ?? "",
        price: option.price ?? "",
        oldPrice: option.oldPrice ?? "",
        sku: option.sku || "",
      })),
    );
  }, [editing]);

  const updateDraft = (key, value) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraftSettings = async () => {
    const ok = await saveSettings(draftSettings);
    if (ok) setDraftSettings((prev) => ({ ...prev }));
  };

  const resetDraftSettings = () => {
    setDraftSettings(settings);
    setNotice("تم إلغاء التغييرات غير المحفوظة");
    setTimeout(() => setNotice(""), 1800);
  };

  const adminProductCategories = useMemo(
    () => [
      "all",
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products],
  );

  const filteredAdminProducts = products
    .filter((product) => {
      const q = productSearch.trim().toLowerCase();
      const searchable =
        `${product.name || ""} ${product.description || ""} ${product.category || ""} ${product.brand || ""} ${product.sku || ""}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);

      const matchesCategory =
        productCategoryFilter === "all" ||
        product.category === productCategoryFilter;

      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "active" && product.status !== "hidden") ||
        (productStatusFilter === "hidden" && product.status === "hidden") ||
        (productStatusFilter === "featured" && product.featured) ||
        (productStatusFilter === "out" && Number(product.stock || 0) <= 0);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (productSort === "price_high")
        return Number(b.price || 0) - Number(a.price || 0);
      if (productSort === "price_low")
        return Number(a.price || 0) - Number(b.price || 0);
      if (productSort === "stock_low")
        return Number(a.stock || 0) - Number(b.stock || 0);
      if (productSort === "name")
        return String(a.name || "").localeCompare(String(b.name || ""), "ar");
      if (productSort === "newest")
        return String(b.id || "").localeCompare(String(a.id || ""));
      return Number(a.order ?? 999999) - Number(b.order ?? 999999);
    });

  const toggleProductSelection = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllVisibleProducts = () => {
    const visibleIds = filteredAdminProducts.map((product) => product.id);
    const allSelected =
      visibleIds.length &&
      visibleIds.every((id) => selectedProducts.includes(id));

    setSelectedProducts((prev) => {
      if (allSelected) return prev.filter((id) => !visibleIds.includes(id));
      return [...new Set([...prev, ...visibleIds])];
    });
  };

  const clearProductSelection = () => setSelectedProducts([]);

  const bulkUpdateProducts = async (patch, successMessage) => {
    if (!selectedProducts.length) return;

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          setDoc(doc(db, "products", id), patch, { merge: true }),
        ),
      );
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

    const ok = window.confirm(
      `هل أنت متأكد من حذف ${selectedProducts.length} منتج محدد؟`,
    );
    if (!ok) return;

    try {
      await Promise.all(
        selectedProducts.map((id) => deleteDoc(doc(db, "products", id))),
      );
      setNotice("تم حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 2600);
      clearProductSelection();
    } catch (error) {
      console.error("Delete selected products failed:", error);
      setNotice("تعذر حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 3500);
    }
  };

  const deleteProduct = async (product) => {
    if (!product?.id) return;

    const ok = window.confirm(
      `هل أنت متأكد من حذف المنتج: ${product.name || "بدون اسم"}؟`,
    );
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      setEditing((current) => (current?.id === product.id ? null : current));
      setSelectedProducts((prev) => prev.filter((id) => id !== product.id));
      setNotice("تم حذف المنتج بنجاح");
      setTimeout(() => setNotice(""), 2400);
    } catch (error) {
      console.error("Delete product failed:", error);
      setNotice(
        "تعذر حذف المنتج. تأكد من الاتصال والصلاحيات ثم حاول مرة أخرى.",
      );
      setTimeout(() => setNotice(""), 4000);
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
      updatedAt: serverTimestamp(),
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
    const fromIndex = current.findIndex((product) => product.id === sourceId);
    const toIndex = current.findIndex((product) => product.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        current.map((product, index) =>
          setDoc(
            doc(db, "products", product.id),
            { order: index + 1, updatedAt: serverTimestamp() },
            { merge: true },
          ),
        ),
      );
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

    const ok = window.confirm(
      `هل أنت متأكد من حذف كل المنتجات؟ سيتم حذف ${products.length} منتج نهائيًا.`,
    );
    if (!ok) return;

    try {
      await Promise.all(
        products.map((product) => deleteDoc(doc(db, "products", product.id))),
      );
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

  const totalValue = products.reduce((n, p) => n + Number(p.price || 0), 0);

  const saveSettings = async (patch) => {
    try {
      await setDoc(
        doc(db, "store", "settings"),
        { ...settings, ...patch },
        { merge: true },
      );
      setSettings((s) => ({ ...s, ...patch }));
      setNotice("تم حفظ التغييرات بنجاح");
      setTimeout(() => setNotice(""), 2200);
      return true;
    } catch (error) {
      console.error("Save settings failed:", error);
      setNotice(
        "تعذر الحفظ. غالبًا حجم الصورة كبير، جرّب شعار أصغر أو ارفعه مرة ثانية.",
      );
      setTimeout(() => setNotice(""), 5000);
      return false;
    }
  };

  const uploadSettingImage = async (key, file) => {
    if (!file) return;

    if (key === "homeHeroVideo") {
      const maxVideoSize = 750 * 1024;
      if (file.size > maxVideoSize) {
        setNotice(
          "حجم الفيديو كبير جدًا للرفع المباشر. استخدم رابط فيديو خارجي أو ارفع فيديو أقل من 750KB.",
        );
        setTimeout(() => setNotice(""), 6000);
        return;
      }
    }

    const data = await fileToDataUrl(
      file,
      key === "logo"
        ? {
            maxWidth: 520,
            maxHeight: 220,
            quality: 0.78,
          }
        : {
            maxWidth: 1400,
            maxHeight: 900,
            quality: 0.82,
          },
    );
    updateDraft(key, data);
  };

  const uploadGalleryImages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      const uploaded = [];
      for (const file of files) {
        const data = await fileToDataUrl(file, {
          maxWidth: 1200,
          maxHeight: 1000,
          quality: 0.82,
        });
        uploaded.push(data);
      }

      setGalleryImages((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Upload gallery failed:", error);
      setNotice("تعذر رفع صور المعرض");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const makeGalleryImagePrimary = (image) => {
    setImagePreview(image);
  };

  const updateProductOption = (index, key, value) => {
    setProductOptions((prev) =>
      prev.map((option, i) =>
        i === index ? { ...option, [key]: value } : option,
      ),
    );
  };

  const addProductOption = () => {
    setProductOptions((prev) => [
      ...prev,
      { size: "", color: "", stock: "", price: "", sku: "" },
    ]);
  };

  const removeProductOption = (index) => {
    setProductOptions((prev) =>
      prev.length > 1
        ? prev.filter((_, i) => i !== index)
        : [{ size: "", color: "", stock: "", price: "", sku: "" }],
    );
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
    if (f.imageFile.files[0])
      image = await fileToDataUrl(f.imageFile.files[0], {
        maxWidth: 1100,
        maxHeight: 900,
        quality: 0.82,
      });
    const id = editing?.id || uid();
    const cleanOptions = productOptions
      .map((option) => ({
        size: String(option.size || "").trim(),
        color: String(option.color || "").trim(),
        stock: option.stock === "" ? "" : Number(option.stock || 0),
        price: option.price === "" ? "" : Number(option.price || 0),
        oldPrice:
          option.oldPrice === "" || option.oldPrice == null
            ? ""
            : Number(option.oldPrice || 0),
        sku: String(option.sku || "").trim(),
      }))
      .filter(
        (option) =>
          option.size ||
          option.color ||
          option.stock !== "" ||
          option.price !== "" ||
          option.oldPrice !== "" ||
          option.sku,
      );

    const sizes = cleanOptions.length
      ? [...new Set(cleanOptions.map((option) => option.size).filter(Boolean))]
      : String(f.sizes.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    const colors = cleanOptions.length
      ? [...new Set(cleanOptions.map((option) => option.color).filter(Boolean))]
      : String(f.colors.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    const gallery = [
      ...new Set(
        [image || editing?.image || "", ...galleryImages].filter(Boolean),
      ),
    ];

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
      seoSlug: makePageSlug(
        f.seoSlug?.value?.trim() || f.name.value.trim() || id,
        id,
      ),
      seoTitle: f.seoTitle?.value?.trim() || "",
      seoDescription: f.seoDescription?.value?.trim() || "",
      stock: Number(f.stock.value || 0),
      sku: f.sku.value.trim(),
      status: f.status.value,
      featured: f.featured.checked,
      image: image || editing?.image || "",
      gallery,
      order: editing?.order ?? Date.now(),
      createdAt: editing?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
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
        if (
          row[key] !== undefined &&
          row[key] !== null &&
          String(row[key]).trim() !== ""
        )
          return row[key];
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
      brand: String(
        pick("brand", "النوع/المورد", "المورد") || "GREEN DIXAM",
      ).trim(),
      category: String(pick("category", "القسم") || "نباتات داخلية").trim(),
      price,
      oldPrice: Number(oldPriceRaw || price),
      rating: Number(pick("rating", "التقييم") || 4.8),
      sizes: String(
        pick("sizes", "الأحجام/الخيارات", "الخيارات") || "صغير,متوسط,كبير",
      ).trim(),
      tag: String(pick("tag", "الشارة") || "Rare").trim(),
      description: String(pick("description", "الوصف") || "").trim(),
      stock: Number(pick("stock", "المخزون") || 0),
      sku: String(pick("sku", "SKU") || "").trim(),
      status: String(pick("status", "الحالة") || "active").trim(),
      featured:
        String(pick("featured", "مميز") || "").toLowerCase() === "true" ||
        String(pick("featured", "مميز") || "") === "نعم",
      image,
      gallery: galleryImages,
      colors:
        f.colors?.value
          ?.split(",")
          .map((v) => v.trim())
          .filter(Boolean) || [],
      seoTitle: f.seoTitle?.value?.trim() || "",
      seoDescription: f.seoDescription?.value?.trim() || "",
      updatedAt: serverTimestamp(),
    };
  };

  const downloadProductsTemplate = async () => {
    const rows = [
      {
        "اسم المنتج": "مونستيرا فاخرة",
        "النوع/المورد": "Monstera",
        القسم: "نباتات داخلية",
        السعر: 189,
        "السعر قبل الخصم": 239,
        المخزون: 12,
        SKU: "GD-PLANT-001",
        الحالة: "active",
        التقييم: 4.9,
        الشارة: "Luxury",
        "الأحجام/الخيارات": "صغير,متوسط,كبير",
        "رابط الصورة":
          "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1200&q=80",
        الوصف: "نبتة داخلية فاخرة تضيف لمسة طبيعية راقية.",
        مميز: "نعم",
      },
      {
        "اسم المنتج": "أصيص سيراميك ذهبي",
        "النوع/المورد": "Golden Ceramic",
        القسم: "أصص فاخرة",
        السعر: 89,
        "السعر قبل الخصم": 119,
        المخزون: 25,
        SKU: "GD-POT-002",
        الحالة: "active",
        التقييم: 4.8,
        الشارة: "Gold",
        "الأحجام/الخيارات": "S,M,L",
        "رابط الصورة":
          "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80",
        الوصف: "أصيص أنيق يناسب النباتات الداخلية.",
        مميز: "لا",
      },
    ];

    const helpRows = [
      ["تعليمات"],
      ["لا تغيّر أسماء الأعمدة حتى يتم الاستيراد بشكل صحيح."],
      ["الحالة: active للظهور أو hidden للإخفاء."],
      ["مميز: اكتب نعم أو true إذا تريد المنتج مميز."],
      ["رابط الصورة يجب أن يكون رابط مباشر لصورة."],
      ["السعر والمخزون والتقييم أرقام فقط."],
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
      setNotice(
        `تم تجهيز ${productsToImport.length} منتج للمعاينة. اضغط حفظ المنتجات المستوردة للتأكيد.`,
      );
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
    const code = String(f.code.value || "")
      .trim()
      .toUpperCase();
    const percent = Number(f.percent.value || 0);
    const expiresAt = f.expiresAt.value || "";

    if (!code || percent <= 0 || percent > 100) {
      setNotice("تأكد من إدخال كود صحيح ونسبة بين 1 و 100");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    await setDoc(
      doc(db, "coupons", code),
      {
        code,
        percent,
        active: f.active.checked,
        usage: "once_per_customer",
        type: "percent",
        expiresAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setNotice("تم حفظ الكوبون");
    setTimeout(() => setNotice(""), 2500);
    f.reset();
  };

  const toggleCoupon = async (coupon) => {
    await setDoc(
      doc(db, "coupons", coupon.id),
      {
        active: !coupon.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const dashboardOrders = orders.map((o) => ({
    ...o,
    total: Number(o.total || 0),
    items: o.items || [],
  }));

  const todayOrders = dashboardOrders.filter(
    (o) => orderTimestamp(o.createdAt) >= todayStart.getTime(),
  );
  const weekOrders = dashboardOrders.filter(
    (o) => orderTimestamp(o.createdAt) >= weekStart.getTime(),
  );
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSales = dashboardOrders.reduce((sum, o) => sum + o.total, 0);

  const productSalesMap = {};
  dashboardOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.name || "منتج غير معروف";
      if (!productSalesMap[key])
        productSalesMap[key] = {
          name: key,
          qty: 0,
          value: 0,
          image: item.image || "",
        };
      productSalesMap[key].qty += Number(item.qty || 1);
      productSalesMap[key].value +=
        Number(item.price || 0) * Number(item.qty || 1);
      if (!productSalesMap[key].image && item.image)
        productSalesMap[key].image = item.image;
    });
  });

  const topProduct = Object.values(productSalesMap).sort(
    (a, b) => b.qty - a.qty,
  )[0];

  const adminBestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const pendingOrdersCount = dashboardOrders.filter((o) =>
    ["new", "processing"].includes(o.status || "new"),
  ).length;
  const lowStockProducts = products.filter(
    (p) => Number(p.stock || 0) <= 3 && p.status !== "hidden",
  );
  const activeProductsCount = products.filter(
    (p) => p.status !== "hidden",
  ).length;
  const averageOrderValue = dashboardOrders.length
    ? Math.round(totalSales / dashboardOrders.length)
    : 0;

  const reportStatusLabels = {
    new: "جديد",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي",
    canceled: "ملغي",
  };

  const reportStatusRows = Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const key = order.status || "new";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({
    status,
    label: reportStatusLabels[status] || status,
    count,
    percent: dashboardOrders.length
      ? Math.round((count / dashboardOrders.length) * 100)
      : 0,
  }));

  const reportCityRows = Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const city =
        order.city || order.shippingCity || order.address?.city || "غير محدد";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const reportSalesRows = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const value = dashboardOrders
      .filter((order) => {
        const time = orderTimestamp(order.createdAt);
        return time >= day.getTime() && time < nextDay.getTime();
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      label: day.toLocaleDateString("ar-SA", { weekday: "short" }),
      value,
    };
  });

  const maxReportSales = Math.max(
    ...reportSalesRows.map((row) => row.value),
    1,
  );
  const newCustomersCount = customers.filter(
    (customer) => orderTimestamp(customer.createdAt) >= weekStart.getTime(),
  ).length;
  const usedCouponsCount = coupons.reduce(
    (sum, coupon) => sum + Object.keys(coupon.usedBy || {}).length,
    0,
  );

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
      ["coupon_uses", usedCouponsCount],
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
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
    {
      label: "طلبات تحتاج متابعة",
      value: pendingOrdersCount,
      tone: pendingOrdersCount ? "warning" : "good",
      icon: <Bell size={18} />,
    },
    {
      label: "منتجات منخفضة المخزون",
      value: lowStockProducts.length,
      tone: lowStockProducts.length ? "warning" : "good",
      icon: <AlertTriangle size={18} />,
    },
    {
      label: "منتجات ظاهرة",
      value: activeProductsCount,
      tone: "neutral",
      icon: <CheckCircle2 size={18} />,
    },
    {
      label: "متوسط الطلب",
      value: `${formatPrice(averageOrderValue)} ر.س`,
      tone: "neutral",
      icon: <TrendingUp size={18} />,
    },
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
    ? Math.round(
        liveVisitorRows.reduce(
          (sum, visitor) => sum + Number(visitor.sessionDuration || 0),
          0,
        ) / liveVisitorRows.length,
      )
    : 0;

  const notificationReadKeys = notificationState?.readKeys || {};
  const lowStockThreshold = Math.max(0, Number(settings.lowStockThreshold ?? 3));
  const highValueOrderThreshold = Math.max(
    0,
    Number(settings.highValueOrderThreshold || 500),
  );
  const notificationItems = useMemo(() => {
    const items = [];
    const now = Date.now();
    const readMap = notificationReadKeys || {};
    const enabled = (key) => settings[key] !== false;

    if (enabled("notifyNewOrders")) {
      dashboardOrders
        .filter((order) => ["new", "processing"].includes(order.status || "new"))
        .slice(0, 30)
        .forEach((order) => {
          const time = orderTimestamp(order.createdAt) || now;
          const isNew = (order.status || "new") === "new";
          items.push({
            key: `order-${order.id}`,
            type: "orders",
            tone: isNew ? "urgent" : "warning",
            title: isNew ? "طلب جديد يحتاج تأكيد" : "طلب قيد التجهيز",
            message: `${order.customerName || order.name || "عميل"} - ${formatPrice(order.total)} ر.س`,
            meta: formatOrderDate(order.createdAt),
            time,
            icon: "order",
            actionLabel: "فتح الطلبات",
            tab: "orders",
          });
        });
    }

    if (enabled("notifyHighValueOrders") && highValueOrderThreshold > 0) {
      dashboardOrders
        .filter((order) => Number(order.total || 0) >= highValueOrderThreshold)
        .slice(0, 12)
        .forEach((order) => {
          const time = orderTimestamp(order.createdAt) || now;
          items.push({
            key: `high-order-${order.id}`,
            type: "orders",
            tone: "success",
            title: "طلب بقيمة عالية",
            message: `${order.customerName || order.name || "عميل"} وصل إلى ${formatPrice(order.total)} ر.س`,
            meta: `الحد: ${formatPrice(highValueOrderThreshold)} ر.س`,
            time,
            icon: "trend",
            actionLabel: "مراجعة الطلب",
            tab: "orders",
          });
        });
    }

    if (enabled("notifyLowStock")) {
      products
        .filter(
          (product) =>
            product.status !== "hidden" &&
            Number(product.stock || 0) <= lowStockThreshold,
        )
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 20)
        .forEach((product, index) => {
          items.push({
            key: `stock-${product.id}`,
            type: "stock",
            tone: Number(product.stock || 0) <= 0 ? "danger" : "warning",
            title:
              Number(product.stock || 0) <= 0
                ? "منتج نفد من المخزون"
                : "مخزون منخفض",
            message: `${product.name || "منتج"} - المتبقي ${Number(product.stock || 0)}`,
            meta: product.category || "المنتجات",
            time: orderTimestamp(product.updatedAt) || now - 1000 * (index + 1),
            icon: "stock",
            actionLabel: "فتح المنتجات",
            tab: "products",
          });
        });
    }

    if (enabled("notifyCustomers")) {
      customers
        .filter((customer) => orderTimestamp(customer.createdAt) >= weekStart.getTime())
        .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt))
        .slice(0, 12)
        .forEach((customer) => {
          const time = orderTimestamp(customer.createdAt) || now;
          items.push({
            key: `customer-${customer.id}`,
            type: "customers",
            tone: "neutral",
            title: "عميل جديد سجّل في المتجر",
            message: customer.name || customer.email || "عميل جديد",
            meta: formatOrderDate(customer.createdAt),
            time,
            icon: "customer",
            actionLabel: "فتح العملاء",
            tab: "customers",
          });
        });
    }

    if (enabled("notifyLiveEvents")) {
      liveEvents.slice(0, 15).forEach((event) => {
        const time = Number(event.createdAtMs || 0) || now;
        items.push({
          key: `live-${event.id}`,
          type: "live",
          tone: event.type === "checkout" ? "urgent" : "neutral",
          title: event.title || "نشاط مباشر في المتجر",
          message: event.path || "/",
          meta: event.type === "cart" ? "سلة" : event.type === "checkout" ? "إتمام طلب" : "مباشر",
          time,
          icon: "live",
          actionLabel: "فتح لوحة التحكم",
          tab: "dashboard",
        });
      });
    }

    if (settings.storeStatus && settings.storeStatus !== "open") {
      items.push({
        key: `system-store-${settings.storeStatus}`,
        type: "system",
        tone: "danger",
        title: "حالة المتجر ليست مفتوحة",
        message:
          settings.storeStatus === "maintenance"
            ? "المتجر في وضع الصيانة"
            : "الطلبات متوقفة مؤقتًا",
        meta: "الإعدادات",
        time: now,
        icon: "system",
        actionLabel: "فتح الإعدادات",
        tab: "settings",
      });
    }

    return items
      .map((item) => ({ ...item, read: Boolean(readMap[item.key]) }))
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
  }, [
    dashboardOrders,
    products,
    customers,
    liveEvents,
    settings.notifyNewOrders,
    settings.notifyHighValueOrders,
    settings.notifyLowStock,
    settings.notifyCustomers,
    settings.notifyLiveEvents,
    settings.storeStatus,
    settings.lowStockThreshold,
    settings.highValueOrderThreshold,
    notificationReadKeys,
    weekStart,
  ]);

  const unreadNotificationsCount = notificationItems.filter((item) => !item.read).length;
  const notificationCounts = notificationItems.reduce(
    (acc, item) => {
      acc.all += 1;
      acc[item.type] = (acc[item.type] || 0) + 1;
      if (!item.read) acc.unread += 1;
      return acc;
    },
    { all: 0, unread: 0 },
  );
  const filteredNotificationItems = notificationItems.filter((item) => {
    if (notificationFilter === "all") return true;
    if (notificationFilter === "unread") return !item.read;
    return item.type === notificationFilter;
  });

  useEffect(() => {
    setDoc(
      doc(db, "store", "notificationState"),
      {
        lastUnreadCount: unreadNotificationsCount,
        lastNotificationAtMs: notificationItems[0]?.time || 0,
        updatedAtMs: Date.now(),
      },
      { merge: true },
    ).catch(() => {});
  }, [unreadNotificationsCount, notificationItems[0]?.time]);

  const saveNotificationState = async (patch) => {
    try {
      await setDoc(
        doc(db, "store", "notificationState"),
        { ...patch, updatedAt: serverTimestamp(), updatedAtMs: Date.now() },
        { merge: true },
      );
    } catch (error) {
      console.error("Save notification state failed:", error);
      setNotice("تعذر تحديث حالة الإشعارات");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const markNotificationRead = async (key) => {
    if (!key) return;
    await saveNotificationState({
      readKeys: { ...notificationReadKeys, [key]: Date.now() },
    });
  };

  const markAllNotificationsRead = async () => {
    const nextReadKeys = { ...notificationReadKeys };
    notificationItems.forEach((item) => {
      nextReadKeys[item.key] = nextReadKeys[item.key] || Date.now();
    });
    await saveNotificationState({ readKeys: nextReadKeys });
    setNotice("تم تعليم كل الإشعارات كمقروءة");
    setTimeout(() => setNotice(""), 2200);
  };

  const clearNotificationReads = async () => {
    await saveNotificationState({ readKeys: {} });
    setNotice("تم إعادة إظهار الإشعارات كمستجدة");
    setTimeout(() => setNotice(""), 2200);
  };

  const requestBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotice("المتصفح لا يدعم إشعارات سطح المكتب");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      await saveSettings({ notificationsBrowser: true });
      new window.Notification(settings.storeName || "GREEN DIXAM", {
        body: "تم تفعيل إشعارات المتصفح للوحة التحكم",
      });
      setNotice("تم تفعيل إشعارات المتصفح");
    } else {
      await saveSettings({ notificationsBrowser: false });
      setNotice("لم يتم السماح بإشعارات المتصفح");
    }
    setTimeout(() => setNotice(""), 3000);
  };

  const themeSections = [
    {
      id: "header",
      label: "الهيدر",
      titleKey: "homeHeaderTitle",
      descKey: "homeHeaderSubtitle",
      imageKey: "homeHeaderImage",
      headerExtra: true,
    },
    {
      id: "hero",
      label: "الهيرو",
      titleKey: "homeHeroTitle",
      descKey: "homeHeroDesc",
      imageKey: "homeHeroImage",
      buttonKey: "homeHeroButton",
      heroExtra: true,
    },
    {
      id: "pages",
      label: "الصفحات",
      titleKey: "homePagesTitle",
      descKey: "",
      imageKey: "",
      pagesExtra: true,
    },
    {
      id: "plants",
      label: "أقسام النباتات",
      titleKey: "homePlantSectionsTitle",
      descKey: "homePlantSectionsDesc",
      imageKey: "homePlantSectionsImage",
    },
    {
      id: "care",
      label: "شريط العناية",
      titleKey: "homeCareTitle",
      descKey: "homeCareDesc",
      imageKey: "homeCareImage",
    },
    {
      id: "offer",
      label: "بنر العروض",
      titleKey: "homeOfferTitle",
      descKey: "homeOfferDesc",
      imageKey: "homeOfferImage",
    },
    {
      id: "products",
      label: "المنتجات",
      titleKey: "homeProductsTitle",
      descKey: "homeProductsDesc",
      imageKey: "",
    },
  ];

  const selectedThemeSection = themeSections.find(
    (section) => section.id === openSection,
  );
  const goToThemeSection = (sectionId) => {
    setTab("homepage");
    setOpenSection(sectionId);
    setThemeMenuOpen(true);
  };
  const changeAdminLanguage = (language) => {
    setAdminLanguage(language);
    localStorage.setItem("adminLanguage", language);
    setLanguageMenuOpen(false);
    setNotice(
      language === "ar"
        ? "تم اختيار اللغة العربية"
        : "English language selected",
    );
    setTimeout(() => setNotice(""), 1800);
  };

  const changeProductsViewMode = (mode) => {
    setProductsViewMode(mode);
    localStorage.setItem("productsViewMode", mode);
  };

  const currentAdminUser = auth.currentUser;
  const currentStaffProfile = useMemo(() => {
    const email = String(currentAdminUser?.email || "").toLowerCase();
    const uidValue = currentAdminUser?.uid || "";
    return (
      staffUsers.find(
        (user) =>
          user.id === uidValue ||
          String(user.email || "").toLowerCase() === email,
      ) || null
    );
  }, [staffUsers, currentAdminUser?.email, currentAdminUser?.uid]);

  const expandPermissionsForNewTabs = (profile = {}) => {
    const allPermissions = Object.keys(ADMIN_PERMISSION_LABELS);
    const roleText = String(profile?.role || "").toLowerCase();
    if (
      profile?.isOwner ||
      roleText === "owner" ||
      String(profile?.role || "").includes("مالك")
    ) {
      return allPermissions;
    }

    const normalized = normalizeStaffPermissions(profile?.permissions);
    const legacyFullAccess = [
      "dashboard",
      "reports",
      "identity",
      "homepage",
      "products",
      "orders",
      "customers",
      "coupons",
      "users",
    ];

    if (legacyFullAccess.every((permission) => normalized.includes(permission))) {
      return allPermissions;
    }

    const expanded = [...normalized];
    if (
      (normalized.includes("identity") || normalized.includes("homepage") || normalized.includes("users")) &&
      !expanded.includes("settings")
    ) {
      expanded.push("settings");
    }
    if (
      (normalized.includes("orders") || normalized.includes("reports") || normalized.includes("customers")) &&
      !expanded.includes("notifications")
    ) {
      expanded.push("notifications");
    }

    return [...new Set(expanded)].filter((permission) => ADMIN_PERMISSION_LABELS[permission]);
  };

  const currentPermissions = useMemo(() => {
    if (!staffUsers.length) return Object.keys(ADMIN_PERMISSION_LABELS);
    if (!currentStaffProfile) return Object.keys(ADMIN_PERMISSION_LABELS);
    if (isStaffDisabled(currentStaffProfile)) return [];
    return expandPermissionsForNewTabs(currentStaffProfile);
  }, [staffUsers, currentStaffProfile]);

  useEffect(() => {
    if (!currentStaffProfile?.id || !currentPermissions.length) return;

    const storedPermissions = normalizeStaffPermissions(currentStaffProfile.permissions);
    const shouldUpdatePermissions =
      currentPermissions.length !== storedPermissions.length ||
      currentPermissions.some((permission) => !storedPermissions.includes(permission));

    if (!shouldUpdatePermissions) return;

    setDoc(
      doc(db, "staffUsers", currentStaffProfile.id),
      {
        permissions: currentPermissions,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});

    if (currentAdminUser?.uid) {
      setDoc(
        doc(db, "admins", currentAdminUser.uid),
        {
          permissions: currentPermissions,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => {});
    }
  }, [currentStaffProfile?.id, currentPermissions.join("|"), currentAdminUser?.uid]);

  const canAccessAdminSection = (permission) =>
    currentPermissions.includes(permission);
  const tabPermission = {
    dashboard: "dashboard",
    reports: "reports",
    identity: "identity",
    homepage: "homepage",
    products: "products",
    orders: "orders",
    customers: "customers",
    coupons: "coupons",
    settings: "settings",
    notifications: "notifications",
    users: "users",
  };
  const accessibleTabs = Object.keys(tabPermission).filter((key) =>
    canAccessAdminSection(tabPermission[key]),
  );

  useEffect(() => {
    if (!accessibleTabs.length) return;
    const requiredPermission = tabPermission[tab];
    if (requiredPermission && !canAccessAdminSection(requiredPermission)) {
      setTab(accessibleTabs[0]);
      setNotice("لا تملك صلاحية الوصول لهذا القسم");
      setTimeout(() => setNotice(""), 2600);
    }
  }, [tab, currentPermissions.join("|")]);

  const renderAdminNavButton = (
    tabKey,
    permissionKey,
    icon,
    label,
    onClick,
  ) => {
    if (!canAccessAdminSection(permissionKey)) return null;
    return (
      <button
        className={tab === tabKey ? "on" : ""}
        onClick={onClick || (() => setTab(tabKey))}
      >
        {icon} {label}
      </button>
    );
  };

  const noPermissionCard = (sectionLabel = "هذا القسم") => (
    <section className="admin-card admin-permission-denied">
      <Lock size={28} />
      <h2>لا تملك صلاحية الوصول</h2>
      <p>
        حسابك لا يملك صلاحية الدخول إلى {sectionLabel}. تواصل مع مالك المتجر
        لتعديل صلاحياتك.
      </p>
    </section>
  );

  const mustForceStaffPasswordChange = Boolean(
    currentStaffProfile?.mustChangePassword && !currentStaffProfile?.isOwner,
  );

  return (
    <div
      className={`admin admin-lang-${adminLanguage} ${mustForceStaffPasswordChange ? "admin-password-change-locked" : ""}`}
      dir={adminLanguage === "ar" ? "rtl" : "ltr"}
    >
      {mustForceStaffPasswordChange && (
        <StaffTemporaryPasswordGate
          staffProfile={currentStaffProfile}
          settings={settings}
        />
      )}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          {settings.logo ? (
            <img
              className="admin-brand-logo"
              src={settings.logo}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <b>{settings.storeName}</b>
          )}
          <span>{t("adminPanel")}</span>
        </div>
        {renderAdminNavButton(
          "dashboard",
          "dashboard",
          <LayoutDashboard />,
          t("home"),
        )}
        {renderAdminNavButton(
          "reports",
          "reports",
          <TrendingUp />,
          t("reports"),
        )}
        {renderAdminNavButton(
          "identity",
          "identity",
          <Palette />,
          t("identity"),
        )}
        {canAccessAdminSection("homepage") && (
          <div className="admin-menu-group">
            <button
              className={tab === "homepage" ? "on" : ""}
              onClick={() => {
                setTab("homepage");
                setThemeMenuOpen(!themeMenuOpen);
              }}
            >
              <Home /> {t("storeTheme")}{" "}
              <span className="admin-menu-chevron">
                {themeMenuOpen ? "−" : "+"}
              </span>
            </button>
            {themeMenuOpen && (
              <div className="admin-submenu">
                {themeSections.map((section) => (
                  <button
                    key={section.id}
                    className={
                      tab === "homepage" && openSection === section.id
                        ? "on"
                        : ""
                    }
                    onClick={() => goToThemeSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {renderAdminNavButton(
          "orders",
          "orders",
          <ClipboardList />,
          t("orders"),
        )}
        {renderAdminNavButton(
          "customers",
          "customers",
          <Users />,
          t("customers"),
        )}
        {renderAdminNavButton(
          "products",
          "products",
          <PackagePlus />,
          t("products"),
        )}
        {renderAdminNavButton("coupons", "coupons", <Palette />, t("coupons"))}
        {renderAdminNavButton("users", "users", <Users />, t("users"))}
        {renderAdminNavButton(
          "settings",
          "settings",
          <Settings />,
          t("settings"),
        )}
        {renderAdminNavButton(
          "notifications",
          "notifications",
          <Bell />,
          t("notifications"),
        )}

        <div className="admin-sidebar-card">
          <span>{t("pulse")}</span>
          <b>{liveVisitors}</b>
          <small>{t("activeNow")}</small>
        </div>

        <div className="side-bottom">
          <button onClick={() => signOut(auth)}>
            <LogOut /> {t("logout")}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {tab === "dashboard" && canAccessAdminSection("dashboard") && (
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
                  <Languages size={18} />
                  <span>
                    {adminLanguage === "ar" ? t("arabic") : t("english")}
                  </span>
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
              <button
                type="button"
                className="modern-admin-icon-btn"
                onClick={() => go("/")}
                title={t("previewStore")}
              >
                <ExternalLink size={18} />
                <span>{t("preview")}</span>
              </button>
              <div className="modern-admin-pill">
                <Clock size={16} />
                <span>{formatOrderDate(new Date())}</span>
              </div>
              <div className="modern-admin-live">
                <span className="live-dot" />
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
              <button className="admin-secondary" onClick={resetDraftSettings}>
                {t("cancelChanges")}
              </button>
              <button className="admin-primary" onClick={saveDraftSettings}>
                {t("saveChanges")}
              </button>
            </div>
          </div>
        )}

        {tab === "dashboard" && canAccessAdminSection("dashboard") && (
          <section className="dashboard-pro-page">
            <div className="admin-health-grid">
              {adminHealthCards.map((card) => (
                <div
                  className={`admin-health-card ${card.tone}`}
                  key={card.label}
                >
                  <div>{card.icon}</div>
                  <span>{card.label}</span>
                  <b>{card.value}</b>
                </div>
              ))}
            </div>

            {(canAccessAdminSection("settings") ||
              canAccessAdminSection("notifications")) && (
              <div className="dashboard-quick-access-grid">
                {canAccessAdminSection("settings") && (
                  <button
                    type="button"
                    className="dashboard-quick-access-card settings"
                    onClick={() => setTab("settings")}
                  >
                    <Settings size={24} />
                    <span>الإعدادات جاهزة</span>
                    <b>تشغيل المتجر والشحن والتواصل</b>
                    <small>اضغط هنا لتعديل الإعدادات العامة.</small>
                  </button>
                )}
                {canAccessAdminSection("notifications") && (
                  <button
                    type="button"
                    className="dashboard-quick-access-card notifications"
                    onClick={() => setTab("notifications")}
                  >
                    <Bell size={24} />
                    <span>مركز الإشعارات جاهز</span>
                    <b>{unreadNotificationsCount} إشعار غير مقروء</b>
                    <small>طلبات، مخزون، عملاء، وأحداث مباشرة.</small>
                  </button>
                )}
              </div>
            )}

            <div className="dashboard-stats-grid">
              <button
                type="button"
                className="dash-stat-card live-visitors-card live-visitors-clickable"
                onClick={() => setShowLiveVisitors(true)}
              >
                <span>{t("visitorsNow")}</span>
                <b>{liveVisitors}</b>
                <small>
                  <i></i> مباشر الآن
                </small>
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
                  {topLivePages.length ? (
                    topLivePages.map(([page, count]) => (
                      <div className="live-mini-row" key={page}>
                        <span>{page}</span>
                        <b>{count}</b>
                      </div>
                    ))
                  ) : (
                    <p>{t("noData")}</p>
                  )}
                </div>

                <div className="live-analytics-box">
                  <h3>{t("trafficSource")}</h3>
                  {topSources.length ? (
                    topSources.map(([source, count]) => (
                      <div className="live-mini-row" key={source}>
                        <span>{source}</span>
                        <b>{count}</b>
                      </div>
                    ))
                  ) : (
                    <p>{t("noData")}</p>
                  )}
                </div>

                <div className="live-analytics-box">
                  <h3>{t("sessionDuration")}</h3>
                  <div className="live-duration-big">
                    {formatDuration(averageSessionDuration)}
                  </div>
                  <p>{t("sessionDurationDesc")}</p>
                </div>

                <div className="live-analytics-box live-events-box">
                  <h3>{t("liveNotifications")}</h3>
                  {liveEvents.length ? (
                    liveEvents.slice(0, 5).map((event) => (
                      <div
                        className={`live-event-row ${event.type || ""}`}
                        key={event.id}
                      >
                        <span>{event.title || "نشاط مباشر"}</span>
                        <small>{event.path || "/"}</small>
                      </div>
                    ))
                  ) : (
                    <p>{t("noLiveEvents")}</p>
                  )}
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
                    {topProduct.image ? (
                      <img
                        src={topProduct.image}
                        alt={topProduct.name || "منتج"}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="top-product-placeholder">🌿</div>
                    )}
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
                    .sort(
                      (a, b) =>
                        orderTimestamp(b.createdAt) -
                        orderTimestamp(a.createdAt),
                    )
                    .slice(0, 5)
                    .map((o) => (
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
                  <div>
                    <span>{t("products")}</span>
                    <b>{products.length}</b>
                  </div>
                  <div>
                    <span>{t("customers")}</span>
                    <b>{customers.length}</b>
                  </div>
                  <div>
                    <span>{t("orders")}</span>
                    <b>{orders.length}</b>
                  </div>
                  <div>
                    <span>{t("inventory")}</span>
                    <b>
                      {products.reduce(
                        (sum, p) => sum + Number(p.stock || 0),
                        0,
                      )}
                    </b>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && canAccessAdminSection("reports") && (
          <section className="reports-pro-page">
            <div className="reports-hero-card admin-card">
              <div>
                <span>Reports Center</span>
                <h2>{t("reportsCenter")}</h2>
                <p>{t("reportsIntro")}</p>
              </div>
              <div className="reports-hero-actions">
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={exportReportsCsv}
                >
                  {t("exportCsv")}
                </button>
                <div className="reports-update-pill">
                  <b>{formatOrderDate(new Date())}</b>
                  <small>{t("lastUpdate")}</small>
                </div>
              </div>
            </div>

            <div className="reports-filter-strip admin-card">
              <button className="active" type="button">
                {t("last7Days")}
              </button>
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
                  {reportSalesRows.map((row) => (
                    <div className="reports-bar-item" key={row.label}>
                      <div className="reports-bar-track">
                        <i
                          style={{
                            height: `${Math.max(8, Math.round((row.value / maxReportSales) * 100))}%`,
                          }}
                        />
                      </div>
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
                  {reportStatusRows.length ? (
                    reportStatusRows.map((row) => (
                      <div className="reports-status-row" key={row.status}>
                        <div>
                          <b>{row.label}</b>
                          <span>{row.count} طلب</span>
                        </div>
                        <div className="reports-progress">
                          <i style={{ width: `${row.percent}%` }} />
                        </div>
                        <em>{row.percent}%</em>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty">لا توجد طلبات بعد</div>
                  )}
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
                  {adminBestSellers.length ? (
                    adminBestSellers.map((product, index) => (
                      <div className="reports-list-row" key={product.name}>
                        <strong>{index + 1}</strong>
                        <div>
                          <b>{product.name}</b>
                          <span>{product.qty} قطعة مباعة</span>
                        </div>
                        <em>{formatPrice(product.value)} ر.س</em>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty">{t("noSalesYet")}</div>
                  )}
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
                  {reportCityRows.length ? (
                    reportCityRows.map(([city, count]) => (
                      <div className="reports-list-row" key={city}>
                        <strong>•</strong>
                        <div>
                          <b>{city}</b>
                          <span>{count} طلب</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty">{t("noCityData")}</div>
                  )}
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
                  <div>
                    <b>{pendingOrdersCount}</b>
                    <span>{t("ordersNeedFollow")}</span>
                  </div>
                  <div>
                    <b>{lowStockProducts.length}</b>
                    <span>{t("lowStockProducts")}</span>
                  </div>
                  <div>
                    <b>{newCustomersCount}</b>
                    <span>{t("newCustomersWeek")}</span>
                  </div>
                  <div>
                    <b>{usedCouponsCount}</b>
                    <span>{t("couponUses")}</span>
                  </div>
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
                {dashboardOrders
                  .slice()
                  .sort(
                    (a, b) =>
                      orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt),
                  )
                  .slice(0, 6)
                  .map((order) => (
                    <div className="reports-table-row" key={order.id}>
                      <b>{order.name || order.customerName || "طلب عميل"}</b>
                      <span>{formatOrderDate(order.createdAt)}</span>
                      <span>
                        {reportStatusLabels[order.status || "new"] ||
                          order.status ||
                          "جديد"}
                      </span>
                      <em>{formatPrice(order.total)} ر.س</em>
                    </div>
                  ))}
                {dashboardOrders.length === 0 && (
                  <div className="dashboard-empty">{t("noOrdersYet")}</div>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "coupons" && canAccessAdminSection("coupons") && (
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
                    <input
                      name="percent"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      required
                    />
                  </Control>

                  <Control label="تاريخ الانتهاء">
                    <input name="expiresAt" type="date" />
                  </Control>

                  <Control label="عنوان SEO">
                    <input
                      name="seoTitle"
                      defaultValue={editing?.seoTitle || ""}
                      placeholder="عنوان يظهر في Google"
                    />
                  </Control>

                  <Control label="وصف SEO">
                    <textarea
                      name="seoDescription"
                      defaultValue={editing?.seoDescription || ""}
                      placeholder="وصف مختصر لمحركات البحث"
                    />
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
                  {coupons.map((coupon) => {
                    const expired =
                      coupon.expiresAt &&
                      new Date(coupon.expiresAt) < new Date();
                    return (
                      <div
                        className={`admin-coupon-card ${coupon.active ? "active" : "disabled"} ${expired ? "expired" : ""}`}
                        key={coupon.id}
                      >
                        <div>
                          <span>{t("discountCode")}</span>
                          <h3>{coupon.code}</h3>
                          <p>
                            خصم {coupon.percent}% • استخدام مرة واحدة لكل عميل
                          </p>
                          <small>
                            تم استخدامه:{" "}
                            {Object.keys(coupon.usedBy || {}).length} مرة
                          </small>
                          <small>
                            ينتهي: {coupon.expiresAt || "بدون تاريخ"}
                          </small>
                        </div>

                        <div className="coupon-actions">
                          <button
                            className="admin-secondary"
                            onClick={() => toggleCoupon(coupon)}
                          >
                            {coupon.active ? "إيقاف" : "تفعيل"}
                          </button>
                          <button
                            className="danger-action"
                            onClick={() =>
                              deleteDoc(doc(db, "coupons", coupon.id))
                            }
                          >
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

        {tab === "identity" && canAccessAdminSection("identity") && (
          <section className="admin-grid">
            <div className="admin-card">
              <h2>{t("readyColors")}</h2>
              <div className="palette-grid">
                {palettes.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setDraftSettings((s) => ({ ...s, ...p }))}
                  >
                    <span>{p.name}</span>
                    <i style={{ background: p.primaryColor }} />
                    <i style={{ background: p.accentColor }} />
                    <i style={{ background: p.backgroundColor }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-card">
              <h2>{t("editIdentity")}</h2>
              <Control label="اسم المتجر">
                <input
                  value={draftSettings.storeName}
                  onChange={(e) => updateDraft("storeName", e.target.value)}
                />
              </Control>
              <Control label="الوصف القصير">
                <input
                  value={draftSettings.tagline}
                  onChange={(e) => updateDraft("tagline", e.target.value)}
                />
              </Control>
              <Control label="الخط">
                <select
                  value={draftSettings.fontFamily}
                  onChange={(e) => updateDraft("fontFamily", e.target.value)}
                >
                  <option>Cairo</option>
                  <option>Tajawal</option>
                </select>
              </Control>
              <Control label="اللون الأساسي">
                <input
                  type="color"
                  value={draftSettings.primaryColor}
                  onChange={(e) => updateDraft("primaryColor", e.target.value)}
                />
              </Control>
              <Control label="لون اللمسة">
                <input
                  type="color"
                  value={draftSettings.accentColor}
                  onChange={(e) => updateDraft("accentColor", e.target.value)}
                />
              </Control>
              <Control label="لون الخلفية">
                <input
                  type="color"
                  value={draftSettings.backgroundColor}
                  onChange={(e) =>
                    updateDraft("backgroundColor", e.target.value)
                  }
                />
              </Control>
            </div>
            <div className="admin-card">
              <h2>{t("logo")}</h2>
              <Control label="رابط الشعار">
                <input
                  value={draftSettings.logo}
                  onChange={(e) => updateDraft("logo", e.target.value)}
                />
              </Control>
              <Control label="أو ارفع الشعار">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    uploadSettingImage("logo", e.target.files[0])
                  }
                />
              </Control>
              <p className="admin-help-text">{t("logoHint")}</p>
              {draftSettings.logo && (
                <img
                  className="admin-image-preview small"
                  src={draftSettings.logo}
                  alt="معاينة الشعار"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          </section>
        )}

        {tab === "products" && canAccessAdminSection("products") && (
          <section className="admin-products-stacked">
            <div className="admin-products-command-center">
              <div className="products-command-main">
                <div className="products-command-title">
                  <span className="eyebrow">Products workspace</span>
                  <h2>{t("productManagement")}</h2>
                  <p>{t("productIntro")}</p>
                </div>

                <div className="products-command-actions">
                  <div
                    className="products-view-mode-toggle"
                    aria-label="طريقة عرض المنتجات"
                  >
                    <button
                      type="button"
                      className={productsViewMode === "cards" ? "active" : ""}
                      onClick={() => changeProductsViewMode("cards")}
                      title="عرض الكروت"
                    >
                      <Grid3X3 size={16} />
                      <span>كروت</span>
                    </button>
                    <button
                      type="button"
                      className={productsViewMode === "rows" ? "active" : ""}
                      onClick={() => changeProductsViewMode("rows")}
                      title="عرض الصفوف"
                    >
                      <Rows3 size={16} />
                      <span>صفوف</span>
                    </button>
                  </div>

                  <button
                    className="admin-primary command-primary product-flat-top-btn"
                    type="button"
                    onClick={() => openProductEditor(null)}
                  >
                    <Plus size={18} /> منتج جديد
                  </button>
                  <button
                    className="admin-secondary command-secondary product-flat-top-btn"
                    type="button"
                    onClick={downloadProductsTemplate}
                  >
                    <Download size={16} /> قالب Excel
                  </button>
                  <label className="excel-upload-btn command-upload product-flat-top-btn">
                    <Download size={16} /> رفع Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={importProductsFromExcel}
                    />
                  </label>
                </div>
              </div>

              <div className="products-command-stats">
                <div>
                  <span>{t("allProducts")}</span>
                  <b>{products.length}</b>
                </div>
                <div>
                  <span>{t("visibleProducts")}</span>
                  <b>{activeProductsCount}</b>
                </div>
                <div>
                  <span>{t("lowStockOnly")}</span>
                  <b>{lowStockProducts.length}</b>
                </div>
                <div>
                  <span>{t("categories")}</span>
                  <b>{Math.max(adminProductCategories.length - 1, 0)}</b>
                </div>
              </div>

              {pendingImport.length > 0 && (
                <div className="pending-import-box command-import-preview">
                  <div className="pending-head">
                    <div>
                      <b>{t("importedPreview")}</b>
                      <span>{pendingImport.length} منتج جاهز للحفظ</span>
                    </div>
                    <div className="pending-actions">
                      <button
                        className="admin-secondary"
                        type="button"
                        onClick={clearPendingImport}
                      >
                        {t("cancelImport")}
                      </button>
                      <button
                        className="admin-primary"
                        type="button"
                        onClick={savePendingImport}
                      >
                        حفظ المنتجات المستوردة
                      </button>
                    </div>
                  </div>

                  <div className="pending-table">
                    {pendingImport.slice(0, 8).map((p, i) => (
                      <div className="pending-row" key={i}>
                        <img
                          src={p.image || "https://via.placeholder.com/120"}
                          alt={p.name || "منتج"}
                          loading="lazy"
                          decoding="async"
                        />
                        <div>
                          <b>{p.name}</b>
                          <span>
                            {p.category} • {p.price} ر.س • المخزون {p.stock}
                          </span>
                        </div>
                        <em>{p.status === "hidden" ? "مخفي" : "ظاهر"}</em>
                      </div>
                    ))}
                  </div>

                  {pendingImport.length > 8 && (
                    <p className="pending-more">
                      ويتم حفظ باقي المنتجات أيضًا: +{pendingImport.length - 8}
                    </p>
                  )}
                </div>
              )}
            </div>

            {productModalOpen && (
              <div
                className="product-modal-backdrop"
                onClick={resetProductEditor}
              >
                <div
                  className="product-modal-shell"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="admin-card product-form-card pro-form-card full-product-form-card products-form-compact-final">
                    <div className="pro-card-head">
                      <div>
                        <span>Product editor</span>
                        <h2>{editing ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
                      </div>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={resetProductEditor}
                      >
                        ×
                      </button>
                    </div>

                    <div className="product-modal-tabs" role="tablist">
                      <button
                        type="button"
                        className={productFormTab === "info" ? "active" : ""}
                        onClick={() => setProductFormTab("info")}
                      >
                        ١ المعلومات
                      </button>
                      <button
                        type="button"
                        className={productFormTab === "pricing" ? "active" : ""}
                        onClick={() => setProductFormTab("pricing")}
                      >
                        ٢ الأسعار والمخزون
                      </button>
                      <button
                        type="button"
                        className={productFormTab === "images" ? "active" : ""}
                        onClick={() => setProductFormTab("images")}
                      >
                        ٣ الصور
                      </button>
                      <button
                        type="button"
                        className={productFormTab === "options" ? "active" : ""}
                        onClick={() => setProductFormTab("options")}
                      >
                        ٤ الخيارات
                      </button>
                      <button
                        type="button"
                        className={productFormTab === "seo" ? "active" : ""}
                        onClick={() => setProductFormTab("seo")}
                      >
                        ٥ SEO
                      </button>
                    </div>

                    <form
                      id="product-editor-form"
                      onSubmit={saveProduct}
                      className={`product-form products-six-card-form product-editor-tabs-form active-tab-${productFormTab}`}
                    >
                      <div className="product-options-master-card">
                        <div className="product-options-master-head">
                          <div>
                            <span>نظام خيارات المنتج</span>
                            <h3>
                              إدارة خيارات المقاسات والألوان والأسعار والمخزون
                            </h3>
                          </div>
                          <span className="product-section-icon">
                            <Settings size={18} />
                          </span>
                        </div>

                        <div className="options-master-grid">
                          <div className="options-preview-panel">
                            <div className="options-subhead">
                              <b>معاينة الخيارات</b>
                              <small>{productOptions.length} خيارات</small>
                            </div>
                            <div className="option-stats-row">
                              <div>
                                <span>الخيارات الكلية</span>
                                <b>{productOptions.length}</b>
                              </div>
                              <div>
                                <span>المقاسات</span>
                                <b>
                                  {
                                    new Set(
                                      productOptions
                                        .map((o) => o.size)
                                        .filter(Boolean),
                                    ).size
                                  }
                                </b>
                              </div>
                              <div>
                                <span>الألوان</span>
                                <b>
                                  {
                                    new Set(
                                      productOptions
                                        .map((o) => o.color)
                                        .filter(Boolean),
                                    ).size
                                  }
                                </b>
                              </div>
                              <div>
                                <span>إجمالي المخزون</span>
                                <b>
                                  {productOptions.reduce(
                                    (sum, o) => sum + Number(o.stock || 0),
                                    0,
                                  )}
                                </b>
                              </div>
                            </div>
                            <div className="option-preview-table">
                              <div className="option-preview-head">
                                <span>اللون</span>
                                <span>المقاس</span>
                                <span>السعر</span>
                                <span>بعد الخصم</span>
                                <span>{t("inventory")}</span>
                                <span>SKU</span>
                              </div>
                              {productOptions.length ? (
                                productOptions.map((option, index) => (
                                  <div
                                    className="option-preview-row"
                                    key={`preview-${index}`}
                                  >
                                    <span>{option.color || "—"}</span>
                                    <span>{option.size || "—"}</span>
                                    <span>
                                      {option.price || editing?.price || "—"}
                                    </span>
                                    <span>
                                      {option.oldPrice ||
                                        editing?.oldPrice ||
                                        "—"}
                                    </span>
                                    <span>{option.stock || 0}</span>
                                    <span>{option.sku || "—"}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="option-preview-empty">
                                  أضف خيارًا ليظهر هنا
                                </div>
                              )}
                            </div>
                            <div className="option-available-note">
                              <CheckCircle2 size={15} /> سيظهر المنتج بهذا الشكل
                              للعملاء حسب الخيارات المتاحة
                            </div>
                          </div>

                          <div className="options-editor-panel">
                            <div className="option-chip-section">
                              <div className="option-chip-head">
                                <b>إدارة الألوان</b>
                              </div>
                              <div className="option-chip-row">
                                {[
                                  ...new Set(
                                    productOptions
                                      .map((o) => o.color)
                                      .filter(Boolean),
                                  ),
                                ].map((color) => (
                                  <span className="option-chip" key={color}>
                                    {color}
                                    <button type="button">×</button>
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  className="option-add-chip"
                                  onClick={addProductOption}
                                >
                                  <Plus size={14} /> إضافة لون
                                </button>
                              </div>
                            </div>

                            <div className="option-chip-section">
                              <div className="option-chip-head">
                                <b>إدارة المقاسات</b>
                              </div>
                              <div className="option-chip-row">
                                {[
                                  ...new Set(
                                    productOptions
                                      .map((o) => o.size)
                                      .filter(Boolean),
                                  ),
                                ].map((size) => (
                                  <span className="option-chip" key={size}>
                                    {size}
                                    <button type="button">×</button>
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  className="option-add-chip"
                                  onClick={addProductOption}
                                >
                                  <Plus size={14} /> إضافة مقاس
                                </button>
                              </div>
                            </div>

                            <div className="option-combinations-title">
                              الخيارات (المقاس × اللون)
                            </div>
                            <div className="product-options-builder refined-options-builder">
                              {productOptions.map((option, index) => (
                                <div
                                  className="product-option-row refined-option-row"
                                  key={index}
                                >
                                  <input
                                    value={option.color}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "color",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="اللون"
                                  />
                                  <input
                                    value={option.size}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "size",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="المقاس"
                                  />
                                  <input
                                    value={option.sku}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "sku",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="SKU اختياري"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={option.price}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "price",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="السعر"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={option.oldPrice || ""}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "oldPrice",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="السعر بعد الخصم"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={option.stock}
                                    onChange={(e) =>
                                      updateProductOption(
                                        index,
                                        "stock",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="المخزون"
                                  />
                                  <button
                                    type="button"
                                    className="admin-danger-soft"
                                    onClick={() => removeProductOption(index)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="option-add-row-btn"
                                onClick={addProductOption}
                              >
                                <Plus size={15} /> إضافة خيار جديد
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="products-six-card-grid">
                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">📝</span>{" "}
                            معلومات المنتج
                          </h3>
                          <Control label="اسم المنتج">
                            <input
                              name="name"
                              defaultValue={editing?.name || ""}
                              placeholder="مثال: مونستيرا فاخرة"
                            />
                          </Control>
                          <Control label="الوصف">
                            <textarea
                              name="description"
                              defaultValue={editing?.description || ""}
                              placeholder="اكتب وصف مختصر وجميل للمنتج"
                            />
                          </Control>
                          <div className="two">
                            <Control label="النوع/المورد">
                              <input
                                name="brand"
                                defaultValue={editing?.brand || ""}
                                placeholder="Monstera"
                              />
                            </Control>
                            <Control label="القسم">
                              <input
                                name="category"
                                defaultValue={
                                  editing?.category || "نباتات داخلية"
                                }
                              />
                            </Control>
                          </div>
                        </div>

                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">🏷️</span>{" "}
                            السعر والمخزون
                          </h3>
                          <div className="two">
                            <Control label="السعر">
                              <input
                                name="price"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={editing?.price || ""}
                              />
                            </Control>
                            <Control label="السعر قبل الخصم">
                              <input
                                name="oldPrice"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={editing?.oldPrice || ""}
                              />
                            </Control>
                          </div>
                          <div className="two">
                            <Control label="المخزون">
                              <input
                                name="stock"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={editing?.stock || 0}
                              />
                            </Control>
                            <Control label="SKU">
                              <input
                                name="sku"
                                defaultValue={editing?.sku || ""}
                                placeholder="GD-PLANT-001"
                              />
                            </Control>
                          </div>
                          <div className="two">
                            <Control label="حالة المنتج">
                              <select
                                name="status"
                                defaultValue={editing?.status || "active"}
                              >
                                <option value="active">ظاهر في المتجر</option>
                                <option value="hidden">{t("hidden")}</option>
                              </select>
                            </Control>
                            <Control label="التقييم">
                              <input
                                name="rating"
                                type="number"
                                step="0.1"
                                max="5"
                                min="0"
                                defaultValue={editing?.rating || 4.8}
                              />
                            </Control>
                          </div>
                        </div>

                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">🖼️</span>{" "}
                            الخيارات والصورة
                          </h3>
                          <div className="three">
                            <Control label="الشارة">
                              <input
                                name="tag"
                                defaultValue={editing?.tag || "Rare"}
                              />
                            </Control>
                            <Control label="الأحجام العامة">
                              <input
                                name="sizes"
                                defaultValue={
                                  Array.isArray(editing?.sizes)
                                    ? editing.sizes.join(",")
                                    : editing?.sizes || "صغير,متوسط,كبير"
                                }
                                placeholder="صغير, متوسط, كبير"
                              />
                            </Control>
                            <Control label="الألوان العامة">
                              <input
                                name="colors"
                                defaultValue={
                                  Array.isArray(editing?.colors)
                                    ? editing.colors.join(",")
                                    : editing?.colors || ""
                                }
                                placeholder="أخضر, أبيض, أسود"
                              />
                            </Control>
                          </div>

                          <div className="product-options-mini-note">
                            تم نقل إدارة خيارات المنتج إلى كرت مستقل ومرتب أعلى
                            النموذج.
                          </div>
                          <Control label="رابط الصورة">
                            <input
                              name="imageUrl"
                              defaultValue={editing?.image || ""}
                              onChange={(e) => setImagePreview(e.target.value)}
                              placeholder="ضع رابط صورة المنتج هنا"
                            />
                          </Control>
                          <Control label="أو ارفع صورة">
                            <input
                              name="imageFile"
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file)
                                  setImagePreview(
                                    await fileToDataUrl(file, {
                                      maxWidth: 1100,
                                      maxHeight: 900,
                                      quality: 0.82,
                                    }),
                                  );
                              }}
                            />
                          </Control>
                          <Control label="رفع صور متعددة للمعرض">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) =>
                                uploadGalleryImages(e.target.files)
                              }
                            />
                          </Control>
                          {imagePreview && (
                            <div className="product-image-preview pro-preview compact-preview">
                              <span>الصورة الأساسية</span>
                              <img
                                src={imagePreview}
                                alt="معاينة المنتج"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          )}
                        </div>

                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">⭐</span>{" "}
                            منتجات مميزة
                          </h3>
                          <p className="product-card-help">
                            فعّل ظهور المنتج ضمن المنتجات البارزة في واجهة
                            المتجر.
                          </p>
                          <label className="feature-toggle compact-feature-toggle">
                            <input
                              name="featured"
                              type="checkbox"
                              defaultChecked={editing?.featured || false}
                            />
                            <span>منتج مميز في الواجهة</span>
                          </label>
                          <div className="product-card-note">
                            يعتمد على نفس خيار المنتج المميز الحالي.
                          </div>
                        </div>

                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">%</span>{" "}
                            المنتجات بخصم
                          </h3>
                          <p className="product-card-help">
                            أي منتج له سعر قبل الخصم سيظهر كمنتج عليه عرض.
                          </p>
                          <div className="two">
                            <Control label="السعر الحالي">
                              <input
                                name="priceDisplayOnly"
                                type="text"
                                value={editing?.price || ""}
                                readOnly
                                placeholder="من حقل السعر"
                              />
                            </Control>
                            <Control label="سعر قبل الخصم">
                              <input
                                name="oldPriceDisplayOnly"
                                type="text"
                                value={editing?.oldPrice || ""}
                                readOnly
                                placeholder="من حقل السعر قبل الخصم"
                              />
                            </Control>
                          </div>
                          <div className="product-card-note">
                            عدّل الخصم من كرت السعر والمخزون.
                          </div>
                        </div>

                        <div className="pro-form-section product-six-card">
                          <h3>
                            <span className="product-section-icon">🔎</span> SEO
                          </h3>
                          <p className="product-card-help">
                            هذه البيانات تظهر في صفحة المنتج المستقلة ونتائج
                            Google ومشاركة واتساب.
                          </p>
                          <Control label="رابط المنتج / Slug">
                            <input
                              name="seoSlug"
                              defaultValue={
                                editing?.seoSlug || productSlug(editing || {})
                              }
                              placeholder="مثال: monstera-premium"
                            />
                          </Control>
                          <Control label="عنوان SEO">
                            <input
                              name="seoTitle"
                              defaultValue={editing?.seoTitle || ""}
                              placeholder="اتركه فارغًا لاستخدام اسم المنتج"
                            />
                          </Control>
                          <Control label="وصف SEO">
                            <textarea
                              name="seoDescription"
                              defaultValue={editing?.seoDescription || ""}
                              placeholder="اتركه فارغًا لاستخدام وصف المنتج"
                            />
                          </Control>
                          <div className="seo-preview-box">
                            <b>
                              {editing?.seoTitle ||
                                editing?.name ||
                                "اسم المنتج"}
                            </b>
                            <span>
                              {editing?.seoDescription ||
                                editing?.description ||
                                "وصف المنتج يظهر هنا بعد الحفظ"}
                            </span>
                          </div>
                          <div className="product-card-note">
                            بعد الحفظ سيكون الرابط مثل: /product/
                            {editing?.seoSlug ||
                              productSlug(editing || { name: "product" })}
                          </div>
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
                              <div
                                className={`gallery-item ${imagePreview === img ? "primary" : ""}`}
                                key={`${img}-${index}`}
                              >
                                <img
                                  src={img}
                                  alt={`gallery-${index}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                                <div className="gallery-actions">
                                  <button
                                    type="button"
                                    onClick={() => makeGalleryImagePrimary(img)}
                                  >
                                    أساسية
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() => removeGalleryImage(index)}
                                  >
                                    {t("delete")}
                                  </button>
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
                            <img
                              src={imagePreview}
                              alt="معاينة المنتج"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span>صورة المنتج</span>
                          )}
                        </div>
                        <div className="live-product-preview-body">
                          <b>{editing?.name || "اسم المنتج"}</b>
                          <small>{editing?.category || "القسم"}</small>
                          <strong>
                            {editing?.price
                              ? `${formatPrice(editing.price)} ر.س`
                              : "السعر"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="product-modal-footer">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={resetProductEditor}
                    >
                      {t("cancel")}
                    </button>
                    <div className="product-modal-footer-actions">
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() => setProductFormTab("info")}
                      >
                        مراجعة المعلومات
                      </button>
                      <button
                        type="submit"
                        form="product-editor-form"
                        className="admin-primary"
                      >
                        <Save size={16} />{" "}
                        {editing ? "حفظ التعديل" : "حفظ وإضافة المنتج"}
                      </button>
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
                  <small>
                    {filteredAdminProducts.length} ظاهر من أصل {products.length}{" "}
                    منتج
                  </small>
                </div>

                <div className="products-head-actions">
                  <b className="products-count">{products.length} منتج</b>
                  {products.length > 0 && (
                    <button
                      type="button"
                      className="admin-danger-soft"
                      onClick={deleteAllProducts}
                    >
                      <Trash2 size={16} /> حذف كل المنتجات
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
                  {adminBestSellers.length ? (
                    adminBestSellers.map((item, index) => (
                      <div className="best-seller-mini" key={item.name}>
                        <b>#{index + 1}</b>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="best-seller-placeholder">🌿</span>
                        )}
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            {item.qty} مبيع • {formatPrice(item.value)} ر.س
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>{t("noSalesYet")}</p>
                  )}
                </div>
              </div>

              <div className="products-toolbar">
                <div className="products-search-box">
                  <Search size={17} />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث باسم المنتج، القسم، المورد أو SKU"
                  />
                </div>

                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                >
                  <option value="all">{t("allProducts")}</option>
                  <option value="active">{t("visibleProducts")}</option>
                  <option value="hidden">المخفية</option>
                  <option value="featured">المميزة</option>
                  <option value="out">نفد المخزون</option>
                </select>

                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                >
                  {adminProductCategories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "كل الأقسام" : category}
                    </option>
                  ))}
                </select>

                <select
                  value={productSort}
                  onChange={(e) => setProductSort(e.target.value)}
                >
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
                      checked={
                        filteredAdminProducts.length > 0 &&
                        filteredAdminProducts.every((product) =>
                          selectedProducts.includes(product.id),
                        )
                      }
                      onChange={toggleAllVisibleProducts}
                    />
                    تحديد الظاهر
                  </label>

                  <span>{selectedProducts.length} محدد</span>

                  <div>
                    <button
                      type="button"
                      className="admin-secondary"
                      disabled={!selectedProducts.length}
                      onClick={() =>
                        bulkUpdateProducts(
                          { status: "active" },
                          "تم إظهار المنتجات المحددة",
                        )
                      }
                    >
                      إظهار
                    </button>
                    <button
                      type="button"
                      className="admin-secondary"
                      disabled={!selectedProducts.length}
                      onClick={() =>
                        bulkUpdateProducts(
                          { status: "hidden" },
                          "تم إخفاء المنتجات المحددة",
                        )
                      }
                    >
                      إخفاء
                    </button>
                    <button
                      type="button"
                      className="admin-danger-soft"
                      disabled={!selectedProducts.length}
                      onClick={deleteSelectedProducts}
                    >
                      <Trash2 size={15} /> حذف المحدد
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`admin-product-cards ${productsViewMode === "rows" ? "products-view-rows" : "products-view-cards"}`}
              >
                {productsViewMode === "rows" && (
                  <div className="products-excel-header">
                    <span>تحديد</span>
                    <span>الصورة</span>
                    <span>المنتج</span>
                    <span>الوصف</span>
                    <span>القسم</span>
                    <span>السعر</span>
                    <span>المخزون</span>
                    <span>الحالة</span>
                    <span>الخيارات</span>
                    <span>SKU</span>
                    <span>إجراءات</span>
                  </div>
                )}
                {filteredAdminProducts.map((p) => (
                  <div
                    className={`admin-product-card ${selectedProducts.includes(p.id) ? "selected" : ""} ${draggedProductId === p.id ? "dragging" : ""}`}
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggedProductId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      reorderProducts(draggedProductId, p.id);
                      setDraggedProductId(null);
                    }}
                    onDragEnd={() => setDraggedProductId(null)}
                  >
                    <label
                      className="product-row-select-check"
                      title="تحديد المنتج"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => toggleProductSelection(p.id)}
                      />
                    </label>
                    <button
                      type="button"
                      className="product-drag-handle"
                      title="اسحب لترتيب المنتج"
                    >
                      ↕
                    </button>
                    <div className="admin-product-thumb">
                      <img
                        className="admin-product-image"
                        src={
                          p.image ||
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='18' fill='%23f3f6f2'/%3E%3Cpath d='M25 66h46L57 48 47 60l-8-9-14 15Z' fill='%23b9c8bf'/%3E%3Ccircle cx='35' cy='34' r='7' fill='%23b9c8bf'/%3E%3C/svg%3E"
                        }
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='18' fill='%23f3f6f2'/%3E%3Cpath d='M25 66h46L57 48 47 60l-8-9-14 15Z' fill='%23b9c8bf'/%3E%3Ccircle cx='35' cy='34' r='7' fill='%23b9c8bf'/%3E%3C/svg%3E";
                        }}
                      />
                      <span
                        className={
                          p.status === "hidden"
                            ? "status hidden"
                            : "status active"
                        }
                      >
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
                          {Array.isArray(p.options) && p.options.length > 0 && (
                            <span>{p.options.length} خيارات</span>
                          )}
                          {Array.isArray(p.gallery) && p.gallery.length > 1 && (
                            <span>{p.gallery.length} صور</span>
                          )}
                        </div>
                        <p>{p.description || p.brand}</p>
                      </div>

                      <div
                        className="products-row-description"
                        title={p.description || p.brand || "بدون وصف"}
                      >
                        {p.description || p.brand || "—"}
                      </div>

                      <div className="admin-product-meta">
                        <span>{formatPrice(p.price)} ر.س</span>
                        <span>المخزون: {p.stock ?? 0}</span>
                        {p.sku && <span>SKU: {p.sku}</span>}
                      </div>

                      <div className="products-row-category-fixed">
                        <span>{p.category || "بدون قسم"}</span>
                      </div>

                      {Array.isArray(p.options) && p.options.length > 0 && (
                        <div className="admin-product-options-list">
                          {p.options.slice(0, 4).map((option, index) => (
                            <span key={index}>
                              {[option.size, option.color]
                                .filter(Boolean)
                                .join(" / ") || "خيار"}
                              {option.stock !== "" && option.stock !== undefined
                                ? ` • ${option.stock} مخزون`
                                : ""}
                            </span>
                          ))}
                          {p.options.length > 4 && (
                            <span>+{p.options.length - 4}</span>
                          )}
                        </div>
                      )}

                      <div className="products-row-status">
                        <span
                          className={
                            p.status === "hidden"
                              ? "row-status hidden"
                              : "row-status active"
                          }
                        >
                          {p.status === "hidden" ? "مخفي" : "ظاهر"}
                        </span>
                      </div>
                      <div className="products-row-options">
                        {Array.isArray(p.options) && p.options.length > 0
                          ? `${p.options.length} خيارات`
                          : "—"}
                      </div>
                      <div className="products-row-sku">{p.sku || "—"}</div>

                      <div className="admin-product-actions">
                        <label
                          className="product-select-check"
                          title="تحديد المنتج"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(p.id)}
                            onChange={() => toggleProductSelection(p.id)}
                          />
                        </label>
                        <button onClick={() => openProductEditor(p)}>
                          <Pencil size={16} /> تعديل كامل
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateProduct(p)}
                        >
                          <Plus size={16} /> نسخ
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteProduct(p)}
                        >
                          <Trash2 size={16} /> حذف
                        </button>
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

        {tab === "homepage" && canAccessAdminSection("homepage") && (
          <section className="homepage-admin-page">
            <div className="homepage-sections-list">
              {(selectedThemeSection
                ? [selectedThemeSection]
                : themeSections
              ).map((section) => (
                <div key={section.id} className="homepage-section-row">
                  <div
                    className="section-header"
                    onClick={() =>
                      setOpenSection(
                        openSection === section.id ? null : section.id,
                      )
                    }
                  >
                    <div>
                      <span>{section.label}</span>
                      <small>
                        {draftSettings[section.titleKey] || "اضغط للتعديل"}
                      </small>
                    </div>
                    <b>{openSection === section.id ? "−" : "+"}</b>
                  </div>

                  {(openSection === section.id ||
                    selectedThemeSection?.id === section.id) && (
                    <div
                      className={`section-form section-form-pro ${section.headerExtra ? "header-admin-clean-form" : ""} ${section.heroExtra ? "hero-admin-compact-form" : ""}`}
                    >
                      <Control label="العنوان">
                        <input
                          value={draftSettings[section.titleKey] || ""}
                          onChange={(e) =>
                            updateDraft(section.titleKey, e.target.value)
                          }
                          placeholder="عنوان القسم"
                        />
                      </Control>

                      {section.headerExtra && (
                        <>
                          <Control label="اللغة">
                            <select
                              value={draftSettings.homeHeaderLang || "AR"}
                              onChange={(e) =>
                                updateDraft("homeHeaderLang", e.target.value)
                              }
                            >
                              <option value="AR">AR</option>
                              <option value="EN">EN</option>
                            </select>
                          </Control>

                          <div className="header-sticky-wrapper">
                            <span className="header-sticky-label">
                              تثبيت الهيدر
                            </span>
                            <label
                              className="header-sticky-inline-control"
                              aria-label="تثبيت الهيدر"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  draftSettings.homeHeaderSticky !== false
                                }
                                onChange={(e) =>
                                  updateDraft(
                                    "homeHeaderSticky",
                                    e.target.checked,
                                  )
                                }
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
                            onChange={(e) =>
                              updateDraft(section.descKey, e.target.value)
                            }
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
                                onChange={(e) =>
                                  updateDraft("homeHeroLayout", e.target.value)
                                }
                              >
                                <option value="video">فيديو بعرض الصفحة</option>
                                <option value="banner">
                                  بنر صورة بعرض الصفحة
                                </option>
                                <option value="split">
                                  مقسم: بنر + صورة + نص
                                </option>
                              </select>
                            </Control>

                            <Control label="نص الزر">
                              <input
                                value={draftSettings.homeHeroButton || ""}
                                onChange={(e) =>
                                  updateDraft("homeHeroButton", e.target.value)
                                }
                                placeholder="تسوق الآن"
                              />
                            </Control>

                            <Control label="رابط زر الهيرو">
                              <input
                                value={
                                  draftSettings.homeHeroButtonLink ||
                                  "#products"
                                }
                                onChange={(e) =>
                                  updateDraft(
                                    "homeHeroButtonLink",
                                    e.target.value,
                                  )
                                }
                                placeholder="#products أو /page/offers"
                              />
                            </Control>

                            {draftSettings.homeHeroLayout === "split" && (
                              <Control label="مكان الصورة الأمامية">
                                <select
                                  value={
                                    draftSettings.homeHeroImagePosition ||
                                    "left"
                                  }
                                  onChange={(e) =>
                                    updateDraft(
                                      "homeHeroImagePosition",
                                      e.target.value,
                                    )
                                  }
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
                                  onChange={(e) =>
                                    updateDraft("homeHeroVideo", e.target.value)
                                  }
                                  placeholder="رابط MP4 أو رابط Google Drive"
                                />
                                <small className="hero-upload-note">
                                  يدعم Google Drive كرابط معاينة. للتشغيل الصامت
                                  التلقائي الأفضل استخدم رابط MP4 مباشر مثل
                                  Cloudinary.
                                </small>
                              </Control>

                              <Control label="أو ارفع فيديو">
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/*"
                                  onChange={(e) =>
                                    uploadSettingImage(
                                      "homeHeroVideo",
                                      e.target.files[0],
                                    )
                                  }
                                />
                                <small className="hero-upload-note">
                                  الرفع المباشر محدود بـ 750KB فقط. للأفضل
                                  استخدم رابط فيديو خارجي.
                                </small>
                              </Control>
                            </div>
                          )}

                          {draftSettings.homeHeroLayout === "split" && (
                            <div className="hero-admin-bg-tools">
                              <Control label="رابط بنر الخلفية">
                                <input
                                  value={draftSettings.homeHeroBgImage || ""}
                                  onChange={(e) =>
                                    updateDraft(
                                      "homeHeroBgImage",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="https://..."
                                />
                              </Control>

                              <Control label="أو ارفع بنر الخلفية">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    uploadSettingImage(
                                      "homeHeroBgImage",
                                      e.target.files[0],
                                    )
                                  }
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
                            onChange={(e) =>
                              updateDraft(section.buttonKey, e.target.value)
                            }
                            placeholder="تسوق الآن"
                          />
                        </Control>
                      )}

                      {section.imageKey &&
                        !(
                          section.heroExtra &&
                          draftSettings.homeHeroLayout === "video"
                        ) && (
                          <div
                            className={`section-image-tools ${section.heroExtra ? "hero-admin-image-tools" : ""}`}
                          >
                            <Control label="رابط الصورة">
                              <input
                                value={draftSettings[section.imageKey] || ""}
                                onChange={(e) =>
                                  updateDraft(section.imageKey, e.target.value)
                                }
                                placeholder="https://..."
                              />
                            </Control>

                            <Control label="أو ارفع صورة">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  uploadSettingImage(
                                    section.imageKey,
                                    e.target.files[0],
                                  )
                                }
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
                              onChange={(e) =>
                                updateDraft("homeHeaderBg", e.target.value)
                              }
                            />
                          </Control>
                          <Control label="الشريط العلوي">
                            <input
                              value={draftSettings.homeHeaderTopBar || ""}
                              onChange={(e) =>
                                updateDraft("homeHeaderTopBar", e.target.value)
                              }
                              placeholder="شحن سريع داخل السعودية 🚚"
                            />
                          </Control>
                          <Control label="لون الشريط العلوي">
                            <input
                              type="color"
                              value={draftSettings.homeTopBarBg || "#0F3D2E"}
                              onChange={(e) =>
                                updateDraft("homeTopBarBg", e.target.value)
                              }
                            />
                          </Control>
                          <Control label="لون نص الشريط">
                            <input
                              type="color"
                              value={draftSettings.homeTopBarText || "#FFFFFF"}
                              onChange={(e) =>
                                updateDraft("homeTopBarText", e.target.value)
                              }
                            />
                          </Control>
                          <div className="topbar-toggle-wrapper">
                            <span className="topbar-toggle-label">
                              إظهار الشريط
                            </span>
                            <label
                              className="topbar-toggle-control"
                              aria-label="إظهار الشريط العلوي"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  draftSettings.homeTopBarEnabled !== false
                                }
                                onChange={(e) =>
                                  updateDraft(
                                    "homeTopBarEnabled",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span>إظهار الشريط</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {section.pagesExtra && (
                        <div className="pages-admin-tools">
                          <div className="pages-admin-list">
                            {(draftSettings.homePages || []).map(
                              (page, pageIndex) => (
                                <div
                                  className="page-row-editor"
                                  key={pageIndex}
                                >
                                  <label className="page-visible-toggle">
                                    <input
                                      type="checkbox"
                                      checked={page.visible !== false}
                                      onChange={(e) => {
                                        const next = [
                                          ...(draftSettings.homePages || []),
                                        ];
                                        next[pageIndex] = {
                                          ...next[pageIndex],
                                          visible: e.target.checked,
                                        };
                                        updateDraft("homePages", next);
                                      }}
                                    />
                                    <span>
                                      {page.visible === false ? "مخفي" : "ظاهر"}
                                    </span>
                                  </label>

                                  <input
                                    value={page.label || ""}
                                    onChange={(e) => {
                                      const next = [
                                        ...(draftSettings.homePages || []),
                                      ];
                                      next[pageIndex] = {
                                        ...next[pageIndex],
                                        label: e.target.value,
                                        visible:
                                          next[pageIndex]?.visible !== false,
                                      };
                                      updateDraft("homePages", next);
                                    }}
                                    placeholder="اسم الصفحة"
                                  />
                                  <input
                                    value={page.href || ""}
                                    onChange={(e) => {
                                      const next = [
                                        ...(draftSettings.homePages || []),
                                      ];
                                      next[pageIndex] = {
                                        ...next[pageIndex],
                                        href: e.target.value,
                                        visible:
                                          next[pageIndex]?.visible !== false,
                                      };
                                      updateDraft("homePages", next);
                                    }}
                                    placeholder="/page/products"
                                  />
                                  <button
                                    type="button"
                                    className="admin-secondary"
                                    onClick={() => {
                                      const next = [
                                        ...(draftSettings.homePages || []),
                                      ];
                                      next.splice(pageIndex, 1);
                                      updateDraft("homePages", next);
                                    }}
                                  >
                                    حذف
                                  </button>
                                </div>
                              ),
                            )}
                          </div>

                          <button
                            type="button"
                            className="admin-primary add-page-btn"
                            onClick={() =>
                              updateDraft("homePages", [
                                ...(draftSettings.homePages || []),
                                {
                                  label: "صفحة جديدة",
                                  href: "/page/new-page",
                                  visible: true,
                                },
                              ])
                            }
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

        {tab === "users" && canAccessAdminSection("users") && (
          <StaffUsersPanel
            staffUsers={staffUsers}
            onNotice={(msg, ms = 3000) => {
              setNotice(msg);
              setTimeout(() => setNotice(""), ms);
            }}
          />
        )}

        {tab === "settings" && canAccessAdminSection("settings") && (
          <AdminSettingsPanel
            settings={settings}
            draftSettings={draftSettings}
            updateDraft={updateDraft}
            saveDraftSettings={saveDraftSettings}
            resetDraftSettings={resetDraftSettings}
            uploadSettingImage={uploadSettingImage}
            setTab={setTab}
          />
        )}

        {tab === "notifications" && canAccessAdminSection("notifications") && (
          <AdminNotificationsPanel
            items={filteredNotificationItems}
            allItems={notificationItems}
            unreadCount={unreadNotificationsCount}
            counts={notificationCounts}
            filter={notificationFilter}
            setFilter={setNotificationFilter}
            markRead={markNotificationRead}
            markAllRead={markAllNotificationsRead}
            clearReads={clearNotificationReads}
            settings={settings}
            saveSettings={saveSettings}
            browserPermission={browserPermission}
            requestBrowserNotifications={requestBrowserNotifications}
            lowStockThreshold={lowStockThreshold}
            highValueOrderThreshold={highValueOrderThreshold}
            setTab={setTab}
          />
        )}

        {tab === "customers" && canAccessAdminSection("customers") && (
          <CustomersPanel customers={customers} orders={orders} />
        )}
        {tab === "orders" && canAccessAdminSection("orders") && (
          <OrdersPanel
            orders={orders}
            t={t}
            onNotice={(msg, ms = 3000) => {
              setNotice(msg);
              setTimeout(() => setNotice(""), ms);
            }}
          />
        )}
        {tabPermission[tab] &&
          !canAccessAdminSection(tabPermission[tab]) &&
          noPermissionCard(titleFor(tab, adminLanguage))}
      </main>
    </div>
  );
}


function AdminSettingsPanel({
  settings,
  draftSettings,
  updateDraft,
  saveDraftSettings,
  resetDraftSettings,
  uploadSettingImage,
  setTab,
}) {
  const storeStatuses = [
    {
      value: "open",
      label: "مفتوح",
      desc: "العملاء يستطيعون تصفح المتجر وإرسال الطلبات.",
    },
    {
      value: "maintenance",
      label: "صيانة",
      desc: "إظهار رسالة تنبيه وإيقاف استقبال الطلبات مؤقتًا.",
    },
    {
      value: "paused",
      label: "متوقف مؤقتًا",
      desc: "المتجر ظاهر لكن إتمام الطلب متوقف.",
    },
  ];

  const currentStatus = draftSettings.storeStatus || "open";
  const statusMeta =
    storeStatuses.find((item) => item.value === currentStatus) ||
    storeStatuses[0];
  const numberValue = (key, fallback = 0) =>
    draftSettings[key] === undefined || draftSettings[key] === null
      ? fallback
      : draftSettings[key];
  const textValue = (key, fallback = "") =>
    draftSettings[key] === undefined || draftSettings[key] === null
      ? fallback
      : draftSettings[key];

  const saveAndStay = async () => {
    await saveDraftSettings();
  };

  return (
    <section className="admin-settings-page">
      <div className="admin-card settings-hero-card">
        <div className="pro-card-head settings-head">
          <div>
            <span>Store Settings</span>
            <h2>الإعدادات</h2>
            <p>
              إدارة تشغيل المتجر، الشحن، التواصل، وسياسات الخدمة من مكان واحد.
            </p>
          </div>
          <div className={`settings-status-pill ${currentStatus}`}>
            <i></i>
            {statusMeta.label}
          </div>
        </div>

        <div className="settings-quick-grid">
          <div>
            <span>حالة المتجر</span>
            <b>{statusMeta.label}</b>
            <small>{statusMeta.desc}</small>
          </div>
          <div>
            <span>رسوم الشحن</span>
            <b>{formatPrice(numberValue("shippingFee", 35))} ر.س</b>
            <small>
              حد الشحن المجاني: {formatPrice(numberValue("freeShippingThreshold", 0))} ر.س
            </small>
          </div>
          <div>
            <span>أقل طلب</span>
            <b>{formatPrice(numberValue("minimumOrderTotal", 0))} ر.س</b>
            <small>0 يعني بدون حد أدنى.</small>
          </div>
          <div>
            <span>تنبيهات الإدارة</span>
            <b>{settings.notificationsBrowser ? "مفعلة" : "داخل اللوحة"}</b>
            <small>{settings.notificationEmail || "لم يتم تحديد بريد تنبيهات"}</small>
          </div>
        </div>
      </div>

      <div className="settings-grid-pro">
        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Settings size={20} />
            <div>
              <h3>تشغيل المتجر</h3>
              <p>تحكم في استقبال الطلبات ورسالة الصيانة.</p>
            </div>
          </div>

          <label>
            حالة المتجر
            <select
              value={currentStatus}
              onChange={(e) => updateDraft("storeStatus", e.target.value)}
            >
              {storeStatuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="setting-toggle-row">
            <input
              type="checkbox"
              checked={draftSettings.checkoutEnabled !== false}
              onChange={(e) => updateDraft("checkoutEnabled", e.target.checked)}
            />
            <span>
              <b>تفعيل إتمام الطلب</b>
              <small>عند إيقافه لن يستطيع العميل إرسال طلب عبر الواتساب.</small>
            </span>
          </label>

          <label>
            عنوان رسالة الصيانة
            <input
              value={textValue("maintenanceTitle", "المتجر تحت الصيانة")}
              onChange={(e) => updateDraft("maintenanceTitle", e.target.value)}
              placeholder="المتجر تحت الصيانة"
            />
          </label>

          <label>
            رسالة تظهر للعميل عند إيقاف الطلبات
            <textarea
              rows="4"
              value={textValue(
                "maintenanceMessage",
                "نرتب لك تجربة أفضل. الطلبات متوقفة مؤقتًا وسنعود قريبًا.",
              )}
              onChange={(e) => updateDraft("maintenanceMessage", e.target.value)}
              placeholder="اكتب رسالة واضحة للعميل"
            />
          </label>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Truck size={20} />
            <div>
              <h3>الشحن والطلبات</h3>
              <p>هذه القيم تؤثر مباشرة على سلة العميل وإتمام الطلب.</p>
            </div>
          </div>

          <div className="settings-two-cols">
            <label>
              رسوم الشحن
              <input
                type="number"
                min="0"
                value={numberValue("shippingFee", 35)}
                onChange={(e) => updateDraft("shippingFee", Number(e.target.value || 0))}
              />
            </label>
            <label>
              الشحن المجاني من
              <input
                type="number"
                min="0"
                value={numberValue("freeShippingThreshold", 0)}
                onChange={(e) =>
                  updateDraft("freeShippingThreshold", Number(e.target.value || 0))
                }
              />
            </label>
          </div>

          <div className="settings-two-cols">
            <label>
              الحد الأدنى للطلب
              <input
                type="number"
                min="0"
                value={numberValue("minimumOrderTotal", 0)}
                onChange={(e) =>
                  updateDraft("minimumOrderTotal", Number(e.target.value || 0))
                }
              />
            </label>
            <label>
              بادئة رقم الطلب
              <input
                value={textValue("orderPrefix", "GD")}
                onChange={(e) => updateDraft("orderPrefix", e.target.value)}
                placeholder="GD"
              />
            </label>
          </div>

          <label>
            نص التوصيل في صفحة المنتج
            <textarea
              rows="3"
              value={textValue(
                "deliveryInfo",
                "توصيل سريع داخل السعودية مع تغليف يحافظ على النبات.",
              )}
              onChange={(e) => updateDraft("deliveryInfo", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Phone size={20} />
            <div>
              <h3>قنوات التواصل</h3>
              <p>تظهر في الهيدر وتستخدمها الإشعارات الإدارية.</p>
            </div>
          </div>

          <label>
            واتساب المتجر
            <input
              value={textValue("homeHeaderWhatsapp", STORE_WHATSAPP)}
              onChange={(e) => updateDraft("homeHeaderWhatsapp", e.target.value)}
              placeholder="9665xxxxxxxx"
            />
          </label>

          <div className="settings-two-cols">
            <label>
              بريد الدعم
              <input
                type="email"
                value={textValue("supportEmail", "")}
                onChange={(e) => updateDraft("supportEmail", e.target.value)}
                placeholder="support@example.com"
              />
            </label>
            <label>
              بريد الإشعارات
              <input
                type="email"
                value={textValue("notificationEmail", "")}
                onChange={(e) => updateDraft("notificationEmail", e.target.value)}
                placeholder="admin@example.com"
              />
            </label>
          </div>

          <div className="settings-two-cols">
            <label>
              Instagram
              <input
                value={textValue("homeHeaderInstagram", "")}
                onChange={(e) => updateDraft("homeHeaderInstagram", e.target.value)}
                placeholder="رابط أو اسم الحساب"
              />
            </label>
            <label>
              TikTok
              <input
                value={textValue("homeHeaderTiktok", "")}
                onChange={(e) => updateDraft("homeHeaderTiktok", e.target.value)}
                placeholder="رابط أو اسم الحساب"
              />
            </label>
          </div>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <ShieldCheck size={20} />
            <div>
              <h3>السياسات والثقة</h3>
              <p>نصوص مختصرة تساعد العميل قبل الشراء.</p>
            </div>
          </div>

          <label>
            مدة الاسترجاع بالأيام
            <input
              type="number"
              min="0"
              value={numberValue("returnPolicyDays", 7)}
              onChange={(e) => updateDraft("returnPolicyDays", Number(e.target.value || 0))}
            />
          </label>

          <label>
            نص سياسة الاسترجاع
            <textarea
              rows="4"
              value={textValue(
                "returnPolicyText",
                "يمكن طلب الاسترجاع أو الاستبدال خلال 7 أيام من استلام الطلب بشرط أن يكون المنتج بحالته الأصلية.",
              )}
              onChange={(e) => updateDraft("returnPolicyText", e.target.value)}
            />
          </label>

          <label>
            ملاحظة الخصوصية
            <textarea
              rows="3"
              value={textValue(
                "privacyNote",
                "نستخدم بياناتك فقط لتجهيز الطلب والتواصل بخصوص الشحن والدعم.",
              )}
              onChange={(e) => updateDraft("privacyNote", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-card settings-section-card settings-logo-card">
          <div className="settings-section-title">
            <Palette size={20} />
            <div>
              <h3>لمسة سريعة للهوية</h3>
              <p>اختصار لتعديل اسم المتجر والشعار بدون الرجوع لهوية المتجر.</p>
            </div>
          </div>

          <div className="settings-two-cols">
            <label>
              اسم المتجر
              <input
                value={textValue("storeName", "GREEN DIXAM")}
                onChange={(e) => updateDraft("storeName", e.target.value)}
              />
            </label>
            <label>
              الشعار النصي
              <input
                value={textValue("tagline", "rare nature, refined living")}
                onChange={(e) => updateDraft("tagline", e.target.value)}
              />
            </label>
          </div>

          <label>
            رابط الشعار
            <input
              value={textValue("logo", "")}
              onChange={(e) => updateDraft("logo", e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="settings-file-upload">
            رفع شعار من الجهاز
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadSettingImage("logo", e.target.files?.[0])}
            />
          </label>
          {draftSettings.logo && (
            <div className="settings-logo-preview">
              <img src={draftSettings.logo} alt="logo preview" />
            </div>
          )}
        </div>

        <div className="admin-card settings-section-card settings-preview-card">
          <div className="settings-section-title">
            <Eye size={20} />
            <div>
              <h3>معاينة سريعة</h3>
              <p>ملخص ما سيطبّق بعد الحفظ.</p>
            </div>
          </div>

          <div className={`settings-store-preview ${currentStatus}`}>
            <span>{textValue("storeName", "GREEN DIXAM")}</span>
            <h3>{statusMeta.label}</h3>
            <p>
              {currentStatus === "open"
                ? "المتجر يستقبل الطلبات بشكل طبيعي."
                : textValue(
                    "maintenanceMessage",
                    "الطلبات متوقفة مؤقتًا وسنعود قريبًا.",
                  )}
            </p>
            <div>
              <b>الشحن: {formatPrice(numberValue("shippingFee", 35))} ر.س</b>
              <b>أقل طلب: {formatPrice(numberValue("minimumOrderTotal", 0))} ر.س</b>
            </div>
          </div>

          <button
            type="button"
            className="admin-secondary"
            onClick={() => setTab("notifications")}
          >
            فتح إعدادات الإشعارات
          </button>
        </div>
      </div>

      <div className="admin-save-bar settings-save-bar">
        <div>
          <b>التغييرات غير محفوظة حتى تضغط حفظ</b>
          <span>سيتم حفظ كل الإعدادات في Firebase وتظهر مباشرة في المتجر.</span>
        </div>
        <div className="save-bar-actions">
          <button className="admin-secondary" onClick={resetDraftSettings}>
            إلغاء التغييرات
          </button>
          <button className="admin-primary" onClick={saveAndStay}>
            <Save size={17} /> حفظ الإعدادات
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminNotificationsPanel({
  items,
  allItems,
  unreadCount,
  counts,
  filter,
  setFilter,
  markRead,
  markAllRead,
  clearReads,
  settings,
  saveSettings,
  browserPermission,
  requestBrowserNotifications,
  lowStockThreshold,
  highValueOrderThreshold,
  setTab,
}) {
  const filterTabs = [
    { key: "all", label: "الكل", count: counts.all || 0 },
    { key: "unread", label: "غير مقروء", count: counts.unread || 0 },
    { key: "orders", label: "الطلبات", count: counts.orders || 0 },
    { key: "stock", label: "المخزون", count: counts.stock || 0 },
    { key: "customers", label: "العملاء", count: counts.customers || 0 },
    { key: "live", label: "المباشر", count: counts.live || 0 },
    { key: "system", label: "النظام", count: counts.system || 0 },
  ];

  const preferenceRows = [
    {
      key: "notifyNewOrders",
      title: "طلبات جديدة وقيد التجهيز",
      desc: "ينبهك عند وصول طلب جديد أو وجود طلب يحتاج متابعة.",
    },
    {
      key: "notifyHighValueOrders",
      title: "طلبات بقيمة عالية",
      desc: "إظهار تنبيه للطلبات التي تتجاوز حد القيمة المحدد.",
    },
    {
      key: "notifyLowStock",
      title: "المخزون المنخفض",
      desc: "إظهار المنتجات التي تحتاج إعادة تعبئة.",
    },
    {
      key: "notifyCustomers",
      title: "العملاء الجدد",
      desc: "إشعار عند تسجيل عميل جديد خلال آخر أسبوع.",
    },
    {
      key: "notifyLiveEvents",
      title: "الأحداث المباشرة",
      desc: "يعرض إضافات السلة ومحاولات إتمام الطلب من الزوار.",
    },
  ];

  const iconFor = (item) => {
    if (item.icon === "order") return <ClipboardList size={20} />;
    if (item.icon === "stock") return <PackagePlus size={20} />;
    if (item.icon === "customer") return <Users size={20} />;
    if (item.icon === "trend") return <TrendingUp size={20} />;
    if (item.icon === "system") return <Settings size={20} />;
    return <Bell size={20} />;
  };

  const permissionText = {
    granted: "مسموح",
    denied: "مرفوض من المتصفح",
    default: "لم يتم الطلب بعد",
    unsupported: "غير مدعوم",
  }[browserPermission || "default"];

  const notificationHealth = unreadCount
    ? `لديك ${unreadCount} إشعار غير مقروء`
    : "كل الإشعارات مقروءة";

  return (
    <section className="admin-notifications-page">
      <div className="admin-card notifications-hero-card">
        <div className="pro-card-head notifications-head">
          <div>
            <span>Notifications Center</span>
            <h2>الإشعارات</h2>
            <p>
              مركز واحد لمتابعة الطلبات الجديدة، المخزون، العملاء، والأحداث المباشرة.
            </p>
          </div>
          <div className="notifications-unread-badge">
            <Bell size={19} />
            <b>{unreadCount}</b>
            <small>غير مقروء</small>
          </div>
        </div>

        <div className="notifications-kpi-grid">
          <div>
            <span>الحالة</span>
            <b>{notificationHealth}</b>
            <small>يتم التحديث مباشرة من بيانات المتجر.</small>
          </div>
          <div>
            <span>طلبات تحتاج متابعة</span>
            <b>{counts.orders || 0}</b>
            <small>طلبات جديدة أو عالية القيمة.</small>
          </div>
          <div>
            <span>تنبيهات المخزون</span>
            <b>{counts.stock || 0}</b>
            <small>الحد الحالي: {lowStockThreshold}</small>
          </div>
          <div>
            <span>إذن المتصفح</span>
            <b>{permissionText}</b>
            <small>خاص بجهازك الحالي فقط.</small>
          </div>
        </div>
      </div>

      <div className="notifications-layout">
        <div className="admin-card notifications-feed-card">
          <div className="notifications-toolbar">
            <div className="notification-filters">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={filter === tab.key ? "on" : ""}
                  onClick={() => setFilter(tab.key)}
                  type="button"
                >
                  {tab.label}
                  <b>{tab.count}</b>
                </button>
              ))}
            </div>
            <div className="notification-actions">
              <button className="admin-secondary" onClick={markAllRead} type="button">
                تعليم الكل كمقروء
              </button>
              <button className="admin-secondary" onClick={clearReads} type="button">
                إعادة إظهار الكل
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {items.length ? (
              items.map((item) => (
                <article
                  className={`notification-row ${item.tone || "neutral"} ${item.read ? "is-read" : "is-unread"}`}
                  key={item.key}
                >
                  <div className="notification-icon">{iconFor(item)}</div>
                  <div className="notification-body">
                    <div>
                      <h3>{item.title}</h3>
                      {!item.read && <span className="notification-dot">جديد</span>}
                    </div>
                    <p>{item.message}</p>
                    <small>{item.meta || "تحديث المتجر"}</small>
                  </div>
                  <div className="notification-row-actions">
                    {item.tab && (
                      <button
                        className="admin-secondary"
                        type="button"
                        onClick={() => setTab(item.tab)}
                      >
                        {item.actionLabel || "فتح"}
                      </button>
                    )}
                    {!item.read && (
                      <button
                        className="admin-primary"
                        type="button"
                        onClick={() => markRead(item.key)}
                      >
                        تم
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="notifications-empty">
                <CheckCircle2 size={34} />
                <h3>لا توجد إشعارات في هذا القسم</h3>
                <p>عند وصول طلبات أو انخفاض المخزون ستظهر هنا تلقائيًا.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="admin-card notifications-settings-card">
          <div className="settings-section-title">
            <Settings size={20} />
            <div>
              <h3>إعدادات الإشعارات</h3>
              <p>اختر نوع التنبيهات التي تريد ظهورها في المركز.</p>
            </div>
          </div>

          <div className="notification-preferences">
            {preferenceRows.map((row) => (
              <label className="setting-toggle-row notification-pref" key={row.key}>
                <input
                  type="checkbox"
                  checked={settings[row.key] !== false}
                  onChange={(e) => saveSettings({ [row.key]: e.target.checked })}
                />
                <span>
                  <b>{row.title}</b>
                  <small>{row.desc}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="notifications-thresholds">
            <label>
              حد المخزون المنخفض
              <input
                type="number"
                min="0"
                defaultValue={lowStockThreshold}
                onBlur={(e) =>
                  saveSettings({ lowStockThreshold: Number(e.target.value || 0) })
                }
              />
            </label>
            <label>
              حد الطلب العالي
              <input
                type="number"
                min="0"
                defaultValue={highValueOrderThreshold}
                onBlur={(e) =>
                  saveSettings({ highValueOrderThreshold: Number(e.target.value || 0) })
                }
              />
            </label>
          </div>

          <label className="setting-toggle-row notification-pref browser-pref">
            <input
              type="checkbox"
              checked={settings.notificationsBrowser === true}
              onChange={(e) => saveSettings({ notificationsBrowser: e.target.checked })}
            />
            <span>
              <b>إشعارات المتصفح</b>
              <small>تحتاج سماح من المتصفح على هذا الجهاز.</small>
            </span>
          </label>
          <button
            type="button"
            className="admin-primary full-width"
            onClick={requestBrowserNotifications}
          >
            طلب السماح من المتصفح
          </button>

          <div className="notifications-mini-summary">
            <b>مصادر الإشعارات الحالية</b>
            <p>
              {allItems.length
                ? `${allItems.length} إشعار من الطلبات والمخزون والأحداث.`
                : "لا توجد إشعارات حالية."}
            </p>
          </div>
        </aside>
      </div>
    </section>
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

  const activeCartVisitors = visitors.filter(
    (v) => Number(v.cartCount || 0) > 0,
  );
  const timezones = [
    ...new Set(visitors.map((v) => v.timezone).filter(Boolean)),
  ];

  return (
    <div className="live-modal-backdrop" onClick={onClose}>
      <div className="live-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="live-modal-head">
          <div>
            <span>Live Visitors</span>
            <h2>الزوار المباشرون</h2>
            <p>
              متابعة الزوار النشطين خلال آخر دقيقة، بدون تخزين بيانات شخصية
              حساسة.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="live-modal-summary">
          <div>
            <b>{visitors.length}</b>
            <span>زائر نشط</span>
          </div>
          <div>
            <b>{activeCartVisitors.length}</b>
            <span>لديهم منتجات بالسلة</span>
          </div>
          <div>
            <b>{timezones.length || 1}</b>
            <span>منطقة زمنية</span>
          </div>
        </div>

        <div className="live-modal-map real-map-layout">
          <div className="live-real-map-card">
            {(() => {
              const located = visitors.filter(
                (v) => Number(v.latitude || 0) && Number(v.longitude || 0),
              );
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
                    <span>
                      تعتمد على IP الزائر، لذلك الموقع تقريبي وليس عنوانًا
                      دقيقًا.
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="live-zone-list">
            <h3>أماكن تواجد الزوار</h3>
            {visitors.length ? (
              visitors.map((visitor, index) => (
                <div key={visitor.id}>
                  <span>
                    {visitor.city || visitor.country
                      ? `${visitor.city || "مدينة غير معروفة"}${visitor.country ? `، ${visitor.country}` : ""}`
                      : visitor.timezone || "موقع غير معروف"}
                  </span>
                  <b>#{index + 1}</b>
                </div>
              ))
            ) : (
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

          {visitors.length ? (
            visitors.map((visitor, index) => (
              <div className="live-table-row" key={visitor.id}>
                <span>زائر #{index + 1}</span>
                <span>{visitor.path || "/"}</span>
                <span>
                  {visitor.city || visitor.country
                    ? `${visitor.city || ""} ${visitor.country || ""}`
                    : `${Number(visitor.cartCount || 0)} منتج`}
                </span>
                <span>
                  {visitor.lastAction || "يتصفح المتجر"} •{" "}
                  {visitor.source || "مباشر"}
                </span>
                <span>
                  {formatLiveTime(visitor.lastSeen)} •{" "}
                  {formatDuration(visitor.sessionDuration)}
                </span>
              </div>
            ))
          ) : (
            <div className="live-empty">لا يوجد زوار نشطون الآن</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffUsersPanel({ staffUsers = [], onNotice = () => {} }) {
  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    role: "products",
    permissions: ["products"],
    status: "active",
    inviteAfterSave: true,
    tempPassword: generateStaffTemporaryPassword(),
  };

  const roleLabels = {
    owner: "مالك المتجر",
    manager: "مدير",
    products: "موظف منتجات",
    orders: "موظف طلبات",
    content: "موظف محتوى",
    support: "دعم عملاء",
  };

  const permissionLabels = ADMIN_PERMISSION_LABELS;
  const permissionDescriptions = ADMIN_PERMISSION_DESCRIPTIONS;
  const roleDefaults = ADMIN_ROLE_DEFAULTS;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [hiddenDeletedStaffKeys, setHiddenDeletedStaffKeys] = useState([]);

  const visibleStaffUsers = useMemo(() => {
    const hidden = new Set(
      hiddenDeletedStaffKeys
        .filter(Boolean)
        .map((item) => String(item).toLowerCase()),
    );
    return staffUsers.filter((user) => {
      if (isStaffDeleted(user)) return false;
      const keys = [user.id, user.authUid, user.email]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());
      return !keys.some((key) => hidden.has(key));
    });
  }, [staffUsers, hiddenDeletedStaffKeys]);

  const stats = useMemo(
    () => ({
      total: visibleStaffUsers.length,
      active: visibleStaffUsers.filter((user) => user.status !== "disabled")
        .length,
      disabled: visibleStaffUsers.filter((user) => user.status === "disabled")
        .length,
      owners: visibleStaffUsers.filter(
        (user) => user.isOwner || user.role === "owner",
      ).length,
    }),
    [visibleStaffUsers],
  );

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleStaffUsers.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        user.phone,
        roleLabels[user.role],
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? user.status !== "disabled"
          : user.status === "disabled");
      return matchesSearch && matchesStatus;
    });
  }, [visibleStaffUsers, search, statusFilter]);

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ ...emptyForm, tempPassword: generateStaffTemporaryPassword() });
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingStaff(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "products",
      permissions: normalizeStaffPermissions(user.permissions),
      status: user.status || "active",
      inviteAfterSave: false,
      tempPassword: user.invitePassword || "",
    });
    setModalOpen(true);
  };

  const setRole = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: normalizeStaffPermissions(
        roleDefaults[role] || prev.permissions,
      ),
    }));
  };

  const togglePermission = (permission) => {
    setForm((prev) => {
      const current = new Set(prev.permissions || []);
      if (current.has(permission)) current.delete(permission);
      else current.add(permission);
      return { ...prev, permissions: [...current] };
    });
  };

  const addPermission = (permission) => {
    if (!permission || editingStaff?.isOwner) return;
    setForm((prev) => {
      const current = new Set(normalizeStaffPermissions(prev.permissions));
      current.add(permission);
      return { ...prev, permissions: [...current] };
    });
  };

  const removePermission = (permission) => {
    if (editingStaff?.isOwner) return;
    setForm((prev) => ({
      ...prev,
      permissions: normalizeStaffPermissions(prev.permissions).filter(
        (item) => item !== permission,
      ),
    }));
  };

  const selectedPermissions = normalizeStaffPermissions(form.permissions);

  const getAdminInviteUrl = (user = {}) => {
    const origin =
      window.location?.origin || "https://ms21alsaadi-wq-github-io.vercel.app";
    const params = new URLSearchParams();
    if (user.email) params.set("email", user.email);
    if (user.invitationToken) params.set("invite", user.invitationToken);
    const queryString = params.toString();
    return `${origin}/admin${queryString ? `?${queryString}` : ""}`;
  };

  const buildInviteMessage = (user = {}) => {
    const permissions =
      normalizeStaffPermissions(user.permissions)
        .map((permission) => permissionLabels[permission] || permission)
        .join("، ") || "حسب الصلاحيات المحددة";
    const roleName = roleLabels[user.role] || "موظف";
    const inviteUrl = getAdminInviteUrl(user);
    return {
      url: inviteUrl,
      subject: `دعوة للانضمام إلى لوحة تحكم GREEN DIXAM`,
      body: `مرحبًا ${user.name || ""}،

تمت دعوتك للانضمام إلى لوحة تحكم متجر GREEN DIXAM.

رابط الدخول:
${inviteUrl}

بيانات الدخول:
البريد: ${user.email || ""}
كلمة المرور المؤقتة: ${user.invitePassword || "استخدم كلمة المرور التي تم تزويدك بها من مالك المتجر"}

الدور:
${roleName}

الصلاحيات:
${permissions}

ملاحظة: هذه كلمة مرور مؤقتة خاصة بحساب لوحة التحكم.

تحياتي`,
    };
  };

  const openInviteEmail = (user) => {
    if (!user?.email) {
      onNotice("لا يوجد بريد إلكتروني لهذا الموظف");
      return;
    }
    const invite = buildInviteMessage(user);
    const mailto = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(invite.subject)}&body=${encodeURIComponent(invite.body)}`;
    const opened = window.open(mailto, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = mailto;
    onNotice("إذا لم يفتح البريد عندك، استخدم زر نسخ نص الدعوة وأرسلها يدويًا");
  };

  const copyInviteLink = async (user) => {
    const invite = buildInviteMessage(user);
    const fullInviteText = `${invite.subject}

${invite.body}`;
    try {
      await navigator.clipboard.writeText(fullInviteText);
      onNotice("تم نسخ نص الدعوة كاملًا مع الرابط وكلمة المرور المؤقتة");
    } catch (error) {
      window.prompt("انسخ نص الدعوة", fullInviteText);
    }
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email) {
      onNotice("اكتب اسم الموظف والبريد الإلكتروني");
      return;
    }

    const isOwner = Boolean(editingStaff?.isOwner || form.role === "owner");
    let staffId = editingStaff?.id || `staff-${Date.now()}`;
    let authUid =
      editingStaff?.authUid ||
      (editingStaff?.id && !String(editingStaff.id).startsWith("staff-")
        ? editingStaff.id
        : "") ||
      "";
    let accountAlreadyExists = false;
    let restoredDeletedStaff = null;
    let restoredDeletedAdmin = null;
    let temporaryPassword = editingStaff
      ? editingStaff.invitePassword || ""
      : String(form.tempPassword || "").trim();
    const invitationToken =
      editingStaff?.invitationToken ||
      `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const sameEmailSnap = await getDocs(
      query(collection(db, "staffUsers"), where("email", "==", email)),
    );
    const sameAdminSnap = await getDocs(
      query(collection(db, "admins"), where("email", "==", email)),
    );
    const existingStaffDocs = sameEmailSnap.docs.map((staffDoc) => ({
      id: staffDoc.id,
      ...(staffDoc.data() || {}),
    }));
    const existingAdminDocs = sameAdminSnap.docs.map((adminDoc) => ({
      id: adminDoc.id,
      ...(adminDoc.data() || {}),
    }));

    if (!editingStaff) {
      const activeStaff = existingStaffDocs.find(
        (item) => !isStaffDisabled(item),
      );
      const activeAdmin = existingAdminDocs.find(
        (item) => !isStaffDisabled(item),
      );

      if (activeStaff || activeAdmin) {
        onNotice(
          "هذا البريد موجود بالفعل ضمن الموظفين. افتح الموظف من الجدول وعدّل بياناته بدل إضافته من جديد.",
        );
        return;
      }

      restoredDeletedStaff =
        existingStaffDocs.find(
          (item) => isStaffDisabled(item) || isStaffDeleted(item),
        ) || null;
      restoredDeletedAdmin =
        existingAdminDocs.find(
          (item) => isStaffDisabled(item) || isStaffDeleted(item),
        ) || null;

      if (restoredDeletedAdmin?.id) {
        authUid = restoredDeletedAdmin.id;
        staffId = restoredDeletedAdmin.id;
        accountAlreadyExists = true;
      } else if (restoredDeletedStaff?.authUid) {
        authUid = restoredDeletedStaff.authUid;
        staffId = restoredDeletedStaff.authUid;
        accountAlreadyExists = true;
      } else if (
        restoredDeletedStaff?.id &&
        !String(restoredDeletedStaff.id).startsWith("staff-")
      ) {
        authUid = restoredDeletedStaff.id;
        staffId = restoredDeletedStaff.id;
        accountAlreadyExists = true;
      } else if (restoredDeletedStaff?.id) {
        staffId = restoredDeletedStaff.id;
      }

      if (temporaryPassword.length < 6) {
        onNotice("كلمة المرور المؤقتة يجب أن تكون 6 أحرف أو أكثر");
        return;
      }

      // الحل الأفضل للحسابات التي حُذفت ثم أُعيدت: نستخدم دالة Vercel الآمنة
      // لتحديث كلمة مرور حساب Firebase Auth الموجود وإعادة تفعيله بنفس الرمز المؤقت.
      try {
        const authResult = await upsertStaffAuthUser({
          email,
          password: temporaryPassword,
          name: form.name.trim(),
        });
        if (!authResult?.uid) {
          throw Object.assign(new Error("staff-auth-invalid-response"), {
            code: "staff-auth-invalid-response",
          });
        }
        authUid = authResult.uid;
        staffId = authUid;
        accountAlreadyExists = false;
      } catch (apiError) {
        if (["active-staff-exists", "permission-denied", "missing-id-token"].includes(apiError?.code)) {
          onNotice(apiError.message || "تعذر إنشاء حساب الموظف");
          return;
        }

        // عند عدم ضبط مفاتيح Firebase Admin في Vercel نرجع للطريقة القديمة:
        // إنشاء حساب جديد من المتصفح، أو إرسال رابط إعادة تعيين إذا كان الحساب موجودًا.
        try {
          const secondaryApp = initializeApp(
            firebaseConfig,
            `staffInviteApp-${Date.now()}`,
          );
          const secondaryAuth = getAuth(secondaryApp);
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            temporaryPassword,
          );
          authUid = cred.user.uid;
          staffId = authUid;
          accountAlreadyExists = false;
          await updateProfile(cred.user, { displayName: form.name.trim() });
          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);
        } catch (error) {
          if (error?.code === "auth/email-already-in-use") {
            accountAlreadyExists = true;
            // لا يمكن من المتصفح تغيير كلمة مرور حساب Firebase Auth موجود مسبقًا.
            // إذا لم تكن دالة Vercel مفعلة، نفعّل الموظف ونرسل له رابط إعادة تعيين كلمة المرور.
            staffId =
              restoredDeletedAdmin?.id ||
              restoredDeletedStaff?.authUid ||
              restoredDeletedStaff?.id ||
              `staff-${Date.now()}`;
            authUid =
              restoredDeletedAdmin?.id || restoredDeletedStaff?.authUid || "";
            try {
              await sendPasswordResetEmail(auth, email);
            } catch (resetError) {}
          } else {
            onNotice(firebaseError(error));
            return;
          }
        }
      }
    }

    const permissions = isOwner
      ? Object.keys(permissionLabels)
      : normalizeStaffPermissions(form.permissions);
    const payload = {
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      role: isOwner ? "owner" : form.role,
      permissions,
      status: isOwner ? "active" : form.status,
      isOwner,
      authUid,
      invitationToken,
      invitePassword: editingStaff
        ? editingStaff.invitePassword || ""
        : temporaryPassword,
      mustChangePassword: editingStaff
        ? Boolean(editingStaff.mustChangePassword)
        : true,
      invitationStatus: accountAlreadyExists
        ? "pending-temporary-activation"
        : editingStaff?.invitationStatus ||
          (form.inviteAfterSave ? "pending" : "created"),
      invitedAtMs: form.inviteAfterSave
        ? Date.now()
        : editingStaff?.invitedAtMs ||
          restoredDeletedStaff?.invitedAtMs ||
          null,
      createdAtMs:
        editingStaff?.createdAtMs ||
        restoredDeletedStaff?.createdAtMs ||
        Date.now(),
      restoredAtMs:
        restoredDeletedStaff || restoredDeletedAdmin ? Date.now() : null,
      isDeleted: false,
      deleted: false,
      disabled: false,
      deletedAtMs: null,
      deletedAt: null,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "staffUsers", staffId), payload, { merge: true });

    // تنظيف أي سجلات قديمة لنفس البريد حتى لا يرجع التعارض بعد الحذف وإعادة الإضافة.
    await Promise.all(
      existingStaffDocs
        .filter((item) => item.id && item.id !== staffId)
        .map(async (item) => {
          try {
            await deleteDoc(doc(db, "staffUsers", item.id));
          } catch (cleanupError) {
            await setDoc(
              doc(db, "staffUsers", item.id),
              {
                status: "deleted",
                isDeleted: true,
                deleted: true,
                disabled: true,
                permissions: [],
                deletedAtMs: Date.now(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        }),
    );

    const adminId =
      authUid ||
      (staffId && !String(staffId).startsWith("staff-") ? staffId : "");
    if (adminId) {
      await setDoc(
        doc(db, "admins", adminId),
        {
          email,
          role: payload.role,
          permissions:
            payload.status === "disabled" ? [] : payload.permissions,
          staffUser: true,
          status: payload.status,
          disabled: payload.status === "disabled",
          isDeleted: false,
          deleted: false,
          mustChangePassword: payload.mustChangePassword,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setModalOpen(false);
    setEditingStaff(null);
    setForm({ ...emptyForm, tempPassword: generateStaffTemporaryPassword() });
    setHiddenDeletedStaffKeys((prev) =>
      prev.filter(
        (key) =>
          ![staffId, authUid, email]
            .filter(Boolean)
            .map((item) => String(item).toLowerCase())
            .includes(String(key).toLowerCase()),
      ),
    );

    if (!editingStaff && form.inviteAfterSave && !accountAlreadyExists) {
      openInviteEmail({ id: staffId, ...payload });
    } else if (!editingStaff && accountAlreadyExists) {
      onNotice(
        "تمت إعادة تفعيل الموظف وحفظ الرمز المؤقت. إذا ظهرت له رسالة بيانات الدخول غير صحيحة، تأكد من إعداد Firebase Admin في Vercel ثم اعمل Redeploy، أو أرسل له استعادة كلمة المرور.",
      );
    } else {
      onNotice(
        editingStaff
          ? "تم تحديث بيانات الموظف"
          : restoredDeletedStaff || restoredDeletedAdmin
            ? "تمت إعادة تفعيل الموظف"
            : "تمت إضافة الموظف",
      );
    }
  };

  const toggleStatus = async (user) => {
    if (user.isOwner || user.role === "owner") {
      onNotice("لا يمكن تعطيل مالك المتجر");
      return;
    }
    const nextStatus = user.status === "disabled" ? "active" : "disabled";
    await setDoc(
      doc(db, "staffUsers", user.id),
      { status: nextStatus, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const adminDocId = user.authUid || user.id;
    if (adminDocId) {
      await setDoc(
        doc(db, "admins", adminDocId),
        {
          status: nextStatus,
          disabled: nextStatus === "disabled",
          permissions:
            nextStatus === "disabled"
              ? []
              : normalizeStaffPermissions(user.permissions),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    onNotice(
      nextStatus === "disabled"
        ? "تم تعطيل حساب الموظف"
        : "تم تفعيل حساب الموظف",
    );
  };

  const removeStaff = async (user) => {
    if (user.isOwner || user.role === "owner") {
      onNotice("لا يمكن حذف مالك المتجر");
      return;
    }
    if (!window.confirm(`حذف الموظف ${user.name || user.email}؟`)) return;

    const email = String(user.email || "")
      .trim()
      .toLowerCase();
    const localHideKeys = [user.id, user.authUid, email].filter(Boolean);

    // إخفاء فوري من الجدول حتى لو تأخر onSnapshot في Firebase.
    setHiddenDeletedStaffKeys((prev) => [
      ...new Set([...prev, ...localHideKeys]),
    ]);

    try {
      const idsToDisable = new Set([user.id, user.authUid].filter(Boolean));
      const matchingStaffDocs = [];

      if (email) {
        const sameEmailSnap = await getDocs(
          query(collection(db, "staffUsers"), where("email", "==", email)),
        );
        sameEmailSnap.docs.forEach((staffDoc) => {
          idsToDisable.add(staffDoc.id);
          const data = staffDoc.data() || {};
          if (data.authUid) idsToDisable.add(data.authUid);
          matchingStaffDocs.push({ id: staffDoc.id, ...data });
        });
      }

      const staffDocIds = new Set(
        [user.id, ...matchingStaffDocs.map((item) => item.id)].filter(Boolean),
      );
      if (!staffDocIds.size && user.id) staffDocIds.add(user.id);

      // نحذف مستند الموظف من staffUsers حتى يختفي فعليًا من الجدول.
      // وإذا رفضت قواعد Firebase الحذف، نرجع لـ soft delete كخطة بديلة.
      await Promise.all(
        [...staffDocIds].map(async (staffDocId) => {
          try {
            await deleteDoc(doc(db, "staffUsers", staffDocId));
          } catch (deleteError) {
            await setDoc(
              doc(db, "staffUsers", staffDocId),
              {
                status: "deleted",
                isDeleted: true,
                deleted: true,
                disabled: true,
                permissions: [],
                deletedAtMs: Date.now(),
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        }),
      );

      await Promise.all(
        [...idsToDisable].map((adminDocId) =>
          setDoc(
            doc(db, "admins", adminDocId),
            {
              email,
              staffUser: true,
              status: "deleted",
              disabled: true,
              isDeleted: true,
              deleted: true,
              permissions: [],
              deletedAtMs: Date.now(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
      );

      try {
        const uidToDisable = user.authUid ||
          (user.id && !String(user.id).startsWith("staff-") ? user.id : "");
        await disableStaffAuthUser({ uid: uidToDisable, email });
      } catch (authDisableError) {
        // تعطيل الدخول الأساسي تم عبر مستندات admins/staffUsers، وهذه خطوة إضافية إذا كانت دالة Vercel مفعلة.
      }

      onNotice("تم حذف الموظف من الجدول وتعطيل دخوله للوحة التحكم");
    } catch (error) {
      // لو فشلت العملية نرجع إظهاره بدل ما يختفي محليًا فقط.
      setHiddenDeletedStaffKeys((prev) =>
        prev.filter((key) => !localHideKeys.includes(key)),
      );
      onNotice(firebaseError(error));
    }
  };

  const issuePasswordReset = async (user) => {
    const email = String(user?.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      onNotice("لا يوجد بريد إلكتروني لهذا الموظف");
      return;
    }

    const code = generateStaffTemporaryPassword();
    const currentStaffDocId = user.id;
    const currentAuthUid =
      user.authUid ||
      (user.id && !String(user.id).startsWith("staff-") ? user.id : "");

    let authPasswordUpdated = false;
    let resolvedAuthUid = currentAuthUid;
    let serverMessage = "";

    try {
      const result = await setStaffAuthPassword({
        uid: currentAuthUid,
        email,
        password: code,
        name: user.name || "",
      });
      if (result?.uid) resolvedAuthUid = result.uid;
      authPasswordUpdated = true;
    } catch (serverError) {
      serverMessage = serverError?.message || "";
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (resetError) {}
    }

    try {
      const { id, ...userData } = user || {};
      const targetStaffDocId = resolvedAuthUid || currentStaffDocId;
      const staffPayload = {
        ...userData,
        email,
        authUid: resolvedAuthUid || currentAuthUid || "",
        invitePassword: code,
        recoveryCode: code,
        recoveryCodeIssuedAtMs: Date.now(),
        recoveryCodeStatus: authPasswordUpdated ? "temporary-password-issued" : "issued",
        mustChangePassword: true,
        invitationStatus: authPasswordUpdated
          ? "temporary-password-issued"
          : "password-reset-required",
        status: "active",
        disabled: false,
        isDeleted: false,
        deleted: false,
        updatedAt: serverTimestamp(),
      };

      if (targetStaffDocId) {
        await setDoc(doc(db, "staffUsers", targetStaffDocId), staffPayload, {
          merge: true,
        });
      }

      if (
        currentStaffDocId &&
        resolvedAuthUid &&
        currentStaffDocId !== resolvedAuthUid
      ) {
        await setDoc(
          doc(db, "staffUsers", currentStaffDocId),
          {
            status: "deleted",
            disabled: true,
            isDeleted: true,
            deleted: true,
            mergedTo: resolvedAuthUid,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const adminDocId = resolvedAuthUid || currentAuthUid;
      if (adminDocId) {
        await setDoc(
          doc(db, "admins", adminDocId),
          {
            email,
            role: user.role || "staff",
            permissions: normalizeStaffPermissions(user.permissions),
            staffUser: true,
            status: "active",
            disabled: false,
            isDeleted: false,
            deleted: false,
            mustChangePassword: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const recoveryText = authPasswordUpdated
        ? `مرحبًا ${user.name || ""}،

تم إصدار كلمة مرور مؤقتة جديدة لدخول لوحة التحكم.

رابط الدخول:
${getAdminInviteUrl({ ...user, email })}

البريد:
${email}

كلمة المرور المؤقتة:
${code}

بعد الدخول سيطلب منك النظام تغيير كلمة المرور.`
        : `مرحبًا ${user.name || ""}،

تم إصدار طلب استعادة دخول لوحة التحكم.

رابط الدخول:
${getAdminInviteUrl({ ...user, email })}

البريد:
${email}

رمز مؤقت محفوظ في النظام:
${code}

مهم: إذا لم يعمل الرمز المؤقت، استخدم رابط إعادة تعيين كلمة المرور الذي وصلك على البريد.
${serverMessage ? `\nملاحظة للمالك: ${serverMessage}` : ""}`;

      try {
        await navigator.clipboard.writeText(recoveryText);
        onNotice(
          authPasswordUpdated
            ? "تم تعيين كلمة مرور مؤقتة جديدة ونسخ نصها للموظف."
            : "تم إرسال رابط إعادة تعيين كلمة المرور ونسخ نص الاستعادة.",
        );
      } catch (copyError) {
        window.prompt("انسخ نص استعادة الدخول", recoveryText);
      }
    } catch (error) {
      onNotice(firebaseError(error));
    }
  };

  return (
    <section className="admin-card staff-admin-page">
      <div className="pro-card-head staff-head">
        <div>
          <span>Team Access</span>
          <h2>المستخدمين والموظفين</h2>
          <p>إدارة الموظفين الذين يدخلون لوحة التحكم وتحديد صلاحيات كل موظف.</p>
        </div>
        <button type="button" className="admin-primary" onClick={openCreate}>
          <Plus size={18} /> إضافة موظف
        </button>
      </div>

      <div className="staff-stats-grid">
        <div>
          <b>{stats.total}</b>
          <span>إجمالي الموظفين</span>
        </div>
        <div>
          <b>{stats.active}</b>
          <span>نشط</span>
        </div>
        <div>
          <b>{stats.disabled}</b>
          <span>معطل</span>
        </div>
        <div>
          <b>{stats.owners}</b>
          <span>مالك المتجر</span>
        </div>
      </div>

      <div className="staff-toolbar">
        <label className="admin-search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الجوال"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="disabled">معطل</option>
        </select>
      </div>

      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>البريد</th>
              <th>الجوال</th>
              <th>الدور</th>
              <th>الصلاحيات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length ? (
              filteredStaff.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="staff-person">
                      <span>
                        {(user.name || user.email || "م").slice(0, 1)}
                      </span>
                      <div>
                        <b>{user.name || "بدون اسم"}</b>
                        {user.isOwner && <em>مالك المتجر</em>}
                      </div>
                    </div>
                  </td>
                  <td>{user.email || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>
                    <span className="staff-role-chip">
                      {roleLabels[user.role] || user.role || "موظف"}
                    </span>
                  </td>
                  <td>
                    <div className="staff-permissions-preview">
                      {normalizeStaffPermissions(user.permissions)
                        .slice(0, 3)
                        .map((permission) => (
                          <span key={permission}>
                            {permissionLabels[permission] || permission}
                          </span>
                        ))}
                      {normalizeStaffPermissions(user.permissions).length >
                        3 && (
                        <span>
                          +
                          {normalizeStaffPermissions(user.permissions).length -
                            3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        user.status === "disabled"
                          ? "staff-status off"
                          : "staff-status on"
                      }
                    >
                      {user.status === "disabled" ? "معطل" : "نشط"}
                    </span>
                  </td>
                  <td>
                    <div className="staff-actions">
                      <button
                        type="button"
                        onClick={() => openInviteEmail(user)}
                        title="إرسال دعوة"
                      >
                        <Mail size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyInviteLink(user)}
                        title="نسخ نص الدعوة"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => issuePasswordReset(user)}
                        title="إرسال رابط استعادة كلمة المرور"
                        aria-label="إرسال رابط استعادة كلمة المرور"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        title="تعديل"
                        aria-label="تعديل الموظف"
                      >
                        <Pencil size={16} />
                      </button>
                      {!user.isOwner && (
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          title={
                            user.status === "disabled"
                              ? "تنشيط الموظف"
                              : "تعطيل الموظف"
                          }
                          aria-label={
                            user.status === "disabled"
                              ? "تنشيط الموظف"
                              : "تعطيل الموظف"
                          }
                        >
                          {user.status === "disabled" ? (
                            <UserCheck size={16} />
                          ) : (
                            <UserX size={16} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeStaff(user)}
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="staff-empty">
                  لا يوجد موظفون مطابقون للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="staff-permissions-overview">
        <div className="staff-permissions-overview-head">
          <div>
            <span>Permissions Map</span>
            <h3>جدول الصلاحيات حسب القسم</h3>
            <p>
              مرجع سريع يوضح معنى كل صلاحية في لوحة التحكم. هذا الجدول للشرح
              فقط، أما تحديد صلاحيات الموظف فيتم من نافذة الإضافة أو التعديل.
            </p>
          </div>
        </div>
        <div className="staff-permission-table-wrap compact">
          <table className="staff-permission-table">
            <thead>
              <tr>
                <th>القسم</th>
                <th>ما الذي تسمح به هذه الصلاحية؟</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(permissionLabels).map(([key, label]) => (
                <tr key={key}>
                  <td>
                    <b>{label}</b>
                  </td>
                  <td>{permissionDescriptions[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="product-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <form
            className="product-modal-shell staff-modal-card"
            onSubmit={saveStaff}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-modal-head">
              <div>
                <span>Staff User</span>
                <h2>{editingStaff ? "تعديل موظف" : "إضافة موظف"}</h2>
                <p>أضف بيانات الموظف وحدد الدور والصلاحيات المناسبة له.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-form-card">
                <div className="staff-modal-section-title">
                  <span>Basic Info</span>
                  <h3>بيانات الموظف</h3>
                </div>
                <div className="staff-form-grid">
                  <Control label="اسم الموظف">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="مثال: محمد أحمد"
                    />
                  </Control>
                  <Control label="البريد الإلكتروني">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="name@example.com"
                      disabled={Boolean(editingStaff?.isOwner)}
                    />
                  </Control>
                  {!editingStaff && (
                    <Control label="كلمة مرور مؤقتة">
                      <div className="staff-password-row">
                        <input
                          value={form.tempPassword}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              tempPassword: e.target.value,
                            }))
                          }
                          placeholder="كلمة مرور للموظف"
                          minLength="6"
                        />
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              tempPassword: generateStaffTemporaryPassword(),
                            }))
                          }
                        >
                          توليد
                        </button>
                      </div>
                    </Control>
                  )}
                  <Control label="رقم الجوال">
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="05xxxxxxxx"
                    />
                  </Control>
                  <Control label="الدور">
                    <select
                      value={form.role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={Boolean(editingStaff?.isOwner)}
                    >
                      <option value="manager">مدير</option>
                      <option value="products">موظف منتجات</option>
                      <option value="orders">موظف طلبات</option>
                      <option value="content">موظف محتوى</option>
                      <option value="support">دعم عملاء</option>
                    </select>
                  </Control>
                  <Control label="الحالة">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                      disabled={Boolean(editingStaff?.isOwner)}
                    >
                      <option value="active">نشط</option>
                      <option value="disabled">معطل</option>
                    </select>
                  </Control>
                </div>
                {!editingStaff && (
                  <label className="staff-invite-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(form.inviteAfterSave)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inviteAfterSave: e.target.checked,
                        }))
                      }
                    />
                    <span>فتح رسالة دعوة جاهزة بالبريد بعد حفظ الموظف</span>
                  </label>
                )}
                <div className="staff-invite-note">
                  <Mail size={16} />
                  <p>
                    للموظف الجديد يتم إنشاء كلمة مرور مؤقتة. إذا كان البريد
                    مستخدمًا سابقًا، سيتم تفعيل الموظف وإرسال رابط إعادة تعيين
                    كلمة المرور بدل كلمة مؤقتة جديدة.
                  </p>
                </div>
                {editingStaff && !editingStaff.isOwner && (
                  <div className="staff-recovery-card">
                    <div>
                      <b>استعادة دخول الموظف</b>
                      <p>
                        لو الموظف نسي كلمة المرور، أرسل له رابط إعادة تعيين آمن
                        ونسخ نص الاستعادة. الحسابات الموجودة سابقًا لا يمكن
                        تغيير كلمة مرورها من المتصفح مباشرة بدون Backend.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => issuePasswordReset(editingStaff)}
                    >
                      استعادة كلمة المرور
                    </button>
                  </div>
                )}
              </div>

              <div className="staff-permission-box staff-permission-badges-box">
                <div className="staff-modal-section-title">
                  <span>Access</span>
                  <h3>صلاحيات الموظف</h3>
                  <p>
                    أضف صلاحيات الموظف كشرائح صغيرة بدل جدول طويل داخل النافذة.
                  </p>
                </div>

                <Control label="إضافة صلاحية">
                  <select
                    value=""
                    onChange={(e) => addPermission(e.target.value)}
                    disabled={Boolean(editingStaff?.isOwner)}
                  >
                    <option value="">اختر صلاحية لإضافتها</option>
                    {Object.entries(permissionLabels)
                      .filter(([key]) => !selectedPermissions.includes(key))
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </Control>

                <div className="staff-permission-badges">
                  {(editingStaff?.isOwner
                    ? Object.keys(permissionLabels)
                    : selectedPermissions
                  ).length ? (
                    (editingStaff?.isOwner
                      ? Object.keys(permissionLabels)
                      : selectedPermissions
                    ).map((permission) => (
                      <span
                        key={permission}
                        className="staff-permission-badge"
                        title={
                          permissionDescriptions[permission] ||
                          "الوصول إلى هذا القسم"
                        }
                      >
                        {permissionLabels[permission] || permission}
                        {!editingStaff?.isOwner && (
                          <button
                            type="button"
                            onClick={() => removePermission(permission)}
                            aria-label={`حذف صلاحية ${permissionLabels[permission] || permission}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <em className="staff-permission-empty">
                      لم تتم إضافة أي صلاحية بعد
                    </em>
                  )}
                </div>
              </div>
            </div>

            <div className="product-modal-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setModalOpen(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="admin-primary">
                <Save size={17} /> حفظ الموظف
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function CustomersPanel({ customers, orders }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((c) => {
    const text =
      `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.city || ""} ${c.address || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const selectedOrders = selected
    ? orders.filter(
        (o) =>
          o.customerId === selected.id || o.customerEmail === selected.email,
      )
    : [];

  return (
    <section className="customers-pro-page">
      <div className="admin-card customers-pro-hero">
        <div>
          <span>Customers CRM</span>
          <h2>إدارة العملاء</h2>
          <p>
            استعرض بيانات العملاء المسجلين وابحث بسرعة بالاسم أو الإيميل أو
            الجوال أو المدينة.
          </p>
        </div>

        <div className="customers-pro-stats">
          <div>
            <b>{customers.length}</b>
            <small>إجمالي العملاء</small>
          </div>
          <div>
            <b>{filteredCustomers.length}</b>
            <small>نتائج البحث</small>
          </div>
        </div>
      </div>

      <div className="admin-card customers-pro-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن عميل..."
        />
        {search && (
          <button className="admin-secondary" onClick={() => setSearch("")}>
            مسح البحث
          </button>
        )}
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
            {filteredCustomers.map((c) => (
              <button
                className={`customer-pro-card ${selected?.id === c.id ? "selected" : ""}`}
                key={c.id}
                onClick={() => setSelected(c)}
              >
                <div className="customer-pro-avatar">
                  {(c.name || c.email || "?")[0]}
                </div>
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
                <div className="customer-pro-avatar large">
                  {(selected.name || selected.email || "?")[0]}
                </div>
                <div>
                  <span>Customer Details</span>
                  <h2>{selected.name || "عميل بدون اسم"}</h2>
                  <p>{selected.email || "لا يوجد إيميل"}</p>
                </div>
              </div>

              <div className="customer-detail-grid-pro">
                <div>
                  <span>الجوال</span>
                  <b>{selected.phone || "غير متوفر"}</b>
                </div>
                <div>
                  <span>المدينة</span>
                  <b>{selected.city || "غير محدد"}</b>
                </div>
                <div className="wide">
                  <span>العنوان</span>
                  <b>{selected.address || "غير متوفر"}</b>
                </div>
                <div>
                  <span>عدد الطلبات</span>
                  <b>{selectedOrders.length}</b>
                </div>
                <div>
                  <span>الحالة</span>
                  <b>مسجل</b>
                </div>
              </div>

              <div className="customer-orders-preview">
                <h3>طلبات العميل</h3>
                {selectedOrders.length ? (
                  selectedOrders.map((o) => (
                    <div className="mini-order" key={o.id}>
                      {formatPrice(o.total)} ر.س • {o.status}
                    </div>
                  ))
                ) : (
                  <p className="muted">لا توجد طلبات بعد.</p>
                )}
              </div>

              <div className="customer-detail-actions-pro">
                <button
                  className="admin-secondary"
                  onClick={() => setSelected(null)}
                >
                  إغلاق التفاصيل
                </button>
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
    cancelled: "ملغي",
  };

  const statusOptions = [
    { value: "all", label: "كل الطلبات" },
    { value: "new", label: "جديد" },
    { value: "processing", label: "قيد التجهيز" },
    { value: "shipped", label: "تم الشحن" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
  ];

  const normalizedOrders = orders
    .map((o) => ({
      ...o,
      status: o.status || "new",
      total: Number(o.total || 0),
      items: o.items || [],
    }))
    .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));

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
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  };

  const filteredOrders = normalizedOrders.filter((o) => {
    const statusOk = statusFilter === "all" || o.status === statusFilter;
    const text =
      `${o.name || ""} ${o.customerName || ""} ${o.email || ""} ${o.customerEmail || ""} ${o.phone || ""} ${o.city || ""} ${o.id || ""}`.toLowerCase();
    return statusOk && isWithinDate(o) && text.includes(search.toLowerCase());
  });

  const totals = normalizedOrders.reduce(
    (acc, o) => {
      acc.count += 1;
      acc.value += o.total;
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    { count: 0, value: 0 },
  );

  const updateShippingInfo = async (orderId, patch) => {
    await setDoc(
      doc(db, "orders", orderId),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const updateOrderStatus = async (orderId, status) => {
    await setDoc(
      doc(db, "orders", orderId),
      { status, updatedAt: serverTimestamp() },
      { merge: true },
    );

    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const sent = await sendOrderStatusEmail(
        { ...order, id: orderId },
        status,
      );
      onNotice?.(
        sent
          ? "تم تحديث حالة الطلب وإرسال إيميل للعميل"
          : "تم تحديث حالة الطلب، لكن لم يتم إرسال الإيميل",
        3500,
      );
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm("هل تريد حذف هذا الطلب؟")) {
      await deleteDoc(doc(db, "orders", orderId));
    }
  };

  const exportOrdersCsv = () => {
    const headers = [
      "order_id",
      "customer",
      "email",
      "phone",
      "city",
      "status",
      "total",
      "coupon",
      "created_at",
      "shipping_company",
      "tracking_number",
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredOrders.map((order) => [
      order.id,
      order.name || order.customerName || "",
      order.email || order.customerEmail || "",
      order.phone || "",
      order.city || "",
      statusLabels[order.status] || order.status,
      order.total,
      order.couponCode || "",
      formatOrderDate(order.createdAt),
      order.shippingCompany === "other"
        ? order.customShipping
        : order.shippingCompany,
      order.trackingNumber || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
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
          <div>
            <b>{totals.count}</b>
            <small>طلب</small>
          </div>
          <div>
            <b>{formatPrice(totals.value)}</b>
            <small>{t("totalSales")}</small>
          </div>
          <div>
            <b>{totals.new || 0}</b>
            <small>طلبات جديدة</small>
          </div>
        </div>
      </div>

      <div className="admin-card orders-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل، الإيميل، الجوال، المدينة..."
        />

        <button
          type="button"
          className="admin-secondary export-orders-btn"
          onClick={exportOrdersCsv}
        >
          <Download size={16} /> تصدير النتائج
        </button>

        <div className="orders-date-filters">
          <button
            className={dateFilter === "all" ? "active" : ""}
            onClick={() => setDateFilter("all")}
          >
            الكل
          </button>
          <button
            className={dateFilter === "today" ? "active" : ""}
            onClick={() => setDateFilter("today")}
          >
            اليوم
          </button>
          <button
            className={dateFilter === "week" ? "active" : ""}
            onClick={() => setDateFilter("week")}
          >
            الأسبوع
          </button>
          <button
            className={dateFilter === "month" ? "active" : ""}
            onClick={() => setDateFilter("month")}
          >
            الشهر
          </button>
        </div>

        <div className="orders-filter-tabs">
          {statusOptions.map((s) => (
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
        {filteredOrders.map((order) => (
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
              <div>
                <span>الجوال</span>
                <b>{order.phone || "غير متوفر"}</b>
              </div>
              <div>
                <span>المدينة</span>
                <b>{order.city || "غير محدد"}</b>
              </div>
              <div>
                <span>الإجمالي</span>
                <b>{formatPrice(order.total)} ر.س</b>
              </div>
              <div>
                <span>الكوبون</span>
                <b>
                  {order.couponCode
                    ? `${order.couponCode} (${order.couponPercent || 0}%)`
                    : "لا يوجد"}
                </b>
              </div>
              <div>
                <span>عدد المنتجات</span>
                <b>{order.items.length}</b>
              </div>
              <div className="wide">
                <span>تاريخ الطلب</span>
                <b>{formatOrderDate(order.createdAt)}</b>
              </div>
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
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name || "منتج"}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span>{item.name}</span>
                  <b>{item.qty || 1}x</b>
                </div>
              ))}
              {order.items.length > 4 && (
                <small>+{order.items.length - 4} منتجات أخرى</small>
              )}
            </div>

            <div className="order-shipping-box">
              <div className="shipping-head">
                <span>بيانات الشحن</span>
                <b>
                  {order.shippingCompany === "other"
                    ? order.customShipping || "أخرى"
                    : order.shippingCompany || "لم يتم التحديد"}
                </b>
              </div>

              <div className="shipping-fields-grid">
                <select
                  value={order.shippingCompany || ""}
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      shippingCompany: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      trackingNumber: e.target.value,
                    })
                  }
                />
              </div>

              {order.shippingCompany === "other" && (
                <input
                  className="custom-shipping-input"
                  placeholder="اكتب اسم شركة الشحن"
                  value={order.customShipping || ""}
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      customShipping: e.target.value,
                    })
                  }
                />
              )}
            </div>

            {order.trackingNumber && (
              <a
                className="tracking-link-admin"
                href={getTrackingUrl(
                  order.shippingCompany,
                  order.trackingNumber,
                  order.customShipping,
                )}
                target="_blank"
                rel="noreferrer"
              >
                فتح تتبع الشحنة
              </a>
            )}

            <div className="order-actions-pro">
              <button
                type="button"
                className="admin-secondary order-details-btn"
                onClick={() => setSelectedOrder(order)}
              >
                تفاصيل
              </button>
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
              >
                <option value="new">جديد</option>
                <option value="processing">قيد التجهيز</option>
                <option value="shipped">تم الشحن</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>

              <button
                className="danger-action"
                onClick={() => deleteOrder(order.id)}
              >
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
        <div
          className="order-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-modal-head">
              <div>
                <span>Order Details</span>
                <h2>تفاصيل الطلب</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                ×
              </button>
            </div>

            <div className="order-modal-info">
              <div>
                <span>رقم الطلب</span>
                <b>#{String(selectedOrder.id || "").slice(0, 10)}</b>
              </div>
              <div>
                <span>الحالة</span>
                <b>{selectedOrder.status || "new"}</b>
              </div>
              <div>
                <span>العميل</span>
                <b>
                  {selectedOrder.name ||
                    selectedOrder.customerName ||
                    "غير محدد"}
                </b>
              </div>
              <div>
                <span>الجوال</span>
                <b>{selectedOrder.phone || "غير متوفر"}</b>
              </div>
              <div>
                <span>الإيميل</span>
                <b>
                  {selectedOrder.email ||
                    selectedOrder.customerEmail ||
                    "غير متوفر"}
                </b>
              </div>
              <div>
                <span>الكوبون</span>
                <b>
                  {selectedOrder.couponCode
                    ? `${selectedOrder.couponCode} (${selectedOrder.couponPercent || 0}%)`
                    : "لا يوجد"}
                </b>
              </div>
              <div>
                <span>الخصم</span>
                <b>{formatPrice(Number(selectedOrder.discount || 0))} ر.س</b>
              </div>
              <div>
                <span>الإجمالي</span>
                <b>{formatPrice(Number(selectedOrder.total || 0))} ر.س</b>
              </div>
              <div>
                <span>تاريخ الطلب</span>
                <b>{formatOrderDate(selectedOrder.createdAt)}</b>
              </div>
              <div className="wide">
                <span>العنوان</span>
                <b>{selectedOrder.address || "غير متوفر"}</b>
              </div>
            </div>

            <div className="order-modal-products">
              <h3>{t("products")}</h3>
              {(selectedOrder.items || []).length ? (
                (selectedOrder.items || []).map((item, i) => (
                  <div className="order-modal-item" key={i}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || "product"}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="order-modal-no-img">🌿</div>
                    )}
                    <div>
                      <b>{item.name || "منتج"}</b>
                      <span>
                        {item.selectedSize || item.size || item.category || ""}
                      </span>
                    </div>
                    <em>{item.qty || 1}x</em>
                  </div>
                ))
              ) : (
                <p className="order-modal-empty">
                  لا توجد منتجات داخل هذا الطلب.
                </p>
              )}
            </div>

            <button
              type="button"
              className="admin-primary modal-close-main"
              onClick={() => setSelectedOrder(null)}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Control({ label, children }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function titleFor(tab, lang = "ar") {
  const titles = {
    ar: {
      dashboard: "الرئيسية",
      reports: "التقارير",
      identity: "هوية المتجر",
      products: "إدارة المنتجات",
      customers: "العملاء",
      orders: "الطلبات",
      coupons: "الكوبونات",
      users: "المستخدمين",
      settings: "الإعدادات",
      notifications: "الإشعارات",
      homepage: "ثيم المتجر",
    },
    en: {
      dashboard: "Home",
      reports: "Reports",
      identity: "Store identity",
      products: "Product management",
      customers: "Customers",
      orders: "Orders",
      coupons: "Coupons",
      users: "Users",
      settings: "Settings",
      notifications: "Notifications",
      homepage: "Store theme",
    },
  };
  return (titles[lang] || titles.ar)[tab] || tab;
}
