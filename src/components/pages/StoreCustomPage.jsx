import { makePageSlug } from "../../utils/helpers.js";
import ProductGrid from "../products/ProductGrid.jsx";

function StoreCustomPage({ page, products = [], go }) {
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
        <ProductGrid
          products={pageProducts}
          go={go}
          className="store-page-products"
          showFavorite={false}
          showSizes={false}
          showAddToCart={false}
        />
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

export default StoreCustomPage;
