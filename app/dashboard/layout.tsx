import { requireStaff } from "@/lib/auth";
import { dealsEnabled } from "@/lib/deals";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import "./workspace.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="ui-workspace">
      <WorkspaceNav showDeals={dealsEnabled()} />
      <div className="ui-workspace-content">{children}</div>
    </div>
  );
}
