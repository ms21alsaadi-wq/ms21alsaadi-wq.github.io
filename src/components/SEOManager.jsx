import { useEffect } from "react";
import { makePageSlug, normalizePageHref } from "../utils/helpers.js";

function cleanSeoText(value, fallback = "") {
  return String(value || fallback || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function limitSeoText(value, max = 160) {
  const text = cleanSeoText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function productAvailability(product) {
  const hasManagedStock = product?.stock !== undefined && product?.stock !== "";
  return hasManagedStock && Number(product.stock || 0) <= 0
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
}

export function productSlug(product) {
  return makePageSlug(
    product?.seoSlug || product?.slug || product?.name || product?.id,
    product?.id || "product",
  );
}

export function productPath(product) {
  return `/product/${productSlug(product)}`;
}

function pathProductSlug(path = "") {
  const raw =
    String(path || "")
      .replace(/^\/product\//, "")
      .split("/")[0] || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function findProductByPath(products = [], path = "") {
  if (!String(path || "").startsWith("/product/")) return null;
  const slug = pathProductSlug(path);
  return (
    products.find((product) => {
      if ((product?.status || "active") === "hidden") return false;
      return (
        productSlug(product) === slug || String(product?.id || "") === slug
      );
    }) || null
  );
}

function setHeadTag(selector, createTag, attrs = {}, textContent = "") {
  if (typeof document === "undefined") return null;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = createTag();
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "")
      tag.removeAttribute(key);
    else tag.setAttribute(key, String(value));
  });
  if (textContent !== undefined) tag.textContent = textContent;
  return tag;
}

function pageTitleFromPath(path, settings) {
  const storeName = cleanSeoText(settings?.storeName, "GREEN DIXAM");
  const homePages = Array.isArray(settings?.homePages)
    ? settings.homePages
    : [];
  const matchedPage = path?.startsWith("/page/")
    ? homePages.find((page, index) => normalizePageHref(page, index) === path)
    : null;

  if (path?.startsWith("/admin")) return `لوحة التحكم | ${storeName}`;
  if (path?.startsWith("/login")) return `دخول العميل | ${storeName}`;
  if (path?.startsWith("/account")) return `حسابي | ${storeName}`;
  if (matchedPage?.label) return `${matchedPage.label} | ${storeName}`;
  return `${storeName} | ${cleanSeoText(settings?.tagline || settings?.homeHeaderSubtitle, "متجر نباتات ومنتجات فاخرة")}`;
}

function pageDescriptionFromPath(path, settings) {
  const homePages = Array.isArray(settings?.homePages)
    ? settings.homePages
    : [];
  const matchedPage = path?.startsWith("/page/")
    ? homePages.find((page, index) => normalizePageHref(page, index) === path)
    : null;

  if (path?.startsWith("/admin"))
    return "صفحة إدارة داخلية غير مخصصة لمحركات البحث.";
  if (path?.startsWith("/login"))
    return "تسجيل دخول العملاء لمتابعة الطلبات والبيانات المحفوظة.";
  if (path?.startsWith("/account"))
    return "حساب العميل لمتابعة الطلبات وتحديث بيانات الشحن.";
  if (matchedPage?.label)
    return limitSeoText(
      `${matchedPage.label} - ${settings?.homeProductsDesc || settings?.homeHeroDesc || settings?.heroSubtitle}`,
      155,
    );
  return limitSeoText(
    settings?.homeHeroDesc ||
      settings?.heroSubtitle ||
      "متجر نباتات ومنتجات فاخرة مختارة بعناية، مع تغليف أنيق وتوصيل سريع داخل السعودية.",
    155,
  );
}

export function SEOManager({ path, settings, products = [] }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const origin = window.location.origin || "";
    const canonicalPath = path || window.location.pathname || "/";
    const canonicalUrl = `${origin}${canonicalPath}`;
    const storeName = cleanSeoText(settings?.storeName, "GREEN DIXAM");
    const currentProduct = findProductByPath(products, canonicalPath);
    const title = currentProduct
      ? cleanSeoText(
          currentProduct.seoTitle ||
            `${currentProduct.name || "منتج"} | ${storeName}`,
        )
      : pageTitleFromPath(canonicalPath, settings);
    const description = currentProduct
      ? limitSeoText(
          currentProduct.seoDescription ||
            currentProduct.description ||
            `${currentProduct.name || "منتج"} من ${storeName}`,
          155,
        )
      : pageDescriptionFromPath(canonicalPath, settings);
    const image =
      currentProduct?.image ||
      settings?.homeHeroImage ||
      settings?.homeHeaderImage ||
      settings?.logo ||
      products.find((p) => p?.image)?.image ||
      "";
    const isPrivatePage =
      canonicalPath.startsWith("/admin") ||
      canonicalPath.startsWith("/login") ||
      canonicalPath.startsWith("/account");
    const categories = [
      ...new Set(products.map((p) => p?.category).filter(Boolean)),
    ].slice(0, 8);
    const keywords = [
      storeName,
      "متجر نباتات",
      "نباتات داخلية",
      "نباتات فاخرة",
      "هدايا نباتات",
      "توصيل نباتات",
      ...categories,
    ].join(", ");

    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.title = title;

    setHeadTag(
      'meta[name="description"]',
      () => document.createElement("meta"),
      { name: "description", content: description },
    );
    setHeadTag('meta[name="keywords"]', () => document.createElement("meta"), {
      name: "keywords",
      content: keywords,
    });
    setHeadTag('meta[name="robots"]', () => document.createElement("meta"), {
      name: "robots",
      content: isPrivatePage
        ? "noindex,nofollow"
        : "index,follow,max-image-preview:large",
    });
    setHeadTag(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement("link");
        link.rel = "canonical";
        return link;
      },
      { href: canonicalUrl },
    );

    setHeadTag(
      'meta[property="og:type"]',
      () => document.createElement("meta"),
      { property: "og:type", content: currentProduct ? "product" : "website" },
    );
    setHeadTag(
      'meta[property="og:locale"]',
      () => document.createElement("meta"),
      { property: "og:locale", content: "ar_SA" },
    );
    setHeadTag(
      'meta[property="og:site_name"]',
      () => document.createElement("meta"),
      { property: "og:site_name", content: storeName },
    );
    setHeadTag(
      'meta[property="og:title"]',
      () => document.createElement("meta"),
      { property: "og:title", content: title },
    );
    setHeadTag(
      'meta[property="og:description"]',
      () => document.createElement("meta"),
      { property: "og:description", content: description },
    );
    setHeadTag(
      'meta[property="og:url"]',
      () => document.createElement("meta"),
      { property: "og:url", content: canonicalUrl },
    );
    if (image)
      setHeadTag(
        'meta[property="og:image"]',
        () => document.createElement("meta"),
        { property: "og:image", content: image },
      );

    setHeadTag(
      'meta[name="twitter:card"]',
      () => document.createElement("meta"),
      {
        name: "twitter:card",
        content: image ? "summary_large_image" : "summary",
      },
    );
    setHeadTag(
      'meta[name="twitter:title"]',
      () => document.createElement("meta"),
      { name: "twitter:title", content: title },
    );
    setHeadTag(
      'meta[name="twitter:description"]',
      () => document.createElement("meta"),
      { name: "twitter:description", content: description },
    );
    if (image)
      setHeadTag(
        'meta[name="twitter:image"]',
        () => document.createElement("meta"),
        { name: "twitter:image", content: image },
      );

    const visibleProducts = products
      .filter((p) => (p?.status || "active") !== "hidden")
      .slice(0, 12);

    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: storeName,
        url: origin,
        logo: settings?.logo || settings?.homeHeaderImage || undefined,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: storeName,
        url: origin,
        inLanguage: "ar-SA",
        description,
      },
      currentProduct
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: cleanSeoText(currentProduct.name, "منتج"),
            description,
            image: currentProduct.image || undefined,
            sku: currentProduct.sku || undefined,
            brand: currentProduct.brand
              ? { "@type": "Brand", name: currentProduct.brand }
              : undefined,
            category: currentProduct.category || undefined,
            offers: {
              "@type": "Offer",
              url: canonicalUrl,
              priceCurrency: "SAR",
              price: Number(currentProduct.price || 0),
              availability: productAvailability(currentProduct),
            },
          }
        : null,
      !currentProduct && visibleProducts.length
        ? {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${storeName} products`,
            itemListElement: visibleProducts.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${origin}${productPath(product)}`,
              item: {
                "@type": "Product",
                name: cleanSeoText(product.name, "منتج"),
                description: limitSeoText(
                  product.description ||
                    product.category ||
                    settings?.homeProductsDesc,
                  180,
                ),
                image: product.image || undefined,
                sku: product.sku || undefined,
                category: product.category || undefined,
                offers: {
                  "@type": "Offer",
                  priceCurrency: "SAR",
                  price: Number(product.price || 0),
                  availability: productAvailability(product),
                },
              },
            })),
          }
        : null,
    ].filter(Boolean);

    setHeadTag(
      'script[data-seo-jsonld="store"]',
      () => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoJsonld = "store";
        return script;
      },
      {},
      JSON.stringify(structuredData),
    );
  }, [path, settings, products]);

  return null;
}
