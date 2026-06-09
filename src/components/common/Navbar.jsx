import { useEffect, useRef, useState } from "react";
import { Languages, Search, ShoppingBag, User } from "lucide-react";
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
  const headerRef = useRef(null);
  const pagesStripRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pagesStripHeight, setPagesStripHeight] = useState(0);
  const isStickyHeader = settings.homeHeaderSticky !== false;
  const isStickyPagesStrip = Boolean(settings.homePagesSticky);

  useEffect(() => {
    if (!isStickyHeader || !headerRef.current) {
      setHeaderHeight(0);
      return undefined;
    }

    const updateHeaderHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      observer?.disconnect();
    };
  }, [
    isStickyHeader,
    settings.homeHeaderTopBar,
    settings.homeTopBarEnabled,
    settings.homeHeaderImage,
    settings.homeHeaderTitle,
    visibleHomePages.length,
  ]);

  useEffect(() => {
    if (!isStickyPagesStrip || !pagesStripRef.current) {
      setPagesStripHeight(0);
      return undefined;
    }

    const updatePagesStripHeight = () => {
      setPagesStripHeight(pagesStripRef.current?.offsetHeight || 0);
    };

    updatePagesStripHeight();
    window.addEventListener("resize", updatePagesStripHeight);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updatePagesStripHeight);
      observer.observe(pagesStripRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePagesStripHeight);
      observer?.disconnect();
    };
  }, [isStickyPagesStrip, settings.homePagesTitle, visibleHomePages.length]);

  return (
    <>
      <header
        ref={headerRef}
        className={`store-header premium-store-header ${isStickyHeader ? "header-sticky-pro" : ""}`}
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
              aria-label={siteLang === "EN" ? "Language" : "اللغة"}
              onClick={() => setLangMenuOpen((v) => !v)}
            >
              <Languages size={19} />
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
            <User size={19} />
          </button>

          <button
            className="luxe-cart-icon"
            aria-label={siteLang === "EN" ? "Cart" : "السلة"}
            onClick={() => setCartOpen(true)}
            title={siteLang === "EN" ? "Cart" : "السلة"}
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </div>
      </header>
      {isStickyHeader && (
        <div
          className="store-header-fixed-spacer"
          style={{ height: headerHeight }}
          aria-hidden="true"
        />
      )}
      <section
        ref={pagesStripRef}
        className={`home-pages-strip ${isStickyPagesStrip ? "pages-fixed-pro" : ""}`}
        style={{
          "--pages-sticky-top": isStickyHeader ? `${headerHeight}px` : "0px",
        }}
      >
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
      {isStickyPagesStrip && (
        <div
          className="home-pages-fixed-spacer"
          style={{ height: pagesStripHeight }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default Navbar;
