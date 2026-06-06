import {
  CheckCircle2,
  Cloud,
  Database,
  Mail,
  MessageCircle,
  PackageCheck,
  Plug,
  ShieldCheck,
  Truck,
} from "lucide-react";

const integrations = [
  {
    title: "شركات الشحن",
    description: "ربط إنشاء الشحنات، حساب الأسعار، وطباعة البوليصات.",
    icon: Truck,
    status: "جاهز للإعداد",
  },
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

const shippingCompanies = [
  {
    name: "سمسا",
    env: "SMSA_API_KEY",
    status: "يحتاج بيانات الشركة",
  },
  {
    name: "أرامكس",
    env: "ARAMEX_API_KEY",
    status: "يحتاج بيانات الشركة",
  },
  {
    name: "البريد السعودي / سبل",
    env: "SPL_API_KEY",
    status: "يحتاج بيانات الشركة",
  },
  {
    name: "DHL",
    env: "DHL_API_KEY",
    status: "يحتاج بيانات الشركة",
  },
];

const shippingEndpoints = [
  { method: "GET", path: "/api/shipping", label: "فحص حالة الربط" },
  { method: "POST", path: "/api/shipping", label: "مدخل أسعار وتتبع وإنشاء شحنات" },
];

export default function IntegrationsPanel() {
  return (
    <section className="admin-card integrations-panel">
      <div className="pro-card-head integrations-head">
        <div>
          <span>Integrations</span>
          <h2>التكاملات</h2>
          <p>
            مركز واحد لمتابعة وربط خدمات المتجر الخارجية، وأهمها شركات الشحن
            التي تحتاج مفاتيح API آمنة داخل Vercel.
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

      <div className="shipping-integration-manager">
        <div className="shipping-integration-main">
          <div className="integration-icon">
            <PackageCheck size={22} />
          </div>
          <div>
            <span>Shipping API</span>
            <h3>ربط شركات الشحن</h3>
            <p>
              هذا المكان مخصص لتجهيز ربط شركات الشحن. مفاتيح الشركات لا تُكتب
              داخل لوحة التحكم، بل تحفظ كمتغيرات آمنة في Vercel ثم تستخدمها
              ملفات API في الخادم.
            </p>
          </div>
        </div>

        <div className="shipping-company-grid">
          {shippingCompanies.map((company) => (
            <div className="shipping-company-card" key={company.name}>
              <b>{company.name}</b>
              <code>{company.env}</code>
              <span>{company.status}</span>
            </div>
          ))}
        </div>

        <div className="api-endpoints-list">
          <b>مسارات API الخاصة بالشحن</b>
          {shippingEndpoints.map((endpoint) => (
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
