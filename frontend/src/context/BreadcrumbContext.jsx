import { createContext, useContext, useState } from "react";

const BreadcrumbContext = createContext(null);
export const useBreadcrumbExtra = () => useContext(BreadcrumbContext);

export function BreadcrumbProvider({ children }) {
  const [extra, setExtra] = useState(null);
  return <BreadcrumbContext.Provider value={{ extra, setExtra }}>{children}</BreadcrumbContext.Provider>;
}
