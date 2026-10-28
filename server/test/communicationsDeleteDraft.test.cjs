const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Communication = require('../src/models/communication.model');
const User = require('../src/models/user.model');

describe('Email Studio - Delete Saved AI Email Draft Suite', () => {
    let server;
    let baseUrl;
    let originalFindOneAndDelete;
    let originalUserFindById;

    const ownerUserId = '6500000000000000000000a1';
    const otherUserId = '6500000000000000000000a2';
    const draftOneId = '6500000000000000000000d1';
    const draftTwoId = '6500000000000000000000d2';
    const otherUserDraftId = '6500000000000000000000d3';

    let ownerToken;
    let otherToken;

    // In-memory mock store for communications
    let mockCommunications = [];

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;

        originalFindOneAndDelete = Communication.findOneAndDelete;
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

        // Mock findOneAndDelete that respects query filters (id and user)
        Communication.findOneAndDelete = (query) => {
            const targetId = String(query._id);
            const targetUser = String(query.user);

            const index = mockCommunications.findIndex(
                item => String(item._id) === targetId && String(item.user) === targetUser
            );

            if (index === -1) {
                return Promise.resolve(null);
            }

            const [deleted] = mockCommunications.splice(index, 1);
            return Promise.resolve(deleted);
        };
    });

    after(async () => {
        Communication.findOneAndDelete = originalFindOneAndDelete;
        User.findById = originalUserFindById;

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    const resetMockData = () => {
        mockCommunications = [
            {
                _id: draftOneId,
                user: ownerUserId,
                companyName: 'Linear',
                role: 'Senior Product Designer',
                type: 'application',
                subject: 'Application: Senior Product Designer - Linear',
                body: 'Hello Linear team,\n\nI am thrilled to submit my application...',
                status: 'draft'
            },
            {
                _id: draftTwoId,
                user: ownerUserId,
                companyName: 'Notion',
                role: 'Frontend Engineer',
                type: 'followup',
                subject: 'Following up on Frontend Engineer Application',
                body: 'Hello Notion recruiting team,\n\nFollowing up on my submission...',
                status: 'draft'
            },
            {
                _id: otherUserDraftId,
                user: otherUserId,
                companyName: 'Figma',
                role: 'Systems Architect',
                type: 'recruiter_outreach',
                subject: 'Inquiry regarding Systems Architect role',
                body: 'Hi there,\n\nReaching out regarding...',
                status: 'draft'
            }
        ];
    };

    test('1. Unauthenticated request to delete draft is rejected with 401', async () => {
        resetMockData();
        const res = await fetch(`${baseUrl}/api/features/communications/${draftOneId}/draft`, {
            method: 'DELETE'
        });
        assert.equal(res.status, 401);
        // Ensure mock data remains intact
        assert.equal(mockCommunications.length, 3);
    });

    test('2. Invalid draft ObjectId returns 400 with descriptive error', async () => {
        resetMockData();
        const res = await fetch(`${baseUrl}/api/features/communications/invalid-not-an-id/draft`, {
            method: 'DELETE',
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.message, 'Invalid draft ID.');
        assert.equal(mockCommunications.length, 3);
    });

    test('3. Authenticated owner can delete their own saved draft (returns 200)', async () => {
        resetMockData();
        const res = await fetch(`${baseUrl}/api/features/communications/${draftOneId}/draft`, {
            method: 'DELETE',
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.message, 'Draft deleted successfully');
        assert.equal(String(data.data.id), draftOneId);

        // Verify draftOne was removed and draftTwo remains
        assert.equal(mockCommunications.length, 2);
        assert.equal(mockCommunications.some(d => String(d._id) === draftOneId), false);
        assert.equal(mockCommunications.some(d => String(d._id) === draftTwoId), true);
        assert.equal(mockCommunications.some(d => String(d._id) === otherUserDraftId), true);
    });

    test('4. Cross-user isolation: User cannot delete another user\'s draft (returns 404 without data leak)', async () => {
        resetMockData();
        // owner tries to delete otherUser's draft
        const res = await fetch(`${baseUrl}/api/features/communications/${otherUserDraftId}/draft`, {
            method: 'DELETE',
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.message, 'Draft communication not found.');

        // Verify otherUser's draft was NOT deleted
        assert.equal(mockCommunications.length, 3);
        assert.equal(mockCommunications.some(d => String(d._id) === otherUserDraftId), true);
    });

    test('5. Non-existent draft ID returns 404', async () => {
        resetMockData();
        const nonExistentId = '6500000000000000000000ff';
        const res = await fetch(`${baseUrl}/api/features/communications/${nonExistentId}/draft`, {
            method: 'DELETE',
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.message, 'Draft communication not found.');
    });

    test('6. Deleting one draft leaves other drafts and records isolated', async () => {
        resetMockData();
        // Owner deletes draftTwo
        const res = await fetch(`${baseUrl}/api/features/communications/${draftTwoId}/draft`, {
            method: 'DELETE',
            headers: { 'Cookie': `token=${ownerToken}` }
        });
        assert.equal(res.status, 200);

        // Verify draftTwo is deleted, but draftOne and otherUserDraftId are completely unaffected
        assert.equal(mockCommunications.length, 2);
        const remainingIds = mockCommunications.map(d => String(d._id));
        assert.ok(remainingIds.includes(draftOneId));
        assert.ok(remainingIds.includes(otherUserDraftId));
        assert.ok(!remainingIds.includes(draftTwoId));
    });
});
