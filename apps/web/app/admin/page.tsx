import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminSession } from "@/lib/admin/session";
import { adminGet } from "@/lib/admin/server";
import type { AdminOverview, FeedbackPage } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminSession();
  const [overview, feedback] = await Promise.all([
    adminGet<AdminOverview>("overview").catch(() => null),
    adminGet<FeedbackPage>("feedback?page=1").catch(() => null),
  ]);
  return <AdminDashboard overview={overview} feedback={feedback} />;
}
