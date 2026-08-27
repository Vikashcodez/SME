import { useParams, Navigate } from "react-router-dom";
import { SCHEMA } from "../data/schema";
import { MultiEntityScreen } from "../components/EntityScreen";

export function ScreenPage() {
  const { code } = useParams();
  const screen = SCHEMA.screens.find((s) => s.code === code);
  if (!screen) return <Navigate to="/app/dashboard" replace />;
  return <MultiEntityScreen screen={screen} entities={SCHEMA.entities} />;
}
