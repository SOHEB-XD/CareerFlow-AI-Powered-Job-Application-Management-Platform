const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Application = require('../src/models/applications.model');
const User = require('../src/models/user.model');

describe('Applications Date Range Filter Suite', () => {
    let server;
    let baseUrl;
    let originalFind;
    let originalCountDocuments;
    let originalUserFindById;
    const testUserId = '6500000000000000000000bb';
    let validToken;
    let lastFindFilter;
    let lastCountFilter;

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;

        originalFind = Application.find;
        originalCountDocuments = Application.countDocuments;
        originalUserFindById = User.findById;

        validToken = jwt.sign(
            { id: testUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        // Stub User.findById for auth middleware
        User.findById = () => ({
            select: () => Promise.resolve({ _id: testUserId, name: 'Date Filter Tester', email: 'datefilter@example.com' })
        });
    });

    after(async () => {
        Application.find = originalFind;
        Application.countDocuments = originalCountDocuments;
        User.findById = originalUserFindById;
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    // Helper to setup mock queries and capture passed filters
    const setupMockQuery = (mockDocs = [], totalCount = mockDocs.length) => {
        lastFindFilter = null;
        lastCountFilter = null;

        Application.find = (filter) => {
            lastFindFilter = filter;
            return {
                skip: (skipVal) => ({
                    limit: (limitVal) => {
                        const sliced = mockDocs.slice(skipVal, skipVal + limitVal);
                        return Promise.resolve(sliced);
                    }
                })
            };
        };

        Application.countDocuments = (filter) => {
            lastCountFilter = filter;
            return Promise.resolve(totalCount);
        };
    };

    test('1. No date boundaries returns existing results unchanged without appliedDate filter', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Acme Corp', role: 'Engineer', appliedDate: new Date('2026-05-10T12:00:00Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.total, 1);
        assert.equal(lastFindFilter.appliedDate, undefined);
        assert.equal(lastCountFilter.appliedDate, undefined);
    });

    test('2. From date only applies $gte with UTC start of day', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Beta Inc', role: 'Developer', appliedDate: new Date('2026-05-10T12:00:00Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=2026-05-01`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(lastFindFilter.appliedDate);
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-05-01T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte, undefined);
        // Find and count filters must be identical
        assert.deepEqual(lastFindFilter.appliedDate, lastCountFilter.appliedDate);
    });

    test('3. To date only applies $lte with UTC end of day (inclusive 23:59:59.999Z)', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Gamma LLC', role: 'Designer', appliedDate: new Date('2026-05-15T20:00:00Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?toDate=2026-05-15`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(lastFindFilter.appliedDate);
        assert.equal(lastFindFilter.appliedDate.$gte, undefined);
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-05-15T23:59:59.999Z');
        assert.deepEqual(lastFindFilter.appliedDate, lastCountFilter.appliedDate);
    });

    test('4. Inclusive From and To boundaries apply both $gte and $lte', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Delta Systems', role: 'Lead', appliedDate: new Date('2026-05-10T10:00:00Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=2026-05-01&toDate=2026-05-15`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-05-01T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-05-15T23:59:59.999Z');
        assert.deepEqual(lastFindFilter.appliedDate, lastCountFilter.appliedDate);
    });

    test('5. No matching records in date range returns total: 0 and empty array', async () => {
        setupMockQuery([], 0);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=2026-01-01&toDate=2026-01-05`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.total, 0);
        assert.equal(body.totalPages, 0);
        assert.deepEqual(body.data, []);
    });

    test('6. Invalid date format returns HTTP 400', async () => {
        // Invalid text string
        const res1 = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=not-a-valid-date`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res1.status, 400);
        const body1 = await res1.json();
        assert.equal(body1.success, false);
        assert.match(body1.message, /invalid fromdate/i);

        // Invalid calendar date (Feb 31)
        const res2 = await fetch(`${baseUrl}/api/applications/get-all-applications?toDate=2026-02-31`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res2.status, 400);
        const body2 = await res2.json();
        assert.equal(body2.success, false);
        assert.match(body2.message, /invalid todate/i);
    });

    test('7. From date later than To date returns HTTP 400', async () => {
        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=2026-05-20&toDate=2026-05-10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.message, 'fromDate cannot be later than toDate');
    });

    test('8. Date filtering combines correctly with search and status filters', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Google', role: 'SWE', status: 'Applied', appliedDate: new Date('2026-05-05') }
        ]);

        const res = await fetch(
            `${baseUrl}/api/applications/get-all-applications?search=Google&status=Applied&fromDate=2026-05-01&toDate=2026-05-15`,
            { headers: { 'Cookie': `token=${validToken}` } }
        );

        assert.equal(res.status, 200);
        assert.ok(lastFindFilter.$or, 'Expected $or for search');
        assert.equal(lastFindFilter.status, 'Applied');
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-05-01T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-05-15T23:59:59.999Z');
        assert.deepEqual(lastFindFilter, lastCountFilter);
    });

    test('9. Filtered totals and page counts reflect date range query', async () => {
        // 14 matching records across 3 pages with limit 5
        const mockApps = Array.from({ length: 14 }, (_, i) => ({
            _id: `app_${i + 1}`,
            companyName: `Company ${i + 1}`,
            role: 'Dev',
            status: 'Applied',
            appliedDate: new Date('2026-05-02')
        }));

        setupMockQuery(mockApps, 14);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=2&limit=5&fromDate=2026-05-01&toDate=2026-05-10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.total, 14);
        assert.equal(body.totalPages, 3);
        assert.equal(body.page, 2);
        assert.equal(body.limit, 5);
        assert.equal(body.data.length, 5);
        assert.equal(body.data[0]._id, 'app_6');
    });

    test('10. Same day boundary (From == To) inclusively covers full 24 hours of that date', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Mono Day', role: 'Dev', appliedDate: new Date('2026-05-08T18:30:00.000Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?fromDate=2026-05-08&toDate=2026-05-08`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-05-08T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-05-08T23:59:59.999Z');
    });

    test('11. Single date query via date=YYYY-MM-DD parameter inclusively filters full day', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Single Day Corp', role: 'SWE', appliedDate: new Date('2026-10-27T14:15:00.000Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?date=2026-10-27`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-10-27T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-10-27T23:59:59.999Z');
        assert.deepEqual(lastFindFilter, lastCountFilter);
    });

    test('12. Single date filter combined with search and status', async () => {
        setupMockQuery([
            { _id: 'app_1', companyName: 'Meta', role: 'Engineer', status: 'Applied', appliedDate: new Date('2026-10-27T10:00:00.000Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?search=Meta&status=Applied&date=2026-10-27`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(lastFindFilter.$or);
        assert.equal(lastFindFilter.status, 'Applied');
        assert.equal(lastFindFilter.appliedDate.$gte.toISOString(), '2026-10-27T00:00:00.000Z');
        assert.equal(lastFindFilter.appliedDate.$lte.toISOString(), '2026-10-27T23:59:59.999Z');
    });
});
