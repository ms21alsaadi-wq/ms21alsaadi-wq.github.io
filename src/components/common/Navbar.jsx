import { Search } from "lucide-react";
import { normalizePageHref } from "../../utils/helpers.js";

function Navbar({
  settings,
  go,
  siteLang,
  setSiteLang,
  searchQuery,
  setSearchQuery,
  langMenuOpen,
  setLangMenuOpen,
  authUser,
  cartCount,
  setCartOpen,
  visibleHomePages,
  currentStorePage,
}) {
  return (
    <header
      className={`store-header ${settings.homeHeaderSticky === false ? "" : "header-sticky-pro"}`}
      style={{
        background: settings.homeHeaderBg || undefined,
      }}
    >
      {settings.homeTopBarEnabled !== false &&
        (settings.homeHeaderTopBar || "").trim() && (
          <div
            className="top-announcement-bar"
            style={{
              background: settings.homeTopBarBg || "#0F3D2E",
              color: settings.homeTopBarText || "#FFFFFF",
            }}
          >
            <span>{settings.homeHeaderTopBar}</span>
          </div>
        )}

      <div className="container luxe-nav">
        <div className="luxe-nav-right">
          <button className="luxe-logo" onClick={() => go("/")}>
            {settings.homeHeaderImage ? (
              <img
                src={settings.homeHeaderImage}
                alt="logo"
                loading="eager"
                decoding="async"
              />
            ) : (
              <b>{settings.homeHeaderTitle || settings.storeName}</b>
            )}
          </button>
        </div>

        <nav className="luxe-nav-center">
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                const productsEl = document.getElementById("products");
                productsEl?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                siteLang === "EN" ? "Search products..." : "ابحث عن منتج..."
              }
            />
            <button
              type="submit"
              className="search-icon-submit"
              aria-label={siteLang === "EN" ? "Search" : "بحث"}
            >
              <Search size={18} />
            </button>
          </form>
        </nav>

        <div className="luxe-nav-left">
          <div className="language-menu-wrap">
            <button
              className="language-toggle"
              type="button"
              title={siteLang === "EN" ? "Language" : "اللغة"}
              onClick={() => setLangMenuOpen((v) => !v)}
            >
              🌐
            </button>

            {langMenuOpen && (
              <div className="language-dropdown">
                <button
                  type="button"
                  className={siteLang === "AR" ? "active" : ""}
                  onClick={() => {
                    setSiteLang("AR");
                    setLangMenuOpen(false);
                  }}
                >
                  العربية
                </button>
                <button
                  type="button"
                  className={siteLang === "EN" ? "active" : ""}
                  onClick={() => {
                    setSiteLang("EN");
                    setLangMenuOpen(false);
                  }}
                >
                  English
                </button>
              </div>
            )}
          </div>

          <button
            className="luxe-icon-btn"
            aria-label="حسابي"
            onClick={() => go(authUser ? "/account" : "/login")}
            title={
              siteLang === "EN"
                ? authUser
                  ? "Account"
                  : "Login"
                : authUser
                  ? "حسابي"
                  : "دخول العميل"
            }
          >
            👤
          </button>

          <button
            className="luxe-cart-icon"
            aria-label={siteLang === "EN" ? "Cart" : "السلة"}
            onClick={() => setCartOpen(true)}
            title={siteLang === "EN" ? "Cart" : "السلة"}
          >
            🛒
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </div>

      <section className="home-pages-strip">
        <div className="container home-pages-inner">
          <span>{settings.homePagesTitle || "الصفحات"}</span>
          <div className="home-pages-links">
            {visibleHomePages.map((page, index) => (
              <a
                key={index}
                href={normalizePageHref(page, index)}
                className={currentStorePage === page ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  go(normalizePageHref(page, index));
                }}
              >
                {page.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </header>
  );
}

export default Navbar;
