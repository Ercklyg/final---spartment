import { Component } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    if (import.meta.env.DEV) console.error('Application render error', error, details);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const pageLoadFailed = /dynamically imported module|loading chunk|failed to fetch/i.test(this.state.error.message || '');
    return <main className="flex min-h-screen items-center justify-center bg-[#f6f9fd] px-5 py-12 text-slate-900">
      <section role="alert" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl sm:p-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle size={28}/></span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{pageLoadFailed?'A newer version of Spartment may be available. Reload to continue.':'This page could not be displayed. Your saved data has not been changed.'}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={()=>window.location.reload()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"><RefreshCw size={18}/>Try again</button>
          <button type="button" onClick={()=>window.location.assign('/')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50"><Home size={18}/>Go to sign in</button>
        </div>
      </section>
    </main>;
  }
}
