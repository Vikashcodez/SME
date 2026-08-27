import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, MemoryRouter } from "react-router-dom";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import "./index.css";

const Router = import.meta.env.VITE_STANDALONE_PREVIEW ? MemoryRouter : HashRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
