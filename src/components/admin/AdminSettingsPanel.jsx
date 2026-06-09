import {
  Eye,
  Palette,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { STORE_WHATSAPP } from "../../data/storeData.js";
import { formatPrice } from "../../utils/helpers.js";

function AdminSettingsPanel({
  settings,
  draftSettings,
  updateDraft,
  saveDraftSettings,
  resetDraftSettings,
  uploadSettingImage,
  setTab,
}) {
  const storeStatuses = [
    {
      value: "open",
      label: "مفتوح",
      desc: "العملاء يستطيعون تصفح المتجر وإرسال الطلبات.",
    },
    {
      value: "maintenance",
      label: "صيانة",
      desc: "إظهار رسالة تنبيه وإيقاف استقبال الطلبات مؤقتًا.",
    },
    {
      value: "paused",
      label: "متوقف مؤقتًا",
      desc: "المتجر ظاهر لكن إتمام الطلب متوقف.",
    },
  ];

  const currentStatus = draftSettings.storeStatus || "open";
  const statusMeta =
    storeStatuses.find((item) => item.value === currentStatus) ||
    storeStatuses[0];
  const numberValue = (key, fallback = 0) =>
    draftSettings[key] === undefined || draftSettings[key] === null
      ? fallback
      : draftSettings[key];
  const textValue = (key, fallback = "") =>
    draftSettings[key] === undefined || draftSettings[key] === null
      ? fallback
      : draftSettings[key];

  const saveAndStay = async () => {
    await saveDraftSettings();
  };

  return (
    <section className="admin-settings-page">
      <div className="admin-card settings-hero-card">
        <div className="pro-card-head settings-head">
          <div>
            <span>Store Settings</span>
            <h2>الإعدادات</h2>
            <p>
              إدارة تشغيل المتجر، الشحن، التواصل، وسياسات الخدمة من مكان واحد.
            </p>
          </div>
          <div className={`settings-status-pill ${currentStatus}`}>
            <i></i>
            {statusMeta.label}
          </div>
        </div>

        <div className="settings-quick-grid">
          <div>
            <span>حالة المتجر</span>
            <b>{statusMeta.label}</b>
            <small>{statusMeta.desc}</small>
          </div>
          <div>
            <span>رسوم الشحن</span>
            <b>{formatPrice(numberValue("shippingFee", 35))} ر.س</b>
            <small>
              حد الشحن المجاني: {formatPrice(numberValue("freeShippingThreshold", 0))} ر.س
            </small>
          </div>
          <div>
            <span>أقل طلب</span>
            <b>{formatPrice(numberValue("minimumOrderTotal", 0))} ر.س</b>
            <small>0 يعني بدون حد أدنى.</small>
          </div>
          <div>
            <span>تنبيهات الإدارة</span>
            <b>{settings.notificationsBrowser ? "مفعلة" : "داخل اللوحة"}</b>
            <small>{settings.notificationEmail || "لم يتم تحديد بريد تنبيهات"}</small>
          </div>
        </div>
      </div>

      <div className="settings-grid-pro">
        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Settings size={20} />
            <div>
              <h3>تشغيل المتجر</h3>
              <p>تحكم في استقبال الطلبات ورسالة الصيانة.</p>
            </div>
          </div>

          <label>
            حالة المتجر
            <select
              value={currentStatus}
              onChange={(e) => updateDraft("storeStatus", e.target.value)}
            >
              {storeStatuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="setting-toggle-row">
            <input
              type="checkbox"
              checked={draftSettings.checkoutEnabled !== false}
              onChange={(e) => updateDraft("checkoutEnabled", e.target.checked)}
            />
            <span>
              <b>تفعيل إتمام الطلب</b>
              <small>عند إيقافه لن يستطيع العميل إرسال طلب عبر الواتساب.</small>
            </span>
          </label>

          <label>
            عنوان رسالة الصيانة
            <input
              value={textValue("maintenanceTitle", "المتجر تحت الصيانة")}
              onChange={(e) => updateDraft("maintenanceTitle", e.target.value)}
              placeholder="المتجر تحت الصيانة"
            />
          </label>

          <label>
            رسالة تظهر للعميل عند إيقاف الطلبات
            <textarea
              rows="4"
              value={textValue(
                "maintenanceMessage",
                "نرتب لك تجربة أفضل. الطلبات متوقفة مؤقتًا وسنعود قريبًا.",
              )}
              onChange={(e) => updateDraft("maintenanceMessage", e.target.value)}
              placeholder="اكتب رسالة واضحة للعميل"
            />
          </label>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Truck size={20} />
            <div>
              <h3>الشحن والطلبات</h3>
              <p>هذه القيم تؤثر مباشرة على سلة العميل وإتمام الطلب.</p>
            </div>
          </div>

          <div className="settings-two-cols">
            <label>
              رسوم الشحن
              <input
                type="number"
                min="0"
                value={numberValue("shippingFee", 35)}
                onChange={(e) => updateDraft("shippingFee", Number(e.target.value || 0))}
              />
            </label>
            <label>
              الشحن المجاني من
              <input
                type="number"
                min="0"
                value={numberValue("freeShippingThreshold", 0)}
                onChange={(e) =>
                  updateDraft("freeShippingThreshold", Number(e.target.value || 0))
                }
              />
            </label>
          </div>

          <div className="settings-two-cols">
            <label>
              الحد الأدنى للطلب
              <input
                type="number"
                min="0"
                value={numberValue("minimumOrderTotal", 0)}
                onChange={(e) =>
                  updateDraft("minimumOrderTotal", Number(e.target.value || 0))
                }
              />
            </label>
            <label>
              بادئة رقم الطلب
              <input
                value={textValue("orderPrefix", "GD")}
                onChange={(e) => updateDraft("orderPrefix", e.target.value)}
                placeholder="GD"
              />
            </label>
          </div>

          <label>
            نص التوصيل في صفحة المنتج
            <textarea
              rows="3"
              value={textValue(
                "deliveryInfo",
                "توصيل سريع داخل السعودية مع تغليف يحافظ على النبات.",
              )}
              onChange={(e) => updateDraft("deliveryInfo", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <Phone size={20} />
            <div>
              <h3>قنوات التواصل</h3>
              <p>تظهر في الهيدر وتستخدمها الإشعارات الإدارية.</p>
            </div>
          </div>

          <label>
            واتساب المتجر
            <input
              value={textValue("homeHeaderWhatsapp", STORE_WHATSAPP)}
              onChange={(e) => updateDraft("homeHeaderWhatsapp", e.target.value)}
              placeholder="9665xxxxxxxx"
            />
          </label>

          <div className="settings-two-cols">
            <label>
              بريد الدعم
              <input
                type="email"
                value={textValue("supportEmail", "")}
                onChange={(e) => updateDraft("supportEmail", e.target.value)}
                placeholder="support@example.com"
              />
            </label>
            <label>
              بريد الإشعارات
              <input
                type="email"
                value={textValue("notificationEmail", "")}
                onChange={(e) => updateDraft("notificationEmail", e.target.value)}
                placeholder="admin@example.com"
              />
            </label>
          </div>

          <div className="settings-two-cols">
            <label>
              Instagram
              <input
                value={textValue("homeHeaderInstagram", "")}
                onChange={(e) => updateDraft("homeHeaderInstagram", e.target.value)}
                placeholder="رابط أو اسم الحساب"
              />
            </label>
            <label>
              TikTok
              <input
                value={textValue("homeHeaderTiktok", "")}
                onChange={(e) => updateDraft("homeHeaderTiktok", e.target.value)}
                placeholder="رابط أو اسم الحساب"
              />
            </label>
          </div>
        </div>

        <div className="admin-card settings-section-card">
          <div className="settings-section-title">
            <ShieldCheck size={20} />
            <div>
              <h3>السياسات والثقة</h3>
              <p>نصوص مختصرة تساعد العميل قبل الشراء.</p>
            </div>
          </div>

          <label>
            ملاحظة الخصوصية
            <textarea
              rows="3"
              value={textValue(
                "privacyNote",
                "نستخدم بياناتك فقط لتجهيز الطلب والتواصل بخصوص الشحن والدعم.",
              )}
              onChange={(e) => updateDraft("privacyNote", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-card settings-section-card settings-logo-card">
          <div className="settings-section-title">
            <Palette size={20} />
            <div>
              <h3>لمسة سريعة للهوية</h3>
              <p>اختصار لتعديل اسم المتجر والشعار بدون الرجوع لهوية المتجر.</p>
            </div>
          </div>

          <div className="settings-two-cols">
            <label>
              اسم المتجر
              <input
                value={textValue("storeName", "GREEN DIXAM")}
                onChange={(e) => updateDraft("storeName", e.target.value)}
              />
            </label>
            <label>
              الشعار النصي
              <input
                value={textValue("tagline", "rare nature, refined living")}
                onChange={(e) => updateDraft("tagline", e.target.value)}
              />
            </label>
          </div>

          <label>
            رابط الشعار
            <input
              value={textValue("logo", "")}
              onChange={(e) => updateDraft("logo", e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="settings-file-upload">
            رفع شعار من الجهاز
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadSettingImage("logo", e.target.files?.[0])}
            />
          </label>
          {draftSettings.logo && (
            <div className="settings-logo-preview">
              <img src={draftSettings.logo} alt="logo preview" />
            </div>
          )}
        </div>

        <div className="admin-card settings-section-card settings-preview-card">
          <div className="settings-section-title">
            <Eye size={20} />
            <div>
              <h3>معاينة سريعة</h3>
              <p>ملخص ما سيطبّق بعد الحفظ.</p>
            </div>
          </div>

          <div className={`settings-store-preview ${currentStatus}`}>
            <span>{textValue("storeName", "GREEN DIXAM")}</span>
            <h3>{statusMeta.label}</h3>
            <p>
              {currentStatus === "open"
                ? "المتجر يستقبل الطلبات بشكل طبيعي."
                : textValue(
                    "maintenanceMessage",
                    "الطلبات متوقفة مؤقتًا وسنعود قريبًا.",
                  )}
            </p>
            <div>
              <b>الشحن: {formatPrice(numberValue("shippingFee", 35))} ر.س</b>
              <b>أقل طلب: {formatPrice(numberValue("minimumOrderTotal", 0))} ر.س</b>
            </div>
          </div>

          <button
            type="button"
            className="admin-secondary"
            onClick={() => setTab("notifications")}
          >
            فتح إعدادات الإشعارات
          </button>
        </div>
      </div>

      <div className="admin-save-bar settings-save-bar">
        <div>
          <b>التغييرات غير محفوظة حتى تضغط حفظ</b>
          <span>سيتم حفظ كل الإعدادات في Firebase وتظهر مباشرة في المتجر.</span>
        </div>
        <div className="save-bar-actions">
          <button className="admin-secondary" onClick={resetDraftSettings}>
            إلغاء التغييرات
          </button>
          <button className="admin-primary" onClick={saveAndStay}>
            <Save size={17} /> حفظ الإعدادات
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminSettingsPanel;
