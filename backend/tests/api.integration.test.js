const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

const skipNoDb = !process.env.MONGODB_URI ? describe.skip : describe;

skipNoDb('Sports Ecosystem API (integration)', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/auth/register coach without specialties returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `t-coach-${Date.now()}@test.local`,
        password: 'Password@12',
        role: 'coach',
        profile: { fullName: 'T', specialties: [], city: 'Lahore' },
      });
    expect(res.status).toBe(400);
    expect(res.body.message || res.body.errors).toBeTruthy();
  });

  it('POST /api/auth/register player returns 201 and requires email verification', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `t-player-${Date.now()}@test.local`,
        password: 'Password@12',
        role: 'player',
        profile: {
          fullName: 'Test Player',
          sportPreference: 'cricket',
          playerCategory: 'batsman',
          skillLevel: 'beginner',
          city: 'Lahore',
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.data?.token).toBeFalsy();
    expect(res.body.data?.user?.role).toBe('player');
    expect(res.body.data?.user?.emailVerified).toBe(false);
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const email = `t-login-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({
      email,
      password: 'Password@12',
      role: 'player',
      profile: {
        fullName: 'L',
        sportPreference: 'badminton',
        skillLevel: 'beginner',
        city: 'Lahore',
      },
    });
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});
