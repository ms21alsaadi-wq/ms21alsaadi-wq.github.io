import { CheckCircle2 } from "lucide-react";

function StoreReturnPolicy({ settings = {} }) {
  const returnDays = Number(settings.returnPolicyDays || 7);
  const items = [
    {
      title: "مدة الاسترجاع",
      text:
        settings.returnPolicyText ||
        `يمكن طلب الاسترجاع أو الاستبدال خلال ${returnDays} أيام من استلام الطلب.`,
    },
    {
      title: "حالة المنتج",
      text: "يشترط أن يكون المنتج بحالته الأصلية وغير مستخدم ومع كامل التغليف إن وجد.",
    },
    {
      title: "المنتجات المستثناة",
      text: "قد لا يشمل الاسترجاع المنتجات المتضررة بسبب سوء العناية أو المنتجات المخصصة حسب الطلب.",
    },
    {
      title: "طريقة الطلب",
      text: "للاسترجاع أو الاستبدال تواصل معنا عبر الواتساب مع رقم الطلب وصور المنتج.",
    },
  ];

  return (
    <section className="container store-return-policy" id="return-policy">
      <div className="store-return-policy-head">
        <span>Return Policy</span>
        <h2>سياسة الاسترجاع والاستبدال</h2>
        <p>
          {settings.privacyNote ||
            "حرصًا على تجربة شراء واضحة، هذه السياسة توضح أهم شروط الاسترجاع والاستبدال قبل إتمام الطلب."}
        </p>
      </div>
      <div className="store-return-policy-grid">
        {items.map((item) => (
          <div className="store-return-policy-card" key={item.title}>
            <CheckCircle2 size={20} />
            <div>
              <b>{item.title}</b>
              <p>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StoreReturnPolicy;
