const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./app');
const { isStripeEnabled } = require('./utils/stripePayments');
const { isEasypaisaLive } = require('./utils/easypaisaPayments');
const { logPublicAppUrlStartupChecks } = require('./utils/publicAppUrl');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const SportCategory = require('./models/SportCategory');
const IndoorGround = require('./models/IndoorGround');

async function seedMinimal() {
  const count = await SportCategory.countDocuments();
  if (count === 0) {
    await SportCategory.insertMany([
      { name: 'Cricket', slug: 'cricket', description: 'Indoor / training cricket' },
      { name: 'Badminton', slug: 'badminton', description: 'Indoor badminton' },
    ]);
    console.log('Seeded sport categories');
  }
  const grounds = await IndoorGround.countDocuments();
  if (grounds === 0) {
    const demoOwner = {
      ownerName: 'Demo Owner',
      ownerPhone: '+923001234567',
      ownerAddress: 'Demo owner mailing address',
      ownerLocation: 'Gulberg III, Lahore',
    };
    const cricketImages = [
      '/uploads/demo-ground-cricket-1.jpg',
      '/uploads/demo-ground-cricket-2.jpg',
      '/uploads/demo-ground-cricket-3.jpg',
    ];
    const badmintonImages = [
      '/uploads/demo-ground-badminton-1.jpg',
      '/uploads/demo-ground-badminton-2.jpg',
      '/uploads/demo-ground-badminton-3.jpg',
    ];
    await IndoorGround.insertMany([
      {
        name: 'Central Indoor Cricket Arena',
        sportType: 'cricket',
        city: 'Lahore',
        address: 'Demo address',
        location: 'Gulberg III, Lahore — https://maps.google.com',
        imagePaths: cricketImages,
        imagePath: cricketImages[0],
        lengthFeet: 120,
        areaSqFt: 14400,
        isActive: true,
        ...demoOwner,
      },
      {
        name: 'Feather Court Badminton',
        sportType: 'badminton',
        city: 'Lahore',
        address: 'Demo address',
        location: 'DHA Phase 5, Lahore',
        imagePaths: badmintonImages,
        imagePath: badmintonImages[0],
        lengthFeet: 44,
        areaSqFt: 880,
        isActive: true,
        ...demoOwner,
      },
    ]);
    console.log('Seeded sample indoor grounds');
  }
}

const PORT = process.env.PORT || 5000;
let httpServer;

function shutdown(signal) {
  console.log(`[shutdown] ${signal} received — closing server`);
  if (!httpServer) {
    process.exit(0);
    return;
  }
  httpServer.close(async () => {
    try {
      await disconnectDatabase();
    } catch (e) {
      console.error('[shutdown] db disconnect error:', e.message);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[shutdown] forced exit after timeout');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

connectDatabase()
  .then(async () => {
    await seedMinimal();
    logPublicAppUrlStartupChecks();
    httpServer = app.listen(PORT, () => {
      console.log(`API listening on port ${PORT} (pid ${process.pid})`);
      if (!isStripeEnabled()) {
        console.warn(
          '[stripe] STRIPE_SECRET_KEY missing — platform subscriptions need Stripe; ground/shop use Easypaisa'
        );
      } else {
        console.log('[stripe] Platform subscription payments enabled');
      }
      if (isEasypaisaLive()) {
        console.log('[easypaisa] Live merchant mode enabled');
      } else {
        console.log('[easypaisa] Demo mode — ground & product checkout simulates Easypaisa');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to start', err);
    process.exit(1);
  });
