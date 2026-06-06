import { auth } from "../firebase.js";

const STAFF_AUTH_ENDPOINT = "/api/staff-auth";

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

async function postStaffAuth(action, payload = {}, { requireAdmin = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (requireAdmin) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const error = new Error("لا توجد جلسة مدير نشطة");
      error.code = "no-current-admin";
      throw error;
    }
    headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
  }

  const response = await fetch(STAFF_AUTH_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await parseResponse(response);
  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.message || "تعذر تنفيذ عملية حساب الموظف");
    error.code = data?.code || `staff-auth-${response.status}`;
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export function upsertStaffAuthUser({ email, password, name }) {
  return postStaffAuth("upsert", { email, password, name }, { requireAdmin: true });
}

export function setStaffAuthPassword({ uid, email, password, name }) {
  return postStaffAuth(
    "set-password",
    { uid, email, password, name },
    { requireAdmin: true },
  );
}

export function disableStaffAuthUser({ uid, email }) {
  return postStaffAuth("disable", { uid, email }, { requireAdmin: true });
}

export function activateStaffTemporaryPassword({ email, password }) {
  return postStaffAuth(
    "activate-temporary-login",
    { email, password },
    { requireAdmin: false },
  );
}
