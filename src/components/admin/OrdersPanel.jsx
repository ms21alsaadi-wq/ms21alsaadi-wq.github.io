import { useState } from "react";
import { Download } from "lucide-react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  formatOrderDate,
  formatPrice,
  getTrackingUrl,
  orderTimestamp,
} from "../../utils/helpers.js";
import { sendOrderStatusEmail } from "../../services/orderNotifications.js";

function OrdersPanel({ orders, onNotice, t = (key) => key }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const statusLabels = {
    new: "جديد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي",
  };

  const statusOptions = [
    { value: "all", label: "كل الطلبات" },
    { value: "new", label: "جديد" },
    { value: "processing", label: "قيد التجهيز" },
    { value: "shipped", label: "تم الشحن" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
  ];

  const normalizedOrders = orders
    .map((o) => ({
      ...o,
      status: o.status || "new",
      total: Number(o.total || 0),
      items: o.items || [],
    }))
    .sort((a, b) => orderTimestamp(b.createdAt) - orderTimestamp(a.createdAt));

  const isWithinDate = (order) => {
    if (dateFilter === "all") return true;

    const time = orderTimestamp(order.createdAt);
    if (!time) return false;

    const orderDate = new Date(time);
    const now = new Date();

    if (dateFilter === "today") {
      return orderDate.toDateString() === now.toDateString();
    }

    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo;
    }

    if (dateFilter === "month") {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  };

  const filteredOrders = normalizedOrders.filter((o) => {
    const statusOk = statusFilter === "all" || o.status === statusFilter;
    const text =
      `${o.name || ""} ${o.customerName || ""} ${o.email || ""} ${o.customerEmail || ""} ${o.phone || ""} ${o.city || ""} ${o.id || ""}`.toLowerCase();
    return statusOk && isWithinDate(o) && text.includes(search.toLowerCase());
  });

  const totals = normalizedOrders.reduce(
    (acc, o) => {
      acc.count += 1;
      acc.value += o.total;
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    { count: 0, value: 0 },
  );

  const updateShippingInfo = async (orderId, patch) => {
    await setDoc(
      doc(db, "orders", orderId),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const updateOrderStatus = async (orderId, status) => {
    await setDoc(
      doc(db, "orders", orderId),
      { status, updatedAt: serverTimestamp() },
      { merge: true },
    );

    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const sent = await sendOrderStatusEmail(
        { ...order, id: orderId },
        status,
      );
      onNotice?.(
        sent
          ? "تم تحديث حالة الطلب وإرسال إيميل للعميل"
          : "تم تحديث حالة الطلب، لكن لم يتم إرسال الإيميل",
        3500,
      );
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm("هل تريد حذف هذا الطلب؟")) {
      await deleteDoc(doc(db, "orders", orderId));
    }
  };

  const exportOrdersCsv = () => {
    const headers = [
      "order_id",
      "customer",
      "email",
      "phone",
      "city",
      "status",
      "total",
      "coupon",
      "created_at",
      "shipping_company",
      "tracking_number",
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredOrders.map((order) => [
      order.id,
      order.name || order.customerName || "",
      order.email || order.customerEmail || "",
      order.phone || "",
      order.city || "",
      statusLabels[order.status] || order.status,
      order.total,
      order.couponCode || "",
      formatOrderDate(order.createdAt),
      order.shippingCompany === "other"
        ? order.customShipping
        : order.shippingCompany,
      order.trackingNumber || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `green-dixam-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice?.("تم تصدير الطلبات الحالية", 2200);
  };

  return (
    <section className="orders-pro-page">
      <div className="admin-card orders-pro-hero">
        <div>
          <span>Orders Management</span>
          <h2>إدارة الطلبات</h2>
          <p>تابع الطلبات، حدث حالتها، وابحث عن طلبات العملاء بسرعة.</p>
        </div>

        <div className="orders-pro-stats">
          <div>
            <b>{totals.count}</b>
            <small>طلب</small>
          </div>
          <div>
            <b>{formatPrice(totals.value)}</b>
            <small>{t("totalSales")}</small>
          </div>
          <div>
            <b>{totals.new || 0}</b>
            <small>طلبات جديدة</small>
          </div>
        </div>
      </div>

      <div className="admin-card orders-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل، الإيميل، الجوال، المدينة..."
        />

        <button
          type="button"
          className="admin-secondary export-orders-btn"
          onClick={exportOrdersCsv}
        >
          <Download size={16} /> تصدير النتائج
        </button>

        <div className="orders-date-filters">
          <button
            className={dateFilter === "all" ? "active" : ""}
            onClick={() => setDateFilter("all")}
          >
            الكل
          </button>
          <button
            className={dateFilter === "today" ? "active" : ""}
            onClick={() => setDateFilter("today")}
          >
            اليوم
          </button>
          <button
            className={dateFilter === "week" ? "active" : ""}
            onClick={() => setDateFilter("week")}
          >
            الأسبوع
          </button>
          <button
            className={dateFilter === "month" ? "active" : ""}
            onClick={() => setDateFilter("month")}
          >
            الشهر
          </button>
        </div>

        <div className="orders-filter-tabs">
          {statusOptions.map((s) => (
            <button
              key={s.value}
              className={statusFilter === s.value ? "active" : ""}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-pro-grid">
        {filteredOrders.map((order) => (
          <div className="order-pro-card" key={order.id}>
            <div className="order-pro-head">
              <div>
                <span>#{String(order.id).slice(0, 8)}</span>
                <h3>{order.name || order.customerName || "طلب عميل"}</h3>
                <p>{order.email || order.customerEmail || ""}</p>
              </div>

              <em className={`order-status ${order.status}`}>
                {statusLabels[order.status] || order.status}
              </em>
            </div>

            <div className="order-pro-info">
              <div>
                <span>الجوال</span>
                <b>{order.phone || "غير متوفر"}</b>
              </div>
              <div>
                <span>المدينة</span>
                <b>{order.city || "غير محدد"}</b>
              </div>
              <div>
                <span>الإجمالي</span>
                <b>{formatPrice(order.total)} ر.س</b>
              </div>
              <div>
                <span>الكوبون</span>
                <b>
                  {order.couponCode
                    ? `${order.couponCode} (${order.couponPercent || 0}%)`
                    : "لا يوجد"}
                </b>
              </div>
              <div>
                <span>عدد المنتجات</span>
                <b>{order.items.length}</b>
              </div>
              <div className="wide">
                <span>تاريخ الطلب</span>
                <b>{formatOrderDate(order.createdAt)}</b>
              </div>
            </div>

            {order.address && (
              <div className="order-address">
                <span>العنوان</span>
                <b>{order.address}</b>
              </div>
            )}

            <div className="order-items-pro">
              {order.items.slice(0, 4).map((item, index) => (
                <div key={index}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name || "منتج"}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span>{item.name}</span>
                  <b>{item.qty || 1}x</b>
                </div>
              ))}
              {order.items.length > 4 && (
                <small>+{order.items.length - 4} منتجات أخرى</small>
              )}
            </div>

            <div className="order-shipping-box">
              <div className="shipping-head">
                <span>بيانات الشحن</span>
                <b>
                  {order.shippingCompany === "other"
                    ? order.customShipping || "أخرى"
                    : order.shippingCompany || "لم يتم التحديد"}
                </b>
              </div>

              <div className="shipping-fields-grid">
                <select
                  value={order.shippingCompany || ""}
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      shippingCompany: e.target.value,
                    })
                  }
                >
                  <option value="">اختر شركة الشحن</option>
                  <option value="Aramex">Aramex</option>
                  <option value="SMSA">SMSA</option>
                  <option value="DHL">DHL</option>
                  <option value="FedEx">FedEx</option>
                  <option value="other">أخرى</option>
                </select>

                <input
                  placeholder="رقم التتبع"
                  value={order.trackingNumber || ""}
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      trackingNumber: e.target.value,
                    })
                  }
                />
              </div>

              {order.shippingCompany === "other" && (
                <input
                  className="custom-shipping-input"
                  placeholder="اكتب اسم شركة الشحن"
                  value={order.customShipping || ""}
                  onChange={(e) =>
                    updateShippingInfo(order.id, {
                      customShipping: e.target.value,
                    })
                  }
                />
              )}
            </div>

            {order.trackingNumber && (
              <a
                className="tracking-link-admin"
                href={getTrackingUrl(
                  order.shippingCompany,
                  order.trackingNumber,
                  order.customShipping,
                )}
                target="_blank"
                rel="noreferrer"
              >
                فتح تتبع الشحنة
              </a>
            )}

            <div className="order-actions-pro">
              <button
                type="button"
                className="admin-secondary order-details-btn"
                onClick={() => setSelectedOrder(order)}
              >
                تفاصيل
              </button>
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
              >
                <option value="new">جديد</option>
                <option value="processing">قيد التجهيز</option>
                <option value="shipped">تم الشحن</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>

              <button
                className="danger-action"
                onClick={() => deleteOrder(order.id)}
              >
                حذف
              </button>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="admin-card empty-orders-pro">
            لا توجد طلبات مطابقة
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-modal-head">
              <div>
                <span>Order Details</span>
                <h2>تفاصيل الطلب</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                ×
              </button>
            </div>

            <div className="order-modal-info">
              <div>
                <span>رقم الطلب</span>
                <b>#{String(selectedOrder.id || "").slice(0, 10)}</b>
              </div>
              <div>
                <span>الحالة</span>
                <b>{selectedOrder.status || "new"}</b>
              </div>
              <div>
                <span>العميل</span>
                <b>
                  {selectedOrder.name ||
                    selectedOrder.customerName ||
                    "غير محدد"}
                </b>
              </div>
              <div>
                <span>الجوال</span>
                <b>{selectedOrder.phone || "غير متوفر"}</b>
              </div>
              <div>
                <span>الإيميل</span>
                <b>
                  {selectedOrder.email ||
                    selectedOrder.customerEmail ||
                    "غير متوفر"}
                </b>
              </div>
              <div>
                <span>الكوبون</span>
                <b>
                  {selectedOrder.couponCode
                    ? `${selectedOrder.couponCode} (${selectedOrder.couponPercent || 0}%)`
                    : "لا يوجد"}
                </b>
              </div>
              <div>
                <span>الخصم</span>
                <b>{formatPrice(Number(selectedOrder.discount || 0))} ر.س</b>
              </div>
              <div>
                <span>الإجمالي</span>
                <b>{formatPrice(Number(selectedOrder.total || 0))} ر.س</b>
              </div>
              <div>
                <span>تاريخ الطلب</span>
                <b>{formatOrderDate(selectedOrder.createdAt)}</b>
              </div>
              <div className="wide">
                <span>العنوان</span>
                <b>{selectedOrder.address || "غير متوفر"}</b>
              </div>
            </div>

            <div className="order-modal-products">
              <h3>{t("products")}</h3>
              {(selectedOrder.items || []).length ? (
                (selectedOrder.items || []).map((item, i) => (
                  <div className="order-modal-item" key={i}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || "product"}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="order-modal-no-img">🌿</div>
                    )}
                    <div>
                      <b>{item.name || "منتج"}</b>
                      <span>
                        {item.selectedSize || item.size || item.category || ""}
                      </span>
                    </div>
                    <em>{item.qty || 1}x</em>
                  </div>
                ))
              ) : (
                <p className="order-modal-empty">
                  لا توجد منتجات داخل هذا الطلب.
                </p>
              )}
            </div>

            <button
              type="button"
              className="admin-primary modal-close-main"
              onClick={() => setSelectedOrder(null)}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


export default OrdersPanel;
