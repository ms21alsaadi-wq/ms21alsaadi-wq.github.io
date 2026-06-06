import {
  ADMIN_PERMISSION_LABELS,
  normalizeStaffPermissions,
} from "../../data/adminPermissions.js";

export const tabPermission = {
  dashboard: "dashboard",
  reports: "reports",
  identity: "identity",
  homepage: "homepage",
  products: "products",
  orders: "orders",
  customers: "customers",
  coupons: "coupons",
  settings: "settings",
  notifications: "notifications",
  users: "users",
};

export function expandPermissionsForNewTabs(profile = {}) {
  const allPermissions = Object.keys(ADMIN_PERMISSION_LABELS);
  const roleText = String(profile?.role || "").toLowerCase();
  if (
    profile?.isOwner ||
    roleText === "owner" ||
    String(profile?.role || "").includes("مالك")
  ) {
    return allPermissions;
  }

  const normalized = normalizeStaffPermissions(profile?.permissions);
  const legacyFullAccess = [
    "dashboard",
    "reports",
    "identity",
    "homepage",
    "products",
    "orders",
    "customers",
    "coupons",
    "users",
  ];

  if (legacyFullAccess.every((permission) => normalized.includes(permission))) {
    return allPermissions;
  }

  const expanded = [...normalized];
  if (
    (normalized.includes("identity") ||
      normalized.includes("homepage") ||
      normalized.includes("users")) &&
    !expanded.includes("settings")
  ) {
    expanded.push("settings");
  }
  if (
    (normalized.includes("orders") ||
      normalized.includes("reports") ||
      normalized.includes("customers")) &&
    !expanded.includes("notifications")
  ) {
    expanded.push("notifications");
  }

  return [...new Set(expanded)].filter(
    (permission) => ADMIN_PERMISSION_LABELS[permission],
  );
}
