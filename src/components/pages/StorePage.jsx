import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import {
  couponUsedByCustomer,
  formatPrice,
  getTrafficSource,
  makePageSlug,
  normalizePageHref,
  sizesArray,
} from "../../utils/helpers.js";
import { findProductByPath, productPath } from "../SEOManager.jsx";
import { getVisitorGeo, trackFunnelStep } from "../../services/analytics.js";
import Navbar from "../common/Navbar.jsx";
import Footer from "../common/Footer.jsx";
import CartDrawer from "../common/CartDrawer.jsx";
import HeroSection from "../common/HeroSection.jsx";
import ProductDetailPage from "../products/ProductDetailPage.jsx";
import ProductGrid from "../products/ProductGrid.jsx";
import Account from "./AccountPage.jsx";
import StoreCustomPage from "./StoreCustomPage.jsx";

function Store({
  settings,
  products,
  authUser,
  customer,
  setCustomer,
  orders = [],
  coupons = [],
  go,
  path,
}) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("green-dixam-cart") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("green-dixam-cart", JSON.stringify(cart));
  }, [cart]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState({});
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("green-dixam-favorites") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("green-dixam-favorites", JSON.stringify(favorites));
  }, [favorites]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const plantCategoryScrollerRef = useRef(null);
  const bestSellerScrollerRef = useRef(null);
  const careProductsScrollerRef = useRef(null);
  const plantCategoryDragRef = useRef({
    active: false,
    dragged: false,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });
  const bestSellerDragRef = useRef({
    active: false,
    dragged: false,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });
  const careProductsDragRef = useRef({
    active: false,
    dragged: false,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    let visitorId = localStorage.getItem("gdVisitorId");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("gdVisitorId", visitorId);
    }

    const visitorRef = doc(db, "liveVisitors", visitorId);

    const touchVisitor = async () => {
      try {
        const cartCount = cart.reduce(
          (sum, item) => sum + Number(item.qty || 1),
          0,
        );
        const now = Date.now();
        const geo = await getVisitorGeo();

        let sessionStart = Number(localStorage.getItem("gdSessionStart") || 0);
        if (!sessionStart) {
          sessionStart = now;
          localStorage.setItem("gdSessionStart", String(sessionStart));
        }

        await setDoc(
          visitorRef,
          {
            firstSeen: sessionStart,
            lastSeen: now,
            sessionDuration: now - sessionStart,
            source:
              localStorage.getItem("gdTrafficSource") || getTrafficSource(),
            path: window.location.pathname || "/",
            pageTitle: document.title || "",
            cartCount,
            cartItems: cart.slice(0, 5).map((item) => ({
              name: item.name || "منتج",
              qty: Number(item.qty || 1),
            })),
            language: navigator.language || "",
            timezone:
              geo.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "",
            city: geo.city || "",
            country: geo.country || "",
            countryCode: geo.countryCode || "",
            latitude: Number(geo.latitude || 0),
            longitude: Number(geo.longitude || 0),
            screen: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
            lastAction: cartCount > 0 ? "لديه منتجات في السلة" : "يتصفح المتجر",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        if (!localStorage.getItem("gdTrafficSource")) {
          localStorage.setItem("gdTrafficSource", getTrafficSource());
        }
      } catch (error) {
        console.warn("Live visitor heartbeat failed:", error);
      }
    };

    touchVisitor();
    const interval = setInterval(touchVisitor, 15000);

    const onFocus = () => touchVisitor();
    const onVisibility = () => {
      if (!document.hidden) touchVisitor();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [path, cart]);

  useEffect(() => {
    trackFunnelStep("visit_store");
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [siteLang, setSiteLang] = useState(() => {
    try {
      return (
        localStorage.getItem("green-dixam-lang") ||
        settings.homeHeaderLang ||
        "AR"
      );
    } catch {
      return settings.homeHeaderLang || "AR";
    }
  });

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("green-dixam-lang", siteLang);
    } catch {}
  }, [siteLang]);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => (product.status || "active") !== "hidden"),
    [products],
  );
  const homeProducts = visibleProducts.slice(0, 10);
  const favoriteProducts = favorites
    .map((favoriteKey) =>
      visibleProducts.find(
        (product) =>
          productPath(product) === favoriteKey || product.id === favoriteKey,
      ),
    )
    .filter(Boolean);
  useEffect(() => {
    if (!favorites.length || !visibleProducts.length) return;
    const normalized = favorites
      .map((favoriteKey) => {
        const product = visibleProducts.find(
          (item) => productPath(item) === favoriteKey || item.id === favoriteKey,
        );
        return product ? productPath(product) : favoriteKey;
      })
      .filter((favoriteKey, index, list) => list.indexOf(favoriteKey) === index);
    if (normalized.join("|") !== favorites.join("|")) {
      setFavorites(normalized);
    }
  }, [favorites, visibleProducts]);
  const bestSellerProducts = useMemo(() => {
    const orderCounts = new Map();
    (orders || []).forEach((order) => {
      (order.items || []).forEach((item) => {
        const id = item.id || item.productId;
        if (!id) return;
        orderCounts.set(id, (orderCounts.get(id) || 0) + Number(item.qty || 1));
      });
    });

    return products
      .filter((product) => (product.status || "active") !== "hidden")
      .map((product) => ({
        product,
        score:
          (orderCounts.get(product.id) || 0) * 100 +
          (product.featured ? 40 : 0) +
          Number(product.rating || 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.product);
  }, [orders, products]);
  const bestSellerLoopProducts =
    bestSellerProducts.length > 1
      ? [...bestSellerProducts, ...bestSellerProducts]
      : bestSellerProducts;
  const hasBestSellersTitle = Object.prototype.hasOwnProperty.call(
    settings,
    "homeBestSellersTitle",
  );
  const bestSellersTitle = (
    hasBestSellersTitle
      ? String(settings.homeBestSellersTitle || "")
      : "منتجات الأكثر طلبًا"
  ).trim();
  const careProductIds = Array.isArray(settings.homeCareProductIds)
    ? settings.homeCareProductIds
    : [];
  const selectedCareProducts = careProductIds
    .map((id) => visibleProducts.find((product) => product.id === id))
    .filter(Boolean);
  const fallbackCareProducts = visibleProducts.slice(0, 6);
  const careProducts = selectedCareProducts.length
    ? selectedCareProducts
    : fallbackCareProducts;
  const careLoopProducts =
    careProducts.length > 1 ? [...careProducts, ...careProducts] : careProducts;
  const hasCareProductsTitle = Object.prototype.hasOwnProperty.call(
    settings,
    "homeCareProductsTitle",
  );
  const careProductsTitle = (
    hasCareProductsTitle
      ? String(settings.homeCareProductsTitle || "")
      : "منتجات العناية"
  ).trim();
  useEffect(() => {
    const scroller = bestSellerScrollerRef.current;
    if (!scroller || bestSellerProducts.length <= 1) return undefined;

    let timer = 0;
    let resizeObserver;

    const getTrack = () => scroller.querySelector(".best-sellers-products-grid");
    const getCard = () => scroller.querySelector(".product");
    const getGap = (track) =>
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;

    const syncCarouselMetrics = () => {
      const track = getTrack();
      if (!track) return;
      const gap = getGap(track);
      const cardWidth = Math.max(170, (scroller.clientWidth - gap * 4) / 5);
      scroller.style.setProperty("--best-seller-card-width", `${cardWidth}px`);

      window.requestAnimationFrame(() => {
        const loopWidth = track.scrollWidth / 2;
        if (loopWidth > 0 && scroller.scrollLeft < 4) {
          scroller.scrollLeft = loopWidth;
        }
      });
    };

    const moveOneProductRight = () => {
      if (bestSellerDragRef.current.active) return;
      const track = getTrack();
      const card = getCard();
      if (!track || !card) return;
      const gap = getGap(track);
      const step = card.getBoundingClientRect().width + gap;
      const loopWidth = track.scrollWidth / 2;
      if (!step || !loopWidth) return;

      if (scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }

      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
    };

    syncCarouselMetrics();
    resizeObserver = new ResizeObserver(syncCarouselMetrics);
    resizeObserver.observe(scroller);
    timer = window.setInterval(moveOneProductRight, 3000);

    return () => {
      window.clearInterval(timer);
      resizeObserver?.disconnect();
    };
  }, [bestSellerProducts.length]);
  useEffect(() => {
    const scroller = careProductsScrollerRef.current;
    if (!scroller || careProducts.length <= 1) return undefined;

    let timer = 0;
    let resizeObserver;

    const getTrack = () => scroller.querySelector(".care-products-grid");
    const getCard = () => scroller.querySelector(".product");
    const getGap = (track) =>
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;

    const syncCarouselMetrics = () => {
      const track = getTrack();
      if (!track) return;
      const gap = getGap(track);
      const cardWidth = Math.max(170, (scroller.clientWidth - gap * 4) / 5);
      scroller.style.setProperty("--best-seller-card-width", `${cardWidth}px`);

      window.requestAnimationFrame(() => {
        const loopWidth = track.scrollWidth / 2;
        if (loopWidth > 0 && scroller.scrollLeft < 4) {
          scroller.scrollLeft = loopWidth;
        }
      });
    };

    const moveOneProductRight = () => {
      if (careProductsDragRef.current.active) return;
      const track = getTrack();
      const card = getCard();
      if (!track || !card) return;
      const gap = getGap(track);
      const step = card.getBoundingClientRect().width + gap;
      const loopWidth = track.scrollWidth / 2;
      if (!step || !loopWidth) return;

      if (scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }

      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
    };

    syncCarouselMetrics();
    resizeObserver = new ResizeObserver(syncCarouselMetrics);
    resizeObserver.observe(scroller);
    timer = window.setInterval(moveOneProductRight, 3000);

    return () => {
      window.clearInterval(timer);
      resizeObserver?.disconnect();
    };
  }, [careProducts.length]);
  const cartCount = cart.reduce((n, i) => n + Number(i.qty || 0), 0);
  const subtotal = cart.reduce(
    (n, i) => n + Number(i.qty || 0) * Number(i.price || 0),
    0,
  );
  const configuredShippingFee = Math.max(0, Number(settings.shippingFee ?? 35));
  const freeShippingThreshold = Math.max(
    0,
    Number(settings.freeShippingThreshold || 0),
  );
  const minimumOrderTotal = Math.max(0, Number(settings.minimumOrderTotal || 0));
  const shippingFee =
    subtotal && (!freeShippingThreshold || subtotal < freeShippingThreshold)
      ? configuredShippingFee
      : 0;
  const discount = appliedCoupon
    ? Math.round(subtotal * (Number(appliedCoupon.percent || 0) / 100))
    : 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;
  const paymentProviders = useMemo(() => {
    const savedProviders = Array.isArray(settings.paymentProviders)
      ? settings.paymentProviders
      : [];
    return savedProviders.length
      ? savedProviders
      : [
          {
            id: "cod",
            name: "الدفع عند الاستلام",
            badge: "COD",
            enabled: true,
            visible: true,
            mode: "live",
            minAmount: 0,
            maxAmount: 0,
            note: "لا يحتاج بوابة دفع، وسيتم تأكيد الطلب عبر واتساب.",
          },
        ];
  }, [settings.paymentProviders]);
  const availablePaymentProviders = useMemo(
    () =>
      paymentProviders.filter((provider) => {
        if (!provider.enabled || provider.visible === false) return false;
        const minAmount = Math.max(0, Number(provider.minAmount || 0));
        const maxAmount = Math.max(0, Number(provider.maxAmount || 0));
        if (minAmount && total < minAmount) return false;
        if (maxAmount && total > maxAmount) return false;
        return true;
      }),
    [paymentProviders, total],
  );
  const availablePaymentIds = availablePaymentProviders
    .map((provider) => provider.id)
    .join("|");
  const selectedPaymentProvider =
    availablePaymentProviders.find(
      (provider) => provider.id === selectedPaymentId,
    ) ||
    availablePaymentProviders[0] ||
    null;

  useEffect(() => {
    if (!availablePaymentProviders.length) {
      if (selectedPaymentId) setSelectedPaymentId("");
      return;
    }
    if (
      !selectedPaymentId ||
      !availablePaymentProviders.some(
        (provider) => provider.id === selectedPaymentId,
      )
    ) {
      setSelectedPaymentId(availablePaymentProviders[0].id);
    }
  }, [availablePaymentIds, availablePaymentProviders, selectedPaymentId]);
  const visibleHomePages = (
    settings.homePages || [
      { label: "النباتات", href: "/page/products", visible: true },
      { label: "العروض", href: "/page/offers", visible: true },
      { label: "دليل العناية", href: "/page/care-guide", visible: true },
    ]
  ).filter((page) => page.visible !== false);
  const defaultPlantCategories = [
    {
      title: "نباتات داخلية",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "سهلة العناية",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "أصص وإكسسوارات",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80",
    },
  ];
  const plantCategories = (
    Array.isArray(settings.homePlantCategories)
      ? settings.homePlantCategories
      : defaultPlantCategories
  )
    .slice(0, 10)
    .filter((item) => item?.title && item?.image);
  const plantCategoriesAutoplay = plantCategories.length > 1;
  const visiblePlantCategories = plantCategoriesAutoplay
    ? [...plantCategories, ...plantCategories]
    : plantCategories;
  const hasPlantCategoriesTitle = Object.prototype.hasOwnProperty.call(
    settings,
    "homePlantSectionsTitle",
  );
  const plantCategoriesTitle =
    (hasPlantCategoriesTitle
      ? String(settings.homePlantSectionsTitle || "")
      : "اختر طابعك الأخضر"
    ).trim();
  useEffect(() => {
    const scroller = plantCategoryScrollerRef.current;
    if (!scroller || !plantCategoriesAutoplay) return undefined;

    let timer = 0;
    let resizeObserver;

    const getTrack = () => scroller.querySelector(".plant-category-track");
    const getCard = () => scroller.querySelector(".plant-category-card");
    const getGap = (track) =>
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;

    const syncCarouselMetrics = () => {
      const track = getTrack();
      if (!track) return;
      const gap = getGap(track);
      const cardWidth = Math.max(220, (scroller.clientWidth - gap * 2) / 3);
      scroller.style.setProperty(
        "--plant-category-card-width",
        `${cardWidth}px`,
      );

      window.requestAnimationFrame(() => {
        const loopWidth = track.scrollWidth / 2;
        if (loopWidth > 0 && scroller.scrollLeft < 4) {
          scroller.scrollLeft = loopWidth;
        }
      });
    };

    const moveOneCategoryRight = () => {
      if (plantCategoryDragRef.current.active) return;
      const track = getTrack();
      const card = getCard();
      if (!track || !card) return;
      const gap = getGap(track);
      const step = card.getBoundingClientRect().width + gap;
      const loopWidth = track.scrollWidth / 2;
      if (!step || !loopWidth) return;

      if (scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }

      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
    };

    syncCarouselMetrics();
    resizeObserver = new ResizeObserver(syncCarouselMetrics);
    resizeObserver.observe(scroller);
    timer = window.setInterval(moveOneCategoryRight, 3000);

    return () => {
      window.clearInterval(timer);
      resizeObserver?.disconnect();
    };
  }, [plantCategoriesAutoplay, plantCategories.length]);
  const startPlantCategoryDrag = (event) => {
    const scroller = plantCategoryScrollerRef.current;
    if (!scroller) return;
    plantCategoryDragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.classList.add("is-dragging");
    scroller.setPointerCapture?.(event.pointerId);
  };
  const movePlantCategoryDrag = (event) => {
    const scroller = plantCategoryScrollerRef.current;
    const drag = plantCategoryDragRef.current;
    if (!scroller || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.dragged = true;
    scroller.scrollLeft = drag.scrollLeft - distance;
  };
  const endPlantCategoryDrag = (event) => {
    const scroller = plantCategoryScrollerRef.current;
    const drag = plantCategoryDragRef.current;
    if (!scroller || !drag.active) return;
    scroller.classList.remove("is-dragging");
    if (drag.pointerId != null) {
      scroller.releasePointerCapture?.(drag.pointerId);
    }
    plantCategoryDragRef.current = {
      ...drag,
      active: false,
      pointerId: null,
    };
  };
  const handlePlantCategoryClick = (event) => {
    if (!plantCategoryDragRef.current.dragged) return;
    event.preventDefault();
    plantCategoryDragRef.current.dragged = false;
  };
  const movePlantCategoryCarousel = (direction) => {
    const scroller = plantCategoryScrollerRef.current;
    if (!scroller) return;
    const track = scroller.querySelector(".plant-category-track");
    const card = scroller.querySelector(".plant-category-card");
    if (!track || !card) return;

    const gap =
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const step = card.getBoundingClientRect().width + gap;
    const loopWidth = plantCategoriesAutoplay ? track.scrollWidth / 2 : 0;
    if (!step) return;

    if (direction === "right") {
      if (loopWidth && scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }
      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
      return;
    }

    if (
      loopWidth &&
      scroller.scrollLeft + step >=
        loopWidth * 2 - scroller.clientWidth - 4
    ) {
      scroller.scrollLeft -= loopWidth;
    }
    scroller.scrollTo({
      left: scroller.scrollLeft + step,
      behavior: "smooth",
    });
  };
  const startBestSellerDrag = (event) => {
    const scroller = bestSellerScrollerRef.current;
    if (!scroller) return;
    bestSellerDragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.classList.add("is-dragging");
    scroller.setPointerCapture?.(event.pointerId);
  };
  const moveBestSellerDrag = (event) => {
    const scroller = bestSellerScrollerRef.current;
    const drag = bestSellerDragRef.current;
    if (!scroller || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.dragged = true;
    scroller.scrollLeft = drag.scrollLeft - distance;
  };
  const endBestSellerDrag = () => {
    const scroller = bestSellerScrollerRef.current;
    const drag = bestSellerDragRef.current;
    if (!scroller || !drag.active) return;
    scroller.classList.remove("is-dragging");
    if (drag.pointerId != null) {
      scroller.releasePointerCapture?.(drag.pointerId);
    }
    bestSellerDragRef.current = {
      ...drag,
      active: false,
      pointerId: null,
    };
  };
  const handleBestSellerClick = (event) => {
    if (!bestSellerDragRef.current.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    bestSellerDragRef.current.dragged = false;
  };
  const startCareProductsDrag = (event) => {
    const scroller = careProductsScrollerRef.current;
    if (!scroller) return;
    careProductsDragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.classList.add("is-dragging");
    scroller.setPointerCapture?.(event.pointerId);
  };
  const moveCareProductsDrag = (event) => {
    const scroller = careProductsScrollerRef.current;
    const drag = careProductsDragRef.current;
    if (!scroller || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.dragged = true;
    scroller.scrollLeft = drag.scrollLeft - distance;
  };
  const endCareProductsDrag = () => {
    const scroller = careProductsScrollerRef.current;
    const drag = careProductsDragRef.current;
    if (!scroller || !drag.active) return;
    scroller.classList.remove("is-dragging");
    if (drag.pointerId != null) {
      scroller.releasePointerCapture?.(drag.pointerId);
    }
    careProductsDragRef.current = {
      ...drag,
      active: false,
      pointerId: null,
    };
  };
  const handleCareProductsClick = (event) => {
    if (!careProductsDragRef.current.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    careProductsDragRef.current.dragged = false;
  };
  const moveBestSellerCarousel = (direction) => {
    const scroller = bestSellerScrollerRef.current;
    if (!scroller) return;
    const track = scroller.querySelector(".best-sellers-products-grid");
    const card = scroller.querySelector(".product");
    if (!track || !card) return;

    const gap =
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const step = card.getBoundingClientRect().width + gap;
    const loopWidth = bestSellerProducts.length > 1 ? track.scrollWidth / 2 : 0;
    if (!step) return;

    if (direction === "right") {
      if (loopWidth && scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }
      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
      return;
    }

    if (
      loopWidth &&
      scroller.scrollLeft + step >=
        loopWidth * 2 - scroller.clientWidth - 4
    ) {
      scroller.scrollLeft -= loopWidth;
    }
    scroller.scrollTo({
      left: scroller.scrollLeft + step,
      behavior: "smooth",
    });
  };
  const moveCareProductsCarousel = (direction) => {
    const scroller = careProductsScrollerRef.current;
    if (!scroller) return;
    const track = scroller.querySelector(".care-products-grid");
    const card = scroller.querySelector(".product");
    if (!track || !card) return;

    const gap =
      Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const step = card.getBoundingClientRect().width + gap;
    const loopWidth = careProducts.length > 1 ? track.scrollWidth / 2 : 0;
    if (!step) return;

    if (direction === "right") {
      if (loopWidth && scroller.scrollLeft <= step + 4) {
        scroller.scrollLeft += loopWidth;
      }
      scroller.scrollTo({
        left: scroller.scrollLeft - step,
        behavior: "smooth",
      });
      return;
    }

    if (
      loopWidth &&
      scroller.scrollLeft + step >=
        loopWidth * 2 - scroller.clientWidth - 4
    ) {
      scroller.scrollLeft -= loopWidth;
    }
    scroller.scrollTo({
      left: scroller.scrollLeft + step,
      behavior: "smooth",
    });
  };
  const footerPages = (settings.footerSections || []).flatMap(
    (section, sectionIndex) =>
      (section.links || [])
        .filter((link) => {
          const href = String(link.href || "").trim();
          const label = String(link.label || "").trim();
          const isHomeLink = /الرئيسية|الرئيسيه|home/i.test(label);
          return (
            label &&
            href !== "whatsapp" &&
            !href.startsWith("http") &&
            !href.startsWith("mailto:") &&
            !href.startsWith("#") &&
            !(href === "/" && isHomeLink)
          );
        })
        .map((link, linkIndex) => {
          const href = String(link.href || "").trim();
          return {
            label: link.label,
            href:
              !href || href === "/"
                ? `/page/${makePageSlug(link.label, `footer-${sectionIndex + 1}-${linkIndex + 1}`)}`
                : href,
            content: link.content || "",
            source: "footer",
          };
        }),
  );
  const storePages = [...visibleHomePages, ...footerPages];

  const currentStorePage = path.startsWith("/page/")
    ? storePages.find(
        (page, index) => normalizePageHref(page, index) === path,
      )
    : null;
  const currentProduct = path.startsWith("/product/")
    ? findProductByPath(products, path)
    : null;
  const isProductPath = path.startsWith("/product/");

  if (path.startsWith("/login"))
    return <CustomerAuth go={go} settings={settings} />;
  if (path.startsWith("/account")) {
    return authUser ? (
      <Account
        customer={customer}
        setCustomer={setCustomer}
        orders={orders}
        coupons={coupons}
        go={go}
        settings={settings}
      />
    ) : (
      <CustomerAuth go={go} settings={settings} />
    );
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMessage("اكتب كود الخصم أولاً");
      return;
    }

    const couponSnap = await getDoc(doc(db, "coupons", code));
    const coupon = couponSnap.exists()
      ? { id: couponSnap.id, ...couponSnap.data() }
      : null;
    if (!coupon) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون غير موجود");
      return;
    }

    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    if (!coupon.active) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون غير مفعل حالياً");
      return;
    }

    if (expired) {
      setAppliedCoupon(null);
      setCouponMessage("الكوبون منتهي");
      return;
    }

    if (couponUsedByCustomer(coupon, authUser?.uid, authUser?.email)) {
      setAppliedCoupon(null);
      setCouponMessage("تم استخدام هذا الكوبون من قبل");
      return;
    }

    setAppliedCoupon(coupon);
    setCouponMessage(`تم تطبيق خصم ${coupon.percent}%`);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  }

  function hasManagedStock(product) {
    return product?.stock !== undefined && product?.stock !== "";
  }

  function isOutOfStock(product) {
    return hasManagedStock(product) && Number(product.stock || 0) <= 0;
  }

  function addToCart(product) {
    if (isOutOfStock(product)) {
      setCouponMessage("هذا المنتج غير متوفر حالياً");
      setCartOpen(true);
      return;
    }

    const size =
      selectedSize[product.id] || sizesArray(product.sizes)[0] || "Free";
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id && i.size === size);
      const stockLimit = hasManagedStock(product)
        ? Math.max(0, Number(product.stock || 0))
        : Infinity;
      if (found)
        return prev.map((i) =>
          i.id === product.id && i.size === size
            ? {
                ...i,
                qty: Math.min(stockLimit, Number(i.qty || 0) + 1),
              }
            : i,
        );
      return [...prev, { ...product, size, qty: 1 }];
    });

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();

        setDoc(
          doc(db, "liveVisitors", visitorId),
          {
            lastAction: `أضاف للسلة: ${product.name || "منتج"}`,
            lastAddedProduct: product.name || "",
            lastCartAt: eventTime,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        setDoc(
          doc(db, "liveEvents", `${visitorId}-${eventTime}`),
          {
            type: "cart",
            title: `أضاف للسلة: ${product.name || "منتج"}`,
            path: window.location.pathname || "/",
            visitorId,
            createdAtMs: eventTime,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {}

    trackFunnelStep("add_to_cart", {
      productId: product.id,
      productName: product.name,
    });

    setCartOpen(true);
  }

  async function checkoutWhatsApp() {
    if (!authUser) {
      setCouponMessage("سجل دخولك كعميل أولاً لإتمام الطلب");
      go("/login");
      return;
    }
    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.city ||
      !customer?.address
    ) {
      setCouponMessage(
        "أكمل بيانات حسابك أولاً: الاسم، الجوال، المدينة، العنوان",
      );
      go("/account");
      return;
    }
    if (!cart.length) return;
    if (!selectedPaymentProvider) {
      setCouponMessage("اختر طريقة الدفع أولاً");
      return;
    }

    const onlinePaymentGateways = ["moyasar", "tabby", "tamara"];
    if (onlinePaymentGateways.includes(selectedPaymentProvider.id)) {
      setCouponMessage(
        `${selectedPaymentProvider.name} تحتاج ربط مفاتيح الدفع قبل استخدامها فعلياً. اختر الدفع عند الاستلام أو التحويل البنكي مؤقتاً.`,
      );
      return;
    }

    if (settings.checkoutEnabled === false || settings.storeStatus !== "open") {
      setCouponMessage(
        settings.maintenanceMessage ||
          "الطلبات متوقفة مؤقتًا. تواصل معنا عبر الواتساب للمساعدة.",
      );
      return;
    }

    if (minimumOrderTotal > 0 && subtotal < minimumOrderTotal) {
      setCouponMessage(
        `الحد الأدنى للطلب هو ${formatPrice(minimumOrderTotal)} ر.س`,
      );
      return;
    }

    const unavailableItem = cart.find((item) => isOutOfStock(item));
    if (unavailableItem) {
      setCouponMessage(`المنتج "${unavailableItem.name}" غير متوفر حالياً`);
      return;
    }

    const overStockItem = cart.find(
      (item) =>
        hasManagedStock(item) &&
        Number(item.qty || 0) > Number(item.stock || 0),
    );
    if (overStockItem) {
      setCouponMessage(
        `الكمية المطلوبة من "${overStockItem.name}" أكبر من المخزون المتاح`,
      );
      return;
    }

    try {
      const visitorId = localStorage.getItem("gdVisitorId");
      if (visitorId) {
        const eventTime = Date.now();
        await setDoc(
          doc(db, "liveEvents", `${visitorId}-${eventTime}`),
          {
            type: "checkout",
            title: "وصل إلى إتمام الطلب",
            path: window.location.pathname || "/checkout",
            visitorId,
            createdAtMs: eventTime,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {}

    trackFunnelStep("checkout", { cartItems: cart.length });

    const order = {
      customerId: authUser.uid,
      customerName: customer.name,
      customerEmail: customer.email || authUser.email,
      customerPhone: customer.phone,
      customerCity: customer.city,
      customerAddress: customer.address,
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        size: i.size,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
      shippingFee,
      discount,
      couponCode: appliedCoupon?.code || "",
      couponPercent: appliedCoupon?.percent || 0,
      total,
      paymentMethodId: selectedPaymentProvider.id,
      paymentMethodName: selectedPaymentProvider.name,
      paymentMode: selectedPaymentProvider.mode || "live",
      paymentStatus:
        selectedPaymentProvider.id === "cod"
          ? "cod"
          : selectedPaymentProvider.id === "bank"
            ? "awaiting_transfer"
            : "pending_payment",
      status: "new",
      orderPrefix: settings.orderPrefix || "GD",
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    };
    const orderRef = await addDoc(collection(db, "orders"), order);

    try {
      await setDoc(
        doc(db, "liveEvents", `order-${orderRef.id}`),
        {
          type: "order",
          title: `طلب جديد من ${customer.name || "عميل"}`,
          path: "/admin/orders",
          orderId: orderRef.id,
          total,
          createdAtMs: Date.now(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {}

    if (appliedCoupon?.code) {
      await setDoc(
        doc(db, "coupons", String(appliedCoupon.code).toUpperCase()),
        {
          usedBy: {
            [authUser.uid]: { orderId: orderRef.id, usedAt: serverTimestamp() },
          },
          usedEmails: {
            [authUser.email]: {
              orderId: orderRef.id,
              usedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await setDoc(
      doc(db, "customers", authUser.uid),
      {
        ...customer,
        ordersCount: Number(customer.ordersCount || 0) + 1,
        lastOrderAt: serverTimestamp(),
      },
      { merge: true },
    );

    const items = cart
      .map(
        (item) =>
          `• ${item.name}\nالحجم: ${item.size}\nالكمية: ${item.qty}\nالسعر: ${formatPrice(item.price)} ر.س`,
      )
      .join("\n\n");
    const orderNumber = `${settings.orderPrefix || "GD"}-${orderRef.id.slice(0, 6).toUpperCase()}`;
    const message = `طلب جديد من ${settings.storeName || "المتجر"}\n\nرقم الطلب: ${orderNumber}\nطريقة الدفع: ${selectedPaymentProvider.name}\n\nبيانات العميل:\nالاسم: ${customer.name}\nالجوال: ${customer.phone}\nالإيميل: ${customer.email || authUser.email}\nالمدينة: ${customer.city}\nالعنوان: ${customer.address}\n\nالمنتجات:\n${items}\n\nملخص الطلب:\nالمجموع الفرعي: ${formatPrice(subtotal)} ر.س\nالخصم: ${formatPrice(discount)} ر.س\nالشحن: ${formatPrice(shippingFee)} ر.س\nالإجمالي: ${formatPrice(total)} ر.س\n\nالرجاء تأكيد الطلب وتجهيزه.`;
    window.open(
      `https://wa.me/${settings.homeHeaderWhatsapp || STORE_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    setCartOpen(false);
  }

  const theme = {
    "--primary": settings.primaryColor,
    "--accent": settings.accentColor,
    "--bg": settings.backgroundColor,
    "--card": settings.cardColor,
    "--font": `"${settings.fontFamily}", system-ui, sans-serif`,
    "--hero-h": `${settings.heroHeight}px`,
    "--product-h": `${Math.min(
      230,
      Math.max(170, Number(settings.productImageHeight || 220)),
    )}px`,
    "--home-header-bg": settings.homeHeaderBg || "#F5F1E8",
    "--topbar-bg": settings.homeTopBarBg || "#0F3D2E",
    "--topbar-text": settings.homeTopBarText || "#FFFFFF",
  };

  return (
    <div
      className="store"
      style={theme}
      dir={siteLang === "EN" ? "ltr" : "rtl"}
    >
      {(settings.storeStatus && settings.storeStatus !== "open") ||
      settings.checkoutEnabled === false ? (
        <div className="store-operation-banner">
          <b>{settings.maintenanceTitle || "تنبيه المتجر"}</b>
          <span>
            {settings.maintenanceMessage ||
              "الطلبات متوقفة مؤقتًا. يمكنك تصفح المنتجات وسيعود استقبال الطلبات قريبًا."}
          </span>
        </div>
      ) : null}
      <Navbar
        settings={settings}
        go={go}
        siteLang={siteLang}
        setSiteLang={setSiteLang}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        langMenuOpen={langMenuOpen}
        setLangMenuOpen={setLangMenuOpen}
        authUser={authUser}
        cartCount={cartCount}
        favoritesCount={favorites.length}
        setCartOpen={setCartOpen}
        visibleHomePages={visibleHomePages}
        currentStorePage={currentStorePage}
      />

      {path.startsWith("/favorites") ? (
        <section className="container favorites-page product-section">
          <div className="products-section-head">
            <div>
              <h2>المفضلة</h2>
              <p>المنتجات التي حفظتيها تظهر هنا.</p>
            </div>
            <button type="button" onClick={() => go("/")}>
              متابعة التسوق
            </button>
          </div>
          {favoriteProducts.length ? (
            <ProductGrid
              products={favoriteProducts}
              go={go}
              addToCart={addToCart}
              favorites={favorites}
              setFavorites={setFavorites}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
            />
          ) : (
            <div className="store-products-empty">
              <b>المفضلة فارغة حالياً</b>
              <span>اضغطي على القلب في أي منتج لحفظه هنا.</span>
            </div>
          )}
        </section>
      ) : isProductPath ? (
        <ProductDetailPage
          product={currentProduct}
          products={products}
          settings={settings}
          go={go}
          addToCart={addToCart}
          setCartOpen={setCartOpen}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
        />
      ) : currentStorePage ? (
        <StoreCustomPage page={currentStorePage} products={products} go={go} />
      ) : (
        <>
          <HeroSection settings={settings} />

          <section className="container plant-categories">
            <div className="plant-section-head">
              <div>
                {plantCategoriesTitle ? <h2>{plantCategoriesTitle}</h2> : null}
              </div>
              <div
                className="plant-section-arrows"
                aria-label="تحريك أقسام النباتات"
              >
                <button
                  type="button"
                  onClick={() => movePlantCategoryCarousel("right")}
                  aria-label="تحريك الأقسام يمين"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => movePlantCategoryCarousel("left")}
                  aria-label="تحريك الأقسام يسار"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>

            <div
              ref={plantCategoryScrollerRef}
              className={`plant-category-grid ${
                plantCategoriesAutoplay ? "plant-category-grid-auto" : ""
              }`}
              onPointerDown={startPlantCategoryDrag}
              onPointerMove={movePlantCategoryDrag}
              onPointerUp={endPlantCategoryDrag}
              onPointerCancel={endPlantCategoryDrag}
              onPointerLeave={endPlantCategoryDrag}
            >
              <div className="plant-category-track">
                {visiblePlantCategories.map((plantCategory, index) => (
                  <a
                    key={`${plantCategory.title}-${index}`}
                    href={plantCategory.href || "#products"}
                    className="plant-category-card"
                    aria-hidden={
                      index >= plantCategories.length ? true : undefined
                    }
                    tabIndex={index >= plantCategories.length ? -1 : undefined}
                    onClick={handlePlantCategoryClick}
                  >
                    <img
                      src={plantCategory.image}
                      alt={plantCategory.title}
                      loading="lazy"
                      decoding="async"
                      style={{
                        "--plant-image-scale": `${Math.max(
                          0.8,
                          Math.min(
                            1.4,
                            Number(plantCategory.imageSize || 100) / 100,
                          ),
                        )}`,
                      }}
                    />
                    <div>
                      <b>{plantCategory.title}</b>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {bestSellerProducts.length ? (
            <section className="container best-sellers-section">
              <div className="plant-section-head best-sellers-head">
                <div>
                  {bestSellersTitle ? <h2>{bestSellersTitle}</h2> : null}
                </div>
                <div
                  className="plant-section-arrows"
                  aria-label="تحريك منتجات الأكثر طلبًا"
                >
                  <button
                    type="button"
                    onClick={() => moveBestSellerCarousel("right")}
                    aria-label="تحريك المنتجات يمين"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBestSellerCarousel("left")}
                    aria-label="تحريك المنتجات يسار"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
              <div
                ref={bestSellerScrollerRef}
                className="best-sellers-strip"
                onPointerDown={startBestSellerDrag}
                onPointerMove={moveBestSellerDrag}
                onPointerUp={endBestSellerDrag}
                onPointerCancel={endBestSellerDrag}
                onPointerLeave={endBestSellerDrag}
                onClickCapture={handleBestSellerClick}
              >
                <ProductGrid
                  products={bestSellerLoopProducts}
                  go={go}
                  addToCart={addToCart}
                  favorites={favorites}
                  setFavorites={setFavorites}
                  selectedSize={selectedSize}
                  setSelectedSize={setSelectedSize}
                  className="best-sellers-products-grid"
                />
              </div>
            </section>
          ) : null}

          <section
            className="container care-strip cms-care-strip"
            style={{
              backgroundImage: settings.homeCareImage
                ? `linear-gradient(135deg, rgba(15,61,46,.90), rgba(23,77,57,.82)), url(${settings.homeCareImage})`
                : undefined,
            }}
          >
            <div>
              <span>Care Guide</span>
              <h2>{settings.homeCareTitle || "عناية هادئة لنباتات تدوم"}</h2>
              <p>
                {settings.homeCareDesc ||
                  "اختر الإضاءة المناسبة، اسقِ النبات بدون إفراط، واستخدم أصيص بتصريف جيد."}
              </p>
            </div>
            <div className="care-items">
              <div>
                <b>01</b>
                <span>اختر الإضاءة المناسبة</span>
              </div>
              <div>
                <b>02</b>
                <span>اسقِ النبات بانتظام بدون إفراط</span>
              </div>
              <div>
                <b>03</b>
                <span>استخدم أصيص بتصريف جيد</span>
              </div>
            </div>
          </section>

          {careProducts.length ? (
            <section className="container best-sellers-section care-products-section">
              <div className="plant-section-head best-sellers-head">
                <div>
                  {careProductsTitle ? <h2>{careProductsTitle}</h2> : null}
                </div>
                <div
                  className="plant-section-arrows"
                  aria-label="تحريك منتجات العناية"
                >
                  <button
                    type="button"
                    onClick={() => moveCareProductsCarousel("right")}
                    aria-label="تحريك منتجات العناية يمين"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCareProductsCarousel("left")}
                    aria-label="تحريك منتجات العناية يسار"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
              <div
                ref={careProductsScrollerRef}
                className="best-sellers-strip care-products-strip"
                onPointerDown={startCareProductsDrag}
                onPointerMove={moveCareProductsDrag}
                onPointerUp={endCareProductsDrag}
                onPointerCancel={endCareProductsDrag}
                onPointerLeave={endCareProductsDrag}
                onClickCapture={handleCareProductsClick}
              >
                <ProductGrid
                  products={careLoopProducts}
                  go={go}
                  addToCart={addToCart}
                  favorites={favorites}
                  setFavorites={setFavorites}
                  selectedSize={selectedSize}
                  setSelectedSize={setSelectedSize}
                  className="best-sellers-products-grid care-products-grid"
                />
              </div>
            </section>
          ) : null}

          <section
            className="container promo"
            style={{
              backgroundImage:
                settings.homeOfferImage || settings.bannerImage
                  ? `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${settings.homeOfferImage || settings.bannerImage})`
                  : undefined,
            }}
          >
            <div>
              <span>Exclusive Campaign</span>
              <h2>{settings.homeOfferTitle || settings.bannerTitle}</h2>
              <p>{settings.homeOfferDesc || settings.bannerSubtitle}</p>
            </div>
          </section>

          <section id="products" className="container product-section">
            {visibleProducts.length ? (
              <>
                <div className="products-section-head">
                  <div>
                    <h2>
                      {settings.homeProductsTitle ||
                        "نباتات نادرة ومنتجات فاخرة مختارة بعناية"}
                    </h2>
                    <p>
                      {settings.homeProductsDesc ||
                        "منتجات مختارة بعناية لتناسب المنزل والمكتب والهدايا."}
                    </p>
                  </div>
                  {visibleProducts.length > homeProducts.length ? (
                    <button type="button" onClick={() => go("/page/products")}>
                      عرض الكل
                    </button>
                  ) : null}
                </div>
                <ProductGrid
                  products={homeProducts}
                  go={go}
                  addToCart={addToCart}
                  favorites={favorites}
                  setFavorites={setFavorites}
                  selectedSize={selectedSize}
                  setSelectedSize={setSelectedSize}
                  className="home-products-grid"
                />
              </>
            ) : (
              <div className="store-products-empty">
                <b>لا توجد منتجات ظاهرة حالياً</b>
                <span>أضف منتجات أو فعّل ظهور المنتجات من لوحة التحكم.</span>
              </div>
            )}
          </section>
        </>
      )}

      <Footer
        settings={settings}
        go={go}
        visibleHomePages={visibleHomePages}
      />

      {cartOpen && (
        <CartDrawer
          cart={cart}
          setCart={setCart}
          setCartOpen={setCartOpen}
          authUser={authUser}
          customer={customer}
          hasManagedStock={hasManagedStock}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          applyCoupon={applyCoupon}
          couponMessage={couponMessage}
          appliedCoupon={appliedCoupon}
          removeCoupon={removeCoupon}
          subtotal={subtotal}
          discount={discount}
          shippingFee={shippingFee}
          total={total}
          checkoutWhatsApp={checkoutWhatsApp}
          paymentProviders={availablePaymentProviders}
          selectedPaymentId={selectedPaymentId}
          setSelectedPaymentId={setSelectedPaymentId}
          selectedPaymentProvider={selectedPaymentProvider}
        />
      )}
    </div>
  );
}


export default Store;
