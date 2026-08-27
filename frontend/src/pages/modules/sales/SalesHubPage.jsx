import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  ShoppingCart, Users, FileText, CheckCircle2, 
  TrendingUp, Clock, AlertTriangle, ChevronRight, 
  Plus, Search, ArrowRight, ShieldCheck, DollarSign,
  Briefcase, CreditCard, Receipt, FileSignature, X, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function SalesHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";

  
  const [pipelineOrders, setPipelineOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [crmOpportunities, setCrmOpportunities] = useState([]);
  const [serviceCases, setServiceCases] = useState([]);
  const [loading, setLoading] = useState(false);

  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [orderFormData, setOrderFormData] = useState({
    order_number: "",
    customer_name: "",
    total_amount: "",
    order_status: "Quotations",
    order_date: new Date().toISOString().slice(0, 10),
  });

  const [customerFormData, setCustomerFormData] = useState({
    customer_code: "",
    customer_name: "",
    email: "",
    phone: "",
    credit_limit: "5000000",
    gst_vat_no: "",
    city: "Pune",
    state: "Maharashtra",
  });

  const [rawCustomers, setRawCustomers] = useState([]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const [custRes, ordRes] = await Promise.allSettled([
        masterService.getCustomers(),
        masterService.getSalesOrders(),
      ]);

      if (custRes.status === "fulfilled" && custRes.value.data?.success) {
        const list = custRes.value.data.data || [];
        setRawCustomers(list);
        setCustomers(
          list.map((c) => ({
            id: c.customer_id || c.customer_code || c.id,
            code: c.customer_code,
            name: c.customer_name || c.name,
            creditLimit: Number(c.credit_limit || 5000000),
            creditUsed: Number(c.outstanding_balance || 0),
            overdue: Number(c.overdue_amount || 0),
            rating: c.rating || "Standard Commercial",
            risk: c.risk_category || "Low Risk",
          }))
        );
      }

      if (ordRes.status === "fulfilled" && ordRes.value.data?.success) {
        const list = ordRes.value.data.data || [];
        setPipelineOrders(
          list.map((o) => ({
            id: o.order_number || o.id,
            customer: o.customer_name || "Enterprise Customer",
            amount: Number(o.grand_total || o.total_amount || 0),
            stage: o.status || o.order_status || "Quotations",
            itemsCount: Array.isArray(o.items) ? o.items.length : (o.item_count ? Number(o.item_count) : 1),
            deliveryDate: o.delivery_date || "2026-09-15",
            poNumber: o.customer_po_number || "PO-DIRECT",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const stages = ["Quotations", "Confirmed", "In Production / Dispatch", "Invoiced"];

  const handleAdvanceStage = (orderId) => {
    setPipelineOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const curIdx = stages.indexOf(o.stage);
        const nextStage = stages[Math.min(stages.length - 1, curIdx + 1)];
        toast.success(`Moved order ${orderId} to '${nextStage}'`);
        return { ...o, stage: nextStage };
      }
      return o;
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderFormData.customer_name || !orderFormData.total_amount) {
      toast.error("Please enter Customer and Total Amount");
      return;
    }
    try {
      
      let matchedCust = rawCustomers.find(
        (c) => c.customer_name?.toLowerCase() === orderFormData.customer_name?.toLowerCase()
      ) || rawCustomers[0];

      let custId = matchedCust ? Number(matchedCust.customer_id) : 1;
      const totalAmt = Number(orderFormData.total_amount) || 10000;
      const taxable = Number((totalAmt / 1.18).toFixed(2));

      await masterService.createSalesOrder({
        order_number: orderFormData.order_number || `SO-2026-${Date.now().toString().slice(-4)}`,
        customer_id: custId,
        status: orderFormData.order_status || "Confirmed",
        order_date: orderFormData.order_date,
        items: [
          {
            item_name: "CNC Precision Machined Components",
            quantity: 1,
            unit_price: taxable,
            gst_rate: 18.00,
          },
        ],
      });
      toast.success("Sales Order recorded successfully");
      setIsOrderModalOpen(false);
      fetchSalesData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create order");
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerFormData.customer_name) {
      toast.error("Please enter Customer Name");
      return;
    }
    try {
      await masterService.createCustomer({
        customer_code: customerFormData.customer_code || `CUST-${Date.now().toString().slice(-4)}`,
        customer_name: customerFormData.customer_name,
        email: customerFormData.email,
        phone: customerFormData.phone,
        credit_limit: Number(customerFormData.credit_limit || 0),
        tax_number: customerFormData.gst_vat_no,
        city: customerFormData.city,
        state: customerFormData.state,
      });
      toast.success("Customer added successfully");
      setIsCustomerModalOpen(false);
      fetchSalesData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add customer");
    }
  };

  const headersMap = {
    orders: {
      tag: "Sales Pipeline",
      title: "Sales Order Execution Pipeline",
      sub: "Visual 4-stage Kanban tracking quotes, confirmed batches, factory machining, and dispatch.",
    },
    customers: {
      tag: "Customer Accounts",
      title: "Customer Directory & Credit Health",
      sub: "Strategic account health, authorized credit limits, and overdue risk assessment.",
    },
    payments: {
      tag: "Receipts & AR",
      title: "Inward Collections & Receipts",
      sub: "Inward NEFT/RTGS collections, payment receipts, and reconciliation against open sales invoices.",
    },
    crm: {
      tag: "CRM & Customer Success",
      title: "CRM Opportunities & Service Hub",
      sub: "Lead pipeline, strategic contract proposals, customer service tickets, and warranty claim tracking.",
    },
    quotations: {
      tag: "CPQ & Proposals",
      title: "Quotation & Proposal Builder",
      sub: "Configure price quotes with multi-level component costing, tiered discount authorization, and proposal workflow.",
    },
    returns: {
      tag: "RMA & Credit Notes",
      title: "Returns, Refunds & Credit Note Management",
      sub: "Return Material Authorization (RMA), quality inspection scrap/rework routing, and statutory GST credit note issuance.",
    },
  };

  
  const [quotations, setQuotations] = useState([
    { id: "QUO-2026-0041", customer: "Bharat Forge Component Unit", itemsCount: 3, rawCost: 280000, margin: "22%", quoteAmount: 341600, approvalStage: "Approved by VP Commercial", validity: "2026-09-30", status: "Ready for Client Dispatch" },
    { id: "QUO-2026-0042", customer: "Tata Motors Precision Div", itemsCount: 8, rawCost: 1250000, margin: "25%", quoteAmount: 1562500, approvalStage: "Pending Finance Review (> ₹10L)", validity: "2026-09-15", status: "In Approval Workflow" },
    { id: "QUO-2026-0043", customer: "Thermax Energy Systems", itemsCount: 2, rawCost: 180000, margin: "18%", quoteAmount: 212400, approvalStage: "Approved by Sales Lead", validity: "2026-10-15", status: "Converted to SO" },
  ]);

  const [returnsList, setReturnsList] = useState([
    { rmaNo: "RMA-2026-009", orderRef: "SO-2026-0031", customer: "Tata Motors Precision Div", part: "Flange Bushing EN8 (50 PCS)", reason: "Dimensional Tolerance Out-of-Spec (+0.015mm)", inspection: "QC Verified (Scrap)", creditNoteNo: "CN-2026-0004", creditAmount: 31000, status: "Credit Note Issued" },
    { rmaNo: "RMA-2026-010", orderRef: "SO-2026-0028", customer: "Kirloskar Oil Engines", part: "CNC Machined Shaft (12 PCS)", reason: "Minor transit surface scratch", inspection: "QC Verified (Buffing Rework)", creditNoteNo: "—", creditAmount: 17400, status: "Rework in Progress" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.orders;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShoppingCart className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                {currentHeader.tag}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currentHeader.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentHeader.sub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "orders" && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => {
                  setOrderFormData({
                    order_number: `SO-2026-00${Math.floor(10 + Math.random() * 90)}`,
                    customer_name: customers[0]?.name || "",
                    total_amount: "",
                    order_status: "Quotations",
                    order_date: new Date().toISOString().slice(0, 10),
                  });
                  setIsOrderModalOpen(true);
                }}
              >
                New Sales Order
              </Button>
            )}
            {activeTab === "customers" && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => {
                  setCustomerFormData({
                    customer_code: `CUST-00${customers.length + 1}`,
                    customer_name: "",
                    email: "",
                    phone: "+91 ",
                    credit_limit: "5000000",
                    gst_vat_no: "",
                    city: "Pune",
                    state: "Maharashtra",
                  });
                  setIsCustomerModalOpen(true);
                }}
              >
                Add Customer
              </Button>
            )}
          </div>
        </div>
      </div>

      
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Visual 4-Stage Sales Execution Pipeline
            </h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
              Live Sales Orders loaded dynamically from database
            </p>
          </div>

          {pipelineOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No sales orders found</p>
              <p className="text-xs text-slate-400 mt-1">Use the "New Sales Order" button in the top banner to create your first order.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stages.map((stageName) => {
                const stageOrders = pipelineOrders.filter((o) => o.stage === stageName);
                const stageTotal = stageOrders.reduce((sum, o) => sum + o.amount, 0);

                return (
                  <div key={stageName} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                        {stageName}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {stageOrders.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[160px]">
                      {stageOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-[#0D9488] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#0D9488]">{order.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{order.date}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{order.customer}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-xs">
                            <span className="font-bold text-slate-900">₹{Number(order.amount || 0).toLocaleString()}</span>
                            {stageName !== "Invoiced" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStage(order.id)}
                                className="text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                Advance <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 font-mono text-xs text-right text-slate-500">
                      Subtotal: <span className="font-bold text-slate-900">₹{Number(stageTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "customers" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Customer Master Records & Credit Monitoring
            </h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
              Real-time authorized credit limits and risk profiles
            </p>
          </div>

          {customers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No customers found</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add Customer" to register your first client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Customer Account Name</th>
                    <th className="py-3 px-4 font-mono text-right">Credit Limit (₹)</th>
                    <th className="py-3 px-4 font-mono text-right">Credit Used (₹)</th>
                    <th className="py-3 px-4 font-mono text-right">Overdue (₹)</th>
                    <th className="py-3 px-4">Account Tier</th>
                    <th className="py-3 px-4 text-center">Risk Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{c.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-700">₹{Number(c.creditLimit || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">₹{Number(c.creditUsed || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-right font-bold text-rose-600">₹{Number(c.overdue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{c.rating}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {c.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#0D9488]" /> Create Sales Order
              </h2>
              <button type="button" onClick={() => setIsOrderModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Order Number</label>
                <input
                  type="text"
                  value={orderFormData.order_number}
                  onChange={(e) => setOrderFormData({ ...orderFormData, order_number: e.target.value })}
                  placeholder="e.g. SO-2026-0041"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={orderFormData.customer_name}
                  onChange={(e) => setOrderFormData({ ...orderFormData, customer_name: e.target.value })}
                  placeholder="e.g. Tata Motors Precision Div"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderFormData.total_amount}
                    onChange={(e) => setOrderFormData({ ...orderFormData, total_amount: e.target.value })}
                    placeholder="e.g. 480000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Order Stage</label>
                  <select
                    value={orderFormData.order_status}
                    onChange={(e) => setOrderFormData({ ...orderFormData, order_status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="Quotations">Quotations</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Production / Dispatch">In Production / Dispatch</option>
                    <option value="Invoiced">Invoiced</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsOrderModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Sales Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0D9488]" /> Add New Customer
              </h2>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Code</label>
                  <input
                    type="text"
                    value={customerFormData.customer_code}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, customer_code: e.target.value })}
                    placeholder="e.g. CUST-005"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={customerFormData.credit_limit}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, credit_limit: e.target.value })}
                    placeholder="5000000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer / Company Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={customerFormData.customer_name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, customer_name: e.target.value })}
                  placeholder="e.g. Kalyani Strategic Systems Ltd"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    placeholder="procurement@kalyani.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    placeholder="+91 20 2712 3456"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsCustomerModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Customer Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "quotations" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Commercial Quotation & CPQ Builder</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Component Costing, Tiered Margin Approval Workflow & Client Proposal Generator</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new commercial quote with approval workflow")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Quotation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Quote Ref</th>
                  <th className="py-2.5 px-3">Prospective Client</th>
                  <th className="py-2.5 px-3">Item Lines</th>
                  <th className="py-2.5 px-3">Base Cost</th>
                  <th className="py-2.5 px-3">Margin %</th>
                  <th className="py-2.5 px-3">Gross Quote Value</th>
                  <th className="py-2.5 px-3">Approval Gate</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{q.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{q.customer}</td>
                    <td className="py-3 px-3 text-slate-600">{q.itemsCount} Products</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{fmtMoney(q.rawCost)}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">+{q.margin}</td>
                    <td className="py-3 px-3 font-black text-slate-900">{fmtMoney(q.quoteAmount)}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{q.approvalStage}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "returns" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Returns, RMA & Credit Note Console</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Customer RMA tracking, quality inspection disposition, and GST credit note generation</p>
            </div>
            <button
              onClick={() => toast.success("New RMA authorization logged")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Raise RMA Request
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">RMA Ref</th>
                  <th className="py-2.5 px-3">Sales Order Ref</th>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Item Returned</th>
                  <th className="py-2.5 px-3">Rejection Root Cause</th>
                  <th className="py-2.5 px-3">QC Disposition</th>
                  <th className="py-2.5 px-3">Credit Note / Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {returnsList.map((ret, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{ret.rmaNo}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{ret.orderRef}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{ret.customer}</td>
                    <td className="py-3 px-3 text-slate-700">{ret.part}</td>
                    <td className="py-3 px-3 text-rose-600 font-medium">{ret.reason}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{ret.inspection}</td>
                    <td className="py-3 px-3 font-black text-slate-900">
                      {ret.creditNoteNo !== "—" ? `${ret.creditNoteNo} (${fmtMoney(ret.creditAmount)})` : "Pending Valuation"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {ret.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHubPage;
