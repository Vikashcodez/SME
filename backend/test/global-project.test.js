import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(backendRoot, '..');
const backendSourceRoot = path.join(backendRoot, 'src');
const frontendSourceRoot = path.join(projectRoot, 'frontend', 'src');

const walk = (directory, extension) => readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walk(entryPath, extension);
        return entry.name.endsWith(extension) ? [entryPath] : [];
    });

const backendFiles = walk(backendSourceRoot, '.js');
const routeFiles = walk(path.join(backendSourceRoot, 'routes'), '.js');
const frontendPages = walk(path.join(frontendSourceRoot, 'pages'), '.jsx');

const read = (filePath) => readFileSync(filePath, 'utf8');

test('global project inventory is complete', () => {
    assert.ok(backendFiles.length >= 50, `Expected at least 50 backend source files, found ${backendFiles.length}`);
    assert.ok(routeFiles.length >= 20, `Expected at least 20 route modules, found ${routeFiles.length}`);
    assert.ok(frontendPages.length >= 30, `Expected at least 30 frontend pages, found ${frontendPages.length}`);
});

test('backend package exposes the global test command', () => {
    const packageJson = JSON.parse(read(path.join(backendRoot, 'package.json')));
    assert.equal(packageJson.scripts.test, 'node --test test/global-project.test.js');
});

test('frontend package exposes build and lint commands', () => {
    const packageJson = JSON.parse(read(path.join(projectRoot, 'frontend', 'package.json')));
    assert.equal(packageJson.scripts.build, 'vite build');
    assert.equal(packageJson.scripts.lint, 'eslint .');
});

test('application mounts every route module', () => {
    const appSource = read(path.join(backendSourceRoot, 'app.js'));
    for (const routeFile of routeFiles) {
        const routeName = path.basename(routeFile, '.js');
        assert.match(appSource, new RegExp(routeName.replace('.', '\\.'), 'i'), `${routeName} is not mounted in app.js`);
    }
});

for (const filePath of backendFiles) {
    test(`backend syntax: ${path.relative(projectRoot, filePath)}`, () => {
        execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    });
}

for (const filePath of routeFiles) {
    test(`route contract: ${path.relative(projectRoot, filePath)}`, () => {
        const source = read(filePath);
        assert.match(source, /express\.Router\(\)/, 'route module must create an Express router');
        assert.match(source, /export default\s+\w+/, 'route module must export its router');
    });
}

for (const filePath of frontendPages) {
    test(`frontend page contract: ${path.relative(projectRoot, filePath)}`, () => {
        const source = read(filePath);
        assert.match(source, /export default\s+\w+|export\s*\{\s*default\s*\}/, 'page must expose a default export');
        assert.ok(source.includes('React') || source.includes('useState') || source.includes('useEffect'), 'page must contain a React component');
    });
}

test('accounting Day Book preserves date-range filtering', () => {
    const controller = read(path.join(backendSourceRoot, 'controllers', 'Accounting.Controller.js'));
    const page = read(path.join(frontendSourceRoot, 'pages', 'Commercial', 'DayBook.jsx'));
    assert.match(controller, /from_date/);
    assert.match(controller, /to_date/);
    assert.match(controller, /voucher_date >= \$2/);
    assert.match(controller, /voucher_date <= \$3/);
    assert.match(page, /fromDate/);
    assert.match(page, /toDate/);
});

test('accounting Day Book excludes unpaid purchase invoices', () => {
    const controller = read(path.join(backendSourceRoot, 'controllers', 'Accounting.Controller.js'));
    assert.match(controller, /source_module IS DISTINCT FROM 'PURCHASE_INVOICE'/);
});

test('accounting Day Book returns separate debit and credit totals', () => {
    const controller = read(path.join(backendSourceRoot, 'controllers', 'Accounting.Controller.js'));
    const page = read(path.join(frontendSourceRoot, 'pages', 'Commercial', 'DayBook.jsx'));
    assert.match(controller, /AS total_debit/);
    assert.match(controller, /AS total_credit/);
    assert.match(page, /v\.total_debit/);
    assert.match(page, /v\.total_credit/);
});

test('purchase payment locks invoices during settlement', () => {
    const source = read(path.join(backendSourceRoot, 'controllers', 'Purchase.Controller.js'));
    assert.match(source, /purchase_invoice_id = \$1 AND company_id = \$2\s+FOR UPDATE/);
});

test('ledger balance updates use the centralized posting helper', () => {
    const posting = read(path.join(backendSourceRoot, 'services', 'AccountingPosting.js'));
    const purchase = read(path.join(backendSourceRoot, 'controllers', 'Purchase.Controller.js'));
    const sales = read(path.join(backendSourceRoot, 'controllers', 'Sales.Controller.js'));
    assert.match(posting, /export const applyLedgerBalance/);
    assert.ok(purchase.includes('applyLedgerBalance'));
    assert.ok(sales.includes('applyLedgerBalance'));
    assert.doesNotMatch(purchase, /UPDATE ledgers SET current_balance = current_balance [+-]/);
    assert.doesNotMatch(sales, /UPDATE ledgers\s+SET current_balance = current_balance [+-]/);
});

test('accounting schema enforces one-sided voucher lines', () => {
    const schema = read(path.join(backendSourceRoot, 'config', 'accounting_schema.js'));
    assert.match(schema, /ck_debit_or_credit/);
    assert.match(schema, /debit_amount > 0 AND credit_amount = 0/);
    assert.match(schema, /credit_amount > 0 AND debit_amount = 0/);
});

test('compliance payroll is integrated with accounting and statutory records', () => {
    const controller = read(path.join(backendSourceRoot, 'controllers', 'Compliance.Controller.js'));
    const routes = read(path.join(backendSourceRoot, 'routes', 'Compliance.Routes.js'));
    const schema = read(path.join(backendSourceRoot, 'config', 'accounting_schema.js'));
    assert.match(schema, /CREATE TABLE IF NOT EXISTS payroll_runs/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS compliance_challans/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS form16_records/);
    assert.match(controller, /postJournal/);
    assert.match(controller, /applyLedgerBalance/);
    assert.match(controller, /generateForm16/);
    assert.match(routes, /\/payroll-runs/);
    assert.match(routes, /\/challans/);
    assert.match(routes, /\/form16/);
});
