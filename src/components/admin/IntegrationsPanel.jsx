import {
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  Mail,
  MessageCircle,
  Plug,
  ShieldCheck,
} from "lucide-react";

const integrations = [
  {
    title: "واتساب",
    description: "رقم التواصل وروابط إرسال الطلبات والتنبيهات للعملاء.",
    icon: MessageCircle,
    status: "متصل من إعدادات المتجر",
  },
  {
    title: "البريد الإلكتروني",
    description: "خدمات إرسال رسائل الطلبات والإشعارات للعملاء.",
    icon: Mail,
    status: "جاهز للربط",
  },
  {
    title: "Firebase",
    description: "قاعدة بيانات المنتجات والطلبات والعملاء ولوحة الإدارة.",
    icon: Database,
    status: "نشط",
  },
  {
    title: "Vercel",
    description: "نشر الموقع وربطه بالمستودع حتى تظهر التحديثات تلقائياً.",
    icon: Cloud,
    status: "مرتبط بالمستودع",
  },
  {
    title: "الحماية والصلاحيات",
    description: "صلاحيات الموظفين، تسجيل الدخول، وحماية أقسام لوحة الإدارة.",
    icon: ShieldCheck,
    status: "نشط",
  },
];

const apiEndpoints = [
  {
    label: "إدارة الموظفين",
    path: "/api/staff-auth",
    method: "POST",
  },
];

export default function IntegrationsPanel({
  draftSettings,
  saveSettings,
  setDraftSettings,
}) {
  const pages = Array.isArray(draftSettings?.homePages)
    ? draftSettings.homePages
    : [];
  const apiPageExists = pages.some((page) => page?.href === "/page/api");

  const addApiPage = async () => {
    if (apiPageExists) return;
    const nextPages = [
      ...pages,
      {
        label: "API",
        href: "/page/api",
        visible: true,
      },
    ];
    setDraftSettings((prev) => ({ ...prev, homePages: nextPages }));
    await saveSettings({ homePages: nextPages });
  };

  return (
    <section className="admin-card integrations-panel">
      <div className="pro-card-head integrations-head">
        <div>
          <span>Integrations</span>
          <h2>التكاملات</h2>
          <p>
            مركز واحد لمتابعة وربط خدمات المتجر الخارجية مثل واتساب، البريد،
            النشر، وقاعدة البيانات.
          </p>
        </div>
        <div className="integrations-head-icon">
          <Plug size={26} />
        </div>
      </div>

      <div className="integrations-grid">
        {integrations.map(({ title, description, icon: Icon, status }) => (
          <article className="integration-card" key={title}>
            <div className="integration-icon">
              <Icon size={22} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span>
                <CheckCircle2 size={15} /> {status}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="api-page-manager">
        <div className="api-page-main">
          <div className="integration-icon">
            <Code2 size={22} />
          </div>
          <div>
            <span>API page</span>
            <h3>صفحة API في المتجر</h3>
            <p>
              أضف صفحة ظاهرة في المتجر باسم API ورابطها /page/api، ثم تقدر
              تطورها لاحقاً كمركز شرح للتكاملات أو روابط الخدمات.
            </p>
          </div>
        </div>

        <div className="api-page-actions">
          <code>/page/api</code>
          <button
            type="button"
            className="admin-primary"
            onClick={addApiPage}
            disabled={apiPageExists}
          >
            {apiPageExists ? "صفحة API مضافة" : "إضافة صفحة API"}
          </button>
        </div>

        <div className="api-endpoints-list">
          <b>نقاط API الحالية</b>
          {apiEndpoints.map((endpoint) => (
            <div className="api-endpoint-row" key={endpoint.path}>
              <span>{endpoint.method}</span>
              <code>{endpoint.path}</code>
              <small>{endpoint.label}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
