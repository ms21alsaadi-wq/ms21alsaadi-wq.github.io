function Control({ label, children }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  );
}

function titleFor(tab, lang = "ar") {
  const titles = {
    ar: {
      dashboard: "الرئيسية",
      reports: "التقارير",
      identity: "هوية المتجر",
      products: "إدارة المنتجات",
      customers: "العملاء",
      orders: "الطلبات",
      coupons: "الكوبونات",
      payments: "المدفوعات",
      users: "المستخدمين",
      settings: "الإعدادات",
      notifications: "الإشعارات",
      homepage: "ثيم المتجر",
    },
    en: {
      dashboard: "Home",
      reports: "Reports",
      identity: "Store identity",
      products: "Product management",
      customers: "Customers",
      orders: "Orders",
      coupons: "Coupons",
      payments: "Payments",
      users: "Users",
      settings: "Settings",
      notifications: "Notifications",
      homepage: "Store theme",
    },
  };
  return (titles[lang] || titles.ar)[tab] || tab;
}

export { Control, titleFor };
