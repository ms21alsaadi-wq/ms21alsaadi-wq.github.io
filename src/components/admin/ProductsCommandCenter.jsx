import { Download, Grid3X3, Plus, Rows3 } from "lucide-react";

export default function ProductsCommandCenter({
  activeProductsCount,
  adminProductCategories,
  changeProductsViewMode,
  clearPendingImport,
  downloadProductsTemplate,
  importProductsFromExcel,
  lowStockProducts,
  openProductEditor,
  pendingImport,
  products,
  productsViewMode,
  savePendingImport,
  t,
}) {
  return (
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
  );
}
