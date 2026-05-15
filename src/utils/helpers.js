export function formatPrice(value) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
}

export function formatOrderDate(value) {
  if (!value) return "غير متوفر";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function orderTimestamp(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function getTrackingUrl(company, trackingNumber, customShipping = "") {
  const code = String(trackingNumber || "").trim();
  if (!code) return "";

  const name = String(company || customShipping || "").toLowerCase();

  if (name.includes("aramex")) return `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(code)}`;
  if (name.includes("smsa") || name.includes("سمسا")) return `https://www.smsaexpress.com/sa/track?tracknumbers=${encodeURIComponent(code)}`;
  if (name.includes("dhl")) return `https://www.dhl.com/sa-en/home/tracking.html?tracking-id=${encodeURIComponent(code)}`;
  if (name.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(code)}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`${customShipping || company || "tracking"} ${code}`)}`;
}

export function orderStatusLabel(status) {
  const labels = {
    new: "تم استلام الطلب",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي"
  };
  return labels[status] || status || "تم تحديث الطلب";
}

export function couponUsedByCustomer(coupon, customerId, customerEmail) {
  const usedBy = coupon?.usedBy || {};
  const usedEmails = coupon?.usedEmails || {};
  return Boolean(
    (customerId && usedBy[customerId]) ||
    (customerEmail && usedEmails[customerEmail])
  );
}

export function sizesArray(sizes) {
  return String(sizes || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makePageSlug(text, fallback = "page") {
  const cleaned = String(text || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function normalizePageHref(page, index = 0) {
  const href = String(page?.href || "").trim();

  if (href.startsWith("/page/")) return href;
  if (href.startsWith("#")) return `/page/${makePageSlug(page?.label, `page-${index + 1}`)}`;
  if (!href) return `/page/${makePageSlug(page?.label, `page-${index + 1}`)}`;
  if (href.startsWith("/")) return href;

  return `/page/${makePageSlug(href || page?.label, `page-${index + 1}`)}`;
}

export function getTrafficSource() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const utm = params.get("utm_source");
    if (utm) return utm;

    const ref = document.referrer || "";
    if (!ref) return "مباشر";

    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("google")) return "Google";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("snapchat")) return "Snapchat";
    if (host.includes("twitter") || host.includes("x.com")) return "X";
    if (host.includes("facebook")) return "Facebook";

    return host.replace("www.", "");
  } catch {
    return "مباشر";
  }
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  if (seconds < 60) return `${seconds}ث`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}د`;
  const hours = Math.floor(minutes / 60);
  return `${hours}س ${minutes % 60}د`;
}

export function getGoogleDriveFileId(url = "") {
  const value = String(url || "").trim();
  if (!value.includes("drive.google.com")) return "";

  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  const idMatch = value.match(/[?&]id=([^&]+)/);
  if (idMatch?.[1]) return idMatch[1];

  return "";
}

export function normalizeVideoUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";

  const driveId = getGoogleDriveFileId(value);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  return value;
}

export function isGoogleDriveVideo(url = "") {
  return Boolean(getGoogleDriveFileId(url));
}

export function firebaseError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential")) return "بيانات الدخول غير صحيحة";
  if (code.includes("email-already-in-use")) return "الإيميل مستخدم مسبقاً";
  if (code.includes("weak-password")) return "كلمة المرور ضعيفة";
  if (code.includes("operation-not-allowed")) return "فعّل طريقة الدخول من Firebase Authentication";
  return err?.message || "حدث خطأ غير معروف";
}