export const CONVERSION_RULES = {
  salesOrder: [
    {
      targetKey: "salesInvoice",
      label: "Convert to Sales Invoice",
      map: (src) => ({ companyID: src.companyID, branchID: src.branchID, customerID: src.customerID, salesOrderID: src.salesOrderID }),
      copyLineItemsFrom: "salesOrderItems",
      lineItemsTargetKey: "salesInvoiceItems",
      lineItemParentField: "salesOrderID",
      lineItemTargetParentField: "invoiceID",
    },
  ],
  purchaseOrder: [
    {
      targetKey: "goodsReceipt",
      label: "Record Goods Receipt",
      map: (src) => ({ companyID: src.companyID, pOID: src.pOID }),
    },
    {
      targetKey: "purchaseInvoice",
      label: "Convert to Purchase Invoice",
      map: (src) => ({ companyID: src.companyID, pOID: src.pOID, vendorID: src.vendorID }),
    },
  ],
};

export function runConversion(rule, sourceRecord, entities, ctx) {
  const targetEntity = entities[rule.targetKey];
  const baseValues = {};
  targetEntity.fields.forEach((f) => {
    if (f.role === "hidden_audit") baseValues[f.key] = f.name.toLowerCase().includes("delet") ? false : true;
    else if (f.ui === "boolean") baseValues[f.key] = false;
    else baseValues[f.key] = "";
  });
  const mapped = rule.map(sourceRecord);
  const created = ctx.createRecord(rule.targetKey, { ...baseValues, ...mapped });

  if (rule.copyLineItemsFrom) {
    const filtered = (ctx.data[rule.copyLineItemsFrom] || []).filter((it) => it[rule.lineItemParentField] === sourceRecord[rule.lineItemParentField]);
    if (filtered.length) {
      const childEntity = entities[rule.lineItemsTargetKey];
      const newItems = filtered.map((it) => {
        const copy = { ...it };
        delete copy.__rowId;
        delete copy[childEntity.idFieldKey];
        copy[rule.lineItemTargetParentField] = created[targetEntity.idFieldKey];
        return copy;
      });
      ctx.createManyRecords(rule.lineItemsTargetKey, newItems);
    }
  }
  return created;
}
