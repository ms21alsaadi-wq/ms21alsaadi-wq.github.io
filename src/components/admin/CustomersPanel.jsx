import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { formatPrice } from "../../utils/helpers.js";

function CustomersPanel({ customers, orders }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((c) => {
    const text =
      `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.city || ""} ${c.address || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const selectedOrders = selected
    ? orders.filter(
        (o) =>
          o.customerId === selected.id || o.customerEmail === selected.email,
      )
    : [];

  return (
    <section className="customers-pro-page">
      <div className="admin-card customers-pro-hero">
        <div>
          <span>Customers CRM</span>
          <h2>إدارة العملاء</h2>
          <p>
            استعرض بيانات العملاء المسجلين وابحث بسرعة بالاسم أو الإيميل أو
            الجوال أو المدينة.
          </p>
        </div>

        <div className="customers-pro-stats">
          <div>
            <b>{customers.length}</b>
            <small>إجمالي العملاء</small>
          </div>
          <div>
            <b>{filteredCustomers.length}</b>
            <small>نتائج البحث</small>
          </div>
        </div>
      </div>

      <div className="admin-card customers-pro-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن عميل..."
        />
        {search && (
          <button className="admin-secondary" onClick={() => setSearch("")}>
            مسح البحث
          </button>
        )}
      </div>

      <div className="customers-pro-layout">
        <div className="admin-card customers-pro-list">
          <div className="pro-card-head">
            <div>
              <span>Customer List</span>
              <h2>قائمة العملاء</h2>
            </div>
            <b className="products-count">{filteredCustomers.length} عميل</b>
          </div>

          <div className="customers-pro-grid">
            {filteredCustomers.map((c) => (
              <button
                className={`customer-pro-card ${selected?.id === c.id ? "selected" : ""}`}
                key={c.id}
                onClick={() => setSelected(c)}
              >
                <div className="customer-pro-avatar">
                  {(c.name || c.email || "?")[0]}
                </div>
                <div className="customer-pro-info">
                  <b>{c.name || "عميل بدون اسم"}</b>
                  <span>{c.email || "لا يوجد إيميل"}</span>
                  <em>{c.phone || "لا يوجد رقم"}</em>
                </div>
                <small>{c.city || "غير محدد"}</small>
              </button>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="empty-state">لا يوجد عملاء مطابقين للبحث</div>
            )}
          </div>
        </div>

        <div className="admin-card customers-pro-details">
          {!selected ? (
            <div className="customer-pro-empty">
              <div className="customer-pro-avatar large">👤</div>
              <h2>اختر عميلًا</h2>
              <p>اضغط على أي عميل من القائمة لعرض بياناته هنا.</p>
            </div>
          ) : (
            <>
              <div className="customer-details-head">
                <div className="customer-pro-avatar large">
                  {(selected.name || selected.email || "?")[0]}
                </div>
                <div>
                  <span>Customer Details</span>
                  <h2>{selected.name || "عميل بدون اسم"}</h2>
                  <p>{selected.email || "لا يوجد إيميل"}</p>
                </div>
              </div>

              <div className="customer-detail-grid-pro">
                <div>
                  <span>الجوال</span>
                  <b>{selected.phone || "غير متوفر"}</b>
                </div>
                <div>
                  <span>المدينة</span>
                  <b>{selected.city || "غير محدد"}</b>
                </div>
                <div className="wide">
                  <span>العنوان</span>
                  <b>{selected.address || "غير متوفر"}</b>
                </div>
                <div>
                  <span>عدد الطلبات</span>
                  <b>{selectedOrders.length}</b>
                </div>
                <div>
                  <span>الحالة</span>
                  <b>مسجل</b>
                </div>
              </div>

              <div className="customer-orders-preview">
                <h3>طلبات العميل</h3>
                {selectedOrders.length ? (
                  selectedOrders.map((o) => (
                    <div className="mini-order" key={o.id}>
                      {formatPrice(o.total)} ر.س • {o.status}
                    </div>
                  ))
                ) : (
                  <p className="muted">لا توجد طلبات بعد.</p>
                )}
              </div>

              <div className="customer-detail-actions-pro">
                <button
                  className="admin-secondary"
                  onClick={() => setSelected(null)}
                >
                  إغلاق التفاصيل
                </button>
                <button
                  className="danger-action"
                  onClick={async () => {
                    if (confirm("هل تريد حذف هذا العميل من قائمة العملاء؟")) {
                      await deleteDoc(doc(db, "customers", selected.id));
                      setSelected(null);
                    }
                  }}
                >
                  حذف العميل
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


export default CustomersPanel;
