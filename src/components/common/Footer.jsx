import { MessageCircle } from "lucide-react";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import { normalizePageHref } from "../../utils/helpers.js";

function Footer({ settings, go, visibleHomePages = [] }) {
  const whatsapp = settings.homeHeaderWhatsapp || STORE_WHATSAPP;
  const currentYear = new Date().getFullYear();

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
            <b>{settings.storeName}</b>
          )}
          <p>{settings.tagline || "متجر نباتات وهدايا خضراء بتجربة شراء سهلة."}</p>
        </div>

        <div className="footer-links">
          <b>روابط المتجر</b>
          <button type="button" onClick={() => go("/")}>
            الصفحة الرئيسية
          </button>
          <a href="#products">المنتجات</a>
          {visibleHomePages.slice(0, 3).map((page, index) => (
            <button
              key={`${page.label}-${index}`}
              type="button"
              onClick={() => go(normalizePageHref(page, index))}
            >
              {page.label}
            </button>
          ))}
        </div>

        <div className="footer-links">
          <b>خدمة العميل</b>
          <button type="button" onClick={() => go("/account")}>
            حسابي
          </button>
          <a href="#products">تصفح المنتجات</a>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            تواصل واتساب
          </a>
        </div>

        <div className="footer-contact">
          <b>تواصل</b>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            <MessageCircle size={18} />
            واتساب المتجر
          </a>
          <p>الرياض، السعودية</p>
          <small>© {currentYear} {settings.storeName || "GREEN DIXAM"}</small>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
