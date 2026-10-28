const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { OAuth2Client } = require('google-auth-library');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('Google Sign-In & OAuth Verification Suite', () => {
    let server;
    let baseUrl;
    let originalVerifyIdToken;
    let originalFindOne;
    let originalCreate;
    let originalGoogleClientId;

    const testClientId = 'test-google-client-id-12345.apps.googleusercontent.com';
    const mockGoogleSub = '109876543210987654321';
    const mockEmail = 'googleuser@example.com';
    const existingPasswordEmail = 'passworduser@example.com';

    let mockUsers = [];

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;

        originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
        originalFindOne = User.findOne;
        originalCreate = User.create;
        originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

        process.env.GOOGLE_CLIENT_ID = testClientId;
    });

    after(async () => {
        OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
        User.findOne = originalFindOne;
        User.create = originalCreate;
        process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    beforeEach(() => {
        mockUsers = [
            {
                _id: '650000000000000000000001',
                name: 'Password User',
                email: existingPasswordEmail,
                password: '$2a$10$FakeHashedPasswordStringForUnitTesting...',
                authProvider: 'local'
            }
        ];

        // Stub User.findOne
        User.findOne = (query) => {
            if (query.googleId) {
                const found = mockUsers.find(u => u.googleId === query.googleId);
                return Promise.resolve(found || null);
            }
            if (query.email) {
                const found = mockUsers.find(u => u.email === query.email.toLowerCase());
                return Promise.resolve(found || null);
            }
            return Promise.resolve(null);
        };

        // Stub User.create
        User.create = (userData) => {
            const newUser = {
                _id: '65000000000000000000000' + (mockUsers.length + 1),
                ...userData
            };
            mockUsers.push(newUser);
            return Promise.resolve(newUser);
        };
    });

    test('1. Rejection of empty, missing, or malformed credential token returns 400', async () => {
        const resEmpty = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert.equal(resEmpty.status, 400);
        const dataEmpty = await resEmpty.json();
        assert.equal(dataEmpty.success, false);
        assert.ok(dataEmpty.message.includes('Invalid Google credential token'));

        const resShort = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: 'too-short-to-be-a-jwt' })
        });
        assert.equal(resShort.status, 400);
    });

    test('2. Missing server configuration returns 503 without leaking details', async () => {
        const originalEnv = process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_ID;

        try {
            const dummyToken = 'a'.repeat(60);
            const res = await fetch(`${baseUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: dummyToken })
            });
            assert.equal(res.status, 503);
            const data = await res.json();
            assert.equal(data.success, false);
            assert.ok(data.message.includes('unavailable'));
        } finally {
            process.env.GOOGLE_CLIENT_ID = originalEnv;
        }
    });

    test('3. Verification failure (invalid signature, expired, or wrong audience) returns 401', async () => {
        OAuth2Client.prototype.verifyIdToken = async () => {
            throw new Error('Token used too late, 1729000000 < 1729000005');
        };

        const dummyToken = 'a'.repeat(60);
        const res = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: dummyToken })
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.message, 'Google authentication failed. The token is invalid or has expired.');
    });

    test('4. Unverified Google email returns 400 with helpful verification message', async () => {
        OAuth2Client.prototype.verifyIdToken = async () => ({
            getPayload: () => ({
                sub: mockGoogleSub,
                email: 'unverified@example.com',
                email_verified: false,
                name: 'Unverified User'
            })
        });

        const dummyToken = 'a'.repeat(60);
        const res = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: dummyToken })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.ok(data.message.includes('not verified'));
    });

    test('5. Existing password-based account conflict returns 409 without silent linking', async () => {
        OAuth2Client.prototype.verifyIdToken = async () => ({
            getPayload: () => ({
                sub: 'a-new-different-sub-123',
                email: existingPasswordEmail,
                email_verified: true,
                name: 'Password User'
            })
        });

        const dummyToken = 'a'.repeat(60);
        const res = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: dummyToken })
        });
        assert.equal(res.status, 409);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.ok(data.message.includes('Please sign in with your email and password'));

        // Verify account was NOT modified or linked
        const userInDb = mockUsers.find(u => u.email === existingPasswordEmail);
        assert.equal(userInDb.googleId, undefined);
        assert.equal(userInDb.authProvider, 'local');
    });

    test('6. Brand new Google user registers and logs in with HTTP-only cookie', async () => {
        OAuth2Client.prototype.verifyIdToken = async () => ({
            getPayload: () => ({
                sub: mockGoogleSub,
                email: mockEmail,
                email_verified: true,
                name: 'Alex Morgan'
            })
        });

        const dummyToken = 'a'.repeat(60);
        const res = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: dummyToken })
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.user.email, mockEmail);
        assert.equal(data.user.name, 'Alex Morgan');

        // Check Set-Cookie header contains session token
        const cookieHeader = res.headers.get('set-cookie');
        assert.ok(cookieHeader, 'Expected Set-Cookie header on successful Google sign-in');
        assert.ok(cookieHeader.includes('token='), 'Expected token in cookie');
        assert.ok(cookieHeader.toLowerCase().includes('httponly'), 'Expected HttpOnly flag');

        // Verify user in mock database
        const createdUser = mockUsers.find(u => u.googleId === mockGoogleSub);
        assert.ok(createdUser);
        assert.equal(createdUser.authProvider, 'google');
        assert.equal(createdUser.password, undefined);
    });

    test('7. Returning Google user logs in without creating a duplicate account', async () => {
        // Pre-insert existing Google user
        mockUsers.push({
            _id: '650000000000000000000088',
            name: 'Existing Google User',
            email: 'existing.google@example.com',
            googleId: 'returning-google-sub-999',
            authProvider: 'google'
        });

        const userCountBefore = mockUsers.length;

        OAuth2Client.prototype.verifyIdToken = async () => ({
            getPayload: () => ({
                sub: 'returning-google-sub-999',
                email: 'existing.google@example.com',
                email_verified: true,
                name: 'Existing Google User'
            })
        });

        const dummyToken = 'a'.repeat(60);
        const res = await fetch(`${baseUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: dummyToken })
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.user.id, '650000000000000000000088');

        // Verify no duplicate account was created
        assert.equal(mockUsers.length, userCountBefore);
    });

    test('8. Google-only user cannot log in via password without setting one', async () => {
        mockUsers.push({
            _id: '650000000000000000000099',
            name: 'Google Only User',
            email: 'googleonly@example.com',
            googleId: 'google-only-sub-111',
            authProvider: 'google',
            password: undefined
        });

        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'googleonly@example.com', password: 'arbitrarypassword' })
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.ok(data.message.includes('Continue with Google'));
    });
});
