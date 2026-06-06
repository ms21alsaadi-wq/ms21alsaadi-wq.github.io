import { useMemo, useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  ExternalLink,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { auth, db, firebaseConfig } from "../../firebase.js";
import {
  ADMIN_PERMISSION_DESCRIPTIONS,
  ADMIN_PERMISSION_LABELS,
  ADMIN_ROLE_DEFAULTS,
  generateStaffTemporaryPassword,
  isStaffDeleted,
  isStaffDisabled,
  normalizeStaffPermissions,
} from "../../data/adminPermissions.js";
import { firebaseError } from "../../utils/helpers.js";
import {
  disableStaffAuthUser,
  setStaffAuthPassword,
  upsertStaffAuthUser,
} from "../../services/staffAuthApi.js";

function Control({ label, children }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StaffUsersPanel({ staffUsers = [], onNotice = () => {} }) {
  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    role: "products",
    permissions: ["products"],
    status: "active",
    inviteAfterSave: true,
    tempPassword: generateStaffTemporaryPassword(),
  };

  const roleLabels = {
    owner: "مالك المتجر",
    manager: "مدير",
    products: "موظف منتجات",
    orders: "موظف طلبات",
    content: "موظف محتوى",
    support: "دعم عملاء",
  };

  const permissionLabels = ADMIN_PERMISSION_LABELS;
  const permissionDescriptions = ADMIN_PERMISSION_DESCRIPTIONS;
  const roleDefaults = ADMIN_ROLE_DEFAULTS;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [hiddenDeletedStaffKeys, setHiddenDeletedStaffKeys] = useState([]);

  const visibleStaffUsers = useMemo(() => {
    const hidden = new Set(
      hiddenDeletedStaffKeys
        .filter(Boolean)
        .map((item) => String(item).toLowerCase()),
    );
    return staffUsers.filter((user) => {
      if (isStaffDeleted(user)) return false;
      const keys = [user.id, user.authUid, user.email]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());
      return !keys.some((key) => hidden.has(key));
    });
  }, [staffUsers, hiddenDeletedStaffKeys]);

  const stats = useMemo(
    () => ({
      total: visibleStaffUsers.length,
      active: visibleStaffUsers.filter((user) => user.status !== "disabled")
        .length,
      disabled: visibleStaffUsers.filter((user) => user.status === "disabled")
        .length,
      owners: visibleStaffUsers.filter(
        (user) => user.isOwner || user.role === "owner",
      ).length,
    }),
    [visibleStaffUsers],
  );

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleStaffUsers.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        user.phone,
        roleLabels[user.role],
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? user.status !== "disabled"
          : user.status === "disabled");
      return matchesSearch && matchesStatus;
    });
  }, [visibleStaffUsers, search, statusFilter]);

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ ...emptyForm, tempPassword: generateStaffTemporaryPassword() });
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingStaff(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "products",
      permissions: normalizeStaffPermissions(user.permissions),
      status: user.status || "active",
      inviteAfterSave: false,
      tempPassword: user.invitePassword || "",
    });
    setModalOpen(true);
  };

  const setRole = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: normalizeStaffPermissions(
        roleDefaults[role] || prev.permissions,
      ),
    }));
  };

  const togglePermission = (permission) => {
    setForm((prev) => {
      const current = new Set(prev.permissions || []);
      if (current.has(permission)) current.delete(permission);
      else current.add(permission);
      return { ...prev, permissions: [...current] };
    });
  };

  const addPermission = (permission) => {
    if (!permission || editingStaff?.isOwner) return;
    setForm((prev) => {
      const current = new Set(normalizeStaffPermissions(prev.permissions));
      current.add(permission);
      return { ...prev, permissions: [...current] };
    });
  };

  const removePermission = (permission) => {
    if (editingStaff?.isOwner) return;
    setForm((prev) => ({
      ...prev,
      permissions: normalizeStaffPermissions(prev.permissions).filter(
        (item) => item !== permission,
      ),
    }));
  };

  const selectedPermissions = normalizeStaffPermissions(form.permissions);

  const getAdminInviteUrl = (user = {}) => {
    const origin =
      window.location?.origin || "https://ms21alsaadi-wq-github-io.vercel.app";
    const params = new URLSearchParams();
    if (user.email) params.set("email", user.email);
    if (user.invitationToken) params.set("invite", user.invitationToken);
    const queryString = params.toString();
    return `${origin}/admin${queryString ? `?${queryString}` : ""}`;
  };

  const buildInviteMessage = (user = {}) => {
    const permissions =
      normalizeStaffPermissions(user.permissions)
        .map((permission) => permissionLabels[permission] || permission)
        .join("، ") || "حسب الصلاحيات المحددة";
    const roleName = roleLabels[user.role] || "موظف";
    const inviteUrl = getAdminInviteUrl(user);
    return {
      url: inviteUrl,
      subject: `دعوة للانضمام إلى لوحة تحكم GREEN DIXAM`,
      body: `مرحبًا ${user.name || ""}،

تمت دعوتك للانضمام إلى لوحة تحكم متجر GREEN DIXAM.

رابط الدخول:
${inviteUrl}

بيانات الدخول:
البريد: ${user.email || ""}
كلمة المرور المؤقتة: ${user.invitePassword || "استخدم كلمة المرور التي تم تزويدك بها من مالك المتجر"}

الدور:
${roleName}

الصلاحيات:
${permissions}

ملاحظة: هذه كلمة مرور مؤقتة خاصة بحساب لوحة التحكم.

تحياتي`,
    };
  };

  const openInviteEmail = (user) => {
    if (!user?.email) {
      onNotice("لا يوجد بريد إلكتروني لهذا الموظف");
      return;
    }
    const invite = buildInviteMessage(user);
    const mailto = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(invite.subject)}&body=${encodeURIComponent(invite.body)}`;
    const opened = window.open(mailto, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = mailto;
    onNotice("إذا لم يفتح البريد عندك، استخدم زر نسخ نص الدعوة وأرسلها يدويًا");
  };

  const copyInviteLink = async (user) => {
    const invite = buildInviteMessage(user);
    const fullInviteText = `${invite.subject}

${invite.body}`;
    try {
      await navigator.clipboard.writeText(fullInviteText);
      onNotice("تم نسخ نص الدعوة كاملًا مع الرابط وكلمة المرور المؤقتة");
    } catch (error) {
      window.prompt("انسخ نص الدعوة", fullInviteText);
    }
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email) {
      onNotice("اكتب اسم الموظف والبريد الإلكتروني");
      return;
    }

    const isOwner = Boolean(editingStaff?.isOwner || form.role === "owner");
    let staffId = editingStaff?.id || `staff-${Date.now()}`;
    let authUid =
      editingStaff?.authUid ||
      (editingStaff?.id && !String(editingStaff.id).startsWith("staff-")
        ? editingStaff.id
        : "") ||
      "";
    let accountAlreadyExists = false;
    let restoredDeletedStaff = null;
    let restoredDeletedAdmin = null;
    let temporaryPassword = editingStaff
      ? editingStaff.invitePassword || ""
      : String(form.tempPassword || "").trim();
    const invitationToken =
      editingStaff?.invitationToken ||
      `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const sameEmailSnap = await getDocs(
      query(collection(db, "staffUsers"), where("email", "==", email)),
    );
    const sameAdminSnap = await getDocs(
      query(collection(db, "admins"), where("email", "==", email)),
    );
    const existingStaffDocs = sameEmailSnap.docs.map((staffDoc) => ({
      id: staffDoc.id,
      ...(staffDoc.data() || {}),
    }));
    const existingAdminDocs = sameAdminSnap.docs.map((adminDoc) => ({
      id: adminDoc.id,
      ...(adminDoc.data() || {}),
    }));

    if (!editingStaff) {
      const activeStaff = existingStaffDocs.find(
        (item) => !isStaffDisabled(item),
      );
      const activeAdmin = existingAdminDocs.find(
        (item) => !isStaffDisabled(item),
      );

      if (activeStaff || activeAdmin) {
        onNotice(
          "هذا البريد موجود بالفعل ضمن الموظفين. افتح الموظف من الجدول وعدّل بياناته بدل إضافته من جديد.",
        );
        return;
      }

      restoredDeletedStaff =
        existingStaffDocs.find(
          (item) => isStaffDisabled(item) || isStaffDeleted(item),
        ) || null;
      restoredDeletedAdmin =
        existingAdminDocs.find(
          (item) => isStaffDisabled(item) || isStaffDeleted(item),
        ) || null;

      if (restoredDeletedAdmin?.id) {
        authUid = restoredDeletedAdmin.id;
        staffId = restoredDeletedAdmin.id;
        accountAlreadyExists = true;
      } else if (restoredDeletedStaff?.authUid) {
        authUid = restoredDeletedStaff.authUid;
        staffId = restoredDeletedStaff.authUid;
        accountAlreadyExists = true;
      } else if (
        restoredDeletedStaff?.id &&
        !String(restoredDeletedStaff.id).startsWith("staff-")
      ) {
        authUid = restoredDeletedStaff.id;
        staffId = restoredDeletedStaff.id;
        accountAlreadyExists = true;
      } else if (restoredDeletedStaff?.id) {
        staffId = restoredDeletedStaff.id;
      }

      if (temporaryPassword.length < 6) {
        onNotice("كلمة المرور المؤقتة يجب أن تكون 6 أحرف أو أكثر");
        return;
      }

      // الحل الأفضل للحسابات التي حُذفت ثم أُعيدت: نستخدم دالة Vercel الآمنة
      // لتحديث كلمة مرور حساب Firebase Auth الموجود وإعادة تفعيله بنفس الرمز المؤقت.
      try {
        const authResult = await upsertStaffAuthUser({
          email,
          password: temporaryPassword,
          name: form.name.trim(),
        });
        if (!authResult?.uid) {
          throw Object.assign(new Error("staff-auth-invalid-response"), {
            code: "staff-auth-invalid-response",
          });
        }
        authUid = authResult.uid;
        staffId = authUid;
        accountAlreadyExists = false;
      } catch (apiError) {
        if (["active-staff-exists", "permission-denied", "missing-id-token"].includes(apiError?.code)) {
          onNotice(apiError.message || "تعذر إنشاء حساب الموظف");
          return;
        }

        // عند عدم ضبط مفاتيح Firebase Admin في Vercel نرجع للطريقة القديمة:
        // إنشاء حساب جديد من المتصفح، أو إرسال رابط إعادة تعيين إذا كان الحساب موجودًا.
        try {
          const secondaryApp = initializeApp(
            firebaseConfig,
            `staffInviteApp-${Date.now()}`,
          );
          const secondaryAuth = getAuth(secondaryApp);
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            temporaryPassword,
          );
          authUid = cred.user.uid;
          staffId = authUid;
          accountAlreadyExists = false;
          await updateProfile(cred.user, { displayName: form.name.trim() });
          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);
        } catch (error) {
          if (error?.code === "auth/email-already-in-use") {
            accountAlreadyExists = true;
            // لا يمكن من المتصفح تغيير كلمة مرور حساب Firebase Auth موجود مسبقًا.
            // إذا لم تكن دالة Vercel مفعلة، نفعّل الموظف ونرسل له رابط إعادة تعيين كلمة المرور.
            staffId =
              restoredDeletedAdmin?.id ||
              restoredDeletedStaff?.authUid ||
              restoredDeletedStaff?.id ||
              `staff-${Date.now()}`;
            authUid =
              restoredDeletedAdmin?.id || restoredDeletedStaff?.authUid || "";
            try {
              await sendPasswordResetEmail(auth, email);
            } catch (resetError) {}
          } else {
            onNotice(firebaseError(error));
            return;
          }
        }
      }
    }

    const permissions = isOwner
      ? Object.keys(permissionLabels)
      : normalizeStaffPermissions(form.permissions);
    const payload = {
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      role: isOwner ? "owner" : form.role,
      permissions,
      status: isOwner ? "active" : form.status,
      isOwner,
      authUid,
      invitationToken,
      invitePassword: editingStaff
        ? editingStaff.invitePassword || ""
        : temporaryPassword,
      mustChangePassword: editingStaff
        ? Boolean(editingStaff.mustChangePassword)
        : true,
      invitationStatus: accountAlreadyExists
        ? "pending-temporary-activation"
        : editingStaff?.invitationStatus ||
          (form.inviteAfterSave ? "pending" : "created"),
      invitedAtMs: form.inviteAfterSave
        ? Date.now()
        : editingStaff?.invitedAtMs ||
          restoredDeletedStaff?.invitedAtMs ||
          null,
      createdAtMs:
        editingStaff?.createdAtMs ||
        restoredDeletedStaff?.createdAtMs ||
        Date.now(),
      restoredAtMs:
        restoredDeletedStaff || restoredDeletedAdmin ? Date.now() : null,
      isDeleted: false,
      deleted: false,
      disabled: false,
      deletedAtMs: null,
      deletedAt: null,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "staffUsers", staffId), payload, { merge: true });

    // تنظيف أي سجلات قديمة لنفس البريد حتى لا يرجع التعارض بعد الحذف وإعادة الإضافة.
    await Promise.all(
      existingStaffDocs
        .filter((item) => item.id && item.id !== staffId)
        .map(async (item) => {
          try {
            await deleteDoc(doc(db, "staffUsers", item.id));
          } catch (cleanupError) {
            await setDoc(
              doc(db, "staffUsers", item.id),
              {
                status: "deleted",
                isDeleted: true,
                deleted: true,
                disabled: true,
                permissions: [],
                deletedAtMs: Date.now(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        }),
    );

    const adminId =
      authUid ||
      (staffId && !String(staffId).startsWith("staff-") ? staffId : "");
    if (adminId) {
      await setDoc(
        doc(db, "admins", adminId),
        {
          email,
          role: payload.role,
          permissions:
            payload.status === "disabled" ? [] : payload.permissions,
          staffUser: true,
          status: payload.status,
          disabled: payload.status === "disabled",
          isDeleted: false,
          deleted: false,
          mustChangePassword: payload.mustChangePassword,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setModalOpen(false);
    setEditingStaff(null);
    setForm({ ...emptyForm, tempPassword: generateStaffTemporaryPassword() });
    setHiddenDeletedStaffKeys((prev) =>
      prev.filter(
        (key) =>
          ![staffId, authUid, email]
            .filter(Boolean)
            .map((item) => String(item).toLowerCase())
            .includes(String(key).toLowerCase()),
      ),
    );

    if (!editingStaff && form.inviteAfterSave && !accountAlreadyExists) {
      openInviteEmail({ id: staffId, ...payload });
    } else if (!editingStaff && accountAlreadyExists) {
      onNotice(
        "تمت إعادة تفعيل الموظف وحفظ الرمز المؤقت. إذا ظهرت له رسالة بيانات الدخول غير صحيحة، تأكد من إعداد Firebase Admin في Vercel ثم اعمل Redeploy، أو أرسل له استعادة كلمة المرور.",
      );
    } else {
      onNotice(
        editingStaff
          ? "تم تحديث بيانات الموظف"
          : restoredDeletedStaff || restoredDeletedAdmin
            ? "تمت إعادة تفعيل الموظف"
            : "تمت إضافة الموظف",
      );
    }
  };

  const toggleStatus = async (user) => {
    if (user.isOwner || user.role === "owner") {
      onNotice("لا يمكن تعطيل مالك المتجر");
      return;
    }
    const nextStatus = user.status === "disabled" ? "active" : "disabled";
    await setDoc(
      doc(db, "staffUsers", user.id),
      { status: nextStatus, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const adminDocId = user.authUid || user.id;
    if (adminDocId) {
      await setDoc(
        doc(db, "admins", adminDocId),
        {
          status: nextStatus,
          disabled: nextStatus === "disabled",
          permissions:
            nextStatus === "disabled"
              ? []
              : normalizeStaffPermissions(user.permissions),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    onNotice(
      nextStatus === "disabled"
        ? "تم تعطيل حساب الموظف"
        : "تم تفعيل حساب الموظف",
    );
  };

  const removeStaff = async (user) => {
    if (user.isOwner || user.role === "owner") {
      onNotice("لا يمكن حذف مالك المتجر");
      return;
    }
    if (!window.confirm(`حذف الموظف ${user.name || user.email}؟`)) return;

    const email = String(user.email || "")
      .trim()
      .toLowerCase();
    const localHideKeys = [user.id, user.authUid, email].filter(Boolean);

    // إخفاء فوري من الجدول حتى لو تأخر onSnapshot في Firebase.
    setHiddenDeletedStaffKeys((prev) => [
      ...new Set([...prev, ...localHideKeys]),
    ]);

    try {
      const idsToDisable = new Set([user.id, user.authUid].filter(Boolean));
      const matchingStaffDocs = [];

      if (email) {
        const sameEmailSnap = await getDocs(
          query(collection(db, "staffUsers"), where("email", "==", email)),
        );
        sameEmailSnap.docs.forEach((staffDoc) => {
          idsToDisable.add(staffDoc.id);
          const data = staffDoc.data() || {};
          if (data.authUid) idsToDisable.add(data.authUid);
          matchingStaffDocs.push({ id: staffDoc.id, ...data });
        });
      }

      const staffDocIds = new Set(
        [user.id, ...matchingStaffDocs.map((item) => item.id)].filter(Boolean),
      );
      if (!staffDocIds.size && user.id) staffDocIds.add(user.id);

      // نحذف مستند الموظف من staffUsers حتى يختفي فعليًا من الجدول.
      // وإذا رفضت قواعد Firebase الحذف، نرجع لـ soft delete كخطة بديلة.
      await Promise.all(
        [...staffDocIds].map(async (staffDocId) => {
          try {
            await deleteDoc(doc(db, "staffUsers", staffDocId));
          } catch (deleteError) {
            await setDoc(
              doc(db, "staffUsers", staffDocId),
              {
                status: "deleted",
                isDeleted: true,
                deleted: true,
                disabled: true,
                permissions: [],
                deletedAtMs: Date.now(),
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        }),
      );

      await Promise.all(
        [...idsToDisable].map((adminDocId) =>
          setDoc(
            doc(db, "admins", adminDocId),
            {
              email,
              staffUser: true,
              status: "deleted",
              disabled: true,
              isDeleted: true,
              deleted: true,
              permissions: [],
              deletedAtMs: Date.now(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
      );

      try {
        const uidToDisable = user.authUid ||
          (user.id && !String(user.id).startsWith("staff-") ? user.id : "");
        await disableStaffAuthUser({ uid: uidToDisable, email });
      } catch (authDisableError) {
        // تعطيل الدخول الأساسي تم عبر مستندات admins/staffUsers، وهذه خطوة إضافية إذا كانت دالة Vercel مفعلة.
      }

      onNotice("تم حذف الموظف من الجدول وتعطيل دخوله للوحة التحكم");
    } catch (error) {
      // لو فشلت العملية نرجع إظهاره بدل ما يختفي محليًا فقط.
      setHiddenDeletedStaffKeys((prev) =>
        prev.filter((key) => !localHideKeys.includes(key)),
      );
      onNotice(firebaseError(error));
    }
  };

  const issuePasswordReset = async (user) => {
    const email = String(user?.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      onNotice("لا يوجد بريد إلكتروني لهذا الموظف");
      return;
    }

    const code = generateStaffTemporaryPassword();
    const currentStaffDocId = user.id;
    const currentAuthUid =
      user.authUid ||
      (user.id && !String(user.id).startsWith("staff-") ? user.id : "");

    let authPasswordUpdated = false;
    let resolvedAuthUid = currentAuthUid;
    let serverMessage = "";

    try {
      const result = await setStaffAuthPassword({
        uid: currentAuthUid,
        email,
        password: code,
        name: user.name || "",
      });
      if (result?.uid) resolvedAuthUid = result.uid;
      authPasswordUpdated = true;
    } catch (serverError) {
      serverMessage = serverError?.message || "";
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (resetError) {}
    }

    try {
      const { id, ...userData } = user || {};
      const targetStaffDocId = resolvedAuthUid || currentStaffDocId;
      const staffPayload = {
        ...userData,
        email,
        authUid: resolvedAuthUid || currentAuthUid || "",
        invitePassword: code,
        recoveryCode: code,
        recoveryCodeIssuedAtMs: Date.now(),
        recoveryCodeStatus: authPasswordUpdated ? "temporary-password-issued" : "issued",
        mustChangePassword: true,
        invitationStatus: authPasswordUpdated
          ? "temporary-password-issued"
          : "password-reset-required",
        status: "active",
        disabled: false,
        isDeleted: false,
        deleted: false,
        updatedAt: serverTimestamp(),
      };

      if (targetStaffDocId) {
        await setDoc(doc(db, "staffUsers", targetStaffDocId), staffPayload, {
          merge: true,
        });
      }

      if (
        currentStaffDocId &&
        resolvedAuthUid &&
        currentStaffDocId !== resolvedAuthUid
      ) {
        await setDoc(
          doc(db, "staffUsers", currentStaffDocId),
          {
            status: "deleted",
            disabled: true,
            isDeleted: true,
            deleted: true,
            mergedTo: resolvedAuthUid,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const adminDocId = resolvedAuthUid || currentAuthUid;
      if (adminDocId) {
        await setDoc(
          doc(db, "admins", adminDocId),
          {
            email,
            role: user.role || "staff",
            permissions: normalizeStaffPermissions(user.permissions),
            staffUser: true,
            status: "active",
            disabled: false,
            isDeleted: false,
            deleted: false,
            mustChangePassword: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const recoveryText = authPasswordUpdated
        ? `مرحبًا ${user.name || ""}،

تم إصدار كلمة مرور مؤقتة جديدة لدخول لوحة التحكم.

رابط الدخول:
${getAdminInviteUrl({ ...user, email })}

البريد:
${email}

كلمة المرور المؤقتة:
${code}

بعد الدخول سيطلب منك النظام تغيير كلمة المرور.`
        : `مرحبًا ${user.name || ""}،

تم إصدار طلب استعادة دخول لوحة التحكم.

رابط الدخول:
${getAdminInviteUrl({ ...user, email })}

البريد:
${email}

رمز مؤقت محفوظ في النظام:
${code}

مهم: إذا لم يعمل الرمز المؤقت، استخدم رابط إعادة تعيين كلمة المرور الذي وصلك على البريد.
${serverMessage ? `\nملاحظة للمالك: ${serverMessage}` : ""}`;

      try {
        await navigator.clipboard.writeText(recoveryText);
        onNotice(
          authPasswordUpdated
            ? "تم تعيين كلمة مرور مؤقتة جديدة ونسخ نصها للموظف."
            : "تم إرسال رابط إعادة تعيين كلمة المرور ونسخ نص الاستعادة.",
        );
      } catch (copyError) {
        window.prompt("انسخ نص استعادة الدخول", recoveryText);
      }
    } catch (error) {
      onNotice(firebaseError(error));
    }
  };

  return (
    <section className="admin-card staff-admin-page">
      <div className="pro-card-head staff-head">
        <div>
          <span>Team Access</span>
          <h2>المستخدمين والموظفين</h2>
          <p>إدارة الموظفين الذين يدخلون لوحة التحكم وتحديد صلاحيات كل موظف.</p>
        </div>
        <button type="button" className="admin-primary" onClick={openCreate}>
          <Plus size={18} /> إضافة موظف
        </button>
      </div>

      <div className="staff-stats-grid">
        <div>
          <b>{stats.total}</b>
          <span>إجمالي الموظفين</span>
        </div>
        <div>
          <b>{stats.active}</b>
          <span>نشط</span>
        </div>
        <div>
          <b>{stats.disabled}</b>
          <span>معطل</span>
        </div>
        <div>
          <b>{stats.owners}</b>
          <span>مالك المتجر</span>
        </div>
      </div>

      <div className="staff-toolbar">
        <label className="admin-search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الجوال"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="disabled">معطل</option>
        </select>
      </div>

      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>البريد</th>
              <th>الجوال</th>
              <th>الدور</th>
              <th>الصلاحيات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length ? (
              filteredStaff.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="staff-person">
                      <span>
                        {(user.name || user.email || "م").slice(0, 1)}
                      </span>
                      <div>
                        <b>{user.name || "بدون اسم"}</b>
                        {user.isOwner && <em>مالك المتجر</em>}
                      </div>
                    </div>
                  </td>
                  <td>{user.email || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>
                    <span className="staff-role-chip">
                      {roleLabels[user.role] || user.role || "موظف"}
                    </span>
                  </td>
                  <td>
                    <div className="staff-permissions-preview">
                      {normalizeStaffPermissions(user.permissions)
                        .slice(0, 3)
                        .map((permission) => (
                          <span key={permission}>
                            {permissionLabels[permission] || permission}
                          </span>
                        ))}
                      {normalizeStaffPermissions(user.permissions).length >
                        3 && (
                        <span>
                          +
                          {normalizeStaffPermissions(user.permissions).length -
                            3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        user.status === "disabled"
                          ? "staff-status off"
                          : "staff-status on"
                      }
                    >
                      {user.status === "disabled" ? "معطل" : "نشط"}
                    </span>
                  </td>
                  <td>
                    <div className="staff-actions">
                      <button
                        type="button"
                        onClick={() => openInviteEmail(user)}
                        title="إرسال دعوة"
                      >
                        <Mail size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyInviteLink(user)}
                        title="نسخ نص الدعوة"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => issuePasswordReset(user)}
                        title="إرسال رابط استعادة كلمة المرور"
                        aria-label="إرسال رابط استعادة كلمة المرور"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        title="تعديل"
                        aria-label="تعديل الموظف"
                      >
                        <Pencil size={16} />
                      </button>
                      {!user.isOwner && (
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          title={
                            user.status === "disabled"
                              ? "تنشيط الموظف"
                              : "تعطيل الموظف"
                          }
                          aria-label={
                            user.status === "disabled"
                              ? "تنشيط الموظف"
                              : "تعطيل الموظف"
                          }
                        >
                          {user.status === "disabled" ? (
                            <UserCheck size={16} />
                          ) : (
                            <UserX size={16} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeStaff(user)}
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="staff-empty">
                  لا يوجد موظفون مطابقون للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="staff-permissions-overview">
        <div className="staff-permissions-overview-head">
          <div>
            <span>Permissions Map</span>
            <h3>جدول الصلاحيات حسب القسم</h3>
            <p>
              مرجع سريع يوضح معنى كل صلاحية في لوحة التحكم. هذا الجدول للشرح
              فقط، أما تحديد صلاحيات الموظف فيتم من نافذة الإضافة أو التعديل.
            </p>
          </div>
        </div>
        <div className="staff-permission-table-wrap compact">
          <table className="staff-permission-table">
            <thead>
              <tr>
                <th>القسم</th>
                <th>ما الذي تسمح به هذه الصلاحية؟</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(permissionLabels).map(([key, label]) => (
                <tr key={key}>
                  <td>
                    <b>{label}</b>
                  </td>
                  <td>{permissionDescriptions[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="product-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <form
            className="product-modal-shell staff-modal-card"
            onSubmit={saveStaff}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-modal-head">
              <div>
                <span>Staff User</span>
                <h2>{editingStaff ? "تعديل موظف" : "إضافة موظف"}</h2>
                <p>أضف بيانات الموظف وحدد الدور والصلاحيات المناسبة له.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-form-card">
                <div className="staff-modal-section-title">
                  <span>Basic Info</span>
                  <h3>بيانات الموظف</h3>
                </div>
                <div className="staff-form-grid">
                  <Control label="اسم الموظف">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="مثال: محمد أحمد"
                    />
                  </Control>
                  <Control label="البريد الإلكتروني">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="name@example.com"
                      disabled={Boolean(editingStaff?.isOwner)}
                    />
                  </Control>
                  {!editingStaff && (
                    <Control label="كلمة مرور مؤقتة">
                      <div className="staff-password-row">
                        <input
                          value={form.tempPassword}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              tempPassword: e.target.value,
                            }))
                          }
                          placeholder="كلمة مرور للموظف"
                          minLength="6"
                        />
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              tempPassword: generateStaffTemporaryPassword(),
                            }))
                          }
                        >
                          توليد
                        </button>
                      </div>
                    </Control>
                  )}
                  <Control label="رقم الجوال">
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="05xxxxxxxx"
                    />
                  </Control>
                  <Control label="الدور">
                    <select
                      value={form.role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={Boolean(editingStaff?.isOwner)}
                    >
                      <option value="manager">مدير</option>
                      <option value="products">موظف منتجات</option>
                      <option value="orders">موظف طلبات</option>
                      <option value="content">موظف محتوى</option>
                      <option value="support">دعم عملاء</option>
                    </select>
                  </Control>
                  <Control label="الحالة">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                      disabled={Boolean(editingStaff?.isOwner)}
                    >
                      <option value="active">نشط</option>
                      <option value="disabled">معطل</option>
                    </select>
                  </Control>
                </div>
                {!editingStaff && (
                  <label className="staff-invite-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(form.inviteAfterSave)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inviteAfterSave: e.target.checked,
                        }))
                      }
                    />
                    <span>فتح رسالة دعوة جاهزة بالبريد بعد حفظ الموظف</span>
                  </label>
                )}
                <div className="staff-invite-note">
                  <Mail size={16} />
                  <p>
                    للموظف الجديد يتم إنشاء كلمة مرور مؤقتة. إذا كان البريد
                    مستخدمًا سابقًا، سيتم تفعيل الموظف وإرسال رابط إعادة تعيين
                    كلمة المرور بدل كلمة مؤقتة جديدة.
                  </p>
                </div>
                {editingStaff && !editingStaff.isOwner && (
                  <div className="staff-recovery-card">
                    <div>
                      <b>استعادة دخول الموظف</b>
                      <p>
                        لو الموظف نسي كلمة المرور، أرسل له رابط إعادة تعيين آمن
                        ونسخ نص الاستعادة. الحسابات الموجودة سابقًا لا يمكن
                        تغيير كلمة مرورها من المتصفح مباشرة بدون Backend.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => issuePasswordReset(editingStaff)}
                    >
                      استعادة كلمة المرور
                    </button>
                  </div>
                )}
              </div>

              <div className="staff-permission-box staff-permission-badges-box">
                <div className="staff-modal-section-title">
                  <span>Access</span>
                  <h3>صلاحيات الموظف</h3>
                  <p>
                    أضف صلاحيات الموظف كشرائح صغيرة بدل جدول طويل داخل النافذة.
                  </p>
                </div>

                <Control label="إضافة صلاحية">
                  <select
                    value=""
                    onChange={(e) => addPermission(e.target.value)}
                    disabled={Boolean(editingStaff?.isOwner)}
                  >
                    <option value="">اختر صلاحية لإضافتها</option>
                    {Object.entries(permissionLabels)
                      .filter(([key]) => !selectedPermissions.includes(key))
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </Control>

                <div className="staff-permission-badges">
                  {(editingStaff?.isOwner
                    ? Object.keys(permissionLabels)
                    : selectedPermissions
                  ).length ? (
                    (editingStaff?.isOwner
                      ? Object.keys(permissionLabels)
                      : selectedPermissions
                    ).map((permission) => (
                      <span
                        key={permission}
                        className="staff-permission-badge"
                        title={
                          permissionDescriptions[permission] ||
                          "الوصول إلى هذا القسم"
                        }
                      >
                        {permissionLabels[permission] || permission}
                        {!editingStaff?.isOwner && (
                          <button
                            type="button"
                            onClick={() => removePermission(permission)}
                            aria-label={`حذف صلاحية ${permissionLabels[permission] || permission}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <em className="staff-permission-empty">
                      لم تتم إضافة أي صلاحية بعد
                    </em>
                  )}
                </div>
              </div>
            </div>

            <div className="product-modal-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setModalOpen(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="admin-primary">
                <Save size={17} /> حفظ الموظف
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}


export default StaffUsersPanel;
