import { fileToDataUrl } from "../../utils/media.js";
import { productSlug } from "../SEOManager.jsx";
import { Control } from "./AdminUi.jsx";

export default function ProductEditorFields({
  editing,
  galleryImages,
  imagePreview,
  makeGalleryImagePrimary,
  productFormTab,
  productPreview,
  removeGalleryImage,
  setImagePreview,
  setProductPreview,
  t,
  updateProductPreviewFromField,
  uploadGalleryImages,
}) {
  const showInfo = productFormTab === "info";
  const showPricing = productFormTab === "pricing";
  const showImages = productFormTab === "images";
  const showSeo = productFormTab === "seo";

  return (
    <>
      <div className="products-six-card-grid">
        <div className="pro-form-section product-six-card" hidden={!showInfo}>
          <h3>
            <span className="product-section-icon">📝</span> معلومات المنتج
          </h3>
          <Control label="اسم المنتج">
            <input
              name="name"
              defaultValue={editing?.name || ""}
              placeholder="مثال: مونستيرا فاخرة"
              required
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
                defaultValue={editing?.category || "نباتات داخلية"}
              />
            </Control>
          </div>
        </div>

        <div
          className="pro-form-section product-six-card"
          hidden={!showPricing}
        >
          <h3>
            <span className="product-section-icon">🏷️</span> السعر والمخزون
          </h3>
          <div className="two">
            <Control label="السعر">
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                defaultValue={editing?.price || ""}
                required
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
                defaultValue={editing?.stock ?? ""}
                placeholder="اتركه فارغًا إذا لم تكن تدير المخزون"
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
              <select name="status" defaultValue={editing?.status || "active"}>
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

        <div className="pro-form-section product-six-card" hidden={!showImages}>
          <h3>
            <span className="product-section-icon">🖼️</span> الخيارات والصورة
          </h3>
          <div className="three">
            <Control label="الشارة">
              <input name="tag" defaultValue={editing?.tag || "Rare"} />
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
            لإدارة المقاسات والألوان والأسعار المتقدمة افتح تبويب الخيارات.
          </div>
          <Control label="رابط الصورة">
            <input
              name="imageUrl"
              defaultValue={editing?.image || ""}
              onChange={(e) =>
                updateProductPreviewFromField("imageUrl", e.target.value)
              }
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
                if (!file) return;
                const dataUrl = await fileToDataUrl(file, {
                  maxWidth: 1100,
                  maxHeight: 900,
                  quality: 0.82,
                });
                setImagePreview(dataUrl);
                setProductPreview((prev) => ({
                  ...prev,
                  image: dataUrl,
                }));
              }}
            />
          </Control>
          <Control label="رفع صور متعددة للمعرض">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => uploadGalleryImages(e.target.files)}
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

        <div
          className="pro-form-section product-six-card"
          hidden={!showPricing}
        >
          <h3>
            <span className="product-section-icon">⭐</span> منتجات مميزة
          </h3>
          <p className="product-card-help">
            فعّل ظهور المنتج ضمن المنتجات البارزة في واجهة المتجر.
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

        <div
          className="pro-form-section product-six-card"
          hidden={!showPricing}
        >
          <h3>
            <span className="product-section-icon">%</span> المنتجات بخصم
          </h3>
          <p className="product-card-help">
            أي منتج له سعر قبل الخصم سيظهر كمنتج عليه عرض.
          </p>
          <div className="two">
            <Control label="السعر الحالي">
              <input
                name="priceDisplayOnly"
                type="text"
                value={productPreview.price || ""}
                readOnly
                placeholder="من حقل السعر"
              />
            </Control>
            <Control label="سعر قبل الخصم">
              <input
                name="oldPriceDisplayOnly"
                type="text"
                value={productPreview.oldPrice || ""}
                readOnly
                placeholder="من حقل السعر قبل الخصم"
              />
            </Control>
          </div>
          <div className="product-card-note">عدّل الخصم من كرت السعر والمخزون.</div>
        </div>

        <div className="pro-form-section product-six-card" hidden={!showSeo}>
          <h3>
            <span className="product-section-icon">🔎</span> SEO
          </h3>
          <p className="product-card-help">
            هذه البيانات تظهر في صفحة المنتج المستقلة ونتائج Google ومشاركة
            واتساب.
          </p>
          <Control label="رابط المنتج / Slug">
            <input
              name="seoSlug"
              defaultValue={
                editing?.seoSlug ||
                productSlug({
                  name: productPreview.name || "product",
                })
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
            <b>{productPreview.seoTitle || productPreview.name || "اسم المنتج"}</b>
            <span>
              {productPreview.seoDescription ||
                productPreview.description ||
                "وصف المنتج يظهر هنا بعد الحفظ"}
            </span>
          </div>
          <div className="product-card-note">
            بعد الحفظ سيكون الرابط مثل: /product/
            {productPreview.seoSlug ||
              productSlug({
                name: productPreview.name || "product",
              })}
          </div>
        </div>
      </div>

      {showImages && galleryImages.length > 0 && (
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
    </>
  );
}
