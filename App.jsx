
export default function App() {
  const settings = {};

  return (
    <div className="store">
      <header className="store-header">
        <div className="top-announcement-bar">
          <span>{settings.homeHeaderTopBar || "شحن سريع داخل السعودية 🚚"}</span>
        </div>

        <div className="container luxe-nav">
          <div className="header-socials">
            <a href="#">IG</a>
            <a href="#">TT</a>
            <a href="#">SC</a>
            <a href="#">X</a>
            <a href="https://wa.me/966508983003">WA</a>
          </div>

          <a className="header-cta-pro" href="#products">
            اطلب الآن
          </a>
        </div>
      </header>
    </div>
  );
}
