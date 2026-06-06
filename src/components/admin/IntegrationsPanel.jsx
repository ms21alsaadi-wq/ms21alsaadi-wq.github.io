import {
  CheckCircle2,
  Cloud,
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

export default function IntegrationsPanel() {
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
    </section>
  );
}
