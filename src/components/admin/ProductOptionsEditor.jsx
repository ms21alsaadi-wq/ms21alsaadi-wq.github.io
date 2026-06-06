import { CheckCircle2, Plus, Settings, Trash2 } from "lucide-react";

export default function ProductOptionsEditor({
  addProductOption,
  productOptions,
  productPreview,
  removeProductOption,
  t,
  updateProductOption,
}) {
  return (
    <div className="product-options-master-card">
      <div className="product-options-master-head">
        <div>
          <span>نظام خيارات المنتج</span>
          <h3>إدارة خيارات المقاسات والألوان والأسعار والمخزون</h3>
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
                  new Set(productOptions.map((o) => o.size).filter(Boolean))
                    .size
                }
              </b>
            </div>
            <div>
              <span>الألوان</span>
              <b>
                {
                  new Set(productOptions.map((o) => o.color).filter(Boolean))
                    .size
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
                <div className="option-preview-row" key={`preview-${index}`}>
                  <span>{option.color || "—"}</span>
                  <span>{option.size || "—"}</span>
                  <span>{option.price || productPreview.price || "—"}</span>
                  <span>
                    {option.oldPrice || productPreview.oldPrice || "—"}
                  </span>
                  <span>{option.stock || 0}</span>
                  <span>{option.sku || "—"}</span>
                </div>
              ))
            ) : (
              <div className="option-preview-empty">أضف خيارًا ليظهر هنا</div>
            )}
          </div>

          <div className="option-available-note">
            <CheckCircle2 size={15} /> سيظهر المنتج بهذا الشكل للعملاء حسب
            الخيارات المتاحة
          </div>
        </div>

        <div className="options-editor-panel">
          <div className="option-chip-section">
            <div className="option-chip-head">
              <b>إدارة الألوان</b>
            </div>
            <div className="option-chip-row">
              {[
                ...new Set(productOptions.map((o) => o.color).filter(Boolean)),
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
                ...new Set(productOptions.map((o) => o.size).filter(Boolean)),
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
              <div className="product-option-row refined-option-row" key={index}>
                <input
                  value={option.color}
                  onChange={(e) =>
                    updateProductOption(index, "color", e.target.value)
                  }
                  placeholder="اللون"
                />
                <input
                  value={option.size}
                  onChange={(e) =>
                    updateProductOption(index, "size", e.target.value)
                  }
                  placeholder="المقاس"
                />
                <input
                  value={option.sku}
                  onChange={(e) =>
                    updateProductOption(index, "sku", e.target.value)
                  }
                  placeholder="SKU اختياري"
                />
                <input
                  type="number"
                  min="0"
                  value={option.price}
                  onChange={(e) =>
                    updateProductOption(index, "price", e.target.value)
                  }
                  placeholder="السعر"
                />
                <input
                  type="number"
                  min="0"
                  value={option.oldPrice || ""}
                  onChange={(e) =>
                    updateProductOption(index, "oldPrice", e.target.value)
                  }
                  placeholder="السعر بعد الخصم"
                />
                <input
                  type="number"
                  min="0"
                  value={option.stock}
                  onChange={(e) =>
                    updateProductOption(index, "stock", e.target.value)
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
  );
}
