import { useEffect, useState } from "react";
import {
  PackagePlus,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { productPath } from "../SEOManager.jsx";
import { formatPrice, makePageSlug, sizesArray } from "../../utils/helpers.js";

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
  const hasManagedStock =
    product.stock !== undefined && product.stock !== "";
  const stock = hasManagedStock ? Number(product.stock || 0) : null;
  const outOfStock = hasManagedStock && stock <= 0;
  const hasDiscount = oldPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;
  const rating = Number(product.rating || 5);
  const reviewCount = Number(product.reviewCount || product.reviews || 24);
  const safeQty = Math.max(
    1,
    hasManagedStock ? Math.min(Number(qty || 1), stock || 1) : Number(qty || 1),
  );
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
              {!outOfStock ? (
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
                <b>{!outOfStock ? "متوفر" : "غير متوفر"}</b>
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
                      hasManagedStock
                        ? Math.min(stock || 1, Number(prev || 1) + 1)
                        : Number(prev || 1) + 1,
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
                disabled={outOfStock}
              >
                {outOfStock ? "غير متوفر" : "أضف إلى السلة"}
              </button>
              <button
                type="button"
                className="product-buy-now"
                onClick={handleAddQtyToCart}
                disabled={outOfStock}
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
                <b>
                  {hasManagedStock
                    ? stock > 0
                      ? `${stock} قطعة`
                      : "غير متوفر"
                    : "متوفر"}
                </b>
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
                onKeyDown={(event) => {
                  if (event.key === "Enter") go(productPath(item));
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

export default ProductDetailPage;
