import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
} from "../data/storeData.js";
import { getTrackingUrl, orderStatusLabel } from "../utils/helpers.js";

export async function sendOrderStatusEmail(order, status) {
  const email = order?.customerEmail || order?.email;
  if (!email) return false;

  const company =
    order?.shippingCompany === "other"
      ? order?.customShipping || "أخرى"
      : order?.shippingCompany || "لم تحدد بعد";

  const trackingUrl = order?.trackingNumber
    ? getTrackingUrl(
        order.shippingCompany,
        order.trackingNumber,
        order.customShipping,
      )
    : "لم يصدر رقم التتبع بعد";

  const params = {
    name: order?.customerName || order?.name || "عميل Green Dixam",
    email,
    order_id: order?.id || "",
    status: orderStatusLabel(status || order?.status),
    company,
    tracking_number: order?.trackingNumber || "—",
    tracking_url: trackingUrl,
  };

  try {
    const emailjs = await import("@emailjs/browser");
    await emailjs.default.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      params,
      EMAILJS_PUBLIC_KEY,
    );
    return true;
  } catch (error) {
    console.error("EmailJS send failed:", error);
    return false;
  }
}
