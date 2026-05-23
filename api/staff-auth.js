import admin from "firebase-admin";

const STAFF_PASSWORD_MIN_LENGTH = 6;

const json = (response, status, body) => response.status(status).json(body);

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }
  return request.body;
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function normalizeKey(value = "") {
  return String(value || "").replace(/\\n/g, "\n");
}

function isDeleted(record = {}) {
  const status = String(record.status || "").toLowerCase();
  return (
    Boolean(record.isDeleted || record.deleted || record.deletedAt || record.deletedAtMs) ||
    ["deleted", "removed", "inactivedeleted"].includes(status)
  );
}

function isDisabled(record = {}) {
  const status = String(record.status || "").toLowerCase();
  return isDeleted(record) || status === "disabled" || Boolean(record.disabled);
}

function hasUsersPermission(record = {}) {
  const permissions = Array.isArray(record.permissions) ? record.permissions : [];
  return Boolean(
    record.isOwner ||
      record.role === "owner" ||
      permissions.includes("users") ||
      permissions.includes("settings"),
  );
}

function getServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: normalizeKey(parsed.private_key || parsed.privateKey),
    };
  }

  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: normalizeKey(parsed.private_key || parsed.privateKey),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizeKey(process.env.FIREBASE_PRIVATE_KEY || "");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    const error = new Error(
      "خدمة الموظفين غير مفعلة. أضف متغيرات Firebase Admin في Vercel ثم اعمل Redeploy.",
    );
    error.code = "admin-sdk-not-configured";
    error.status = 501;
    throw error;
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

async function getCallerContext(app, request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const token = String(header).startsWith("Bearer ") ? String(header).slice(7) : "";
  if (!token) {
    const error = new Error("يجب تسجيل الدخول كمدير");
    error.code = "missing-id-token";
    error.status = 401;
    throw error;
  }

  const decoded = await admin.auth(app).verifyIdToken(token);
  const firestore = admin.firestore(app);
  const adminSnap = await firestore.collection("admins").doc(decoded.uid).get();
  const staffSnap = await firestore.collection("staffUsers").doc(decoded.uid).get();

  const records = [];
  if (adminSnap.exists) records.push({ id: adminSnap.id, type: "admin", ...adminSnap.data() });
  if (staffSnap.exists) records.push({ id: staffSnap.id, type: "staff", ...staffSnap.data() });

  const email = normalizeEmail(decoded.email);
  if (email) {
    const emailStaff = await firestore.collection("staffUsers").where("email", "==", email).limit(10).get();
    emailStaff.docs.forEach((staffDoc) => {
      records.push({ id: staffDoc.id, type: "staff", ...staffDoc.data() });
    });
  }

  const allowed = records.some((record) => !isDisabled(record) && hasUsersPermission(record));
  const primaryAdmin = adminSnap.exists && !isDisabled(adminSnap.data()) && !adminSnap.data()?.staffUser;

  if (!primaryAdmin && !allowed) {
    const error = new Error("لا تملك صلاحية إدارة الموظفين");
    error.code = "permission-denied";
    error.status = 403;
    throw error;
  }

  return { decoded, firestore };
}

async function hasActiveStaffRecord(firestore, email) {
  const [staffSnap, adminSnap] = await Promise.all([
    firestore.collection("staffUsers").where("email", "==", email).limit(20).get(),
    firestore.collection("admins").where("email", "==", email).limit(20).get(),
  ]);

  return [...staffSnap.docs, ...adminSnap.docs].some((recordDoc) => {
    const record = recordDoc.data() || {};
    return !isDisabled(record);
  });
}

function temporaryPasswordMatches(record = {}, password = "") {
  const supplied = String(password || "");
  if (supplied.length < STAFF_PASSWORD_MIN_LENGTH) return false;

  const possiblePasswords = [
    record.invitePassword,
    record.tempPassword,
    record.temporaryPassword,
    record.recoveryCode,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return possiblePasswords.includes(supplied);
}

async function findActiveStaffByTemporaryPassword(firestore, email, password) {
  const staffSnap = await firestore.collection("staffUsers").where("email", "==", email).limit(20).get();
  const candidates = staffSnap.docs.map((staffDoc) => ({
    id: staffDoc.id,
    ...(staffDoc.data() || {}),
  }));

  return candidates.find(
    (record) => !isDisabled(record) && temporaryPasswordMatches(record, password),
  );
}

async function createOrUpdateAuthUser(app, { uid = "", email = "", password = "", name = "" }) {
  let userRecord = null;

  try {
    if (uid) userRecord = await admin.auth(app).getUser(uid);
    else userRecord = await admin.auth(app).getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  if (userRecord) {
    return admin.auth(app).updateUser(userRecord.uid, {
      email: email || userRecord.email,
      password,
      displayName: name || userRecord.displayName || undefined,
      disabled: false,
    });
  }

  return admin.auth(app).createUser({
    email,
    password,
    displayName: name || undefined,
    disabled: false,
  });
}

async function upsertStaffUser(app, body, firestore) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const displayName = String(body.name || "").trim();

  if (!email) {
    return { status: 400, body: { ok: false, code: "missing-email", message: "البريد الإلكتروني مطلوب" } };
  }
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "weak-password",
        message: `كلمة المرور المؤقتة يجب أن تكون ${STAFF_PASSWORD_MIN_LENGTH} أحرف أو أكثر`,
      },
    };
  }

  if (await hasActiveStaffRecord(firestore, email)) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "active-staff-exists",
        message: "هذا البريد مربوط بموظف أو مدير نشط بالفعل",
      },
    };
  }

  const before = await admin.auth(app).getUserByEmail(email).catch((error) => {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  });
  const userRecord = await createOrUpdateAuthUser(app, {
    email,
    password,
    name: displayName,
  });

  try {
    await admin.auth(app).revokeRefreshTokens(userRecord.uid);
  } catch (error) {}

  return {
    status: 200,
    body: {
      ok: true,
      uid: userRecord.uid,
      email: userRecord.email,
      existing: Boolean(before),
    },
  };
}

async function setStaffPassword(app, body) {
  const email = normalizeEmail(body.email);
  const uid = String(body.uid || "").trim();
  const password = String(body.password || "");
  const displayName = String(body.name || "").trim();

  if (!uid && !email) {
    return { status: 400, body: { ok: false, code: "missing-target", message: "حدد UID أو بريد الموظف" } };
  }
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "weak-password",
        message: `كلمة المرور المؤقتة يجب أن تكون ${STAFF_PASSWORD_MIN_LENGTH} أحرف أو أكثر`,
      },
    };
  }

  const userRecord = await createOrUpdateAuthUser(app, {
    uid,
    email,
    password,
    name: displayName,
  });

  try {
    await admin.auth(app).revokeRefreshTokens(userRecord.uid);
  } catch (error) {}

  return {
    status: 200,
    body: { ok: true, uid: userRecord.uid, email: userRecord.email },
  };
}

async function activateTemporaryLogin(app, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const firestore = admin.firestore(app);

  if (!email || password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return {
      status: 401,
      body: { ok: false, code: "invalid-credential", message: "بيانات الدخول غير صحيحة" },
    };
  }

  const staffRecord = await findActiveStaffByTemporaryPassword(firestore, email, password);
  if (!staffRecord) {
    return {
      status: 401,
      body: { ok: false, code: "invalid-temporary-password", message: "بيانات الدخول غير صحيحة" },
    };
  }

  const userRecord = await createOrUpdateAuthUser(app, {
    uid: staffRecord.authUid || (!String(staffRecord.id || "").startsWith("staff-") ? staffRecord.id : ""),
    email,
    password,
    name: staffRecord.name || "",
  });

  const uid = userRecord.uid;
  const permissions = Array.isArray(staffRecord.permissions) ? staffRecord.permissions : [];
  const cleanStaff = {
    ...staffRecord,
    email,
    authUid: uid,
    status: "active",
    disabled: false,
    isDeleted: false,
    deleted: false,
    invitationStatus: "accepted",
    recoveryCodeStatus: staffRecord.recoveryCode ? "used" : staffRecord.recoveryCodeStatus || null,
    lastTemporaryLoginAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.collection("staffUsers").doc(uid).set(cleanStaff, { merge: true });

  if (staffRecord.id && staffRecord.id !== uid) {
    await firestore.collection("staffUsers").doc(staffRecord.id).set(
      {
        status: "deleted",
        disabled: true,
        isDeleted: true,
        deleted: true,
        mergedTo: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await firestore.collection("admins").doc(uid).set(
    {
      email,
      role: staffRecord.role || "staff",
      permissions,
      staffUser: true,
      status: "active",
      disabled: false,
      isDeleted: false,
      deleted: false,
      mustChangePassword: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await admin.auth(app).revokeRefreshTokens(uid);
  } catch (error) {}

  return { status: 200, body: { ok: true, uid, email } };
}

async function disableStaffUser(app, body) {
  const email = normalizeEmail(body.email);
  const uid = String(body.uid || "").trim();

  if (!uid && !email) {
    return { status: 400, body: { ok: false, code: "missing-target", message: "حدد UID أو بريد الموظف" } };
  }

  let userRecord = null;
  try {
    userRecord = uid ? await admin.auth(app).getUser(uid) : await admin.auth(app).getUserByEmail(email);
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      return { status: 200, body: { ok: true, disabled: false, notFound: true } };
    }
    throw error;
  }

  await admin.auth(app).updateUser(userRecord.uid, { disabled: true });
  try {
    await admin.auth(app).revokeRefreshTokens(userRecord.uid);
  } catch (error) {}

  return { status: 200, body: { ok: true, uid: userRecord.uid, disabled: true } };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, code: "method-not-allowed" });
  }

  try {
    const body = parseBody(request);
    const action = String(body.action || "");
    const app = getAdminApp();

    if (action === "activate-temporary-login") {
      const result = await activateTemporaryLogin(app, body);
      return json(response, result.status, result.body);
    }

    const { firestore } = await getCallerContext(app, request);
    const result =
      action === "upsert"
        ? await upsertStaffUser(app, body, firestore)
        : action === "set-password"
          ? await setStaffPassword(app, body)
          : action === "disable"
            ? await disableStaffUser(app, body)
            : { status: 400, body: { ok: false, code: "unknown-action", message: "عملية غير معروفة" } };

    return json(response, result.status, result.body);
  } catch (error) {
    const status = error.status || (error.code === "admin-sdk-not-configured" ? 501 : 500);
    return json(response, status, {
      ok: false,
      code: error.code || "staff-auth-error",
      message: error.message || "تعذر تنفيذ عملية حساب الموظف",
    });
  }
}
