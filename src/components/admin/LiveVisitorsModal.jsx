import { X } from "lucide-react";
import { formatDuration } from "../../utils/helpers.js";

function LiveVisitorsModal({ visitors = [], onClose }) {
  const formatLiveTime = (value) => {
    const stamp = Number(value || 0);
    if (!stamp) return "غير معروف";
    const diff = Math.max(0, Math.round((Date.now() - stamp) / 1000));
    if (diff < 10) return "الآن";
    if (diff < 60) return `قبل ${diff} ثانية`;
    return `قبل ${Math.round(diff / 60)} دقيقة`;
  };

  const activeCartVisitors = visitors.filter(
    (v) => Number(v.cartCount || 0) > 0,
  );
  const timezones = [
    ...new Set(visitors.map((v) => v.timezone).filter(Boolean)),
  ];

  return (
    <div className="live-modal-backdrop" onClick={onClose}>
      <div className="live-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="live-modal-head">
          <div>
            <span>Live Visitors</span>
            <h2>الزوار المباشرون</h2>
            <p>
              متابعة الزوار النشطين خلال آخر دقيقة، بدون تخزين بيانات شخصية
              حساسة.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="live-modal-summary">
          <div>
            <b>{visitors.length}</b>
            <span>زائر نشط</span>
          </div>
          <div>
            <b>{activeCartVisitors.length}</b>
            <span>لديهم منتجات بالسلة</span>
          </div>
          <div>
            <b>{timezones.length || 1}</b>
            <span>منطقة زمنية</span>
          </div>
        </div>

        <div className="live-modal-map real-map-layout">
          <div className="live-real-map-card">
            {(() => {
              const located = visitors.filter(
                (v) => Number(v.latitude || 0) && Number(v.longitude || 0),
              );
              const center = located[0];
              const lat = Number(center?.latitude || 24.7136);
              const lon = Number(center?.longitude || 46.6753);
              const bbox = `${lon - 8},${lat - 5},${lon + 8},${lat + 5}`;
              const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

              return (
                <>
                  <iframe
                    title="خريطة الزوار المباشرين"
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="live-real-map-note">
                    <b>خريطة فعلية تقريبية</b>
                    <span>
                      تعتمد على IP الزائر، لذلك الموقع تقريبي وليس عنوانًا
                      دقيقًا.
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="live-zone-list">
            <h3>أماكن تواجد الزوار</h3>
            {visitors.length ? (
              visitors.map((visitor, index) => (
                <div key={visitor.id}>
                  <span>
                    {visitor.city || visitor.country
                      ? `${visitor.city || "مدينة غير معروفة"}${visitor.country ? `، ${visitor.country}` : ""}`
                      : visitor.timezone || "موقع غير معروف"}
                  </span>
                  <b>#{index + 1}</b>
                </div>
              ))
            ) : (
              <p>لا توجد بيانات موقع بعد</p>
            )}
          </div>
        </div>

        <div className="live-visitors-table">
          <div className="live-table-head">
            <span>الزائر</span>
            <span>آخر صفحة</span>
            <span>السلة</span>
            <span>آخر نشاط</span>
            <span>آخر ظهور</span>
          </div>

          {visitors.length ? (
            visitors.map((visitor, index) => (
              <div className="live-table-row" key={visitor.id}>
                <span>زائر #{index + 1}</span>
                <span>{visitor.path || "/"}</span>
                <span>
                  {visitor.city || visitor.country
                    ? `${visitor.city || ""} ${visitor.country || ""}`
                    : `${Number(visitor.cartCount || 0)} منتج`}
                </span>
                <span>
                  {visitor.lastAction || "يتصفح المتجر"} •{" "}
                  {visitor.source || "مباشر"}
                </span>
                <span>
                  {formatLiveTime(visitor.lastSeen)} •{" "}
                  {formatDuration(visitor.sessionDuration)}
                </span>
              </div>
            ))
          ) : (
            <div className="live-empty">لا يوجد زوار نشطون الآن</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveVisitorsModal;
