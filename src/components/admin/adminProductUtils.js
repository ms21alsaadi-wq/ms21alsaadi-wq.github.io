export function productPreviewFromProduct(product = null) {
  return {
    name: product?.name || "",
    description: product?.description || "",
    brand: product?.brand || "",
    category: product?.category || "نباتات داخلية",
    price: product?.price ?? "",
    oldPrice: product?.oldPrice ?? "",
    stock: product?.stock ?? "",
    sku: product?.sku || "",
    status: product?.status || "active",
    rating: product?.rating ?? 4.8,
    tag: product?.tag || "Rare",
    sizes: Array.isArray(product?.sizes)
      ? product.sizes.join(",")
      : product?.sizes || "صغير,متوسط,كبير",
    colors: Array.isArray(product?.colors)
      ? product.colors.join(",")
      : product?.colors || "",
    featured: Boolean(product?.featured),
    seoSlug: product?.seoSlug || "",
    seoTitle: product?.seoTitle || "",
    seoDescription: product?.seoDescription || "",
    image: product?.image || "",
  };
}

export const productHasManagedStock = (product) =>
  product?.stock !== undefined && product?.stock !== "";

export const productStockValue = (product) => Number(product?.stock || 0);

export const productIsLowStock = (product, threshold = 3) =>
  product.status !== "hidden" &&
  productHasManagedStock(product) &&
  productStockValue(product) <= threshold;

export function getAdminProductCategories(products) {
  return [
    "all",
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ];
}

export function filterAdminProducts({
  productCategoryFilter,
  products,
  productSearch,
  productSort,
  productStatusFilter,
}) {
  return products
    .filter((product) => {
      const q = productSearch.trim().toLowerCase();
      const searchable =
        `${product.name || ""} ${product.description || ""} ${product.category || ""} ${product.brand || ""} ${product.sku || ""}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);

      const matchesCategory =
        productCategoryFilter === "all" ||
        product.category === productCategoryFilter;

      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "active" && product.status !== "hidden") ||
        (productStatusFilter === "hidden" && product.status === "hidden") ||
        (productStatusFilter === "featured" && product.featured) ||
        (productStatusFilter === "out" &&
          productHasManagedStock(product) &&
          productStockValue(product) <= 0);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (productSort === "price_high")
        return Number(b.price || 0) - Number(a.price || 0);
      if (productSort === "price_low")
        return Number(a.price || 0) - Number(b.price || 0);
      if (productSort === "stock_low")
        return (
          (productHasManagedStock(a) ? productStockValue(a) : Infinity) -
          (productHasManagedStock(b) ? productStockValue(b) : Infinity)
        );
      if (productSort === "name")
        return String(a.name || "").localeCompare(String(b.name || ""), "ar");
      if (productSort === "newest")
        return String(b.id || "").localeCompare(String(a.id || ""));
      return Number(a.order ?? 999999) - Number(b.order ?? 999999);
    });
}

export function normalizeExcelProduct(row) {
  const pick = (...keys) => {
    for (const key of keys) {
      if (
        row[key] !== undefined &&
        row[key] !== null &&
        String(row[key]).trim() !== ""
      ) {
        return row[key];
      }
    }
    return "";
  };

  const name = String(pick("name", "اسم المنتج", "المنتج")).trim();
  if (!name) return null;

  const price = Number(pick("price", "السعر") || 0);
  const oldPriceRaw = pick("oldPrice", "السعر قبل الخصم");
  const image = String(pick("image", "رابط الصورة", "الصورة")).trim();
  const colors = String(pick("colors", "الألوان", "ألوان") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    name,
    brand: String(
      pick("brand", "النوع/المورد", "المورد") || "GREEN DIXAM",
    ).trim(),
    category: String(pick("category", "القسم") || "نباتات داخلية").trim(),
    price,
    oldPrice: Number(oldPriceRaw || price),
    rating: Number(pick("rating", "التقييم") || 4.8),
    sizes: String(
      pick("sizes", "الأحجام/الخيارات", "الخيارات") || "صغير,متوسط,كبير",
    ).trim(),
    tag: String(pick("tag", "الشارة") || "Rare").trim(),
    description: String(pick("description", "الوصف") || "").trim(),
    stock: Number(pick("stock", "المخزون") || 0),
    sku: String(pick("sku", "SKU") || "").trim(),
    status: String(pick("status", "الحالة") || "active").trim(),
    featured:
      String(pick("featured", "مميز") || "").toLowerCase() === "true" ||
      String(pick("featured", "مميز") || "") === "نعم",
    image,
    gallery: image ? [image] : [],
    colors,
    seoTitle: String(pick("seoTitle", "عنوان SEO") || "").trim(),
    seoDescription: String(pick("seoDescription", "وصف SEO") || "").trim(),
  };
}
