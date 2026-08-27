import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-card p-6 text-center flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <h1 className="text-base font-bold text-slate-900">Something went wrong</h1>
            <p className="text-xs text-slate-500">
              This screen hit an unexpected error. Your session is still signed in.
            </p>
            {this.state.error?.message && (
              <div className="w-full text-left p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-rose-700 overflow-x-auto">
                <p className="font-bold">Error: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-600 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reload Page
              </button>
              <a
                href="/app/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
