
import { useState } from "react";

export default function Account({ customer = {}, setCustomer = ()=>{}, orders = [] }) {
  const [tab, setTab] = useState("profile");

  return (
    <div className="account-page">
      <div className="account-card">

        <div className="account-tabs">
          <button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>بياناتي</button>
          <button className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}>طلباتي</button>
          <button className={tab==="theme"?"active":""} onClick={()=>setTab("theme")}>المظهر</button>
          <button className={tab==="coupons"?"active":""} onClick={()=>setTab("coupons")}>الكوبونات</button>
          <button className={tab==="wallet"?"active":""} onClick={()=>setTab("wallet")}>المحفظة</button>
        </div>

        <div className="account-content">

          {tab==="profile" && (
            <>
              <h2>بيانات العميل</h2>
              <input placeholder="الاسم" value={customer.name||""}/>
              <input placeholder="الإيميل" value={customer.email||""}/>
              <input placeholder="الجوال" value={customer.phone||""}/>
              <textarea placeholder="العنوان" value={customer.address||""}/>
            </>
          )}

          {tab==="orders" && (
            <>
              <h2>طلباتي</h2>
              {orders.length===0 ? <p>لا يوجد طلبات</p> :
                orders.map((o,i)=>(
                  <div key={i} className="order-card">
                    <p>طلب #{o.id}</p>
                    <p>{o.status}</p>
                  </div>
                ))
              }
            </>
          )}

          {tab==="theme" && <p>قريبًا</p>}
          {tab==="coupons" && <p>لا يوجد كوبونات</p>}
          {tab==="wallet" && <p>0 ر.س</p>}

        </div>

      </div>
    </div>
  );
}
