const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Application = require('../src/models/applications.model');
const User = require('../src/models/user.model');

describe('Applications Pagination Logic & Controller Suite', () => {
    let server;
    let baseUrl;
    let originalFind;
    let originalCountDocuments;
    let originalUserFindById;
    const testUserId = '6500000000000000000000aa';
    let validToken;

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
        User.findById = (id) => ({
            select: () => Promise.resolve({ _id: testUserId, name: 'Test User', email: 'test@example.com' })
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

    // Helper to generate N mock applications
    const generateMockApps = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            _id: `app_${i + 1}`,
            companyName: `Company ${i + 1}`,
            role: `Software Engineer ${i + 1}`,
            status: 'Applied',
            applicationSource: 'LinkedIn',
            user: testUserId
        }));
    };

    test('1. Zero matching applications returns total: 0, totalPages: 0, and empty data array', async () => {
        Application.countDocuments = async () => 0;
        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve([])
            })
        });

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.total, 0);
        assert.equal(body.totalPages, 0);
        assert.equal(body.page, 1);
        assert.equal(body.limit, 10);
        assert.deepEqual(body.data, []);
    });

    test('2. 1-10 matching applications (e.g. 5 records) returns 1 page', async () => {
        const mockApps = generateMockApps(5);
        Application.countDocuments = async () => 5;
        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve(mockApps)
            })
        });

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.total, 5);
        assert.equal(body.totalPages, 1);
        assert.equal(body.data.length, 5);
    });

    test('3. Exactly 10 matching applications produces exactly 1 page', async () => {
        const mockApps = generateMockApps(10);
        Application.countDocuments = async () => 10;
        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve(mockApps)
            })
        });

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.total, 10);
        assert.equal(body.totalPages, 1);
        assert.equal(body.data.length, 10);
    });

    test('4. 12 matching applications produces 2 pages (page 1 returns 10, page 2 returns 2)', async () => {
        const allMockApps = generateMockApps(12);

        Application.countDocuments = async () => 12;
        Application.find = () => ({
            skip: (skipCount) => ({
                limit: (limitCount) => {
                    const sliced = allMockApps.slice(skipCount, skipCount + limitCount);
                    return Promise.resolve(sliced);
                }
            })
        });

        // Request Page 1
        const res1 = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res1.status, 200);
        const body1 = await res1.json();
        assert.equal(body1.total, 12);
        assert.equal(body1.totalPages, 2);
        assert.equal(body1.page, 1);
        assert.equal(body1.data.length, 10);
        assert.equal(body1.data[0]._id, 'app_1');
        assert.equal(body1.data[9]._id, 'app_10');

        // Request Page 2
        const res2 = await fetch(`${baseUrl}/api/applications/get-all-applications?page=2&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res2.status, 200);
        const body2 = await res2.json();
        assert.equal(body2.total, 12);
        assert.equal(body2.totalPages, 2);
        assert.equal(body2.page, 2);
        assert.equal(body2.data.length, 2);
        assert.equal(body2.data[0]._id, 'app_11');
        assert.equal(body2.data[1]._id, 'app_12');
    });

    test('5. 25 matching applications produces 3 pages with limit 10', async () => {
        Application.countDocuments = async () => 25;
        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve(generateMockApps(10))
            })
        });

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.total, 25);
        assert.equal(body.totalPages, 3);
    });

    test('6. Filtered query reflects filtered total rather than unfiltered database total', async () => {
        let capturedFilter;
        Application.countDocuments = async (filter) => {
            capturedFilter = filter;
            if (filter.status === 'Interview Scheduled') return 4;
            return 100;
        };
        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve(generateMockApps(4))
            })
        });

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10&status=Interview%20Scheduled`, {
            headers: { 'Cookie': `token=${validToken}` }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(capturedFilter.status, 'Interview Scheduled');
        assert.equal(body.total, 4);
        assert.equal(body.totalPages, 1);
        assert.equal(body.data.length, 4);
    });
});
