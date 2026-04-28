import "./App.css";

function App() {
  return (
    <div>

      {/* HEADER */}
      <div className="header">

        <div className="logo">LUXE SOLE</div>

        <div className="nav-links">
          <a href="#">الأقسام</a>
          <a href="#">الخصومات</a>
          <a href="#">المنتدى</a>
        </div>

        <div className="actions">

          <div className="icon-btn">👤</div>

          <div className="cart">
            <span className="icon-btn">🛒</span>
            <span className="cart-count">3</span>
          </div>

        </div>

      </div>

      {/* محتوى مؤقت */}
      <div style={{ padding: "40px", textAlign: "center" }}>
        المتجر شغال 🔥
      </div>

    </div>
  );
}

export default App;
