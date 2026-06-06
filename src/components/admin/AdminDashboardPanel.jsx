import { Bell, Settings } from "lucide-react";
import {
  formatDuration,
  formatOrderDate,
  formatPrice,
  orderTimestamp,
} from "../../utils/helpers.js";
import LiveVisitorsModal from "./LiveVisitorsModal.jsx";

export default function AdminDashboardPanel({
  adminHealthCards,
  averageSessionDuration,
  canAccessAdminSection,
  customers,
  dashboardOrders,
  funnelStats,
  liveEvents,
  liveVisitorRows,
  liveVisitors,
  orders,
  productHasManagedStock,
  productStockValue,
  products,
  setShowLiveVisitors,
  setTab,
  showLiveVisitors,
  t,
  todayOrders,
  todaySales,
  topLivePages,
  topProduct,
  topSources,
  totalSales,
  unreadNotificationsCount,
  weekOrders,
}) {
  return (
    <section className="dashboard-pro-page">
      <div className="admin-health-grid">
        {adminHealthCards.map((card) => (
          <div className={`admin-health-card ${card.tone}`} key={card.label}>
            <div>{card.icon}</div>
            <span>{card.label}</span>
            <b>{card.value}</b>
          </div>
        ))}
      </div>

      {(canAccessAdminSection("settings") ||
        canAccessAdminSection("notifications")) && (
        <div className="dashboard-quick-access-grid">
          {canAccessAdminSection("settings") && (
            <button
              type="button"
              className="dashboard-quick-access-card settings"
              onClick={() => setTab("settings")}
            >
              <Settings size={24} />
              <span>الإعدادات جاهزة</span>
              <b>تشغيل المتجر والشحن والتواصل</b>
              <small>اضغط هنا لتعديل الإعدادات العامة.</small>
            </button>
          )}
          {canAccessAdminSection("notifications") && (
            <button
              type="button"
              className="dashboard-quick-access-card notifications"
              onClick={() => setTab("notifications")}
            >
              <Bell size={24} />
              <span>مركز الإشعارات جاهز</span>
              <b>{unreadNotificationsCount} إشعار غير مقروء</b>
              <small>طلبات، مخزون، عملاء، وأحداث مباشرة.</small>
            </button>
          )}
        </div>
      )}

      <div className="dashboard-stats-grid">
        <button
          type="button"
          className="dash-stat-card live-visitors-card live-visitors-clickable"
          onClick={() => setShowLiveVisitors(true)}
        >
          <span>{t("visitorsNow")}</span>
          <b>{liveVisitors}</b>
          <small>
            <i></i> مباشر الآن
          </small>
        </button>

        <div className="dash-stat-card">
          <span>{t("ordersToday")}</span>
          <b>{todayOrders.length}</b>
          <small>{t("newOrderToday")}</small>
        </div>

        <div className="dash-stat-card gold">
          <span>{t("salesToday")}</span>
          <b>{formatPrice(todaySales)} ر.س</b>
          <small>{t("salesTodayDesc")}</small>
        </div>

        <div className="dash-stat-card">
          <span>{t("last7Days")}</span>
          <b>{weekOrders.length}</b>
          <small>{t("ordersWeek")}</small>
        </div>

        <div className="dash-stat-card">
          <span>{t("totalSales")}</span>
          <b>{formatPrice(totalSales)} ر.س</b>
          <small>{t("totalSalesDesc")}</small>
        </div>
      </div>

      <div className="admin-card funnel-panel">
        <div className="panel-head">
          <div>
            <span>{t("conversionFunnel")}</span>
            <h2>{t("conversionFunnel")}</h2>
          </div>
        </div>

        <div className="funnel-grid">
          <div className="funnel-step">
            <b>{funnelStats.visit_store}</b>
            <span>{t("visitedStore")}</span>
          </div>
          <div className="funnel-arrow">→</div>
          <div className="funnel-step">
            <b>{funnelStats.view_product}</b>
            <span>{t("openedProduct")}</span>
          </div>
          <div className="funnel-arrow">→</div>
          <div className="funnel-step">
            <b>{funnelStats.add_to_cart}</b>
            <span>{t("addedCart")}</span>
          </div>
          <div className="funnel-arrow">→</div>
          <div className="funnel-step">
            <b>{funnelStats.checkout}</b>
            <span>{t("reachedPayment")}</span>
          </div>
          <div className="funnel-arrow">→</div>
          <div className="funnel-step success">
            <b>{funnelStats.purchase}</b>
            <span>{t("orderCompleted")}</span>
          </div>
        </div>
      </div>

      <div className="admin-card live-analytics-panel">
        <div className="panel-head">
          <div>
            <span>Live Analytics</span>
            <h2>{t("liveAnalytics")}</h2>
          </div>
        </div>

        <div className="live-analytics-grid">
          <div className="live-analytics-box">
            <h3>{t("topPages")}</h3>
            {topLivePages.length ? (
              topLivePages.map(([page, count]) => (
                <div className="live-mini-row" key={page}>
                  <span>{page}</span>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <p>{t("noData")}</p>
            )}
          </div>

          <div className="live-analytics-box">
            <h3>{t("trafficSource")}</h3>
            {topSources.length ? (
              topSources.map(([source, count]) => (
                <div className="live-mini-row" key={source}>
                  <span>{source}</span>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <p>{t("noData")}</p>
            )}
          </div>

          <div className="live-analytics-box">
            <h3>{t("sessionDuration")}</h3>
            <div className="live-duration-big">
              {formatDuration(averageSessionDuration)}
            </div>
            <p>{t("sessionDurationDesc")}</p>
          </div>

          <div className="live-analytics-box live-events-box">
            <h3>{t("liveNotifications")}</h3>
            {liveEvents.length ? (
              liveEvents.slice(0, 5).map((event) => (
                <div
                  className={`live-event-row ${event.type || ""}`}
                  key={event.id}
                >
                  <span>{event.title || "نشاط مباشر"}</span>
                  <small>{event.path || "/"}</small>
                </div>
              ))
            ) : (
              <p>{t("noLiveEvents")}</p>
            )}
          </div>
        </div>
      </div>

      {showLiveVisitors && (
        <LiveVisitorsModal
          visitors={liveVisitorRows}
          onClose={() => setShowLiveVisitors(false)}
        />
      )}

      <div className="dashboard-main-grid">
        <div className="admin-card dashboard-panel">
          <div className="panel-head">
            <div>
              <span>Best Seller</span>
              <h2>{t("topProduct")}</h2>
            </div>
          </div>

          {topProduct ? (
            <div className="top-product-card">
              {topProduct.image ? (
                <img
                  src={topProduct.image}
                  alt={topProduct.name || "منتج"}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="top-product-placeholder">🌿</div>
              )}
              <div>
                <h3>{topProduct.name}</h3>
                <p>تم بيع {topProduct.qty} قطعة</p>
                <b>{formatPrice(topProduct.value)} ر.س</b>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">{t("noSalesYet")}</div>
          )}
        </div>

        <div className="admin-card dashboard-panel">
          <div className="panel-head">
            <div>
              <span>Recent Orders</span>
              <h2>{t("recentOrders")}</h2>
            </div>
          </div>

          <div className="recent-orders-list">
            {dashboardOrders
              .slice()
              .sort(
                (a, b) =>
                  orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt),
              )
              .slice(0, 5)
              .map((o) => (
                <div className="recent-order-row" key={o.id}>
                  <div>
                    <b>{o.name || o.customerName || "طلب عميل"}</b>
                    <span>{formatOrderDate(o.createdAt)}</span>
                  </div>
                  <em>{formatPrice(o.total)} ر.س</em>
                </div>
              ))}

            {dashboardOrders.length === 0 && (
              <div className="dashboard-empty">{t("noOrdersYet")}</div>
            )}
          </div>
        </div>

        <div className="admin-card dashboard-panel">
          <div className="panel-head">
            <div>
              <span>Quick Numbers</span>
              <h2>{t("quickNumbers")}</h2>
            </div>
          </div>

          <div className="quick-numbers">
            <div>
              <span>{t("products")}</span>
              <b>{products.length}</b>
            </div>
            <div>
              <span>{t("customers")}</span>
              <b>{customers.length}</b>
            </div>
            <div>
              <span>{t("orders")}</span>
              <b>{orders.length}</b>
            </div>
            <div>
              <span>{t("inventory")}</span>
              <b>
                {products.reduce(
                  (sum, p) =>
                    productHasManagedStock(p)
                      ? sum + productStockValue(p)
                      : sum,
                  0,
                )}
              </b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
