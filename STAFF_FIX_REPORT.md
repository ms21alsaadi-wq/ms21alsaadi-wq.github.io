# Staff Login + Eye Icon Fix Report

## 1. سبب مشكلة الموظف المحذوف ثم المعاد إضافته

الموظف عندما يتم حذفه من جدول `staffUsers` قد يبقى حسابه موجودًا داخل Firebase Authentication. Firebase لا يسمح من كود الواجهة بتغيير كلمة مرور حساب موجود سابقًا، لذلك الرمز المؤقت الجديد لا يعمل إلا إذا تم تحديث كلمة مرور حساب Auth من Backend آمن.

## 2. ما الذي تم إصلاحه

- تعديل `vercel.json` حتى لا يتم تحويل `/api/staff-auth` إلى صفحة المتجر.
- إضافة API آمن في `api/staff-auth.js` يدعم:
  - إنشاء موظف جديد.
  - إعادة تفعيل حساب Auth قديم.
  - تعيين كلمة مرور مؤقتة جديدة.
  - تعطيل حساب Auth عند حذف الموظف.
  - تفعيل الرمز المؤقت من صفحة الدخول إذا فشل تسجيل الدخول أول مرة.
- تحديث `src/services/staffAuthApi.js` لدعم استدعاءات الإدارة واستدعاء تفعيل الرمز المؤقت من صفحة الدخول.
- تحديث صفحة دخول لوحة التحكم بحيث إذا ظهرت `بيانات الدخول غير صحيحة` بسبب حساب قديم، تحاول تفعيل الرمز المؤقت ثم تعيد تسجيل الدخول تلقائيًا.
- تحديث زر استعادة كلمة المرور للموظف ليصدر كلمة مرور مؤقتة جديدة إن كانت خدمة Firebase Admin مفعلة.

## 3. أيقونة العين

- تم تثبيت زر العين داخل حقل كلمة المرور في صفحة `/admin`.
- تم وضع CSS أقوى في آخر `src/styles.css` حتى يظهر الزر في RTL وعلى الجوال.
- الزر يغير نوع الحقل بين `password` و`text` لإظهار أو إخفاء الرمز.

## 4. شرط مهم على Vercel

حتى يعمل دخول الموظف القديم بالرمز المؤقت الجديد، يجب إضافة متغيرات Firebase Admin في Vercel ثم عمل Redeploy:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

أو استخدم متغيرًا واحدًا:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"your_project_id","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"}
```

بدون هذه المتغيرات سيبقى المتجر يعمل، لكن تغيير كلمة مرور حساب Firebase Auth قديم لن يتم تلقائيًا.

## 5. الاختبار

تم تشغيل:

```bash
npm run build
```

والبناء نجح بدون أخطاء.
