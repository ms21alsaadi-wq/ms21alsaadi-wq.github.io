import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import { isStaffDisabled, normalizeStaffPermissions } from "../../data/adminPermissions.js";
import { firebaseError } from "../../utils/helpers.js";
import { activateStaffTemporaryPassword } from "../../services/staffAuthApi.js";

function AdminLogin({ go, settings }) {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function finishLogin(cred, email) {
    const normalizedEmail = String(email || cred.user.email || "")
      .trim()
      .toLowerCase();
    const adminSnap = await getDoc(doc(db, "admins", cred.user.uid));
    const adminData = adminSnap.exists() ? adminSnap.data() || {} : null;
    const adminBlocked = Boolean(
      adminData?.disabled ||
        adminData?.isDeleted ||
        adminData?.deleted ||
        adminData?.status === "deleted" ||
        adminData?.status === "disabled",
    );

    const staffByUidSnap = await getDoc(doc(db, "staffUsers", cred.user.uid));
    let staffRecord = staffByUidSnap.exists()
      ? { id: cred.user.uid, ...staffByUidSnap.data() }
      : null;

    const staffByEmailSnap = await getDocs(
      query(collection(db, "staffUsers"), where("email", "==", normalizedEmail)),
    );
    const emailStaffRecords = staffByEmailSnap.docs.map((staffDoc) => ({
      id: staffDoc.id,
      ...(staffDoc.data() || {}),
    }));
    const activeEmailStaff = emailStaffRecords.find(
      (item) => !isStaffDisabled(item),
    );
    if (!staffRecord || isStaffDisabled(staffRecord)) {
      staffRecord = activeEmailStaff || staffRecord;
    }

    const canEnterAsStaff = Boolean(
      staffRecord && !isStaffDisabled(staffRecord),
    );
    const isStaffAdminAccount = Boolean(adminData?.staffUser || staffRecord);

    if (
      (adminBlocked && !canEnterAsStaff) ||
      (!adminSnap.exists() && !canEnterAsStaff) ||
      (isStaffAdminAccount && !canEnterAsStaff)
    ) {
      await signOut(auth);
      setMessage("هذا الحساب غير مصرح له بدخول لوحة التحكم أو تم حذفه/تعطيله.");
      return false;
    }

    if (canEnterAsStaff) {
      const permissions = normalizeStaffPermissions(staffRecord.permissions);
      await setDoc(
        doc(db, "staffUsers", cred.user.uid),
        {
          ...staffRecord,
          email: normalizedEmail,
          authUid: cred.user.uid,
          status: "active",
          disabled: false,
          isDeleted: false,
          deleted: false,
          invitationStatus: "accepted",
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "admins", cred.user.uid),
        {
          email: normalizedEmail,
          role: staffRecord.role || "staff",
          permissions,
          staffUser: true,
          status: "active",
          disabled: false,
          isDeleted: false,
          deleted: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setMessage("");
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setMessage("");
    setBusy(true);

    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await finishLogin(cred, email);
    } catch (err) {
      const code = String(err?.code || "").toLowerCase();
      const canTryTemporaryCode =
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-disabled") ||
        code.includes("user-not-found");

      if (canTryTemporaryCode) {
        try {
          setMessage("جاري تفعيل الرمز المؤقت...");
          await activateStaffTemporaryPassword({ email, password });
          const cred = await signInWithEmailAndPassword(auth, email, password);
          await finishLogin(cred, email);
          return;
        } catch (temporaryError) {
          setMessage(temporaryError?.message || firebaseError(err));
          return;
        }
      }

      setMessage(firebaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      settings={settings}
      title="دخول لوحة التحكم"
      subtitle="لوحة التحكم مخصصة لحسابات الأدمن المصرح لها فقط."
    >
      <form onSubmit={submit} className="login-form">
        <label>
          <span>
            <Mail size={16} /> الإيميل
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue={
              new URLSearchParams(window.location.search).get("email") || ""
            }
          />
        </label>
        <label>
          <span>
            <Lock size={16} /> كلمة المرور
          </span>
          <div className="password-input-wrap admin-login-password-wrap">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength="6"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-visibility-button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={2.4} /> : <Eye size={20} strokeWidth={2.4} />}
            </button>
          </div>
        </label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary" disabled={busy}>
          {busy ? "جاري الدخول..." : "دخول"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => go("/")}
          disabled={busy}
        >
          رجوع للمتجر
        </button>
      </form>
    </AuthShell>
  );
}

function StaffTemporaryPasswordGate({ staffProfile, settings }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const newPassword = event.target.newPassword.value;
    const confirmPassword = event.target.confirmPassword.value;

    if (newPassword.length < 8) {
      setMessage("كلمة المرور الجديدة يجب أن تكون 8 أحرف أو أكثر");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("تأكيد كلمة المرور غير مطابق");
      return;
    }

    try {
      setBusy(true);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("no-current-user");

      await updatePassword(currentUser, newPassword);
      await setDoc(
        doc(db, "staffUsers", currentUser.uid),
        {
          mustChangePassword: false,
          invitePassword: "",
          invitationStatus: "accepted",
          passwordChangedAtMs: Date.now(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "admins", currentUser.uid),
        {
          mustChangePassword: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setMessage("تم تغيير كلمة المرور بنجاح. جاري فتح لوحة التحكم...");
    } catch (error) {
      if (error?.code === "auth/requires-recent-login") {
        setMessage(
          "انتهت صلاحية جلسة الدخول. سجّل خروج ثم ادخل بكلمة المرور المؤقتة وحاول مرة أخرى.",
        );
      } else {
        setMessage(firebaseError(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="staff-password-modal-lock"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-password-title"
    >
      <div className="staff-password-modal-backdrop" />
      <div className="staff-password-modal-card staff-password-card">
        <div className="login-brand-mark">
          {settings?.logo ? (
            <img src={settings.logo} alt="logo" />
          ) : (
            <ShieldCheck size={34} />
          )}
        </div>
        <span className="staff-password-eyebrow">حماية الحساب</span>
        <h1 id="staff-password-title">غيّر كلمة المرور المؤقتة</h1>
        <p>
          مرحبًا {staffProfile?.name || auth.currentUser?.email || ""}، دخلت
          بنجاح. قبل استخدام لوحة التحكم لازم تختار كلمة مرور جديدة خاصة بك.
        </p>
        <form onSubmit={submit} className="login-form staff-password-form">
          <label>
            <span>
              <Lock size={16} /> كلمة المرور الجديدة
            </span>
            <input
              name="newPassword"
              type="password"
              minLength="8"
              required
              placeholder="8 أحرف أو أكثر"
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label>
            <span>
              <Lock size={16} /> تأكيد كلمة المرور
            </span>
            <input
              name="confirmPassword"
              type="password"
              minLength="8"
              required
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
            />
          </label>
          <button className="admin-primary" disabled={busy}>
            {busy ? "جاري الحفظ..." : "تغيير كلمة المرور والمتابعة"}
          </button>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => signOut(auth)}
          >
            تسجيل خروج
          </button>
          {message && <p className="auth-message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

function CustomerAuth({ go, settings }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const name = e.target.name.value.trim();
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "customers", cred.user.uid), {
          name,
          email,
          phone: "",
          city: "",
          address: "",
          createdAt: serverTimestamp(),
          ordersCount: 0,
        });
      }
      go("/account");
    } catch (err) {
      setMessage(firebaseError(err));
    }
  }

  return (
    <AuthShell
      settings={settings}
      title={mode === "login" ? "دخول العميل" : "إنشاء حساب عميل"}
      subtitle="سجل حسابك لحفظ بياناتك واستخدامها في الطلبات القادمة."
    >
      <form onSubmit={submit} className="login-form">
        {mode === "signup" && (
          <label>
            <span>
              <User size={16} /> الاسم
            </span>
            <input name="name" required />
          </label>
        )}
        <label>
          <span>
            <Mail size={16} /> الإيميل
          </span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>
            <Lock size={16} /> كلمة المرور
          </span>
          <input name="password" type="password" required minLength="6" />
        </label>
        {message && <div className="error">{message}</div>}
        <button className="admin-primary">
          {mode === "login" ? "دخول" : "إنشاء حساب"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "إنشاء حساب جديد" : "عندي حساب"}
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => go("/")}
        >
          رجوع للمتجر
        </button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children, settings }) {
  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-brand-mark">
          {settings?.logo ? (
            <img
              src={settings.logo}
              alt="logo"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span>{settings?.storeName || "GREEN DIXAM"}</span>
          )}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}


export { AdminLogin, CustomerAuth, StaffTemporaryPasswordGate };
