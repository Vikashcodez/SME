import { useState } from "react";
import { Bell, HelpCircle, ChevronDown, Sparkles, Send, Loader2, MessageSquare, Mail, Users, AlertTriangle, LifeBuoy } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { fmtDateTime, cx } from "../utils/format";
import { Badge } from "../components/ui/Badge";
import { Button, IconButton } from "../components/ui/Button";
import { SectionHeading } from "../components/ui/Heading";
import { Card, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { erp } from "../services/api";

const FAQ_ITEMS = [
  { q: "How do I approve a pending Sales Order?", a: "Open Sales & Order Management → Sales Orders, find the order with status 'Pending Approval', and use the Approve action from the row menu or the record detail view." },
  { q: "How is GST calculated on invoices?", a: "GST is computed per line item based on the Tax Master rate assigned to each product's HSN/SAC code, then rolled up into the invoice's GST and Net Amount fields automatically." },
  { q: "Can I export data to Excel?", a: "Yes — every list screen has an Export button that downloads the currently filtered records as a CSV file, which opens directly in Excel." },
  { q: "How do I deactivate a customer or vendor without deleting their history?", a: "Use the Deactivate quick action on the row. This flips the record's active status while preserving all historical transactions." },
  { q: "Where can I see low-stock alerts?", a: "The Dashboard highlights products below their reorder level. You can also check current vs reorder levels directly on the Stock Master and Product Master screens." },
];

function canned(q) {
  const s = q.toLowerCase();
  if (s.includes("purchase order")) return "Go to Purchase Management → Purchase Orders and click 'New Purchase Order'. Add line items, then Save as Draft or Submit for Approval.";
  if (s.includes("invoice")) return "Navigate to Sales & Order Management → Sales Invoices, click 'New Sales Invoice', link it to a Sales Order if applicable, and add line items — GST and totals calculate automatically.";
  if (s.includes("stock") || s.includes("inventory")) return "Check Inventory Management → Stock Master for live stock levels, or Warehouse Stock for a per-location breakdown.";
  if (s.includes("payroll") || s.includes("salary")) return "Payroll runs live under Employee & Workforce Management → Payroll. Each run pulls from Salary records and applies statutory deductions.";
  if (s.includes("gst") || s.includes("tax")) return "GST filings are tracked under Governance & Compliance → GST Returns, with due dates and filing status per return period.";
  return "I can help you navigate any of the 27 modules in this ERP — try asking about sales orders, purchase orders, inventory, payroll, or GST returns.";
}

export function NotificationsHelpPage() {
  const { data } = useAppData();
  const notifications = (data.notificationMaster || []).slice(0, 20);
  const [openFaq, setOpenFaq] = useState(null);
  const [askInput, setAskInput] = useState("");
  const [askHistory, setAskHistory] = useState([{ role: "assistant", text: "Hi! I'm your Chandra Precision ERP AI Copilot. Ask me anything about screens, metrics, inventory, or workflows." }]);
  const [asking, setAsking] = useState(false);

  const submitAsk = async (e) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    const q = askInput.trim();
    setAskHistory((h) => [...h, { role: "user", text: q }]);
    setAskInput("");
    setAsking(true);

    try {
      const res = await erp.askAI(q);
      if (res.data?.success && res.data?.data?.answer) {
        setAskHistory((h) => [...h, { role: "assistant", text: res.data.data.answer }]);
      } else {
        setAskHistory((h) => [...h, { role: "assistant", text: canned(q) }]);
      }
    } catch {
      setAskHistory((h) => [...h, { role: "assistant", text: canned(q) }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        icon={LifeBuoy}
        accent={{ softBg: "bg-emerald-50", softText: "text-emerald-600", solidBg: "bg-emerald-500", gradient: "from-emerald-400 to-emerald-600" }}
        title="Notifications & Help"
        subtitle="Stay on top of system alerts and get quick answers about how the ERP works."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <SectionHeading icon={Bell}>Notifications</SectionHeading>
              <Badge tone="info">{notifications.length} recent</Badge>
            </CardHeader>
            <div style={{ maxHeight: 420 }} className="divide-y divide-slate-100 overflow-y-auto">
              {notifications.length === 0 ? (
                <EmptyState icon={Bell} title="No notifications yet" message="You're all caught up. New alerts will appear here." />
              ) : (
                notifications.map((n) => (
                  <div key={n.__rowId} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="h-4 w-4" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{n.type || "Notification"}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message || "You have a new update in the system."}</p>
                      <p className="text-xs text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <SectionHeading icon={HelpCircle}>Frequently Asked Questions</SectionHeading>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {FAQ_ITEMS.map((f, i) => (
                <div key={i}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 transition-colors">
                    <span className="text-sm font-semibold text-slate-700">{f.q}</span>
                    <ChevronDown className={cx("h-4 w-4 text-slate-400 transition-transform flex-shrink-0", openFaq === i && "rotate-180")} />
                  </button>
                  {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{f.a}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5">
          <div style={{ height: 500 }} className="bg-white rounded-2xl border border-slate-200/70 shadow-card flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <SectionHeading>Ask AI</SectionHeading>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {askHistory.map((m, i) => (
                <div key={i} style={{ maxWidth: "85%" }} className={cx("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-ink-900 text-white self-end" : "bg-slate-100 text-slate-700 self-start")}>
                  {m.text}
                </div>
              ))}
              {asking && (
                <div className="bg-slate-100 text-slate-400 self-start rounded-2xl px-3.5 py-2.5 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              )}
            </div>
            <form onSubmit={submitAsk} className="p-3 border-t border-slate-100 flex items-center gap-2">
              <input value={askInput} onChange={(e) => setAskInput(e.target.value)} placeholder="Type a question…" className="flex-1 rounded-lg border-0 ring-1 ring-inset ring-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/60 focus:bg-white transition-colors" />
              <IconButton icon={Send} label="Send" tone="primary" onClick={submitAsk} />
            </form>
          </div>

          <Card className="p-5">
            <SectionHeading icon={MessageSquare} className="mb-3">Contact Support</SectionHeading>
            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">Need help beyond the FAQ? Reach your account manager or escalate an open issue.</p>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" icon={Mail} className="justify-start">Email Support Team</Button>
              <Button variant="secondary" size="sm" icon={Users} className="justify-start">Message Approver / Manager</Button>
              <Button variant="outlineDanger" size="sm" icon={AlertTriangle} className="justify-start">Escalate Issue</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NotificationsHelpPage;
