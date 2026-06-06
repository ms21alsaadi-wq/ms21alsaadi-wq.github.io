import { useState } from "react";
import { Home, Mail, MapPin, Phone, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import {
  couponUsedByCustomer,
  formatOrderDate,
  formatPrice,
  getTrackingUrl,
  orderTimestamp,
} from "../../utils/helpers.js";

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
  const profileFields = [
    {
      key: "name",
      label: "الاسم",
      value: customer?.name || auth.currentUser?.displayName || "",
    },
    { key: "phone", label: "رقم الجوال", value: customer?.phone || "" },
    { key: "city", label: "المدينة", value: customer?.city || "" },
    { key: "address", label: "العنوان", value: customer?.address || "" },
  ];
  const missingProfileFields = profileFields.filter(
    (field) => !String(field.value || "").trim(),
  );
  const profileReady = missingProfileFields.length === 0;

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
      name: e.target.name.value.trim(),
      email: auth.currentUser.email,
      phone: e.target.phone.value.trim(),
      city: e.target.city.value.trim(),
      address: e.target.address.value.trim(),
      updatedAt: serverTimestamp(),
    };

    if (!data.name || !data.phone || !data.city || !data.address) {
      setMessage("أكمل بيانات الشحن المطلوبة");
      setTimeout(() => setMessage(""), 2200);
      return;
    }

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

                <div
                  className={`account-readiness-card ${
                    profileReady ? "ready" : "warning"
                  }`}
                >
                  <b>
                    {profileReady
                      ? "بيانات الشحن مكتملة"
                      : "بيانات الشحن تحتاج إكمال"}
                  </b>
                  <span>
                    {profileReady
                      ? "تقدر الآن إتمام الطلب من السلة بدون الرجوع لتعديل بياناتك."
                      : `أكمل: ${missingProfileFields
                          .map((field) => field.label)
                          .join("، ")}`}
                  </span>
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

export default Account;
