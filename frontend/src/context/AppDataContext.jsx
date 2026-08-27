import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useEffect } from "react";
import toast from 'react-hot-toast';
import { SCHEMA } from "../data/schema";
import { ID_PREFIXES } from "../data/idPrefixes";
import api, { erp } from "../services/api";

const AppDataContext = createContext(null);
export const useAppData = () => useContext(AppDataContext);

const MODULAR_ENTITY_MAP = {
  'customers': '/modules/sales/customers',
  'customerMaster': '/modules/sales/customers',
  'vendors': '/modules/procurement/vendors',
  'vendorMaster': '/modules/procurement/vendors',
  'products': '/modules/inventory/products',
  'productMaster': '/modules/inventory/products',
  'employees': '/modules/hr/employees',
  'employeeMaster': '/modules/hr/employees',
  'salesOrders': '/modules/sales/orders',
  'salesOrder': '/modules/sales/orders',
  'salesInvoices': '/modules/sales/invoices',
  'salesInvoice': '/modules/sales/invoices',
  'purchaseOrders': '/modules/procurement/orders',
  'purchaseOrder': '/modules/procurement/orders',
  'goodsReceipts': '/modules/procurement/grn',
  'workOrders': '/modules/manufacturing/work-orders',
  'workOrder': '/modules/manufacturing/work-orders',
  'qcInspections': '/modules/quality/inspections',
  'ncrReports': '/modules/quality/ncr',
  'ledgers': '/modules/accounts/ledgers',
  'vouchers': '/modules/accounts/vouchers',
};

function dataReducer(state, action) {
  switch (action.type) {
    case "INIT":
      return action.payload;
    case "SET_ENTITY_DATA":
      return { ...state, [action.entityKey]: action.records };
    case "CREATE": {
      const rows = state[action.entityKey] || [];
      return { ...state, [action.entityKey]: [action.record, ...rows] };
    }
    case "CREATE_MANY": {
      const rows = state[action.entityKey] || [];
      return { ...state, [action.entityKey]: [...action.records, ...rows] };
    }
    case "UPDATE": {
      const rows = state[action.entityKey] || [];
      return {
        ...state,
        [action.entityKey]: rows.map((r) =>
          r.__rowId === action.rowId || r[action.idFieldKey] === action.recordId
            ? { ...r, ...action.patch }
            : r
        ),
      };
    }
    case "DELETE": {
      const rows = state[action.entityKey] || [];
      return {
        ...state,
        [action.entityKey]: rows.filter(
          (r) => r.__rowId !== action.rowId && r[action.idFieldKey] !== action.recordId
        ),
      };
    }
    case "DELETE_MANY_BY_FK": {
      const rows = state[action.entityKey] || [];
      return { ...state, [action.entityKey]: rows.filter((r) => r[action.fkKey] !== action.fkValue) };
    }
    default:
      return state;
  }
}

export function emptyRecordFor(entity) {
  const rec = {};
  entity.fields.forEach((f) => {
    if (f.role === "hidden_audit") {
      rec[f.key] = f.name.toLowerCase().includes("delet") ? false : true;
    } else if (f.ui === "boolean") {
      rec[f.key] = false;
    } else {
      rec[f.key] = "";
    }
  });
  return rec;
}

export function AppDataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, null, () => {
    const initial = {};
    if (SCHEMA && SCHEMA.entities) {
      Object.keys(SCHEMA.entities).forEach((k) => {
        initial[k] = [];
      });
    }
    return initial;
  });

  const rowIdCounter = useRef(100000);

  
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await erp.getSchema();
        if (res.data?.success && res.data?.data) {
          
        }
      } catch (e) {
        console.warn("Backend schema fetch fallback to local schema", e);
      }
    };
    fetchSchema();
  }, []);

  const refreshEntity = useCallback(async (entityKey) => {
    try {
      let res;
      if (MODULAR_ENTITY_MAP[entityKey]) {
        res = await api.get(MODULAR_ENTITY_MAP[entityKey]);
      } else {
        res = await erp.listRecords(entityKey, { all: 'true' });
      }

      if (res.data?.success && Array.isArray(res.data.data)) {
        const records = res.data.data.map((r, i) => ({
          ...r,
          __rowId: `${entityKey}_${r[SCHEMA.entities[entityKey]?.idFieldKey] || i}`,
        }));
        dispatch({ type: "SET_ENTITY_DATA", entityKey, records });
      }
    } catch (e) {
      console.warn(`Could not refresh entity ${entityKey} from backend`, e);
    }
  }, []);

  const createRecord = useCallback(
    async (entityKey, values) => {
      const entity = SCHEMA.entities[entityKey];
      const rows = state[entityKey] || [];
      const prefix = ID_PREFIXES[entity.key] || entity.key.slice(0, 4).toUpperCase();
      let maxN = 0;
      rows.forEach((r) => {
        const idVal = r[entity.idFieldKey];
        if (typeof idVal === "string") {
          const m = idVal.match(/(\d+)$/);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
        }
      });
      rowIdCounter.current += 1;
      const recordId = `${prefix}-${String(maxN + 1).padStart(4, "0")}`;
      const record = {
        ...values,
        [entity.idFieldKey]: values[entity.idFieldKey] || recordId,
        __rowId: `${entityKey}_new_${rowIdCounter.current}`,
      };
      const now = new Date().toISOString();
      if (entity.fields.some((f) => f.key === "createdAt")) record.createdAt = now;
      if (entity.fields.some((f) => f.key === "createdBy")) record.createdBy = "You";
      if (entity.fields.some((f) => f.key === "updatedAt")) record.updatedAt = now;
      if (entity.fields.some((f) => f.key === "updatedBy")) record.updatedBy = "You";

      
      dispatch({ type: "CREATE", entityKey, record });

      
      try {
        await erp.createRecord(entityKey, record);
        refreshEntity(entityKey);
      } catch (err) {
        console.warn(`Failed to persist new ${entityKey} to backend:`, err);
        dispatch({
          type: "DELETE",
          entityKey,
          rowId: record.__rowId,
          recordId: record[entity.idFieldKey],
          idFieldKey: entity.idFieldKey
        });
        toast.error('Failed to save record. Please try again.');
        throw err;
      }

      return record;
    },
    [state, refreshEntity]
  );

  const createManyRecords = useCallback(
    async (entityKey, valuesArray) => {
      const entity = SCHEMA.entities[entityKey];
      const existingRows = state[entityKey] || [];
      const prefix = ID_PREFIXES[entity.key] || entity.key.slice(0, 4).toUpperCase();
      let maxN = 0;
      existingRows.forEach((r) => {
        const idVal = r[entity.idFieldKey];
        if (typeof idVal === "string") {
          const m = idVal.match(/(\d+)$/);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
        }
      });
      const now = new Date().toISOString();
      const records = valuesArray.map((values, i) => {
        rowIdCounter.current += 1;
        const record = {
          ...values,
          [entity.idFieldKey]: values[entity.idFieldKey] || `${prefix}-${String(maxN + i + 1).padStart(4, "0")}`,
          __rowId: `${entityKey}_new_${rowIdCounter.current}`,
        };
        if (entity.fields.some((f) => f.key === "createdAt")) record.createdAt = now;
        if (entity.fields.some((f) => f.key === "createdBy")) record.createdBy = "You";
        if (entity.fields.some((f) => f.key === "updatedAt")) record.updatedAt = now;
        if (entity.fields.some((f) => f.key === "updatedBy")) record.updatedBy = "You";
        return record;
      });

      dispatch({ type: "CREATE_MANY", entityKey, records });

      
      for (const rec of records) {
        try {
          await erp.createRecord(entityKey, rec);
        } catch (e) {
          
        }
      }
      refreshEntity(entityKey);

      return records;
    },
    [state, refreshEntity]
  );

  const updateRecord = useCallback(
    async (entityKey, rowId, patch) => {
      const entity = SCHEMA.entities[entityKey];
      const fullPatch = { ...patch };
      if (entity.fields.some((f) => f.key === "updatedAt")) fullPatch.updatedAt = new Date().toISOString();
      if (entity.fields.some((f) => f.key === "updatedBy")) fullPatch.updatedBy = "You";

      
      const rows = state[entityKey] || [];
      const found = rows.find((r) => r.__rowId === rowId || r[entity.idFieldKey] === rowId);
      const originalRecord = found ? { ...found } : null;
      const recordId = found ? found[entity.idFieldKey] : rowId;

      dispatch({ type: "UPDATE", entityKey, rowId, recordId, idFieldKey: entity.idFieldKey, patch: fullPatch });

      
      if (recordId) {
        try {
          await erp.updateRecord(entityKey, recordId, fullPatch);
          refreshEntity(entityKey);
        } catch (err) {
          console.warn(`Failed to update ${entityKey}/${recordId} in backend:`, err);
          if (originalRecord) {
            dispatch({
              type: "UPDATE",
              entityKey,
              rowId,
              recordId,
              idFieldKey: entity.idFieldKey,
              patch: originalRecord
            });
          }
          toast.error('Failed to update record. Changes reverted.');
          throw err;
        }
      }
    },
    [state, refreshEntity]
  );

  const deleteRecord = useCallback(
    async (entityKey, rowId) => {
      const entity = SCHEMA.entities[entityKey];
      const rows = state[entityKey] || [];
      const found = rows.find((r) => r.__rowId === rowId || r[entity.idFieldKey] === rowId);
      const originalRecord = found ? { ...found } : null;
      const recordId = found ? found[entity.idFieldKey] : rowId;

      dispatch({ type: "DELETE", entityKey, rowId, recordId, idFieldKey: entity.idFieldKey });

      if (recordId) {
        try {
          await erp.deleteRecord(entityKey, recordId);
          refreshEntity(entityKey);
        } catch (err) {
          console.warn(`Failed to delete ${entityKey}/${recordId} in backend:`, err);
          if (originalRecord) {
            dispatch({ type: "CREATE", entityKey, record: originalRecord });
          }
          toast.error('Failed to delete record. Restored.');
          throw err;
        }
      }
    },
    [state, refreshEntity]
  );

  const value = useMemo(
    () => ({
      data: state,
      schema: SCHEMA,
      createRecord,
      createManyRecords,
      updateRecord,
      deleteRecord,
      refreshEntity,
      dispatch,
    }),
    [state, createRecord, createManyRecords, updateRecord, deleteRecord, refreshEntity]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
