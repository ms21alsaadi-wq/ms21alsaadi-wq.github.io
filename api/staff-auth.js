import admin from "firebase-admin";

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

function isDeleted(record = {}) {
  const status = String(record.status || "").toLowerCase();
  return Boolean(record.isDeleted || record.deleted || record.deletedAt || record.deletedAtMs) ||
    ["deleted", "removed", "inactivedeleted"].includes(status);
}

function isDisabled(record = {}) {
  return isDeleted(record) || record.status === "disabled" || Boolean(record.disabled);
}

function getServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: String(parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n"),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    const error = new Error("Firebase Admin غير مضبوط في متغيرات Vercel");
    error.code = "admin-sdk-not-configured";
    throw error;
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

async function getCallerContext(app, request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
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
    const emailStaff = await firestore.collection("staffUsers").where("email", "==", email).limit(5).get();
    emailStaff.docs.forEach((staffDoc) => {
      records.push({ id: staffDoc.id, type: "staff", ...staffDoc.data() });
    });
  }

  const primaryAdmin = adminSnap.exists && !isDisabled(adminSnap.data()) && !adminSnap.data()?.staffUser;
  const canManageStaff = records.some((record) => {
    if (isDisabled(record)) return false;
    if (record.isOwner || record.role === "owner") return true;
    return Array.isArray(record.permissions) && record.permissions.includes("users");
  });

  if (!primaryAdmin && !canManageStaff) {
    const error = new Error("لا تملك صلاحية إدارة الموظفين");
    error.code = "permission-denied";
    error.status = 403;
    throw error;
  }

  return { decoded, firestore };
}

async function hasActiveStaffRecord(firestore, email) {
  const [staffSnap, adminSnap] = await Promise.all([
    firestore.collection("staffUsers").where("email", "==", email).limit(10).get(),
    firestore.collection("admins").where("email", "==", email).limit(10).get(),
  ]);

  return [...staffSnap.docs, ...adminSnap.docs].some((recordDoc) => {
    const record = recordDoc.data() || {};
    return !isDisabled(record);
  });
}

async function upsertStaffUser(app, body, firestore) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const displayName = String(body.name || "").trim();

  if (!email) {
    return { status: 400, body: { ok: false, code: "missing-email", message: "البريد الإلكتروني مطلوب" } };
  }
  if (password.length < 6) {
    return { status: 400, body: { ok: false, code: "weak-password", message: "كلمة المرور المؤقتة يجب أن تكون 6 أحرف أو أكثر" } };
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

  let userRecord;
  let existing = false;

  try {
    userRecord = await admin.auth(app).getUserByEmail(email);
    existing = true;
    userRecord = await admin.auth(app).updateUser(userRecord.uid, {
      email,
      password,
      displayName: displayName || userRecord.displayName || undefined,
      disabled: false,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    userRecord = await admin.auth(app).createUser({
      email,
      password,
      displayName: displayName || undefined,
      disabled: false,
    });
  }

  try {
    await admin.auth(app).revokeRefreshTokens(userRecord.uid);
  } catch (error) {}

  return {
    status: 200,
    body: {
      ok: true,
      uid: userRecord.uid,
      email: userRecord.email,
      existing,
    },
  };
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
    const app = getAdminApp();
    const { firestore } = await getCallerContext(app, request);
    const body = parseBody(request);
    const action = String(body.action || "");

    const result = action === "upsert"
      ? await upsertStaffUser(app, body, firestore)
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
