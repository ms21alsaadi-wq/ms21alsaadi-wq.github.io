export const ADMIN_PERMISSION_LABELS = {
  dashboard: "لوحة التحكم",
  reports: "التقارير",
  identity: "هوية المتجر",
  homepage: "ثيم المتجر",
  products: "المنتجات",
  orders: "الطلبات",
  customers: "العملاء",
  coupons: "الكوبونات",
  payments: "المدفوعات",
  settings: "الإعدادات",
  notifications: "الإشعارات",
  users: "المستخدمين",
};

export const ADMIN_PERMISSION_DESCRIPTIONS = {
  dashboard: "مشاهدة ملخص الأداء ونبض المتجر",
  reports: "مشاهدة وتصدير تقارير المبيعات والطلبات",
  identity: "تعديل شعار وبيانات وهوية المتجر",
  homepage: "تعديل أقسام الصفحة الرئيسية والبنرات والثيم",
  products: "إضافة وتعديل وحذف المنتجات وخياراتها",
  orders: "متابعة الطلبات وتحديث حالاتها",
  customers: "عرض بيانات العملاء وسجل طلباتهم",
  coupons: "إنشاء وتعديل وحذف كوبونات الخصم",
  payments: "إدارة بوابات الدفع وطرق الدفع الظاهرة للعميل",
  settings: "إدارة إعدادات المتجر العامة",
  notifications: "مشاهدة تنبيهات المتجر ومركز الإشعارات",
  users: "إضافة الموظفين وتعديل أدوارهم وصلاحياتهم",
};

export const ADMIN_ROLE_DEFAULTS = {
  owner: Object.keys(ADMIN_PERMISSION_LABELS),
  manager: Object.keys(ADMIN_PERMISSION_LABELS).filter(
    (key) => key !== "users",
  ),
  products: ["dashboard", "products"],
  orders: ["dashboard", "reports", "orders", "customers"],
  content: ["dashboard", "identity", "homepage", "products"],
  support: ["dashboard", "orders", "customers", "notifications"],
};

export const normalizeStaffPermissions = (permissions = []) => {
  const list = Array.isArray(permissions) ? permissions : [];
  const normalized = list.map((item) => (item === "pages" ? "homepage" : item));
  return [...new Set(normalized)].filter((key) => ADMIN_PERMISSION_LABELS[key]);
};

export const isStaffDeleted = (user = {}) => {
  const record = user || {};
  const status = String(record.status || "").toLowerCase();
  return (
    Boolean(
      record.isDeleted ||
        record.deleted ||
        record.deletedAt ||
        record.deletedAtMs,
    ) ||
    status === "deleted" ||
    status === "removed" ||
    status === "inactiveDeleted".toLowerCase()
  );
};

export const isStaffDisabled = (user = {}) => {
  const record = user || {};
  return (
    isStaffDeleted(record) ||
    record.status === "disabled" ||
    Boolean(record.disabled)
  );
};

export const generateStaffTemporaryPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "Gd-";
  for (let i = 0; i < 9; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password + "!";
};
