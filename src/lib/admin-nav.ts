import type { Permission } from "@/lib/rbac";
import { dccHref } from "@/lib/staff-access";

export const dccNav: Array<{ href: string; label: string; permission?: Permission }> = [
  { href: dccHref(), label: "Dashboard" },
  { href: dccHref("/users"), label: "Users", permission: "users.view" },
  { href: dccHref("/staff"), label: "Admin Management", permission: "admins.manage" },
  { href: dccHref("/listings"), label: "Listings", permission: "listings.view" },
  { href: dccHref("/bookings"), label: "Bookings & Deals", permission: "listings.view" },
  { href: dccHref("/referrals"), label: "Referrals", permission: "users.view" },
  { href: dccHref("/subscriptions"), label: "Subscriptions", permission: "subscriptions.view" },
  { href: dccHref("/ai"), label: "AI Control Center", permission: "ai.view" },
  { href: dccHref("/finance"), label: "Finance", permission: "finance.view" },
  { href: dccHref("/payments"), label: "Payments", permission: "finance.view" },
  { href: dccHref("/security"), label: "Security Center", permission: "logs.view" },
  { href: dccHref("/email"), label: "Email Center", permission: "settings.view" },
  { href: dccHref("/support"), label: "CRM & Support", permission: "support.view" },
  { href: dccHref("/analytics"), label: "Analytics", permission: "analytics.view" },
  { href: dccHref("/legal"), label: "Legal Center", permission: "legal.view" },
  { href: dccHref("/monitoring"), label: "System Monitoring", permission: "monitoring.view" },
  { href: dccHref("/audit"), label: "Audit Log", permission: "logs.view" },
  { href: dccHref("/notifications"), label: "Notifications" },
  { href: dccHref("/settings"), label: "System Settings", permission: "settings.view" },
  { href: dccHref("/reports"), label: "Complaints", permission: "listings.moderate" },
];
