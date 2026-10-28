const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('Authentication Persistence & Session Flow Suite', () => {
    let server;
    let baseUrl;
    let originalFindById;

    before(async () => {
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        originalFindById = User.findById;
    });

    after(async () => {
        User.findById = originalFindById;
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('1. Unauthenticated request to /api/auth/me without cookie returns 401', async () => {
        const res = await fetch(`${baseUrl}/api/auth/me`, { method: 'GET' });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.message, 'Not authorized, no token provided');
    });

    test('2. Request with invalid or tampered token cookie returns 401', async () => {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Cookie': 'token=invalid.tampered.token'
            }
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.message, 'Not authorized, token verification failed');
    });

    test('3. Request with expired token cookie returns 401', async () => {
        const expiredToken = jwt.sign(
            { id: '507f1f77bcf86cd799439011' },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '-1s' }
        );
        const res = await fetch(`${baseUrl}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Cookie': `token=${expiredToken}`
            }
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.message, 'Not authorized, token verification failed');
    });

    test('4. Request with valid token cookie restores user session successfully', async () => {
        const fakeUserId = '507f1f77bcf86cd799439011';
        const validToken = jwt.sign(
            { id: fakeUserId },
            process.env.JWT_SECRET || 'testsecret',
            { expiresIn: '1d' }
        );

        // Stub User.findById for session restoration test
        User.findById = (id) => ({
            select: (fields) => {
                assert.equal(id, fakeUserId);
                assert.equal(fields, '-password');
                return Promise.resolve({
                    _id: fakeUserId,
                    name: 'Alex Morgan',
                    email: 'alex@example.com'
                });
            }
        });

        const res = await fetch(`${baseUrl}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Cookie': `token=${validToken}`
            }
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.user.name, 'Alex Morgan');
        assert.equal(data.user.email, 'alex@example.com');
        assert.equal(data.user.id, fakeUserId);
    });

    test('5. Logout endpoint invalidates session cookie with expired date', async () => {
        const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);

        // Check Set-Cookie header contains expiry in the past
        const cookieHeader = res.headers.get('set-cookie');
        assert.ok(cookieHeader, 'Expected Set-Cookie header on logout');
        assert.ok(cookieHeader.includes('token=;'), 'Expected empty token in cookie');
        assert.ok(cookieHeader.toLowerCase().includes('httponly'), 'Expected HttpOnly flag');
        assert.ok(
            cookieHeader.includes('1970') || cookieHeader.includes('Max-Age=0') || cookieHeader.includes('Expires='),
            'Expected cookie to be expired in the past'
        );
    });
});
