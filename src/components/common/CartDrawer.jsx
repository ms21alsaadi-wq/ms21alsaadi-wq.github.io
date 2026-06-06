import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "../../utils/helpers.js";

function CartDrawer({
  cart = [],
  setCart,
  setCartOpen,
  authUser,
  customer,
  hasManagedStock,
  couponCode,
  setCouponCode,
  applyCoupon,
  couponMessage,
  appliedCoupon,
  removeCoupon,
  subtotal,
  discount,
  shippingFee,
  total,
  checkoutWhatsApp,
}) {
  const itemCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const hasCustomerDetails = Boolean(
    customer?.name && customer?.phone && customer?.city && customer?.address,
  );
  const checkoutReadiness = !authUser
    ? {
        title: "تسجيل الدخول مطلوب",
        text: "سجل دخولك كعميل حتى نقدر نحفظ طلبك وبيانات الشحن.",
        status: "warning",
      }
    : !hasCustomerDetails
      ? {
          title: "بيانات الشحن ناقصة",
          text: "أكمل الاسم، الجوال، المدينة، والعنوان من حسابك قبل الإرسال.",
          status: "warning",
        }
      : {
          title: "جاهز لإتمام الطلب",
          text: "بياناتك مكتملة وسيتم إرسال الطلب عبر واتساب.",
          status: "ready",
        };

  return (
    <div className="cart-overlay">
      <div className="cart-bg" onClick={() => setCartOpen(false)} />
      <aside className="cart-panel">
        <div className="cart-head">
          <div>
            <h3>سلة الشراء</h3>
            <span>{itemCount ? `${itemCount} منتج في السلة` : "السلة فارغة"}</span>
          </div>
          <button onClick={() => setCartOpen(false)}>
            <X />
          </button>
        </div>
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty">السلة فارغة</div>
          ) : (
            cart.map((item, index) => (
              <div className="cart-item" key={`${item.id}-${index}`}>
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
                  {hasManagedStock(item) &&
                    Number(item.qty || 0) >= Number(item.stock || 0) && (
                      <em className="cart-stock-limit">
                        وصلت للكمية المتوفرة
                      </em>
                    )}
                  <div className="qty">
                    <button
                      onClick={() =>
                        setCart((current) =>
                          current.map((cartItem, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...cartItem,
                                  qty: Math.max(1, cartItem.qty - 1),
                                }
                              : cartItem,
                          ),
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <b>{item.qty}</b>
                    <button
                      disabled={
                        hasManagedStock(item) &&
                        Number(item.qty || 0) >= Number(item.stock || 0)
                      }
                      onClick={() =>
                        setCart((current) =>
                          current.map((cartItem, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...cartItem,
                                  qty: hasManagedStock(cartItem)
                                    ? Math.min(
                                        Number(cartItem.stock || 0),
                                        Number(cartItem.qty || 0) + 1,
                                      )
                                    : Number(cartItem.qty || 0) + 1,
                                }
                              : cartItem,
                          ),
                        )
                      }
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setCart((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
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
          <div className={`cart-checkout-readiness ${checkoutReadiness.status}`}>
            <b>{checkoutReadiness.title}</b>
            <span>{checkoutReadiness.text}</span>
          </div>

          <div className="coupon-box">
            <label>كود الخصم</label>
            <div className="coupon-input-row">
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="مثال: GREEN10"
              />
              <button type="button" onClick={applyCoupon}>
                تطبيق
              </button>
            </div>
            {couponMessage && (
              <span className={appliedCoupon ? "coupon-success" : "coupon-error"}>
                {couponMessage}
              </span>
            )}
            {appliedCoupon && (
              <button type="button" className="remove-coupon" onClick={removeCoupon}>
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

          <button disabled={!cart.length} onClick={checkoutWhatsApp}>
            {cart.length ? "إتمام الطلب عبر واتساب" : "أضف منتجات أولاً"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default CartDrawer;
