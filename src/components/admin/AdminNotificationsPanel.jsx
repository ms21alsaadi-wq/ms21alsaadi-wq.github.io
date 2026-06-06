import {
  Bell,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

function AdminNotificationsPanel({
  items,
  allItems,
  unreadCount,
  counts,
  filter,
  setFilter,
  markRead,
  markAllRead,
  clearReads,
  settings,
  saveSettings,
  browserPermission,
  requestBrowserNotifications,
  lowStockThreshold,
  highValueOrderThreshold,
  setTab,
}) {
  const filterTabs = [
    { key: "all", label: "الكل", count: counts.all || 0 },
    { key: "unread", label: "غير مقروء", count: counts.unread || 0 },
    { key: "orders", label: "الطلبات", count: counts.orders || 0 },
    { key: "stock", label: "المخزون", count: counts.stock || 0 },
    { key: "customers", label: "العملاء", count: counts.customers || 0 },
    { key: "live", label: "المباشر", count: counts.live || 0 },
    { key: "system", label: "النظام", count: counts.system || 0 },
  ];

  const preferenceRows = [
    {
      key: "notifyNewOrders",
      title: "طلبات جديدة وقيد التجهيز",
      desc: "ينبهك عند وصول طلب جديد أو وجود طلب يحتاج متابعة.",
    },
    {
      key: "notifyHighValueOrders",
      title: "طلبات بقيمة عالية",
      desc: "إظهار تنبيه للطلبات التي تتجاوز حد القيمة المحدد.",
    },
    {
      key: "notifyLowStock",
      title: "المخزون المنخفض",
      desc: "إظهار المنتجات التي تحتاج إعادة تعبئة.",
    },
    {
      key: "notifyCustomers",
      title: "العملاء الجدد",
      desc: "إشعار عند تسجيل عميل جديد خلال آخر أسبوع.",
    },
    {
      key: "notifyLiveEvents",
      title: "الأحداث المباشرة",
      desc: "يعرض إضافات السلة ومحاولات إتمام الطلب من الزوار.",
    },
  ];

  const iconFor = (item) => {
    if (item.icon === "order") return <ClipboardList size={20} />;
    if (item.icon === "stock") return <PackagePlus size={20} />;
    if (item.icon === "customer") return <Users size={20} />;
    if (item.icon === "trend") return <TrendingUp size={20} />;
    if (item.icon === "system") return <Settings size={20} />;
    return <Bell size={20} />;
  };

  const permissionText = {
    granted: "مسموح",
    denied: "مرفوض من المتصفح",
    default: "لم يتم الطلب بعد",
    unsupported: "غير مدعوم",
  }[browserPermission || "default"];

  const notificationHealth = unreadCount
    ? `لديك ${unreadCount} إشعار غير مقروء`
    : "كل الإشعارات مقروءة";

  return (
    <section className="admin-notifications-page">
      <div className="admin-card notifications-hero-card">
        <div className="pro-card-head notifications-head">
          <div>
            <span>Notifications Center</span>
            <h2>الإشعارات</h2>
            <p>
              مركز واحد لمتابعة الطلبات الجديدة، المخزون، العملاء، والأحداث المباشرة.
            </p>
          </div>
          <div className="notifications-unread-badge">
            <Bell size={19} />
            <b>{unreadCount}</b>
            <small>غير مقروء</small>
          </div>
        </div>

        <div className="notifications-kpi-grid">
          <div>
            <span>الحالة</span>
            <b>{notificationHealth}</b>
            <small>يتم التحديث مباشرة من بيانات المتجر.</small>
          </div>
          <div>
            <span>طلبات تحتاج متابعة</span>
            <b>{counts.orders || 0}</b>
            <small>طلبات جديدة أو عالية القيمة.</small>
          </div>
          <div>
            <span>تنبيهات المخزون</span>
            <b>{counts.stock || 0}</b>
            <small>الحد الحالي: {lowStockThreshold}</small>
          </div>
          <div>
            <span>إذن المتصفح</span>
            <b>{permissionText}</b>
            <small>خاص بجهازك الحالي فقط.</small>
          </div>
        </div>
      </div>

      <div className="notifications-layout">
        <div className="admin-card notifications-feed-card">
          <div className="notifications-toolbar">
            <div className="notification-filters">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={filter === tab.key ? "on" : ""}
                  onClick={() => setFilter(tab.key)}
                  type="button"
                >
                  {tab.label}
                  <b>{tab.count}</b>
                </button>
              ))}
            </div>
            <div className="notification-actions">
              <button className="admin-secondary" onClick={markAllRead} type="button">
                تعليم الكل كمقروء
              </button>
              <button className="admin-secondary" onClick={clearReads} type="button">
                إعادة إظهار الكل
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {items.length ? (
              items.map((item) => (
                <article
                  className={`notification-row ${item.tone || "neutral"} ${item.read ? "is-read" : "is-unread"}`}
                  key={item.key}
                >
                  <div className="notification-icon">{iconFor(item)}</div>
                  <div className="notification-body">
                    <div>
                      <h3>{item.title}</h3>
                      {!item.read && <span className="notification-dot">جديد</span>}
                    </div>
                    <p>{item.message}</p>
                    <small>{item.meta || "تحديث المتجر"}</small>
                  </div>
                  <div className="notification-row-actions">
                    {item.tab && (
                      <button
                        className="admin-secondary"
                        type="button"
                        onClick={() => setTab(item.tab)}
                      >
                        {item.actionLabel || "فتح"}
                      </button>
                    )}
                    {!item.read && (
                      <button
                        className="admin-primary"
                        type="button"
                        onClick={() => markRead(item.key)}
                      >
                        تم
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="notifications-empty">
                <CheckCircle2 size={34} />
                <h3>لا توجد إشعارات في هذا القسم</h3>
                <p>عند وصول طلبات أو انخفاض المخزون ستظهر هنا تلقائيًا.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="admin-card notifications-settings-card">
          <div className="settings-section-title">
            <Settings size={20} />
            <div>
              <h3>إعدادات الإشعارات</h3>
              <p>اختر نوع التنبيهات التي تريد ظهورها في المركز.</p>
            </div>
          </div>

          <div className="notification-preferences">
            {preferenceRows.map((row) => (
              <label className="setting-toggle-row notification-pref" key={row.key}>
                <input
                  type="checkbox"
                  checked={settings[row.key] !== false}
                  onChange={(e) => saveSettings({ [row.key]: e.target.checked })}
                />
                <span>
                  <b>{row.title}</b>
                  <small>{row.desc}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="notifications-thresholds">
            <label>
              حد المخزون المنخفض
              <input
                type="number"
                min="0"
                defaultValue={lowStockThreshold}
                onBlur={(e) =>
                  saveSettings({ lowStockThreshold: Number(e.target.value || 0) })
                }
              />
            </label>
            <label>
              حد الطلب العالي
              <input
                type="number"
                min="0"
                defaultValue={highValueOrderThreshold}
                onBlur={(e) =>
                  saveSettings({ highValueOrderThreshold: Number(e.target.value || 0) })
                }
              />
            </label>
          </div>

          <label className="setting-toggle-row notification-pref browser-pref">
            <input
              type="checkbox"
              checked={settings.notificationsBrowser === true}
              onChange={(e) => saveSettings({ notificationsBrowser: e.target.checked })}
            />
            <span>
              <b>إشعارات المتصفح</b>
              <small>تحتاج سماح من المتصفح على هذا الجهاز.</small>
            </span>
          </label>
          <button
            type="button"
            className="admin-primary full-width"
            onClick={requestBrowserNotifications}
          >
            طلب السماح من المتصفح
          </button>

          <div className="notifications-mini-summary">
            <b>مصادر الإشعارات الحالية</b>
            <p>
              {allItems.length
                ? `${allItems.length} إشعار من الطلبات والمخزون والأحداث.`
                : "لا توجد إشعارات حالية."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AdminNotificationsPanel;
