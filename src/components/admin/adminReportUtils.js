import { orderTimestamp } from "../../utils/helpers.js";

export const reportStatusLabels = {
  new: "جديد",
  processing: "قيد المعالجة",
  shipped: "تم الشحن",
  completed: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
};

export function buildReportStatusRows(dashboardOrders) {
  return Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const key = order.status || "new";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({
    status,
    label: reportStatusLabels[status] || status,
    count,
    percent: dashboardOrders.length
      ? Math.round((count / dashboardOrders.length) * 100)
      : 0,
  }));
}

export function buildReportCityRows(dashboardOrders) {
  return Object.entries(
    dashboardOrders.reduce((acc, order) => {
      const city =
        order.city || order.shippingCity || order.address?.city || "غير محدد";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export function buildReportSalesRows(dashboardOrders) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const value = dashboardOrders
      .filter((order) => {
        const time = orderTimestamp(order.createdAt);
        return time >= day.getTime() && time < nextDay.getTime();
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      label: day.toLocaleDateString("ar-SA", { weekday: "short" }),
      value,
    };
  });
}
