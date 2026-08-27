import { Send, CheckCircle2, XCircle } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useToast } from "../components/ui/Toast";
import { getWorkflowTargets } from "../utils/status";

export function useRecordActions(entity) {
  const { updateRecord } = useAppData();
  const toast = useToast();
  const statusField = entity.fields.find((f) => f.key === "status");
  const targets = statusField && statusField.options ? getWorkflowTargets(statusField.options) : null;
  const hasApprovalFields = entity.fields.some((f) => f.key === "approvedBy");

  const applyStatus = (row, newStatus, extra) => {
    const patch = { status: newStatus, ...extra };
    updateRecord(entity.key, row.__rowId, patch);
    toast(`${entity.name} ${row[entity.idFieldKey]} → ${newStatus}`);
  };

  const nextActions = (row) => {
    if (entity.kind !== "transaction" || !targets) return [];
    const cur = (row.status || "").toLowerCase();
    const actions = [];
    if (!cur || cur === (targets.draft || "").toLowerCase()) {
      if (targets.submitted) {
        actions.push({ label: "Submit for Approval", icon: Send, tone: "primary", onClick: () => applyStatus(row, targets.submitted) });
      }
    } else if (targets.submitted && cur === targets.submitted.toLowerCase()) {
      if (targets.approved) {
        actions.push({
          label: "Approve",
          icon: CheckCircle2,
          tone: "primary",
          onClick: () =>
            applyStatus(row, targets.approved, hasApprovalFields ? { approvedBy: "You", approvalDate: new Date().toISOString(), approvalRemarks: "Approved via workflow." } : {}),
        });
      }
      if (targets.rejected) {
        actions.push({
          label: "Reject",
          icon: XCircle,
          tone: "danger",
          onClick: () =>
            applyStatus(row, targets.rejected, hasApprovalFields ? { approvedBy: "You", approvalDate: new Date().toISOString(), approvalRemarks: "Rejected via workflow." } : {}),
        });
      }
    }
    return actions;
  };

  const toggleActive = (row) => {
    const isActive = row.isActive !== false;
    updateRecord(entity.key, row.__rowId, { isActive: !isActive });
    toast(`${row[entity.labelFieldKey] || row[entity.idFieldKey]} ${!isActive ? "activated" : "deactivated"}`);
  };

  return { nextActions, toggleActive, targets, statusField };
}
