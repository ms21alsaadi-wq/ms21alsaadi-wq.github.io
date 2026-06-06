import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { Control } from "./AdminUi.jsx";

export default function CouponsPanel({
  coupons,
  editing,
  saveCoupon,
  toggleCoupon,
  t,
}) {
  return (
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
                coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
              return (
                <div
                  className={`admin-coupon-card ${coupon.active ? "active" : "disabled"} ${expired ? "expired" : ""}`}
                  key={coupon.id}
                >
                  <div>
                    <span>{t("discountCode")}</span>
                    <h3>{coupon.code}</h3>
                    <p>خصم {coupon.percent}% • استخدام مرة واحدة لكل عميل</p>
                    <small>
                      تم استخدامه: {Object.keys(coupon.usedBy || {}).length} مرة
                    </small>
                    <small>ينتهي: {coupon.expiresAt || "بدون تاريخ"}</small>
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
                      onClick={() => deleteDoc(doc(db, "coupons", coupon.id))}
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
  );
}
