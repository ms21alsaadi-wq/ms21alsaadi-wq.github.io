# GREEN DIXAM Store

متجر React + Vite مخصص للنباتات والهدايا الخضراء، مع لوحة تحكم، منتجات، طلبات، عملاء، كوبونات، صفحات مخصصة، إشعارات بريد، وربط Firebase.

## التشغيل محليًا

```bash
npm install
npm run dev
```

## البناء للإنتاج

```bash
npm run build
npm run preview
```

## متغيرات البيئة

انسخ الملف `.env.example` إلى `.env` وعدّل القيم حسب مشروعك:

```bash
cp .env.example .env
```

المشروع يحتوي على قيم افتراضية حالية حتى لا يتوقف التشغيل، لكن الأفضل ضبط المتغيرات من لوحة Vercel للحماية وسهولة النقل بين البيئات.

## النشر على Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

ملف `vercel.json` يوجه كل المسارات إلى الصفحة الرئيسية حتى تعمل روابط المتجر الداخلية مثل `/product/...` و`/page/...`.

## هيكلة الملفات المهمة

- `src/App.jsx`: الواجهة الأساسية ومسارات المتجر ولوحة التحكم.
- `src/components/SEOManager.jsx`: إدارة عناوين الصفحات، الميتا، وبيانات JSON-LD.
- `src/data/storeData.js`: الإعدادات والمنتجات الافتراضية.
- `src/data/adminPermissions.js`: صلاحيات وأدوار المستخدمين الإداريين.
- `src/services/analytics.js`: تتبع الزوار وخطوات القمع البيعي.
- `src/services/orderNotifications.js`: إرسال تحديثات الطلب عبر EmailJS.
- `src/utils/helpers.js`: دوال مساعدة عامة.
- `src/utils/media.js`: معالجة وضغط الصور قبل الحفظ.
