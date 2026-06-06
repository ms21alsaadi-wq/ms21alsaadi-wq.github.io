import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { formatPrice } from "../../utils/helpers.js";

const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='18' fill='%23f3f6f2'/%3E%3Cpath d='M25 66h46L57 48 47 60l-8-9-14 15Z' fill='%23b9c8bf'/%3E%3Ccircle cx='35' cy='34' r='7' fill='%23b9c8bf'/%3E%3C/svg%3E";

export default function AdminProductsList({
  adminBestSellers,
  adminProductCategories,
  bulkUpdateProducts,
  deleteAllProducts,
  deleteProduct,
  deleteSelectedProducts,
  draggedProductId,
  duplicateProduct,
  filteredAdminProducts,
  openProductEditor,
  productCategoryFilter,
  productSearch,
  productSort,
  productStatusFilter,
  products,
  productsViewMode,
  reorderProducts,
  selectedProducts,
  setDraggedProductId,
  setProductCategoryFilter,
  setProductSearch,
  setProductSort,
  setProductStatusFilter,
  t,
  toggleAllVisibleProducts,
  toggleProductSelection,
}) {
  return (
    <div className="admin-card products-manager pro-products-manager full-products-manager products-list-compact-final">
      <div className="pro-card-head products-manager-head">
        <div>
          <span>Catalogue</span>
          <h2>المنتجات المضافة</h2>
          <small>
            {filteredAdminProducts.length} ظاهر من أصل {products.length} منتج
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

        <select value={productSort} onChange={(e) => setProductSort(e.target.value)}>
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
            <label className="product-row-select-check" title="تحديد المنتج">
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
                src={p.image || PRODUCT_PLACEHOLDER}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = PRODUCT_PLACEHOLDER;
                }}
              />
              <span
                className={p.status === "hidden" ? "status hidden" : "status active"}
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
                      {[option.size, option.color].filter(Boolean).join(" / ") ||
                        "خيار"}
                      {option.stock !== "" && option.stock !== undefined
                        ? ` • ${option.stock} مخزون`
                        : ""}
                    </span>
                  ))}
                  {p.options.length > 4 && <span>+{p.options.length - 4}</span>}
                </div>
              )}

              <div className="products-row-status">
                <span
                  className={
                    p.status === "hidden" ? "row-status hidden" : "row-status active"
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
                <label className="product-select-check" title="تحديد المنتج">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => toggleProductSelection(p.id)}
                  />
                </label>
                <button onClick={() => openProductEditor(p)}>
                  <Pencil size={16} /> تعديل كامل
                </button>
                <button type="button" onClick={() => duplicateProduct(p)}>
                  <Plus size={16} /> نسخ
                </button>
                <button className="danger" onClick={() => deleteProduct(p)}>
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
  );
}
