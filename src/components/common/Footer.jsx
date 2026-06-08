import { MessageCircle } from "lucide-react";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import { makePageSlug, normalizePageHref } from "../../utils/helpers.js";

function Footer({ settings, go, visibleHomePages = [] }) {
  const whatsapp = settings.homeHeaderWhatsapp || STORE_WHATSAPP;
  const currentYear = new Date().getFullYear();
  const defaultFooterSections = [
    {
      title: "روابط المتجر",
      links: [
        { label: "الصفحة الرئيسية", href: "/" },
        { label: "المنتجات", href: "#products" },
        ...visibleHomePages.slice(0, 2).map((page, index) => ({
          label: page.label,
          href: normalizePageHref(page, index),
        })),
      ],
    },
    {
      title: "خدمة العميل",
      links: [
        { label: "حسابي", href: "/account" },
        { label: "تصفح المنتجات", href: "#products" },
        { label: "تواصل واتساب", href: "whatsapp" },
      ],
    },
  ];
  const footerSections =
    settings.footerSections?.length > 0
      ? settings.footerSections
      : defaultFooterSections;
  const footerDescription =
    settings.footerDescription ||
    settings.tagline ||
    "متجر نباتات وهدايا خضراء بتجربة شراء سهلة.";
  const footerCopyright =
    settings.footerCopyright ||
    `© ${currentYear} ${settings.storeName || "GREEN DIXAM"}`;
  const paymentMethods = [
    { label: "mada", className: "mada" },
    { label: "VISA", className: "visa" },
    { label: "Mastercard", className: "mastercard" },
    { label: "Pay", className: "apple" },
    { label: "tabby", className: "tabby" },
  ];
  const isHomeLink = (label = "") =>
    /الرئيسية|الرئيسيه|home/i.test(String(label || ""));
  const resolveFooterHref = (link = {}) => {
    const rawHref = String(link.href || "").trim();
    if (rawHref === "whatsapp") return `https://wa.me/${whatsapp}`;
    if ((!rawHref || rawHref === "/") && !isHomeLink(link.label)) {
      return `/page/${makePageSlug(link.label || "footer-page")}`;
    }
    return rawHref || "/";
  };

  const handleFooterLink = (event, href = "") => {
    if (!href) return;
    if (href === "whatsapp") return;
    if (href.startsWith("#")) {
      event.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (href.startsWith("/")) {
      event.preventDefault();
      go(href);
    }
  };

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          {settings.logo || settings.homeHeaderImage ? (
            <img
              src={settings.logo || settings.homeHeaderImage}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <b>{settings.footerTitle || settings.storeName}</b>
          )}
          <p>{footerDescription}</p>
        </div>

        {footerSections.map((section, sectionIndex) => (
          <div className="footer-links" key={`${section.title}-${sectionIndex}`}>
            <b>{section.title || "قسم الفوتر"}</b>
            {(section.links || []).map((link, linkIndex) => {
              const href = resolveFooterHref(link);
              const isExternal =
                href.startsWith("http") || href.startsWith("mailto:");
              return (
                <a
                  key={`${link.label}-${linkIndex}`}
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  onClick={(event) => handleFooterLink(event, href)}
                >
                  {link.label || "رابط"}
                </a>
              );
            })}
          </div>
        ))}

        <div className="footer-contact">
          <b>تواصل</b>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            <MessageCircle size={18} />
            واتساب المتجر
          </a>
          <p>{settings.footerLocation || "الرياض، السعودية"}</p>
        </div>
      </div>

      <div className="container footer-bottom">
        <div className="footer-payments" aria-label="طرق الدفع">
          {paymentMethods.map((method) => (
            <span
              className={`payment-badge ${method.className}`}
              key={method.className}
            >
              {method.label}
            </span>
          ))}
        </div>
        <small>{footerCopyright}</small>
      </div>
    </footer>
  );
}

export default Footer;
