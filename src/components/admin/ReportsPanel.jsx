import {
  formatOrderDate,
  formatPrice,
  orderTimestamp,
} from "../../utils/helpers.js";

export default function ReportsPanel({
  adminBestSellers,
  averageOrderValue,
  dashboardOrders,
  exportReportsCsv,
  lowStockProducts,
  maxReportSales,
  newCustomersCount,
  pendingOrdersCount,
  reportCityRows,
  reportSalesRows,
  reportStatusLabels,
  reportStatusRows,
  t,
  todayOrders,
  todaySales,
  totalSales,
  usedCouponsCount,
  weekOrders,
}) {
  return (
    <section className="reports-pro-page">
      <div className="reports-hero-card admin-card">
        <div>
          <span>Reports Center</span>
          <h2>{t("reportsCenter")}</h2>
          <p>{t("reportsIntro")}</p>
        </div>
        <div className="reports-hero-actions">
          <button
            className="admin-secondary"
            type="button"
            onClick={exportReportsCsv}
          >
            {t("exportCsv")}
          </button>
          <div className="reports-update-pill">
            <b>{formatOrderDate(new Date())}</b>
            <small>{t("lastUpdate")}</small>
          </div>
        </div>
      </div>

      <div className="reports-filter-strip admin-card">
        <button className="active" type="button">
          {t("last7Days")}
        </button>
        <button type="button">{t("thisMonth")}</button>
        <button type="button">{t("allPeriod")}</button>
        <span>{t("advancedFiltersLater")}</span>
      </div>

      <div className="reports-kpi-grid">
        <div className="reports-kpi-card admin-card">
          <span>{t("totalSales")}</span>
          <b>{formatPrice(totalSales)} ر.س</b>
          <small>كل الطلبات المسجلة</small>
        </div>
        <div className="reports-kpi-card admin-card">
          <span>{t("salesToday")}</span>
          <b>{formatPrice(todaySales)} ر.س</b>
          <small>{todayOrders.length} طلب اليوم</small>
        </div>
        <div className="reports-kpi-card admin-card">
          <span>طلبات الأسبوع</span>
          <b>{weekOrders.length}</b>
          <small>{t("last7Days")}</small>
        </div>
        <div className="reports-kpi-card admin-card warning">
          <span>{t("needsFollowUp")}</span>
          <b>{pendingOrdersCount}</b>
          <small>{t("newOrProcessing")}</small>
        </div>
        <div className="reports-kpi-card admin-card">
          <span>{t("averageOrder")}</span>
          <b>{formatPrice(averageOrderValue)} ر.س</b>
          <small>{t("averageOrderDesc")}</small>
        </div>
        <div className="reports-kpi-card admin-card danger">
          <span>{t("lowStock")}</span>
          <b>{lowStockProducts.length}</b>
          <small>{t("lowStockDesc")}</small>
        </div>
      </div>

      <div className="reports-layout-grid">
        <div className="admin-card reports-chart-card">
          <div className="panel-head">
            <div>
              <span>Sales Trend</span>
              <h2>{t("salesLast7Days")}</h2>
            </div>
          </div>
          <div className="reports-bars">
            {reportSalesRows.map((row) => (
              <div className="reports-bar-item" key={row.label}>
                <div className="reports-bar-track">
                  <i
                    style={{
                      height: `${Math.max(8, Math.round((row.value / maxReportSales) * 100))}%`,
                    }}
                  />
                </div>
                <b>{formatPrice(row.value)}</b>
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card reports-panel-card">
          <div className="panel-head">
            <div>
              <span>Order Status</span>
              <h2>{t("orderStatus")}</h2>
            </div>
          </div>
          <div className="reports-status-list">
            {reportStatusRows.length ? (
              reportStatusRows.map((row) => (
                <div className="reports-status-row" key={row.status}>
                  <div>
                    <b>{row.label}</b>
                    <span>{row.count} طلب</span>
                  </div>
                  <div className="reports-progress">
                    <i style={{ width: `${row.percent}%` }} />
                  </div>
                  <em>{row.percent}%</em>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">لا توجد طلبات بعد</div>
            )}
          </div>
        </div>
      </div>

      <div className="reports-layout-grid three">
        <div className="admin-card reports-panel-card">
          <div className="panel-head">
            <div>
              <span>Best Sellers</span>
              <h2>{t("bestSelling")}</h2>
            </div>
          </div>
          <div className="reports-list">
            {adminBestSellers.length ? (
              adminBestSellers.map((product, index) => (
                <div className="reports-list-row" key={product.name}>
                  <strong>{index + 1}</strong>
                  <div>
                    <b>{product.name}</b>
                    <span>{product.qty} قطعة مباعة</span>
                  </div>
                  <em>{formatPrice(product.value)} ر.س</em>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">{t("noSalesYet")}</div>
            )}
          </div>
        </div>

        <div className="admin-card reports-panel-card">
          <div className="panel-head">
            <div>
              <span>Top Cities</span>
              <h2>{t("topCities")}</h2>
            </div>
          </div>
          <div className="reports-list">
            {reportCityRows.length ? (
              reportCityRows.map(([city, count]) => (
                <div className="reports-list-row" key={city}>
                  <strong>•</strong>
                  <div>
                    <b>{city}</b>
                    <span>{count} طلب</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">{t("noCityData")}</div>
            )}
          </div>
        </div>

        <div className="admin-card reports-panel-card reports-alerts-card">
          <div className="panel-head">
            <div>
              <span>Admin Alerts</span>
              <h2>{t("importantAlerts")}</h2>
            </div>
          </div>
          <div className="reports-alert-list">
            <div>
              <b>{pendingOrdersCount}</b>
              <span>{t("ordersNeedFollow")}</span>
            </div>
            <div>
              <b>{lowStockProducts.length}</b>
              <span>{t("lowStockProducts")}</span>
            </div>
            <div>
              <b>{newCustomersCount}</b>
              <span>{t("newCustomersWeek")}</span>
            </div>
            <div>
              <b>{usedCouponsCount}</b>
              <span>{t("couponUses")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card reports-panel-card">
        <div className="panel-head">
          <div>
            <span>Recent Orders</span>
            <h2>آخر الطلبات</h2>
          </div>
        </div>
        <div className="reports-table">
          {dashboardOrders
            .slice()
            .sort(
              (a, b) =>
                orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt),
            )
            .slice(0, 6)
            .map((order) => (
              <div className="reports-table-row" key={order.id}>
                <b>{order.name || order.customerName || "طلب عميل"}</b>
                <span>{formatOrderDate(order.createdAt)}</span>
                <span>
                  {reportStatusLabels[order.status || "new"] ||
                    order.status ||
                    "جديد"}
                </span>
                <em>{formatPrice(order.total)} ر.س</em>
              </div>
            ))}
          {dashboardOrders.length === 0 && (
            <div className="dashboard-empty">{t("noOrdersYet")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
