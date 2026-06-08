import { KeyRound, Save, ShieldCheck } from "lucide-react";

const defaultProviders = [
  {
    id: "moyasar",
    name: "مويسر",
    badge: "Moyasar",
    enabled: false,
    visible: true,
    mode: "test",
    minAmount: 0,
    maxAmount: 0,
    note: "يدعم مدى والبطاقات وApple Pay حسب تفعيل حسابك.",
  },
  {
    id: "tabby",
    name: "تابي",
    badge: "tabby",
    enabled: false,
    visible: true,
    mode: "test",
    minAmount: 0,
    maxAmount: 0,
    note: "الدفع الآجل أو التقسيط يحتاج قبول حساب تاجر من تابي.",
  },
  {
    id: "tamara",
    name: "تمارا",
    badge: "Tamara",
    enabled: false,
    visible: true,
    mode: "test",
    minAmount: 0,
    maxAmount: 0,
    note: "الدفع الآجل أو التقسيط يحتاج قبول حساب تاجر من تمارا.",
  },
  {
    id: "cod",
    name: "الدفع عند الاستلام",
    badge: "COD",
    enabled: true,
    visible: true,
    mode: "live",
    minAmount: 0,
    maxAmount: 0,
    note: "لا يحتاج بوابة دفع، لكنه يحتاج سياسة واضحة للعميل.",
  },
  {
    id: "bank",
    name: "تحويل بنكي",
    badge: "Bank",
    enabled: false,
    visible: true,
    mode: "live",
    minAmount: 0,
    maxAmount: 0,
    note: "أضف بيانات الحساب لاحقاً في وصف طريقة الدفع.",
  },
];

function mergeProviders(providers = []) {
  const saved = Array.isArray(providers) ? providers : [];
  return defaultProviders.map((provider) => ({
    ...provider,
    ...(saved.find((item) => item.id === provider.id) || {}),
  }));
}

function PaymentsPanel({
  draftSettings,
  updateDraft,
  saveDraftSettings,
  resetDraftSettings,
}) {
  const providers = mergeProviders(draftSettings.paymentProviders);
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const visibleProviders = providers.filter((provider) => provider.visible);

  const updateProvider = (providerId, changes) => {
    updateDraft(
      "paymentProviders",
      providers.map((provider) =>
        provider.id === providerId ? { ...provider, ...changes } : provider,
      ),
    );
  };

  return (
    <section className="payments-admin-page">
      <div className="payments-hero admin-card">
        <div>
          <span>Payment Gateways</span>
          <h2>المدفوعات</h2>
          <p>
            جهز طرق الدفع التي ستظهر للعميل. الربط الحقيقي يحتاج مفاتيح سرية
            محفوظة في Vercel وملفات API آمنة.
          </p>
        </div>
        <div className="payments-hero-stats">
          <div>
            <b>{enabledProviders.length}</b>
            <small>مفعلة</small>
          </div>
          <div>
            <b>{visibleProviders.length}</b>
            <small>ظاهرة للعميل</small>
          </div>
        </div>
      </div>

      <div className="payment-security-note">
        <ShieldCheck />
        <div>
          <b>تنبيه أمان مهم</b>
          <span>
            لا تضع المفاتيح السرية هنا. هذه الصفحة تتحكم في العرض والتفعيل فقط،
            أما مفاتيح Moyasar أو Tabby أو Tamara السرية تكون داخل Vercel.
          </span>
        </div>
      </div>

      <div className="payment-settings-card admin-card">
        <label>
          رسالة تظهر في صفحة الدفع
          <textarea
            rows="3"
            value={draftSettings.paymentNotice || ""}
            onChange={(e) => updateDraft("paymentNotice", e.target.value)}
            placeholder="مثال: جميع المدفوعات آمنة ومحمية."
          />
        </label>
      </div>

      <div className="payment-providers-grid">
        {providers.map((provider) => (
          <article className="payment-provider-card" key={provider.id}>
            <div className="payment-provider-head">
              <span className={`payment-provider-badge ${provider.id}`}>
                {provider.badge}
              </span>
              <div>
                <h3>{provider.name}</h3>
                <p>{provider.note}</p>
              </div>
            </div>

            <div className="payment-provider-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={(e) =>
                    updateProvider(provider.id, { enabled: e.target.checked })
                  }
                />
                مفعلة
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={provider.visible !== false}
                  onChange={(e) =>
                    updateProvider(provider.id, { visible: e.target.checked })
                  }
                />
                تظهر للعميل
              </label>
            </div>

            <div className="payment-provider-fields">
              <label>
                الاسم الظاهر
                <input
                  value={provider.name}
                  onChange={(e) =>
                    updateProvider(provider.id, { name: e.target.value })
                  }
                />
              </label>
              <label>
                شارة الدفع
                <input
                  value={provider.badge}
                  onChange={(e) =>
                    updateProvider(provider.id, { badge: e.target.value })
                  }
                />
              </label>
              <label>
                الوضع
                <select
                  value={provider.mode || "test"}
                  onChange={(e) =>
                    updateProvider(provider.id, { mode: e.target.value })
                  }
                >
                  <option value="test">تجربة</option>
                  <option value="live">فعلي</option>
                </select>
              </label>
              <label>
                أقل مبلغ
                <input
                  type="number"
                  min="0"
                  value={provider.minAmount || 0}
                  onChange={(e) =>
                    updateProvider(provider.id, {
                      minAmount: Number(e.target.value || 0),
                    })
                  }
                />
              </label>
              <label>
                أعلى مبلغ
                <input
                  type="number"
                  min="0"
                  value={provider.maxAmount || 0}
                  onChange={(e) =>
                    updateProvider(provider.id, {
                      maxAmount: Number(e.target.value || 0),
                    })
                  }
                />
              </label>
            </div>

            <div className="payment-provider-api">
              <KeyRound />
              <span>
                الربط الفعلي لـ {provider.name} سيتم لاحقاً عبر ملف API آمن
                ومفاتيح Vercel.
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-save-bar settings-save-bar">
        <div>
          <b>التغييرات غير محفوظة حتى تضغط حفظ</b>
          <span>ستظهر طرق الدفع المفعلة لاحقاً في السلة وصفحة الدفع.</span>
        </div>
        <div className="save-bar-actions">
          <button className="admin-secondary" onClick={resetDraftSettings}>
            إلغاء التغييرات
          </button>
          <button className="admin-primary" onClick={saveDraftSettings}>
            <Save size={17} /> حفظ المدفوعات
          </button>
        </div>
      </div>
    </section>
  );
}

export default PaymentsPanel;
