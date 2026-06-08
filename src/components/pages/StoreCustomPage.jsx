import { makePageSlug } from "../../utils/helpers.js";
import ProductGrid from "../products/ProductGrid.jsx";

function cleanRichPageContent(content = "") {
  return String(content || "")
    .replace(/\sclass="[^"]*"/gi, "")
    .replace(/\sstyle="([^"]*)"/gi, (_, styleValue) => {
      const safeStyle = styleValue
        .split(";")
        .map((rule) => rule.trim())
        .filter(Boolean)
        .filter((rule) =>
          /^(color|background-color|text-align|font-weight|font-style|text-decoration)\s*:/i.test(
            rule,
          ),
        )
        .join("; ");
      return safeStyle ? ` style="${safeStyle}"` : "";
    })
    .replace(/\s(width|height|align|valign)="[^"]*"/gi, "");
}

function StoreCustomPage({ page, products = [], go }) {
  const label = page?.label || "صفحة";
  const slug = makePageSlug(page?.href || label);
  const keyword = label.toLowerCase();
  const pageContent = String(page?.content || "").trim();
  const hasRichContent = /<\/?[a-z][\s\S]*>/i.test(pageContent);
  const cleanPageContent = cleanRichPageContent(pageContent);
  const contentBlocks = pageContent
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

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
    <main
      className={`container store-page-view ${
        page?.source === "footer" ? "footer-store-page-view" : ""
      }`}
    >
      <button
        type="button"
        className="primary store-page-back"
        onClick={() => go("/")}
      >
        ← رجوع للرئيسية
      </button>

      <div className="store-page-hero">
        {page?.source !== "footer" && <span>Store Page</span>}
        <h1>{label}</h1>
        {page?.source !== "footer" && (
          <p>
            {pageContent
              ? "هذه الصفحة ويمكن تعديل محتواها من لوحة التحكم."
              : "هذه صفحة مستقلة داخل المتجر ويمكن التحكم باسمها ورابطها من لوحة التحكم."}
          </p>
        )}
      </div>

      {pageContent && (
        <article className="store-page-content-card">
          {hasRichContent ? (
            <div dangerouslySetInnerHTML={{ __html: cleanPageContent }} />
          ) : (
            contentBlocks.map((block, index) => <p key={index}>{block}</p>)
          )}
        </article>
      )}

      {!pageContent && pageProducts.length > 0 ? (
        <ProductGrid
          products={pageProducts}
          go={go}
          className="store-page-products"
          showFavorite={false}
          showSizes={false}
          showAddToCart={false}
        />
      ) : !pageContent ? (
        <div className="store-page-empty">
          <h2>{label}</h2>
          <p>
            لا يوجد محتوى مخصص لهذه الصفحة حتى الآن. تقدر تغيّر اسم الصفحة أو
            رابطها من لوحة التحكم.
          </p>
        </div>
      ) : null}
    </main>
  );
}

export default StoreCustomPage;
