const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Application = require('../src/models/applications.model');
const User = require('../src/models/user.model');

describe('Applications City Field and City Filter Suite', () => {
    let server;
    let baseUrl;
    let originalFind;
    let originalFindOne;
    let originalFindOneAndUpdate;
    let originalCountDocuments;
    let originalDistinct;
    let originalCreate;
    let originalUserFindById;

    const testUserId = '6500000000000000000000cc';
    const otherUserId = '6500000000000000000000dd';
    let validToken;
    let otherUserToken;

    let lastFindFilter;
    let lastCountFilter;
    let lastDistinctFilter;

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;

        originalFind = Application.find;
        originalFindOne = Application.findOne;
        originalFindOneAndUpdate = Application.findOneAndUpdate;
        originalCountDocuments = Application.countDocuments;
        originalDistinct = Application.distinct;
        originalCreate = Application.create;
        originalUserFindById = User.findById;

        validToken = jwt.sign(
            { id: testUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        otherUserToken = jwt.sign(
            { id: otherUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        // Stub User.findById for auth middleware
        User.findById = (id) => ({
            select: () => {
                if (String(id) === testUserId) {
                    return Promise.resolve({ _id: testUserId, name: 'City Tester', email: 'citytester@example.com' });
                }
                if (String(id) === otherUserId) {
                    return Promise.resolve({ _id: otherUserId, name: 'Other User', email: 'otheruser@example.com' });
                }
                return Promise.resolve(null);
            }
        });
    });

    after(async () => {
        Application.find = originalFind;
        Application.findOne = originalFindOne;
        Application.findOneAndUpdate = originalFindOneAndUpdate;
        Application.countDocuments = originalCountDocuments;
        Application.distinct = originalDistinct;
        Application.create = originalCreate;
        User.findById = originalUserFindById;

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

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

    test('1. Creating an application with a city trims and saves the city field', async () => {
        Application.findOne = () => Promise.resolve(null);
        let createdData = null;
        Application.create = (doc) => {
            createdData = doc;
            return Promise.resolve({
                _id: '650000000000000000000010',
                ...doc,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        };

        const res = await fetch(`${baseUrl}/api/applications/add-application`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${validToken}`
            },
            body: JSON.stringify({
                companyName: 'Acme Corp',
                role: 'Senior Frontend Engineer',
                applicationSource: 'LinkedIn',
                city: '  Surat  '
            })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(createdData.city, 'Surat');
        assert.equal(body.data.city, 'Surat');
    });

    test('2. Creating an application without city defaults to empty string', async () => {
        Application.findOne = () => Promise.resolve(null);
        let createdData = null;
        Application.create = (doc) => {
            createdData = doc;
            return Promise.resolve({
                _id: '650000000000000000000020',
                ...doc,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        };

        const res = await fetch(`${baseUrl}/api/applications/add-application`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${validToken}`
            },
            body: JSON.stringify({
                companyName: 'Beta Systems',
                role: 'Backend Developer',
                applicationSource: 'Indeed'
            })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(createdData.city, '');
    });

    test('3. Updating an application city persists trimmed city', async () => {
        const appId = '650000000000000000000030';
        const existingApp = {
            _id: appId,
            user: { toString: () => testUserId },
            companyName: 'Gamma LLC',
            role: 'DevOps Engineer',
            status: 'Applied',
            city: 'Ahmedabad'
        };

        Application.findOne = (query) => {
            if (query && query._id === appId) {
                return Promise.resolve(existingApp);
            }
            return Promise.resolve(null);
        };

        let updatedFields = null;
        Application.findOneAndUpdate = (filter, update) => {
            updatedFields = update;
            return Promise.resolve({
                ...existingApp,
                ...update,
                _id: appId
            });
        };

        const res = await fetch(`${baseUrl}/api/applications/update-application/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${validToken}`
            },
            body: JSON.stringify({
                city: '  Bengaluru  '
            })
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(updatedFields.city, 'Bengaluru');
        assert.equal(body.data.city, 'Bengaluru');
    });

    test('4. Clearing an application city saves empty string', async () => {
        const appId = '650000000000000000000040';
        const existingApp = {
            _id: appId,
            user: { toString: () => testUserId },
            companyName: 'Delta Inc',
            role: 'Product Designer',
            status: 'Applied',
            city: 'Mumbai'
        };

        Application.findOne = (query) => {
            if (query && query._id === appId) {
                return Promise.resolve(existingApp);
            }
            return Promise.resolve(null);
        };

        let updatedFields = null;
        Application.findOneAndUpdate = (filter, update) => {
            updatedFields = update;
            return Promise.resolve({
                ...existingApp,
                ...update,
                _id: appId
            });
        };

        const res = await fetch(`${baseUrl}/api/applications/update-application/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${validToken}`
            },
            body: JSON.stringify({
                city: '   '
            })
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(updatedFields.city, '');
        assert.equal(body.data.city, '');
    });

    test('5. Editing other fields without city preserves the existing city', async () => {
        const appId = '650000000000000000000050';
        const existingApp = {
            _id: appId,
            user: { toString: () => testUserId },
            companyName: 'Epsilon Tech',
            role: 'Full Stack Engineer',
            status: 'Applied',
            city: 'Pune'
        };

        Application.findOne = (query) => {
            if (query && query._id === appId) {
                return Promise.resolve(existingApp);
            }
            return Promise.resolve(null);
        };

        let updatedFields = null;
        Application.findOneAndUpdate = (filter, update) => {
            updatedFields = update;
            return Promise.resolve({
                ...existingApp,
                ...update,
                _id: appId
            });
        };

        const res = await fetch(`${baseUrl}/api/applications/update-application/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${validToken}`
            },
            body: JSON.stringify({
                notes: 'Updated interview notes'
            })
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(updatedFields.city, undefined);
    });

    test('6. Scoped distinct cities endpoint returns distinct, sorted cities for authenticated user', async () => {
        Application.distinct = (field, filter) => {
            lastDistinctFilter = filter;
            assert.equal(field, 'city');
            // Mock returning raw distinct values including casing/spacing variations
            if (String(filter.user) === testUserId) {
                return Promise.resolve(['Surat', 'Mumbai', 'surat', 'Bengaluru']);
            }
            return Promise.resolve(['London', 'New York']);
        };

        const res = await fetch(`${baseUrl}/api/applications/get-user-cities`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(String(lastDistinctFilter.user), testUserId);
        // Deduplicated case-insensitively and sorted alphabetically
        assert.deepEqual(body.data, ['Bengaluru', 'Mumbai', 'Surat']);
    });

    test('7. Scoped distinct cities endpoint does not leak other users cities', async () => {
        Application.distinct = (field, filter) => {
            if (String(filter.user) === otherUserId) {
                return Promise.resolve(['Tokyo', 'Kyoto']);
            }
            return Promise.resolve(['Surat']);
        };

        const res = await fetch(`${baseUrl}/api/applications/get-user-cities`, {
            headers: { 'Cookie': `token=${otherUserToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.deepEqual(body.data, ['Kyoto', 'Tokyo']);
        assert.ok(!body.data.includes('Surat'));
    });

    test('8. Filtering by city applies case-insensitive exact match regex', async () => {
        setupMockQuery([
            { _id: '650000000000000000000060', companyName: 'Acme Corp', role: 'Engineer', city: 'Surat' }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?city=Surat`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.ok(lastFindFilter.city);
        assert.ok(lastCountFilter.city);
        assert.equal(lastFindFilter.city.$options, 'i');
        assert.equal(lastFindFilter.city.$regex, '^Surat$');
    });

    test('9. Querying with city=All does not filter by city', async () => {
        setupMockQuery([
            { _id: '650000000000000000000061', companyName: 'Acme Corp', role: 'Engineer', city: 'Surat' },
            { _id: '650000000000000000000062', companyName: 'Beta Inc', role: 'Designer', city: 'Mumbai' }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?city=All`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(lastFindFilter.city, undefined);
        assert.equal(lastCountFilter.city, undefined);
    });

    test('10. City filter combines seamlessly with search, status, and appliedDate filters', async () => {
        setupMockQuery([
            { _id: '650000000000000000000063', companyName: 'Acme Corp', role: 'Lead Engineer', status: 'Applied', city: 'Surat', appliedDate: new Date('2026-06-15T00:00:00Z') }
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?search=Acme&status=Applied&fromDate=2026-06-15&toDate=2026-06-15&city=Surat`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);

        // Ownership scope
        assert.equal(String(lastFindFilter.user), testUserId);
        assert.equal(String(lastCountFilter.user), testUserId);

        // Status filter
        assert.equal(lastFindFilter.status, 'Applied');
        assert.equal(lastCountFilter.status, 'Applied');

        // Date filter
        assert.ok(lastFindFilter.appliedDate.$gte);
        assert.ok(lastFindFilter.appliedDate.$lte);

        // City filter
        assert.equal(lastFindFilter.city.$regex, '^Surat$');
        assert.equal(lastCountFilter.city.$regex, '^Surat$');

        // Search query
        assert.ok(lastFindFilter.$or);
        assert.ok(lastCountFilter.$or);
    });

    test('11. Older records without city field remain valid', async () => {
        setupMockQuery([
            { _id: '650000000000000000000064', companyName: 'Legacy Corp', role: 'Architect' } // no city property
        ]);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications?page=1&limit=10`, {
            headers: { 'Cookie': `token=${validToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data[0].companyName, 'Legacy Corp');
    });
});
