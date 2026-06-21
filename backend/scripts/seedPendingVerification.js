/**
 * One pending coach + one pending business for admin verification mockup (local dev).
 * Idempotent: skips create if email exists; always sets verificationStatus to pending_review.
 * Password: Demo1234!
 *
 * Usage (from backend/): npm run seed:pending-verification
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const CoachProfile = require('../models/CoachProfile');
const BusinessProfile = require('../models/BusinessProfile');

const DEMO_PASSWORD = 'Demo1234!';
const MAP_URL = 'https://www.google.com/maps?q=24.8607,67.0011';

const MOCK_COACH = {
  email: 'mock-pending-coach@local.test',
  fullName: 'Mock Coach (Pending)',
  city: 'Karachi',
  specialties: ['cricket'],
};

const MOCK_BUSINESS = {
  email: 'mock-pending-business@local.test',
  businessName: 'Mock Sports Shop',
  storeName: 'Mock Sports Shop',
  address: '123 Demo Street, Karachi',
  city: 'Karachi',
};

async function ensurePendingCoach(passwordHash) {
  const email = MOCK_COACH.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      passwordHash,
      role: 'coach',
      verificationStatus: 'pending_review',
      emailVerified: true,
    });
    const cp = await CoachProfile.create({
      user: user._id,
      fullName: MOCK_COACH.fullName,
      phone: '03211234567',
      specialties: MOCK_COACH.specialties,
      academyLocation: `${MOCK_COACH.city} Sports Academy`,
      city: MOCK_COACH.city,
      bio: 'Mock coach awaiting admin verification.',
      yearsExperience: 5,
      availability: [],
      locationMapUrl: MAP_URL,
    });
    user.coachProfile = cp._id;
    await user.save();
    console.log('Created pending coach:', email);
  } else {
    console.log('Coach exists, ensuring pending_review:', email);
  }
  user.verificationStatus = 'pending_review';
  await user.save();
}

async function ensurePendingBusiness(passwordHash) {
  const email = MOCK_BUSINESS.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      passwordHash,
      role: 'business_owner',
      verificationStatus: 'pending_review',
      emailVerified: true,
    });
    const bp = await BusinessProfile.create({
      user: user._id,
      businessName: MOCK_BUSINESS.businessName,
      address: MOCK_BUSINESS.address,
      phone: '0211234567',
      storeName: MOCK_BUSINESS.storeName,
      storeDescription: 'Mock business awaiting admin verification.',
      locationMapUrl: MAP_URL,
    });
    user.businessProfile = bp._id;
    await user.save();
    console.log('Created pending business:', email);
  } else {
    console.log('Business exists, ensuring pending_review:', email);
  }
  user.verificationStatus = 'pending_review';
  await user.save();
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await ensurePendingCoach(passwordHash);
  await ensurePendingBusiness(passwordHash);
  await mongoose.disconnect();
  console.log('\nDone. Admin queue: /admin/verification/coaches & /admin/verification/business');
  console.log('Login password for both accounts:', DEMO_PASSWORD);
  console.log('Coach:', MOCK_COACH.email);
  console.log('Business:', MOCK_BUSINESS.email);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
