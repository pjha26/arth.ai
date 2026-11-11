import { requireStaff } from "@/lib/auth";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import "./workspace.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="ui-workspace">
      <WorkspaceNav />
      <div className="ui-workspace-content">{children}</div>
    </div>
  );
}
