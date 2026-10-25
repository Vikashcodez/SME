import { Link, NavLink, useLocation } from 'react-router-dom';

const sections = [
  {
    title: 'Books and Registers',
    items: [
      ['Day Book', '/day-book', 'Chronological posted voucher register'],
      ['Ledger', '/ledger-management', 'Ledger balances and statements'],
      ['Sales Register', '/sales-invoices', 'Sales invoices and customer balances'],
      ['Purchase Register', '/purchase-invoices', 'Purchase bills and supplier balances'],
      ['Receipt Register', '/receipts-settlement', 'Customer receipts and bill settlement'],
      ['Trial Balance', '/trial-balance', 'Debit and credit closing balances'],
    ]
  },
  {
    title: 'Financial Statements',
    items: [
      ['Profit & Loss Account', '/profit-and-loss', 'Income, direct costs, and expenses'],
      ['Balance Sheet', '/balance-sheet', 'Assets, liabilities, and equity'],
      ['Cash & Bank Movement', '/day-book', 'Cash and bank movement review'],
      ['Accounts Receivable', '/receipts-settlement', 'Customer outstanding and allocations'],
      ['Accounts Payable', '/purchase-invoices', 'Supplier bills and payments'],
    ]
  },
  {
    title: 'Configuration',
    items: [
      ['Chart of Accounts', '/chart-of-accounts', 'Groups and accounting ledgers'],
      ['Financial Years & Audit', '/accounting-controls', 'Lock periods and review audit activity'],
      ['Bank Reconciliation', '/accounting-management', 'Review bank and cash ledger movements'],
      ['Cost Centres & Budgets', '/accounting-management', 'Configure management accounting dimensions'],
      ['Tax and Compliance', '/compliance', 'Tax, payroll, and compliance workflows'],
    ]
  }
];

const AccountingGateway = () => {
  const location = useLocation();
  const branchPrefix = location.pathname.startsWith('/branch/') ? '/branch' : '';
  const routeFor = (path) => `${branchPrefix}${path}`;

  return (
  <div className="min-h-full bg-slate-50 px-4 py-5 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Accounting workspace</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Accounting Gateway</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a book, statement, or setup area to begin.</p>
          </div>
          <Link to={routeFor('/day-book')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            Open Day Book
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map(([label, path, description]) => (
                <NavLink
                  key={path + label}
                  to={routeFor(path)}
                  className={({ isActive }) => `block border-l-2 px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isActive ? 'border-indigo-600 bg-indigo-50' : 'border-transparent hover:bg-indigo-50/50'}`}
                >
                  <span className="block text-sm font-medium text-slate-800">{label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Accounting workflow</h2>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ['1', 'Configure', 'Create groups, ledgers, opening balances, and tax settings.'],
            ['2', 'Record', 'Post balanced vouchers, invoices, receipts, and payments.'],
            ['3', 'Review', 'Use registers and statements to verify balances and results.']
          ].map(([number, title, description]) => (
            <div key={number} className="bg-white px-4 py-4">
              <span className="text-xs font-bold text-indigo-600">{number}</span>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
  );
};

export default AccountingGateway;
