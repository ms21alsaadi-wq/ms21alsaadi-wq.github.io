import { MessageCircle } from "lucide-react";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import { normalizePageHref } from "../../utils/helpers.js";

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
              const href =
                link.href === "whatsapp"
                  ? `https://wa.me/${whatsapp}`
                  : link.href || "/";
              const isExternal =
                href.startsWith("http") || href.startsWith("mailto:");
              return (
                <a
                  key={`${link.label}-${linkIndex}`}
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  onClick={(event) => handleFooterLink(event, link.href)}
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
          <small>{footerCopyright}</small>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
