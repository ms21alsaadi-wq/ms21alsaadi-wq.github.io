
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import {
  defaultSettings,
  defaultProducts,
} from "./data/storeData";
import { orderTimestamp } from "./utils/helpers";
import { SEOManager } from "./components/SEOManager.jsx";
import { isStaffDisabled } from "./data/adminPermissions.js";
import Store from "./components/pages/StorePage.jsx";
import { AdminLogin } from "./components/pages/AuthPages.jsx";
import Admin from "./components/admin/AdminPage.jsx";

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
