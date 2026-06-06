import {
  Bell,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Palette,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase.js";

export default function AdminSidebar({
  settings,
  t,
  tab,
  setTab,
  themeMenuOpen,
  setThemeMenuOpen,
  themeSections,
  openSection,
  goToThemeSection,
  canAccessAdminSection,
  liveVisitors,
}) {
  const renderNavButton = (tabKey, permissionKey, icon, label) => {
    if (!canAccessAdminSection(permissionKey)) return null;
    return (
      <button className={tab === tabKey ? "on" : ""} onClick={() => setTab(tabKey)}>
        {icon} {label}
      </button>
    );
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        {settings.logo ? (
          <img
            className="admin-brand-logo"
            src={settings.logo}
            alt="logo"
            loading="eager"
            decoding="async"
          />
        ) : (
          <b>{settings.storeName}</b>
        )}
        <span>{t("adminPanel")}</span>
      </div>

      {renderNavButton("dashboard", "dashboard", <LayoutDashboard />, t("home"))}
      {renderNavButton("reports", "reports", <TrendingUp />, t("reports"))}
      {renderNavButton("identity", "identity", <Palette />, t("identity"))}

      {canAccessAdminSection("homepage") && (
        <div className="admin-menu-group">
          <button
            className={tab === "homepage" ? "on" : ""}
            onClick={() => {
              setTab("homepage");
              setThemeMenuOpen(!themeMenuOpen);
            }}
          >
            <Home /> {t("storeTheme")}{" "}
            <span className="admin-menu-chevron">
              {themeMenuOpen ? "−" : "+"}
            </span>
          </button>
          {themeMenuOpen && (
            <div className="admin-submenu">
              {themeSections.map((section) => (
                <button
                  key={section.id}
                  className={
                    tab === "homepage" && openSection === section.id ? "on" : ""
                  }
                  onClick={() => goToThemeSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {renderNavButton("orders", "orders", <ClipboardList />, t("orders"))}
      {renderNavButton("customers", "customers", <Users />, t("customers"))}
      {renderNavButton("products", "products", <PackagePlus />, t("products"))}
      {renderNavButton("coupons", "coupons", <Palette />, t("coupons"))}
      {renderNavButton("users", "users", <Users />, t("users"))}
      {renderNavButton("settings", "settings", <Settings />, t("settings"))}
      {renderNavButton("notifications", "notifications", <Bell />, t("notifications"))}

      <div className="admin-sidebar-card">
        <span>{t("pulse")}</span>
        <b>{liveVisitors}</b>
        <small>{t("activeNow")}</small>
      </div>

      <div className="side-bottom">
        <button onClick={() => signOut(auth)}>
          <LogOut /> {t("logout")}
        </button>
      </div>
    </aside>
  );
}
