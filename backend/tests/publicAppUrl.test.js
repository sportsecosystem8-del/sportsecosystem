describe('publicAppUrl helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.CLIENT_URL;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers APP_BASE_URL when provided', () => {
    process.env.APP_BASE_URL = 'https://app.example.com';
    process.env.CLIENT_URL = 'https://api.example.com';

    const { getPublicAppUrlForEmailLinks } = require('../utils/publicAppUrl');

    expect(getPublicAppUrlForEmailLinks()).toBe('https://app.example.com');
  });

  it('uses CLIENT_URL when APP_BASE_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_URL = 'https://app.example.com';

    const { getPublicAppUrlForEmailLinks } = require('../utils/publicAppUrl');

    expect(getPublicAppUrlForEmailLinks()).toBe('https://app.example.com');
  });

  it('uses deployment host variables like VERCEL_URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_URL = 'sports-ecosystem-git-main.vercel.app';

    const { getPublicAppUrlForEmailLinks } = require('../utils/publicAppUrl');

    expect(getPublicAppUrlForEmailLinks()).toBe('https://sports-ecosystem-git-main.vercel.app');
  });

  it('falls back to the local Vite URL in development when no public URL is configured', () => {
    const { getPublicAppUrlForEmailLinks, DEV_FALLBACK_BASE_URL } = require('../utils/publicAppUrl');

    expect(getPublicAppUrlForEmailLinks()).toBe(DEV_FALLBACK_BASE_URL);
  });
});
