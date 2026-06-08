import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Lock,
  TrendingUp,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import {
  formatOrderDate,
  formatPrice,
  makePageSlug,
  orderTimestamp,
  uid,
} from "../../utils/helpers.js";
import {
  ADMIN_PERMISSION_LABELS,
  isStaffDeleted,
  isStaffDisabled,
  normalizeStaffPermissions,
} from "../../data/adminPermissions.js";
import { fileToDataUrl } from "../../utils/media.js";
import AdminDashboardPanel from "./AdminDashboardPanel.jsx";
import AdminDashboardHeader from "./AdminDashboardHeader.jsx";
import AdminProductsList from "./AdminProductsList.jsx";
import AdminSaveBar from "./AdminSaveBar.jsx";
import AdminSidebar from "./AdminSidebar.jsx";
import AdminNotificationsPanel from "./AdminNotificationsPanel.jsx";
import AdminSettingsPanel from "./AdminSettingsPanel.jsx";
import StaffUsersPanel from "./StaffUsersPanel.jsx";
import CustomersPanel from "./CustomersPanel.jsx";
import CouponsPanel from "./CouponsPanel.jsx";
import HomepagePanel from "./HomepagePanel.jsx";
import IdentityPanel from "./IdentityPanel.jsx";
import OrdersPanel from "./OrdersPanel.jsx";
import PaymentsPanel from "./PaymentsPanel.jsx";
import ProductEditorModal from "./ProductEditorModal.jsx";
import ProductsCommandCenter from "./ProductsCommandCenter.jsx";
import ReportsPanel from "./ReportsPanel.jsx";
import { titleFor } from "./AdminUi.jsx";
import { expandPermissionsForNewTabs, tabPermission } from "./adminAccess.js";
import { adminI18n } from "./adminI18n.js";
import {
  buildReportCityRows,
  buildReportSalesRows,
  buildReportStatusRows,
  reportStatusLabels,
} from "./adminReportUtils.js";
import { adminTabFromPath } from "./adminRoutes.js";
import {
  filterAdminProducts,
  getAdminProductCategories,
  normalizeExcelProduct,
  productHasManagedStock,
  productIsLowStock,
  productPreviewFromProduct,
  productStockValue,
} from "./adminProductUtils.js";
import {
  productTemplateHelpRows,
  productTemplateRows,
} from "./productExcelTemplate.js";
import { themeSections } from "./themeSections.js";

function Admin({
  settings,
  setSettings,
  products,
  customers,
  orders,
  coupons = [],
  go,
  path = "/admin",
}) {
  const [tab, setTab] = useState(() => adminTabFromPath(path));
  const [openSection, setOpenSection] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(true);
  const [adminLanguage, setAdminLanguage] = useState(
    () => localStorage.getItem("adminLanguage") || "ar",
  );
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [productsViewMode, setProductsViewMode] = useState(
    () => localStorage.getItem("productsViewMode") || "cards",
  );

  useEffect(() => {
    const nextTab = adminTabFromPath(path);
    setTab((current) => (current === nextTab ? current : nextTab));
  }, [path]);

  const t = (key) =>
    adminI18n[adminLanguage]?.[key] || adminI18n.ar[key] || key;
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [draftSettings, setDraftSettings] = useState(settings);
  const [imagePreview, setImagePreview] = useState(editing?.image || "");
  const [productPreview, setProductPreview] = useState({
    name: "",
    description: "",
    brand: "",
    category: "نباتات داخلية",
    price: "",
    oldPrice: "",
    stock: "",
    sku: "",
    status: "active",
    rating: 4.8,
    tag: "Rare",
    sizes: "صغير,متوسط,كبير",
    colors: "",
    featured: false,
    seoSlug: "",
    seoTitle: "",
    seoDescription: "",
    image: "",
  });
  const [galleryImages, setGalleryImages] = useState([]);
  const [pendingImport, setPendingImport] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSort, setProductSort] = useState("newest");
  const [productOptions, setProductOptions] = useState([
    { size: "", color: "", stock: "", price: "", sku: "" },
  ]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productFormTab, setProductFormTab] = useState("info");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [liveVisitorRows, setLiveVisitorRows] = useState([]);
  const [showLiveVisitors, setShowLiveVisitors] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [funnelStats, setFunnelStats] = useState({
    visit_store: 0,
    view_product: 0,
    add_to_cart: 0,
    checkout: 0,
    purchase: 0,
  });
  const [staffUsers, setStaffUsers] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationState, setNotificationState] = useState({ readKeys: {} });
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return window.Notification.permission;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "staffUsers"),
      async (snapshot) => {
        if (snapshot.empty) {
          const currentAdmin = auth.currentUser;
          if (currentAdmin?.uid) {
            await setDoc(
              doc(db, "staffUsers", currentAdmin.uid),
              {
                name: currentAdmin.displayName || "مالك المتجر",
                email: currentAdmin.email || "",
                phone: "",
                role: "owner",
                permissions: Object.keys(ADMIN_PERMISSION_LABELS),
                status: "active",
                isOwner: true,
                lastLogin: Date.now(),
                createdAtMs: Date.now(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
          setStaffUsers([]);
          return;
        }

        const rows = snapshot.docs
          .map((staffDoc) => ({ id: staffDoc.id, ...(staffDoc.data() || {}) }))
          .filter((staffUser) => !isStaffDeleted(staffUser))
          .sort((a, b) => {
            if (a.isOwner && !b.isOwner) return -1;
            if (!a.isOwner && b.isOwner) return 1;
            return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
          });

        setStaffUsers(rows);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "liveVisitors"),
      (snapshot) => {
        const now = Date.now();
        const rows = snapshot.docs
          .map((visitorDoc) => ({
            id: visitorDoc.id,
            ...(visitorDoc.data() || {}),
          }))
          .filter((visitor) => Number(visitor.lastSeen || 0) > now - 60000)
          .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));

        setLiveVisitorRows(rows);
        setLiveVisitors(rows.length);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "liveEvents"), (snapshot) => {
      const since = Date.now() - 1000 * 60 * 60 * 6;
      const rows = snapshot.docs
        .map((eventDoc) => ({ id: eventDoc.id, ...(eventDoc.data() || {}) }))
        .filter((event) => Number(event.createdAtMs || 0) > since)
        .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
        .slice(0, 12);

      setLiveEvents(rows);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "store", "notificationState"), (snap) => {
      setNotificationState(
        snap.exists() ? { readKeys: {}, ...(snap.data() || {}) } : { readKeys: {} },
      );
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setBrowserPermission(window.Notification.permission);
  }, [settings.notificationsBrowser]);

  useEffect(() => {
    if (notificationFilter === "unread") return;
    const validFilters = ["all", "orders", "stock", "customers", "live", "system"];
    if (!validFilters.includes(notificationFilter)) setNotificationFilter("all");
  }, [notificationFilter]);

  useEffect(() => {
    const count = Number(notificationState?.lastUnreadCount || 0);
    if (!count) return;
    document.title = `(${count}) ${settings?.storeName || "GREEN DIXAM"}`;
    return () => {
      document.title = settings?.storeName || "GREEN DIXAM";
    };
  }, [notificationState?.lastUnreadCount, settings?.storeName]);

  useEffect(() => {
    setDoc(
      doc(db, "store", "notificationState"),
      { lastSeenAtMs: Date.now() },
      { merge: true },
    ).catch(() => {});
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setDoc(
        doc(db, "store", "notificationState"),
        { adminOnline: navigator.onLine, updatedAtMs: Date.now() },
        { merge: true },
      ).catch(() => {});
    };

    if (typeof window === "undefined") return undefined;
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "funnelEvents"),
      (snapshot) => {
        const stats = {
          visit_store: 0,
          view_product: 0,
          add_to_cart: 0,
          checkout: 0,
          purchase: 0,
        };

        snapshot.docs.forEach((eventDoc) => {
          const data = eventDoc.data() || {};
          if (stats[data.step] !== undefined) {
            stats[data.step] += 1;
          }
        });

        setFunnelStats(stats);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setImagePreview(editing?.image || "");
    setProductPreview(productPreviewFromProduct(editing));
    setGalleryImages(Array.isArray(editing?.gallery) ? editing.gallery : []);
    const currentOptions =
      Array.isArray(editing?.options) && editing.options.length
        ? editing.options
        : [{ size: "", color: "", stock: "", price: "", sku: "" }];
    setProductOptions(
      currentOptions.map((option) => ({
        size: option.size || "",
        color: option.color || "",
        stock: option.stock ?? "",
        price: option.price ?? "",
        oldPrice: option.oldPrice ?? "",
        sku: option.sku || "",
      })),
    );
  }, [editing]);

  const updateDraft = (key, value) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraftSettings = async () => {
    const ok = await saveSettings(draftSettings);
    if (ok) setDraftSettings((prev) => ({ ...prev }));
  };

  const resetDraftSettings = () => {
    setDraftSettings(settings);
    setNotice("تم إلغاء التغييرات غير المحفوظة");
    setTimeout(() => setNotice(""), 1800);
  };

  const adminProductCategories = useMemo(
    () => getAdminProductCategories(products),
    [products],
  );
  const filteredAdminProducts = filterAdminProducts({
    productCategoryFilter,
    products,
    productSearch,
    productSort,
    productStatusFilter,
  });

  const toggleProductSelection = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllVisibleProducts = () => {
    const visibleIds = filteredAdminProducts.map((product) => product.id);
    const allSelected =
      visibleIds.length &&
      visibleIds.every((id) => selectedProducts.includes(id));

    setSelectedProducts((prev) => {
      if (allSelected) return prev.filter((id) => !visibleIds.includes(id));
      return [...new Set([...prev, ...visibleIds])];
    });
  };

  const clearProductSelection = () => setSelectedProducts([]);

  const bulkUpdateProducts = async (patch, successMessage) => {
    if (!selectedProducts.length) return;

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          setDoc(doc(db, "products", id), patch, { merge: true }),
        ),
      );
      setNotice(successMessage);
      setTimeout(() => setNotice(""), 2600);
      clearProductSelection();
    } catch (error) {
      console.error("Bulk update products failed:", error);
      setNotice("تعذر تنفيذ العملية على المنتجات المحددة");
      setTimeout(() => setNotice(""), 3500);
    }
  };

  const deleteSelectedProducts = async () => {
    if (!selectedProducts.length) return;

    const ok = window.confirm(
      `هل أنت متأكد من حذف ${selectedProducts.length} منتج محدد؟`,
    );
    if (!ok) return;

    try {
      await Promise.all(
        selectedProducts.map((id) => deleteDoc(doc(db, "products", id))),
      );
      setNotice("تم حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 2600);
      clearProductSelection();
    } catch (error) {
      console.error("Delete selected products failed:", error);
      setNotice("تعذر حذف المنتجات المحددة");
      setTimeout(() => setNotice(""), 3500);
    }
  };

  const deleteProduct = async (product) => {
    if (!product?.id) return;

    const ok = window.confirm(
      `هل أنت متأكد من حذف المنتج: ${product.name || "بدون اسم"}؟`,
    );
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      setEditing((current) => (current?.id === product.id ? null : current));
      setSelectedProducts((prev) => prev.filter((id) => id !== product.id));
      setNotice("تم حذف المنتج بنجاح");
      setTimeout(() => setNotice(""), 2400);
    } catch (error) {
      console.error("Delete product failed:", error);
      setNotice(
        "تعذر حذف المنتج. تأكد من الاتصال والصلاحيات ثم حاول مرة أخرى.",
      );
      setTimeout(() => setNotice(""), 4000);
    }
  };

  const duplicateProduct = async (product) => {
    const id = uid();
    const copy = {
      ...product,
      name: `${product.name || "منتج"} - نسخة`,
      sku: product.sku ? `${product.sku}-COPY` : "",
      status: "hidden",
      featured: false,
      order: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    delete copy.id;

    try {
      await setDoc(doc(db, "products", id), copy, { merge: true });
      setNotice("تم نسخ المنتج وحفظه كمخفي");
      setTimeout(() => setNotice(""), 2600);
    } catch (error) {
      console.error("Duplicate product failed:", error);
      setNotice("تعذر نسخ المنتج");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const reorderProducts = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const current = [...filteredAdminProducts];
    const fromIndex = current.findIndex((product) => product.id === sourceId);
    const toIndex = current.findIndex((product) => product.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        current.map((product, index) =>
          setDoc(
            doc(db, "products", product.id),
            { order: index + 1, updatedAt: serverTimestamp() },
            { merge: true },
          ),
        ),
      );
      setProductSort("custom");
      setNotice("تم ترتيب المنتجات");
      setTimeout(() => setNotice(""), 1800);
    } catch (error) {
      console.error("Reorder products failed:", error);
      setNotice("تعذر حفظ ترتيب المنتجات");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const deleteAllProducts = async () => {
    if (!products.length) {
      setNotice("لا توجد منتجات لحذفها");
      setTimeout(() => setNotice(""), 2200);
      return;
    }

    const ok = window.confirm(
      `هل أنت متأكد من حذف كل المنتجات؟ سيتم حذف ${products.length} منتج نهائيًا.`,
    );
    if (!ok) return;

    try {
      await Promise.all(
        products.map((product) => deleteDoc(doc(db, "products", product.id))),
      );
      setEditing(null);
      setImagePreview("");
      setGalleryImages([]);
      clearProductSelection();
      setNotice("تم حذف كل المنتجات بنجاح");
      setTimeout(() => setNotice(""), 3000);
    } catch (error) {
      console.error("Delete all products failed:", error);
      setNotice("تعذر حذف كل المنتجات. حاول مرة أخرى.");
      setTimeout(() => setNotice(""), 4000);
    }
  };

  const saveSettings = async (patch) => {
    try {
      await setDoc(
        doc(db, "store", "settings"),
        { ...settings, ...patch },
        { merge: true },
      );
      setSettings((s) => ({ ...s, ...patch }));
      setNotice("تم حفظ التغييرات بنجاح");
      setTimeout(() => setNotice(""), 2200);
      return true;
    } catch (error) {
      console.error("Save settings failed:", error);
      setNotice(
        "تعذر الحفظ. غالبًا حجم الصورة كبير، جرّب شعار أصغر أو ارفعه مرة ثانية.",
      );
      setTimeout(() => setNotice(""), 5000);
      return false;
    }
  };

  const uploadSettingImage = async (key, file) => {
    if (!file) return;

    if (key === "homeHeroVideo") {
      const maxVideoSize = 750 * 1024;
      if (file.size > maxVideoSize) {
        setNotice(
          "حجم الفيديو كبير جدًا للرفع المباشر. استخدم رابط فيديو خارجي أو ارفع فيديو أقل من 750KB.",
        );
        setTimeout(() => setNotice(""), 6000);
        return;
      }
    }

    const data = await fileToDataUrl(
      file,
      key === "logo"
        ? {
            maxWidth: 520,
            maxHeight: 220,
            quality: 0.78,
          }
        : {
            maxWidth: 1400,
            maxHeight: 900,
            quality: 0.82,
          },
    );
    updateDraft(key, data);
  };

  const uploadGalleryImages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      const uploaded = [];
      for (const file of files) {
        const data = await fileToDataUrl(file, {
          maxWidth: 1200,
          maxHeight: 1000,
          quality: 0.82,
        });
        uploaded.push(data);
      }

      setGalleryImages((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Upload gallery failed:", error);
      setNotice("تعذر رفع صور المعرض");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const makeGalleryImagePrimary = (image) => {
    setImagePreview(image);
  };

  const updateProductOption = (index, key, value) => {
    setProductOptions((prev) =>
      prev.map((option, i) =>
        i === index ? { ...option, [key]: value } : option,
      ),
    );
  };

  const addProductOption = () => {
    setProductOptions((prev) => [
      ...prev,
      { size: "", color: "", stock: "", price: "", sku: "" },
    ]);
  };

  const removeProductOption = (index) => {
    setProductOptions((prev) =>
      prev.length > 1
        ? prev.filter((_, i) => i !== index)
        : [{ size: "", color: "", stock: "", price: "", sku: "" }],
    );
  };

  const resetProductEditor = () => {
    setEditing(null);
    setImagePreview("");
    setProductPreview(productPreviewFromProduct(null));
    setGalleryImages([]);
    setProductOptions([{ size: "", color: "", stock: "", price: "", sku: "" }]);
    setProductFormTab("info");
    setProductModalOpen(false);
  };

  const openProductEditor = (product = null) => {
    setEditing(product);
    setImagePreview(product?.image || "");
    setProductPreview(productPreviewFromProduct(product));
    setProductFormTab("info");
    setProductModalOpen(true);
  };

  const updateProductPreviewFromField = (name, value) => {
    if (!name || name === "imageFile") return;
    setProductPreview((prev) => ({ ...prev, [name]: value }));
    if (name === "imageUrl") {
      setImagePreview(value);
      setProductPreview((prev) => ({ ...prev, image: value }));
    }
  };

  const updateProductPreviewFromForm = (event) => {
    const target = event.target;
    if (!target?.name) return;
    updateProductPreviewFromField(
      target.name,
      target.type === "checkbox" ? target.checked : target.value,
    );
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const f = e.target;
    const productName = f.name.value.trim();
    const productPrice = Number(f.price.value);
    const productRating = Number(f.rating.value || 5);

    if (!productName) {
      setNotice("اكتب اسم المنتج أولاً");
      setProductFormTab("info");
      setTimeout(() => setNotice(""), 2600);
      return;
    }

    if (!Number.isFinite(productPrice) || productPrice <= 0) {
      setNotice("اكتب سعر المنتج بشكل صحيح");
      setProductFormTab("pricing");
      setTimeout(() => setNotice(""), 2600);
      return;
    }

    if (!Number.isFinite(productRating) || productRating < 0 || productRating > 5) {
      setNotice("التقييم يجب أن يكون بين 0 و 5");
      setProductFormTab("pricing");
      setTimeout(() => setNotice(""), 2600);
      return;
    }

    let image = f.imageUrl.value.trim();
    if (f.imageFile.files[0])
      image = await fileToDataUrl(f.imageFile.files[0], {
        maxWidth: 1100,
        maxHeight: 900,
        quality: 0.82,
      });
    const id = editing?.id || uid();
    const cleanOptions = productOptions
      .map((option) => ({
        size: String(option.size || "").trim(),
        color: String(option.color || "").trim(),
        stock: option.stock === "" ? "" : Number(option.stock || 0),
        price: option.price === "" ? "" : Number(option.price || 0),
        oldPrice:
          option.oldPrice === "" || option.oldPrice == null
            ? ""
            : Number(option.oldPrice || 0),
        sku: String(option.sku || "").trim(),
      }))
      .filter(
        (option) =>
          option.size ||
          option.color ||
          option.stock !== "" ||
          option.price !== "" ||
          option.oldPrice !== "" ||
          option.sku,
      );

    const sizes = cleanOptions.length
      ? [...new Set(cleanOptions.map((option) => option.size).filter(Boolean))]
      : String(f.sizes.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    const colors = cleanOptions.length
      ? [...new Set(cleanOptions.map((option) => option.color).filter(Boolean))]
      : String(f.colors.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    const gallery = [
      ...new Set(
        [image || editing?.image || "", ...galleryImages].filter(Boolean),
      ),
    ];

    const product = {
      name: productName,
      brand: f.brand.value.trim(),
      category: f.category.value.trim(),
      price: productPrice,
      oldPrice: Number(f.oldPrice.value || f.price.value),
      rating: productRating,
      sizes,
      colors,
      options: cleanOptions,
      tag: f.tag.value.trim(),
      description: f.description.value.trim(),
      seoSlug: makePageSlug(
        f.seoSlug?.value?.trim() || productName || id,
        id,
      ),
      seoTitle: f.seoTitle?.value?.trim() || "",
      seoDescription: f.seoDescription?.value?.trim() || "",
      stock: f.stock.value === "" ? "" : Number(f.stock.value || 0),
      sku: f.sku.value.trim(),
      status: f.status.value,
      featured: editing?.featured || false,
      image: image || editing?.image || "",
      gallery,
      order: editing?.order ?? Date.now(),
      createdAt: editing?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "products", id), product, { merge: true });
    setNotice(editing ? "تم تعديل المنتج بنجاح" : "تم إضافة المنتج بنجاح");
    setTimeout(() => setNotice(""), 2200);
    resetProductEditor();
    f.reset();
    setTab("products");
  };

  const downloadProductsTemplate = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(productTemplateRows);
    const help = XLSX.utils.aoa_to_sheet(productTemplateHelpRows);
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.utils.book_append_sheet(wb, help, "Instructions");
    XLSX.writeFile(wb, "green-dixam-products-template.xlsx");
  };

  const importProductsFromExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const productsToImport = rows.map(normalizeExcelProduct).filter(Boolean);

      if (!productsToImport.length) {
        setNotice("لم يتم العثور على منتجات صالحة داخل ملف Excel");
        setTimeout(() => setNotice(""), 3500);
        return;
      }

      setPendingImport(productsToImport);
      setNotice(
        `تم تجهيز ${productsToImport.length} منتج للمعاينة. اضغط حفظ المنتجات المستوردة للتأكيد.`,
      );
      setTimeout(() => setNotice(""), 4500);
      event.target.value = "";
    } catch (error) {
      console.error("Excel import failed:", error);
      setNotice("تعذر قراءة الملف. تأكد أنه ملف Excel وبنفس قالب الأعمدة.");
      setTimeout(() => setNotice(""), 5000);
    }
  };

  const savePendingImport = async () => {
    if (!pendingImport.length) {
      setNotice("لا توجد منتجات مستوردة للحفظ");
      setTimeout(() => setNotice(""), 2500);
      return;
    }

    try {
      for (const product of pendingImport) {
        const id = product.sku || uid();
        await setDoc(
          doc(db, "products", String(id)),
          { ...product, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }

      setNotice(`تم حفظ ${pendingImport.length} منتج في المتجر`);
      setPendingImport([]);
      setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      console.error("Save pending import failed:", error);
      setNotice("تعذر حفظ المنتجات المستوردة. حاول مرة أخرى.");
      setTimeout(() => setNotice(""), 5000);
    }
  };

  const clearPendingImport = () => {
    setPendingImport([]);
    setNotice("تم إلغاء المنتجات المستوردة غير المحفوظة");
    setTimeout(() => setNotice(""), 2500);
  };

  const saveCoupon = async (e) => {
    e.preventDefault();
    const f = e.target;
    const code = String(f.code.value || "")
      .trim()
      .toUpperCase();
    const percent = Number(f.percent.value || 0);
    const expiresAt = f.expiresAt.value || "";

    if (!code || percent <= 0 || percent > 100) {
      setNotice("تأكد من إدخال كود صحيح ونسبة بين 1 و 100");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    await setDoc(
      doc(db, "coupons", code),
      {
        code,
        percent,
        active: f.active.checked,
        usage: "once_per_customer",
        type: "percent",
        expiresAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setNotice("تم حفظ الكوبون");
    setTimeout(() => setNotice(""), 2500);
    f.reset();
  };

  const toggleCoupon = async (coupon) => {
    await setDoc(
      doc(db, "coupons", coupon.id),
      {
        active: !coupon.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const dashboardOrders = orders.map((o) => ({
    ...o,
    total: Number(o.total || 0),
    items: o.items || [],
  }));

  const todayOrders = dashboardOrders.filter(
    (o) => orderTimestamp(o.createdAt) >= todayStart.getTime(),
  );
  const weekOrders = dashboardOrders.filter(
    (o) => orderTimestamp(o.createdAt) >= weekStart.getTime(),
  );
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSales = dashboardOrders.reduce((sum, o) => sum + o.total, 0);

  const productSalesMap = {};
  dashboardOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.name || "منتج غير معروف";
      if (!productSalesMap[key])
        productSalesMap[key] = {
          name: key,
          qty: 0,
          value: 0,
          image: item.image || "",
        };
      productSalesMap[key].qty += Number(item.qty || 1);
      productSalesMap[key].value +=
        Number(item.price || 0) * Number(item.qty || 1);
      if (!productSalesMap[key].image && item.image)
        productSalesMap[key].image = item.image;
    });
  });

  const topProduct = Object.values(productSalesMap).sort(
    (a, b) => b.qty - a.qty,
  )[0];

  const adminBestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const pendingOrdersCount = dashboardOrders.filter((o) =>
    ["new", "processing"].includes(o.status || "new"),
  ).length;
  const lowStockProducts = products.filter((p) => productIsLowStock(p, 3));
  const activeProductsCount = products.filter(
    (p) => p.status !== "hidden",
  ).length;
  const averageOrderValue = dashboardOrders.length
    ? Math.round(totalSales / dashboardOrders.length)
    : 0;

  const reportStatusRows = buildReportStatusRows(dashboardOrders);
  const reportCityRows = buildReportCityRows(dashboardOrders);
  const reportSalesRows = buildReportSalesRows(dashboardOrders);

  const maxReportSales = Math.max(
    ...reportSalesRows.map((row) => row.value),
    1,
  );
  const newCustomersCount = customers.filter(
    (customer) => orderTimestamp(customer.createdAt) >= weekStart.getTime(),
  ).length;
  const usedCouponsCount = coupons.reduce(
    (sum, coupon) => sum + Object.keys(coupon.usedBy || {}).length,
    0,
  );

  const exportReportsCsv = () => {
    const headers = ["metric", "value"];
    const rows = [
      ["total_sales", totalSales],
      ["today_sales", todaySales],
      ["total_orders", dashboardOrders.length],
      ["week_orders", weekOrders.length],
      ["average_order", averageOrderValue],
      ["pending_orders", pendingOrdersCount],
      ["low_stock_products", lowStockProducts.length],
      ["new_customers_week", newCustomersCount],
      ["coupon_uses", usedCouponsCount],
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `green-dixam-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("تم تصدير تقرير الأداء");
    setTimeout(() => setNotice(""), 2200);
  };
  const adminHealthCards = [
    {
      label: "طلبات تحتاج متابعة",
      value: pendingOrdersCount,
      tone: pendingOrdersCount ? "warning" : "good",
      icon: <Bell size={18} />,
    },
    {
      label: "منتجات منخفضة المخزون",
      value: lowStockProducts.length,
      tone: lowStockProducts.length ? "warning" : "good",
      icon: <AlertTriangle size={18} />,
    },
    {
      label: "منتجات ظاهرة",
      value: activeProductsCount,
      tone: "neutral",
      icon: <CheckCircle2 size={18} />,
    },
    {
      label: "متوسط الطلب",
      value: `${formatPrice(averageOrderValue)} ر.س`,
      tone: "neutral",
      icon: <TrendingUp size={18} />,
    },
  ];

  const livePageStats = liveVisitorRows.reduce((acc, visitor) => {
    const key = visitor.path || "/";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topLivePages = Object.entries(livePageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sourceStats = liveVisitorRows.reduce((acc, visitor) => {
    const key = visitor.source || "مباشر";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topSources = Object.entries(sourceStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const averageSessionDuration = liveVisitorRows.length
    ? Math.round(
        liveVisitorRows.reduce(
          (sum, visitor) => sum + Number(visitor.sessionDuration || 0),
          0,
        ) / liveVisitorRows.length,
      )
    : 0;

  const notificationReadKeys = notificationState?.readKeys || {};
  const lowStockThreshold = Math.max(0, Number(settings.lowStockThreshold ?? 3));
  const highValueOrderThreshold = Math.max(
    0,
    Number(settings.highValueOrderThreshold || 500),
  );
  const notificationItems = useMemo(() => {
    const items = [];
    const now = Date.now();
    const readMap = notificationReadKeys || {};
    const enabled = (key) => settings[key] !== false;

    if (enabled("notifyNewOrders")) {
      dashboardOrders
        .filter((order) => ["new", "processing"].includes(order.status || "new"))
        .slice(0, 30)
        .forEach((order) => {
          const time = orderTimestamp(order.createdAt) || now;
          const isNew = (order.status || "new") === "new";
          items.push({
            key: `order-${order.id}`,
            type: "orders",
            tone: isNew ? "urgent" : "warning",
            title: isNew ? "طلب جديد يحتاج تأكيد" : "طلب قيد التجهيز",
            message: `${order.customerName || order.name || "عميل"} - ${formatPrice(order.total)} ر.س`,
            meta: formatOrderDate(order.createdAt),
            time,
            icon: "order",
            actionLabel: "فتح الطلبات",
            tab: "orders",
          });
        });
    }

    if (enabled("notifyHighValueOrders") && highValueOrderThreshold > 0) {
      dashboardOrders
        .filter((order) => Number(order.total || 0) >= highValueOrderThreshold)
        .slice(0, 12)
        .forEach((order) => {
          const time = orderTimestamp(order.createdAt) || now;
          items.push({
            key: `high-order-${order.id}`,
            type: "orders",
            tone: "success",
            title: "طلب بقيمة عالية",
            message: `${order.customerName || order.name || "عميل"} وصل إلى ${formatPrice(order.total)} ر.س`,
            meta: `الحد: ${formatPrice(highValueOrderThreshold)} ر.س`,
            time,
            icon: "trend",
            actionLabel: "مراجعة الطلب",
            tab: "orders",
          });
        });
    }

    if (enabled("notifyLowStock")) {
      products
        .filter((product) => productIsLowStock(product, lowStockThreshold))
        .sort((a, b) => productStockValue(a) - productStockValue(b))
        .slice(0, 20)
        .forEach((product, index) => {
          const stock = productStockValue(product);
          items.push({
            key: `stock-${product.id}`,
            type: "stock",
            tone: stock <= 0 ? "danger" : "warning",
            title: stock <= 0 ? "منتج نفد من المخزون" : "مخزون منخفض",
            message: `${product.name || "منتج"} - المتبقي ${stock}`,
            meta: product.category || "المنتجات",
            time: orderTimestamp(product.updatedAt) || now - 1000 * (index + 1),
            icon: "stock",
            actionLabel: "فتح المنتجات",
            tab: "products",
          });
        });
    }

    if (enabled("notifyCustomers")) {
      customers
        .filter((customer) => orderTimestamp(customer.createdAt) >= weekStart.getTime())
        .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt))
        .slice(0, 12)
        .forEach((customer) => {
          const time = orderTimestamp(customer.createdAt) || now;
          items.push({
            key: `customer-${customer.id}`,
            type: "customers",
            tone: "neutral",
            title: "عميل جديد سجّل في المتجر",
            message: customer.name || customer.email || "عميل جديد",
            meta: formatOrderDate(customer.createdAt),
            time,
            icon: "customer",
            actionLabel: "فتح العملاء",
            tab: "customers",
          });
        });
    }

    if (enabled("notifyLiveEvents")) {
      liveEvents.slice(0, 15).forEach((event) => {
        const time = Number(event.createdAtMs || 0) || now;
        items.push({
          key: `live-${event.id}`,
          type: "live",
          tone: event.type === "checkout" ? "urgent" : "neutral",
          title: event.title || "نشاط مباشر في المتجر",
          message: event.path || "/",
          meta: event.type === "cart" ? "سلة" : event.type === "checkout" ? "إتمام طلب" : "مباشر",
          time,
          icon: "live",
          actionLabel: "فتح لوحة التحكم",
          tab: "dashboard",
        });
      });
    }

    if (settings.storeStatus && settings.storeStatus !== "open") {
      items.push({
        key: `system-store-${settings.storeStatus}`,
        type: "system",
        tone: "danger",
        title: "حالة المتجر ليست مفتوحة",
        message:
          settings.storeStatus === "maintenance"
            ? "المتجر في وضع الصيانة"
            : "الطلبات متوقفة مؤقتًا",
        meta: "الإعدادات",
        time: now,
        icon: "system",
        actionLabel: "فتح الإعدادات",
        tab: "settings",
      });
    }

    return items
      .map((item) => ({ ...item, read: Boolean(readMap[item.key]) }))
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
  }, [
    dashboardOrders,
    products,
    customers,
    liveEvents,
    settings.notifyNewOrders,
    settings.notifyHighValueOrders,
    settings.notifyLowStock,
    settings.notifyCustomers,
    settings.notifyLiveEvents,
    settings.storeStatus,
    settings.lowStockThreshold,
    settings.highValueOrderThreshold,
    notificationReadKeys,
    weekStart,
  ]);

  const unreadNotificationsCount = notificationItems.filter((item) => !item.read).length;
  const notificationCounts = notificationItems.reduce(
    (acc, item) => {
      acc.all += 1;
      acc[item.type] = (acc[item.type] || 0) + 1;
      if (!item.read) acc.unread += 1;
      return acc;
    },
    { all: 0, unread: 0 },
  );
  const filteredNotificationItems = notificationItems.filter((item) => {
    if (notificationFilter === "all") return true;
    if (notificationFilter === "unread") return !item.read;
    return item.type === notificationFilter;
  });

  useEffect(() => {
    setDoc(
      doc(db, "store", "notificationState"),
      {
        lastUnreadCount: unreadNotificationsCount,
        lastNotificationAtMs: notificationItems[0]?.time || 0,
        updatedAtMs: Date.now(),
      },
      { merge: true },
    ).catch(() => {});
  }, [unreadNotificationsCount, notificationItems[0]?.time]);

  const saveNotificationState = async (patch) => {
    try {
      await setDoc(
        doc(db, "store", "notificationState"),
        { ...patch, updatedAt: serverTimestamp(), updatedAtMs: Date.now() },
        { merge: true },
      );
    } catch (error) {
      console.error("Save notification state failed:", error);
      setNotice("تعذر تحديث حالة الإشعارات");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const markNotificationRead = async (key) => {
    if (!key) return;
    await saveNotificationState({
      readKeys: { ...notificationReadKeys, [key]: Date.now() },
    });
  };

  const markAllNotificationsRead = async () => {
    const nextReadKeys = { ...notificationReadKeys };
    notificationItems.forEach((item) => {
      nextReadKeys[item.key] = nextReadKeys[item.key] || Date.now();
    });
    await saveNotificationState({ readKeys: nextReadKeys });
    setNotice("تم تعليم كل الإشعارات كمقروءة");
    setTimeout(() => setNotice(""), 2200);
  };

  const clearNotificationReads = async () => {
    await saveNotificationState({ readKeys: {} });
    setNotice("تم إعادة إظهار الإشعارات كمستجدة");
    setTimeout(() => setNotice(""), 2200);
  };

  const requestBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotice("المتصفح لا يدعم إشعارات سطح المكتب");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      await saveSettings({ notificationsBrowser: true });
      new window.Notification(settings.storeName || "GREEN DIXAM", {
        body: "تم تفعيل إشعارات المتصفح للوحة التحكم",
      });
      setNotice("تم تفعيل إشعارات المتصفح");
    } else {
      await saveSettings({ notificationsBrowser: false });
      setNotice("لم يتم السماح بإشعارات المتصفح");
    }
    setTimeout(() => setNotice(""), 3000);
  };

  const selectedThemeSection = themeSections.find(
    (section) => section.id === openSection,
  );
  const goToThemeSection = (sectionId) => {
    setTab("homepage");
    setOpenSection(sectionId);
    setThemeMenuOpen(true);
  };
  const changeAdminLanguage = (language) => {
    setAdminLanguage(language);
    localStorage.setItem("adminLanguage", language);
    setLanguageMenuOpen(false);
    setNotice(
      language === "ar"
        ? "تم اختيار اللغة العربية"
        : "English language selected",
    );
    setTimeout(() => setNotice(""), 1800);
  };

  const changeProductsViewMode = (mode) => {
    setProductsViewMode(mode);
    localStorage.setItem("productsViewMode", mode);
  };

  const currentAdminUser = auth.currentUser;
  const currentStaffProfile = useMemo(() => {
    const email = String(currentAdminUser?.email || "").toLowerCase();
    const uidValue = currentAdminUser?.uid || "";
    return (
      staffUsers.find(
        (user) =>
          user.id === uidValue ||
          String(user.email || "").toLowerCase() === email,
      ) || null
    );
  }, [staffUsers, currentAdminUser?.email, currentAdminUser?.uid]);

  const currentPermissions = useMemo(() => {
    if (!staffUsers.length) return Object.keys(ADMIN_PERMISSION_LABELS);
    if (!currentStaffProfile) return Object.keys(ADMIN_PERMISSION_LABELS);
    if (isStaffDisabled(currentStaffProfile)) return [];
    return expandPermissionsForNewTabs(currentStaffProfile);
  }, [staffUsers, currentStaffProfile]);

  useEffect(() => {
    if (!currentStaffProfile?.id || !currentPermissions.length) return;

    const storedPermissions = normalizeStaffPermissions(currentStaffProfile.permissions);
    const shouldUpdatePermissions =
      currentPermissions.length !== storedPermissions.length ||
      currentPermissions.some((permission) => !storedPermissions.includes(permission));

    if (!shouldUpdatePermissions) return;

    setDoc(
      doc(db, "staffUsers", currentStaffProfile.id),
      {
        permissions: currentPermissions,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});

    if (currentAdminUser?.uid) {
      setDoc(
        doc(db, "admins", currentAdminUser.uid),
        {
          permissions: currentPermissions,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => {});
    }
  }, [currentStaffProfile?.id, currentPermissions.join("|"), currentAdminUser?.uid]);

  const canAccessAdminSection = (permission) =>
    currentPermissions.includes(permission);
  const accessibleTabs = Object.keys(tabPermission).filter((key) =>
    canAccessAdminSection(tabPermission[key]),
  );

  useEffect(() => {
    if (!accessibleTabs.length) return;
    const requiredPermission = tabPermission[tab];
    if (requiredPermission && !canAccessAdminSection(requiredPermission)) {
      setTab(accessibleTabs[0]);
      setNotice("لا تملك صلاحية الوصول لهذا القسم");
      setTimeout(() => setNotice(""), 2600);
    }
  }, [tab, currentPermissions.join("|")]);

  const noPermissionCard = (sectionLabel = "هذا القسم") => (
    <section className="admin-card admin-permission-denied">
      <Lock size={28} />
      <h2>لا تملك صلاحية الوصول</h2>
      <p>
        حسابك لا يملك صلاحية الدخول إلى {sectionLabel}. تواصل مع مالك المتجر
        لتعديل صلاحياتك.
      </p>
    </section>
  );

  const mustForceStaffPasswordChange = Boolean(
    currentStaffProfile?.mustChangePassword && !currentStaffProfile?.isOwner,
  );

  return (
    <div
      className={`admin admin-lang-${adminLanguage} ${mustForceStaffPasswordChange ? "admin-password-change-locked" : ""}`}
      dir={adminLanguage === "ar" ? "rtl" : "ltr"}
    >
      {mustForceStaffPasswordChange && (
        <StaffTemporaryPasswordGate
          staffProfile={currentStaffProfile}
          settings={settings}
        />
      )}
      <AdminSidebar
        settings={settings}
        t={t}
        tab={tab}
        setTab={setTab}
        themeMenuOpen={themeMenuOpen}
        setThemeMenuOpen={setThemeMenuOpen}
        themeSections={themeSections}
        openSection={openSection}
        goToThemeSection={goToThemeSection}
        canAccessAdminSection={canAccessAdminSection}
        liveVisitors={liveVisitors}
      />

      <main className="admin-main">
        {tab === "dashboard" && canAccessAdminSection("dashboard") && (
          <AdminDashboardHeader
            adminLanguage={adminLanguage}
            changeAdminLanguage={changeAdminLanguage}
            go={go}
            languageMenuOpen={languageMenuOpen}
            liveVisitors={liveVisitors}
            setLanguageMenuOpen={setLanguageMenuOpen}
            t={t}
            title={titleFor(tab, adminLanguage)}
          />
        )}
        {notice && <div className="notice">{notice}</div>}
        {(tab === "identity" || tab === "homepage") && (
          <AdminSaveBar
            resetDraftSettings={resetDraftSettings}
            saveDraftSettings={saveDraftSettings}
            t={t}
          />
        )}

        {tab === "dashboard" && canAccessAdminSection("dashboard") && (
          <AdminDashboardPanel
            adminHealthCards={adminHealthCards}
            averageSessionDuration={averageSessionDuration}
            canAccessAdminSection={canAccessAdminSection}
            customers={customers}
            dashboardOrders={dashboardOrders}
            funnelStats={funnelStats}
            liveEvents={liveEvents}
            liveVisitorRows={liveVisitorRows}
            liveVisitors={liveVisitors}
            orders={orders}
            productHasManagedStock={productHasManagedStock}
            productStockValue={productStockValue}
            products={products}
            setShowLiveVisitors={setShowLiveVisitors}
            setTab={setTab}
            showLiveVisitors={showLiveVisitors}
            t={t}
            todayOrders={todayOrders}
            todaySales={todaySales}
            topLivePages={topLivePages}
            topProduct={topProduct}
            topSources={topSources}
            totalSales={totalSales}
            unreadNotificationsCount={unreadNotificationsCount}
            weekOrders={weekOrders}
          />
        )}

        {tab === "reports" && canAccessAdminSection("reports") && (
          <ReportsPanel
            adminBestSellers={adminBestSellers}
            averageOrderValue={averageOrderValue}
            dashboardOrders={dashboardOrders}
            exportReportsCsv={exportReportsCsv}
            lowStockProducts={lowStockProducts}
            maxReportSales={maxReportSales}
            newCustomersCount={newCustomersCount}
            pendingOrdersCount={pendingOrdersCount}
            reportCityRows={reportCityRows}
            reportSalesRows={reportSalesRows}
            reportStatusLabels={reportStatusLabels}
            reportStatusRows={reportStatusRows}
            t={t}
            todayOrders={todayOrders}
            todaySales={todaySales}
            totalSales={totalSales}
            usedCouponsCount={usedCouponsCount}
            weekOrders={weekOrders}
          />
        )}

        {tab === "coupons" && canAccessAdminSection("coupons") && (
          <CouponsPanel
            coupons={coupons}
            editing={editing}
            saveCoupon={saveCoupon}
            toggleCoupon={toggleCoupon}
            t={t}
          />
        )}

        {tab === "identity" && canAccessAdminSection("identity") && (
          <IdentityPanel
            draftSettings={draftSettings}
            setDraftSettings={setDraftSettings}
            t={t}
            updateDraft={updateDraft}
            uploadSettingImage={uploadSettingImage}
          />
        )}

        {tab === "products" && canAccessAdminSection("products") && (
          <section className="admin-products-stacked">
            <ProductsCommandCenter
              activeProductsCount={activeProductsCount}
              adminProductCategories={adminProductCategories}
              changeProductsViewMode={changeProductsViewMode}
              clearPendingImport={clearPendingImport}
              downloadProductsTemplate={downloadProductsTemplate}
              importProductsFromExcel={importProductsFromExcel}
              lowStockProducts={lowStockProducts}
              openProductEditor={openProductEditor}
              pendingImport={pendingImport}
              products={products}
              productsViewMode={productsViewMode}
              savePendingImport={savePendingImport}
              t={t}
            />

            {productModalOpen && (
              <ProductEditorModal
                addProductOption={addProductOption}
                editing={editing}
                galleryImages={galleryImages}
                imagePreview={imagePreview}
                makeGalleryImagePrimary={makeGalleryImagePrimary}
                productFormTab={productFormTab}
                productOptions={productOptions}
                productPreview={productPreview}
                removeGalleryImage={removeGalleryImage}
                removeProductOption={removeProductOption}
                resetProductEditor={resetProductEditor}
                saveProduct={saveProduct}
                setImagePreview={setImagePreview}
                setProductFormTab={setProductFormTab}
                setProductPreview={setProductPreview}
                t={t}
                updateProductOption={updateProductOption}
                updateProductPreviewFromField={updateProductPreviewFromField}
                updateProductPreviewFromForm={updateProductPreviewFromForm}
                uploadGalleryImages={uploadGalleryImages}
              />
            )}

            <AdminProductsList
              adminBestSellers={adminBestSellers}
              adminProductCategories={adminProductCategories}
              bulkUpdateProducts={bulkUpdateProducts}
              deleteAllProducts={deleteAllProducts}
              deleteProduct={deleteProduct}
              deleteSelectedProducts={deleteSelectedProducts}
              draggedProductId={draggedProductId}
              duplicateProduct={duplicateProduct}
              filteredAdminProducts={filteredAdminProducts}
              openProductEditor={openProductEditor}
              productCategoryFilter={productCategoryFilter}
              productSearch={productSearch}
              productSort={productSort}
              productStatusFilter={productStatusFilter}
              products={products}
              productsViewMode={productsViewMode}
              reorderProducts={reorderProducts}
              selectedProducts={selectedProducts}
              setDraggedProductId={setDraggedProductId}
              setProductCategoryFilter={setProductCategoryFilter}
              setProductSearch={setProductSearch}
              setProductSort={setProductSort}
              setProductStatusFilter={setProductStatusFilter}
              t={t}
              toggleAllVisibleProducts={toggleAllVisibleProducts}
              toggleProductSelection={toggleProductSelection}
            />
          </section>
        )}

        {tab === "homepage" && canAccessAdminSection("homepage") && (
          <HomepagePanel
            draftSettings={draftSettings}
            openSection={openSection}
            selectedThemeSection={selectedThemeSection}
            setOpenSection={setOpenSection}
            themeSections={themeSections}
            updateDraft={updateDraft}
            uploadSettingImage={uploadSettingImage}
          />
        )}

        {tab === "users" && canAccessAdminSection("users") && (
          <StaffUsersPanel
            staffUsers={staffUsers}
            onNotice={(msg, ms = 3000) => {
              setNotice(msg);
              setTimeout(() => setNotice(""), ms);
            }}
          />
        )}

        {tab === "settings" && canAccessAdminSection("settings") && (
          <AdminSettingsPanel
            settings={settings}
            draftSettings={draftSettings}
            updateDraft={updateDraft}
            saveDraftSettings={saveDraftSettings}
            resetDraftSettings={resetDraftSettings}
            uploadSettingImage={uploadSettingImage}
            setTab={setTab}
          />
        )}

        {tab === "payments" && canAccessAdminSection("payments") && (
          <PaymentsPanel
            draftSettings={draftSettings}
            updateDraft={updateDraft}
            saveDraftSettings={saveDraftSettings}
            resetDraftSettings={resetDraftSettings}
          />
        )}

        {tab === "notifications" && canAccessAdminSection("notifications") && (
          <AdminNotificationsPanel
            items={filteredNotificationItems}
            allItems={notificationItems}
            unreadCount={unreadNotificationsCount}
            counts={notificationCounts}
            filter={notificationFilter}
            setFilter={setNotificationFilter}
            markRead={markNotificationRead}
            markAllRead={markAllNotificationsRead}
            clearReads={clearNotificationReads}
            settings={settings}
            saveSettings={saveSettings}
            browserPermission={browserPermission}
            requestBrowserNotifications={requestBrowserNotifications}
            lowStockThreshold={lowStockThreshold}
            highValueOrderThreshold={highValueOrderThreshold}
            setTab={setTab}
          />
        )}

        {tab === "customers" && canAccessAdminSection("customers") && (
          <CustomersPanel customers={customers} orders={orders} />
        )}
        {tab === "orders" && canAccessAdminSection("orders") && (
          <OrdersPanel
            orders={orders}
            t={t}
            onNotice={(msg, ms = 3000) => {
              setNotice(msg);
              setTimeout(() => setNotice(""), ms);
            }}
          />
        )}
        {tabPermission[tab] &&
          !canAccessAdminSection(tabPermission[tab]) &&
          noPermissionCard(titleFor(tab, adminLanguage))}
      </main>
    </div>
  );
}



export default Admin;
