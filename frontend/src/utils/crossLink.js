import { SCHEMA } from "../data/schema";

let _entityScreenMap = null;
export function getEntityScreenMap() {
  if (_entityScreenMap) return _entityScreenMap;
  const map = {};
  SCHEMA.screens.forEach((s) => {
    s.entityKeys.forEach((ek) => {
      if (!(ek in map)) map[ek] = s.code;
    });
  });
  _entityScreenMap = map;
  return map;
}

let _reverseFkIndex = null;
export function getReverseFkIndex() {
  if (_reverseFkIndex) return _reverseFkIndex;
  const index = {};
  Object.values(SCHEMA.entities).forEach((e) => {
    e.fields.forEach((f) => {
      if (f.role === "fk" && f.fkTarget) {
        if (!index[f.fkTarget]) index[f.fkTarget] = [];
        index[f.fkTarget].push({ entityKey: e.key, fieldKey: f.key });
      }
    });
  });
  _reverseFkIndex = index;
  return index;
}

export function recordLink(entityKey, recordId) {
  const screenCode = getEntityScreenMap()[entityKey];
  if (!screenCode) return null;
  return `/app/screen/${screenCode}?open=${encodeURIComponent(recordId)}&entity=${entityKey}`;
}
