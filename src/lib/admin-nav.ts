import type { Permission } from "@/lib/rbac";

export const dccNav: Array<{ href: string; label: string; permission?: Permission }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users", permission: "users.view" },
  { href: "/admin/staff", label: "Admin Management", permission: "admins.manage" },
  { href: "/admin/listings", label: "Listings", permission: "listings.view" },
  { href: "/admin/subscriptions", label: "Subscriptions", permission: "subscriptions.view" },
  { href: "/admin/ai", label: "AI Control Center", permission: "ai.view" },
  { href: "/admin/finance", label: "Finance", permission: "finance.view" },
  { href: "/admin/payments", label: "Payments", permission: "finance.view" },
  { href: "/admin/security", label: "Security Center", permission: "logs.view" },
  { href: "/admin/email", label: "Email Center", permission: "settings.view" },
  { href: "/admin/support", label: "CRM & Support", permission: "support.view" },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics.view" },
  { href: "/admin/legal", label: "Legal Center", permission: "legal.view" },
  { href: "/admin/monitoring", label: "System Monitoring", permission: "monitoring.view" },
  { href: "/admin/audit", label: "Audit Log", permission: "logs.view" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "System Settings", permission: "settings.view" },
  { href: "/admin/reports", label: "Complaints", permission: "listings.moderate" },
];
