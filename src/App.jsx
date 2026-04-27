import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  Search,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
} from "lucide-react";

const products = [
  { id: 1, name: "Nike Air Max Pulse", brand: "Nike", category: "Running", price: 749, oldPrice: 899, rating: 4.8, sizes: [40,41,42,43,44], tag: "Best Seller", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80" },
  { id: 2, name: "Adidas Ultraboost Light", brand: "Adidas", category: "Running", price: 829, oldPrice: 999, rating: 4.9, sizes: [40,41,42,43], tag: "Premium", image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=1200&q=80" },
  { id: 3, name: "New Balance 9060", brand: "New Balance", category: "Lifestyle", price: 699, oldPrice: 849, rating: 4.7, sizes: [39,40,41,42,43], tag: "New Drop", image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1200&q=80" },
  { id: 4, name: "Puma RS-X Heritage", brand: "Puma", category: "Lifestyle", price: 579, oldPrice: 699, rating: 4.6, sizes: [40,41,42,44], tag: "Hot Pick", image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1200&q=80" },
  { id: 5, name: "Jordan 1 Retro High", brand: "Jordan", category: "Sneakers", price: 1299, oldPrice: 1499, rating: 5.0, sizes: [41,42,43,44,45], tag: "Collectors", image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=80" },
  { id: 6, name: "Gucci Ace Leather", brand: "Gucci", category: "Luxury", price: 2499, oldPrice: 2899, rating: 4.9, sizes: [40,41,42,43], tag: "Luxury", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80" },
  { id: 7, name: "Alexander McQueen Oversized", brand: "Alexander McQueen", category: "Luxury", price: 2799, oldPrice: 3199, rating: 4.8, sizes: [40,41,42,43,44], tag: "Exclusive", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80" },
  { id: 8, name: "On Cloudmonster", brand: "On", category: "Running", price: 899, oldPrice: 1049, rating: 4.8, sizes: [40,41,42,43,44], tag: "Performance", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80" },
];

const brands = ["All", ...new Set(products.map((p) => p.brand))];
const categories = ["All", ...new Set(products.map((p) => p.category))];
const testimonials = [
  { name: "سارة", text: "التصميم فاخر جدًا وتجربة الشراء واضحة وسريعة. المتجر فعلاً شكله براند عالمي." },
  { name: "خالد", text: "تقسيم البراندات والفلاتر ممتاز، والمنتجات معروضة بشكل احترافي جدًا." },
  { name: "نورة", text: "الهيرو والقسم الفاخر أعطوا الموقع هوية قوية ومناسبة لمتجر أحذية مميز." },
];

function formatPrice(value) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export default function LuxeSneakerStore() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [selectedSize, setSelectedSize] = useState({});
  const [cart, setCart] = useState([]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchesBrand = brand === "All" || p.brand === brand;
      const matchesCategory = category === "All" || p.category === category;
      return matchesQuery && matchesBrand && matchesCategory;
    });
  }, [query, brand, category]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal > 0 ? 35 : 0;
  const total = subtotal + shipping;

  const toggleFavorite = (id) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const addToCart = (product) => {
    const size = selectedSize[product.id] || product.sizes[0];
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id && item.size === size);
      if (found) {
        return prev.map((item) =>
          item.id === product.id && item.size === size ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, size, qty: 1 }];
    });
    setCartOpen(true);
  };

  const updateQty = (index, delta) => {
    setCart((prev) => prev.map((item, i) => i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="page" dir="rtl">
      <div className="top-glow" />

      <header className="header">
        <div className="container nav">
          <div className="brand-wrap">
            <button className="menu-btn mobile-only" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <div className="brand-title">LUXE SOLE</div>
              <div className="brand-sub">global footwear</div>
            </div>
          </div>

          <nav className="desktop-nav">
            <a href="#home">الرئيسية</a>
            <a href="#collections">التشكيلات</a>
            <a href="#products">المنتجات</a>
            <a href="#experience">المزايا</a>
          </nav>

          <div className="nav-actions">
            <button className="login-btn">تسجيل الدخول</button>
            <button onClick={() => setCartOpen(true)} className="cart-btn">
              <span className="cart-inner"><ShoppingBag size={16} /> السلة</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mobile-menu container">
            <a href="#home">الرئيسية</a>
            <a href="#collections">التشكيلات</a>
            <a href="#products">المنتجات</a>
            <a href="#experience">المزايا</a>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="container hero">
          <div className="hero-copy">
            <div className="pill">تشكيلة فاخرة من أفضل البراندات العالمية</div>
            <div className="hero-text">
              <h1>متجر شوزات <span>بتصميم فاخر</span> <em>وتجربة تسوق احترافية</em></h1>
              <p>اختر من Nike و Adidas و Jordan و Gucci و Alexander McQueen وغيرهم، مع عرض فاخر للمنتجات، فلاتر ذكية، مقاسات، وسلة شراء أنيقة تليق بمتجر براندات عالمي.</p>
            </div>
            <div className="hero-actions">
              <a href="#products" className="primary-btn">تسوق الآن</a>
              <a href="#collections" className="secondary-btn">استكشف البراندات</a>
            </div>

            <div className="stats">
              {[
                ["+40", "موديل فاخر"],
                ["24H", "شحن سريع"],
                ["100%", "منتجات أصلية"],
              ].map(([num, label]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-num">{num}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-card top-card">
              <div className="tiny-label">Editor's Pick</div>
              <div className="card-big">Jordan 1 Retro</div>
              <div className="card-small">Classic silhouette with luxury street presence</div>
            </div>
            <div className="floating-card bottom-card dark">
              <div className="tiny-label">Exclusive Drop</div>
              <div className="discount">30%</div>
              <div className="card-small">على مجموعة مختارة هذا الأسبوع</div>
            </div>
            <div className="hero-image-wrap">
              <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1400&q=80" alt="Luxury shoes" className="hero-image" />
            </div>
          </div>
        </section>

        <section id="collections" className="container section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Brands</div>
              <h2>أشهر البراندات في مكان واحد</h2>
            </div>
            <button className="secondary-btn desktop-only-inline">عرض جميع التشكيلات <ChevronLeft size={16} /></button>
          </div>
          <div className="brand-grid">
            {[
              ["Nike", "Sport Icons"],
              ["Adidas", "Performance Luxe"],
              ["Jordan", "Street Prestige"],
              ["Gucci", "Italian Luxury"],
            ].map(([title, sub]) => (
              <div className="brand-card" key={title}>
                <div className="brand-subhead">{sub}</div>
                <div className="brand-name">{title}</div>
                <div className="brand-text">تصاميم منتقاة لواجهة متجر براندات أنيق وفخم.</div>
              </div>
            ))}
          </div>
        </section>

        <section id="experience" className="container section">
          <div className="features-grid">
            {[
              [Truck, "توصيل سريع", "شحن سريع وآمن إلى مختلف المدن مع تتبع مباشر للطلب."],
              [ShieldCheck, "أصالة مضمونة", "واجهة مناسبة لمتجر يعرض المنتجات الأصلية مع ثقة أعلى للعميل."],
              [RotateCcw, "استبدال مرن", "عرض سياسات الإرجاع والاستبدال بطريقة راقية وواضحة."],
            ].map(([Icon, title, text]) => (
              <div className="feature-card" key={title}>
                <div className="feature-icon"><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container section-tight">
          <div className="filter-panel">
            <div className="search-wrap">
              <Search className="search-icon" size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن براند أو موديل..." className="search-input" />
            </div>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className="select">
              {brands.map((item) => (
                <option key={item} value={item}>{item === "All" ? "كل البراندات" : item}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
              {categories.map((item) => (
                <option key={item} value={item}>{item === "All" ? "كل الأقسام" : item}</option>
              ))}
            </select>
          </div>
        </section>

        <section id="products" className="container section">
          <div className="section-head products-head">
            <div>
              <div className="eyebrow">Featured Catalogue</div>
              <h2>منتجات مختارة بعناية</h2>
              <p className="muted">{filteredProducts.length} منتج متاح بعرض فاخر ومتجاوب.</p>
            </div>
            <div className="chips">
              {["All", "Nike", "Adidas", "Jordan", "Luxury"].map((chip) => (
                <button
                  key={chip}
                  className="chip"
                  onClick={() => {
                    if (["Nike", "Adidas", "Jordan"].includes(chip)) {
                      setBrand(chip); setCategory("All");
                    } else if (chip === "Luxury") {
                      setCategory("Luxury"); setBrand("All");
                    } else {
                      setBrand("All"); setCategory("All");
                    }
                  }}
                >
                  {chip === "All" ? "الكل" : chip}
                </button>
              ))}
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-media">
                  <img src={product.image} alt={product.name} className="product-image" />
                  <div className="tag">{product.tag}</div>
                  <button className="fav-btn" onClick={() => toggleFavorite(product.id)}>
                    <Heart size={18} className={favorites.includes(product.id) ? "fav-active" : ""} />
                  </button>
                </div>
                <div className="product-body">
                  <div className="product-head">
                    <div>
                      <div className="product-brand">{product.brand}</div>
                      <h3>{product.name}</h3>
                    </div>
                    <div className="product-category">{product.category}</div>
                  </div>

                  <div className="rating"><Star size={15} fill="currentColor" /> <span>{product.rating}</span></div>

                  <div className="sizes">
                    {product.sizes.map((size) => {
                      const active = (selectedSize[product.id] || product.sizes[0]) === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize((prev) => ({ ...prev, [product.id]: size }))}
                          className={active ? "size active" : "size"}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  <div className="product-footer">
                    <div>
                      <div className="price">{formatPrice(product.price)} ر.س</div>
                      <div className="old-price">{formatPrice(product.oldPrice)} ر.س</div>
                    </div>
                    <button onClick={() => addToCart(product)} className="primary-btn small-btn">أضف للسلة</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container section">
          <div className="promo-grid">
            <div className="promo-dark">
              <div className="eyebrow light">Luxury Campaign</div>
              <h3>عروض موسمية على البراندات المميزة</h3>
              <p>قسم تسويقي فاخر مناسب لإبراز الهبوطات الجديدة والخصومات الحصرية على الشوزات العالمية.</p>
              <div className="hero-actions">
                <button className="gold-btn">اكتشف العروض</button>
                <button className="ghost-btn">شاهد الجديد</button>
              </div>
            </div>
            <div className="promo-light">
              <div className="eyebrow">Why it feels premium</div>
              {[
                "واجهة فاخرة بألوان هادئة ولمسات ذهبية",
                "بطاقات منتجات احترافية مع المقاسات والتقييم",
                "تقسيم واضح للبراندات والتشكيلات",
                "سلة شراء أنيقة وتجربة استخدام أفضل",
              ].map((item) => (
                <div className="bullet" key={item}>
                  <span className="dot" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Testimonials</div>
              <h2>آراء تجريبية على شكل متجر احترافي</h2>
            </div>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((item) => (
              <div className="testimonial-card" key={item.name}>
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <p>“{item.text}”</p>
                <div className="person">{item.name}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="brand-title">LUXE SOLE</div>
            <p className="footer-text">متجر شوزات فاخر مناسب لعرض البراندات العالمية بشكل احترافي وجذاب.</p>
          </div>
          <div>
            <div className="footer-title">الأقسام</div>
            <div className="footer-list"><div>Running</div><div>Sneakers</div><div>Lifestyle</div><div>Luxury</div></div>
          </div>
          <div>
            <div className="footer-title">خدمة العملاء</div>
            <div className="footer-list"><div>الشحن والتوصيل</div><div>الإرجاع والاستبدال</div><div>طرق الدفع</div><div>الأسئلة الشائعة</div></div>
          </div>
          <div>
            <div className="footer-title">تواصل</div>
            <div className="footer-list"><div>support@luxesole.com</div><div>+966 50 000 0000</div><div>Riyadh, Saudi Arabia</div></div>
          </div>
        </div>
      </footer>

      {cartOpen && (
        <div className="cart-overlay">
          <div className="cart-backdrop" onClick={() => setCartOpen(false)} />
          <div className="cart-panel">
            <div className="cart-header">
              <div>
                <div className="eyebrow">Shopping Bag</div>
                <h3>سلة الشراء</h3>
              </div>
              <button onClick={() => setCartOpen(false)} className="menu-btn"><X size={20} /></button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-cart">السلة فارغة حاليًا</div>
              ) : (
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div key={`${item.id}-${item.size}-${index}`} className="cart-item">
                      <img src={item.image} alt={item.name} />
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.name}</div>
                        <div className="cart-meta">المقاس: {item.size}</div>
                        <div className="cart-meta">{formatPrice(item.price)} ر.س</div>
                        <div className="cart-actions">
                          <div className="qty-box">
                            <button onClick={() => updateQty(index, -1)}><Minus size={14} /></button>
                            <span>{item.qty}</span>
                            <button onClick={() => updateQty(index, 1)}><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeItem(index)} className="trash-btn"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cart-footer">
              <div className="row"><span>الإجمالي الفرعي</span><span>{formatPrice(subtotal)} ر.س</span></div>
              <div className="row"><span>الشحن</span><span>{formatPrice(shipping)} ر.س</span></div>
              <div className="row total"><span>الإجمالي</span><span>{formatPrice(total)} ر.س</span></div>
              <button className="primary-btn checkout-btn">إتمام الشراء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
