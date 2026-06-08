export const ADMIN_ROUTE_TABS = [
  "dashboard",
  "reports",
  "identity",
  "homepage",
  "products",
  "orders",
  "customers",
  "coupons",
  "payments",
  "users",
  "settings",
  "notifications",
];

export function adminTabFromPath(pathname = "") {
  const segment = String(pathname || "")
    .replace(/^\/admin\/?/, "")
    .split("/")[0];
  return ADMIN_ROUTE_TABS.includes(segment) ? segment : "dashboard";
}
