function Footer({ settings }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <b>{settings.storeName}</b>
          )}
          <p>{settings.tagline}</p>
        </div>
        <div>
          <b>النباتات</b>
          <p>
            نباتات داخلية
            <br />
            أصص
            <br />
            هدايا خضراء
          </p>
        </div>
        <div>
          <b>الدعم</b>
          <p>
            الشحن
            <br />
            الدفع
            <br />
            الاستبدال
          </p>
        </div>
        <div>
          <b>تواصل</b>
          <p>
            support@greenhaven.com
            <br />
            الرياض، السعودية
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
