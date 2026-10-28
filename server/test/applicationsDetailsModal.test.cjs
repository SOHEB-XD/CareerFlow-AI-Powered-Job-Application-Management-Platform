const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Application = require('../src/models/applications.model');
const User = require('../src/models/user.model');

describe('Application Details View & Endpoint Suite', () => {
    let server;
    let baseUrl;
    let originalFindOne;
    let originalFind;
    let originalCountDocuments;
    let originalUserFindById;

    const ownerUserId = '6500000000000000000000e1';
    const otherUserId = '6500000000000000000000e2';
    const testAppId = '6500000000000000000000aa';

    let ownerToken;
    let otherToken;

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;

        originalFindOne = Application.findOne;
        originalFind = Application.find;
        originalCountDocuments = Application.countDocuments;
        originalUserFindById = User.findById;

        ownerToken = jwt.sign(
            { id: ownerUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        otherToken = jwt.sign(
            { id: otherUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        User.findById = (id) => ({
            select: () => {
                if (String(id) === ownerUserId) {
                    return Promise.resolve({ _id: ownerUserId, name: 'Owner User', email: 'owner@example.com' });
                }
                if (String(id) === otherUserId) {
                    return Promise.resolve({ _id: otherUserId, name: 'Other User', email: 'other@example.com' });
                }
                return Promise.resolve(null);
            }
        });
    });

    after(async () => {
        Application.findOne = originalFindOne;
        Application.find = originalFind;
        Application.countDocuments = originalCountDocuments;
        User.findById = originalUserFindById;

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('1. Unauthenticated request to get application details returns 401', async () => {
        const res = await fetch(`${baseUrl}/api/applications/get-application/${testAppId}`);
        assert.equal(res.status, 401);
    });

    test('2. Invalid ObjectId returns 400 with descriptive error', async () => {
        const res = await fetch(`${baseUrl}/api/applications/get-application/not-a-valid-id`, {
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.message, 'Invalid application ID');
    });

    test('3. Owner user fetches full application record with all persisted fields', async () => {
        const mockApp = {
            _id: testAppId,
            user: ownerUserId,
            companyName: 'Stripe',
            role: 'Staff Infrastructure Engineer',
            status: 'Interview Scheduled',
            applicationSource: 'LinkedIn',
            appliedDate: new Date('2026-10-15T10:00:00Z'),
            interviewDate: new Date('2026-11-01T14:30:00Z'),
            companyWebsite: 'https://stripe.com',
            hrEmail: 'recruiting@stripe.com',
            notes: 'Preparing for distributed systems interview round and system architecture questions.',
            city: 'Seattle',
            createdAt: new Date('2026-10-15T10:00:00Z'),
            updatedAt: new Date('2026-10-20T12:00:00Z')
        };

        Application.findOne = (query) => {
            if (query._id === testAppId && String(query.user) === ownerUserId) {
                return Promise.resolve(mockApp);
            }
            return Promise.resolve(null);
        };

        const res = await fetch(`${baseUrl}/api/applications/get-application/${testAppId}`, {
            headers: { 'Cookie': `token=${ownerToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.companyName, 'Stripe');
        assert.equal(body.data.role, 'Staff Infrastructure Engineer');
        assert.equal(body.data.city, 'Seattle');
        assert.equal(body.data.companyWebsite, 'https://stripe.com');
        assert.equal(body.data.hrEmail, 'recruiting@stripe.com');
        assert.equal(body.data.notes, mockApp.notes);
        assert.ok(body.data.appliedDate);
        assert.ok(body.data.interviewDate);
    });

    test('4. Cross-user access is strictly forbidden (returns 404 when querying another user application)', async () => {
        Application.findOne = (query) => {
            // Only returns if user matches owner
            if (query._id === testAppId && String(query.user) === ownerUserId) {
                return Promise.resolve({ _id: testAppId, companyName: 'Secret Corp', user: ownerUserId });
            }
            return Promise.resolve(null);
        };

        const res = await fetch(`${baseUrl}/api/applications/get-application/${testAppId}`, {
            headers: { 'Cookie': `token=${otherToken}` }
        });

        assert.equal(res.status, 404);
        const body = await res.json();
        assert.equal(body.message, 'Application not found');
    });

    test('5. getAllApplications returns all necessary application details in collection response', async () => {
        const mockApps = [
            {
                _id: testAppId,
                companyName: 'Acme Corp',
                role: 'Frontend Lead',
                status: 'Applied',
                applicationSource: 'Referral',
                appliedDate: new Date('2026-10-10T00:00:00Z'),
                city: 'Surat',
                companyWebsite: 'https://acme.inc',
                hrEmail: 'hr@acme.inc',
                notes: 'Referred by senior staff engineer.',
                user: ownerUserId
            }
        ];

        Application.find = () => ({
            skip: () => ({
                limit: () => Promise.resolve(mockApps)
            })
        });

        Application.countDocuments = () => Promise.resolve(mockApps.length);

        const res = await fetch(`${baseUrl}/api/applications/get-all-applications`, {
            headers: { 'Cookie': `token=${ownerToken}` }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        const first = body.data[0];
        // Ensure none of the meaningful fields are excluded or projected out
        assert.equal(first.companyName, 'Acme Corp');
        assert.equal(first.role, 'Frontend Lead');
        assert.equal(first.city, 'Surat');
        assert.equal(first.companyWebsite, 'https://acme.inc');
        assert.equal(first.hrEmail, 'hr@acme.inc');
        assert.equal(first.notes, 'Referred by senior staff engineer.');
    });
});
