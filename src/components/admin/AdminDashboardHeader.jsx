import { Clock, ExternalLink, Languages } from "lucide-react";
import { formatOrderDate } from "../../utils/helpers.js";

export default function AdminDashboardHeader({
  adminLanguage,
  changeAdminLanguage,
  go,
  languageMenuOpen,
  liveVisitors,
  setLanguageMenuOpen,
  t,
  title,
}) {
  return (
    <header className="admin-top modern-admin-top">
      <div className="modern-admin-title">
        <span>{t("dashboard")}</span>
        <h1>{title}</h1>
      </div>
      <div className="modern-admin-actions">
        <div className="admin-language-switcher">
          <button
            type="button"
            className="modern-admin-icon-btn admin-language-trigger"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            title={t("language")}
          >
            <Languages size={18} />
            <span>{adminLanguage === "ar" ? t("arabic") : t("english")}</span>
          </button>
          {languageMenuOpen && (
            <div className="admin-language-menu">
              <button
                type="button"
                className={adminLanguage === "ar" ? "active" : ""}
                onClick={() => changeAdminLanguage("ar")}
              >
                <span>ع</span>
                <div>
                  <b>{t("arabic")}</b>
                  <small>{t("currentAdminLanguage")}</small>
                </div>
              </button>
              <button
                type="button"
                className={adminLanguage === "en" ? "active" : ""}
                onClick={() => changeAdminLanguage("en")}
              >
                <span>EN</span>
                <div>
                  <b>{t("english")}</b>
                  <small>{t("adminPanelLanguage")}</small>
                </div>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="modern-admin-icon-btn"
          onClick={() => go("/")}
          title={t("previewStore")}
        >
          <ExternalLink size={18} />
          <span>{t("preview")}</span>
        </button>
        <div className="modern-admin-pill">
          <Clock size={16} />
          <span>{formatOrderDate(new Date())}</span>
        </div>
        <div className="modern-admin-live">
          <span className="live-dot" />
          <b>{liveVisitors}</b>
          <small>{t("active")}</small>
        </div>
      </div>
    </header>
  );
}
