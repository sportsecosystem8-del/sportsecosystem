const { Router } = require('express');
const { body, query } = require('express-validator');
const p = require('../controllers/playerController');
const { authenticate, requireRole, loadUser } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const r = Router();
r.use(authenticate, loadUser, requireRole('player'));

r.get('/me/profile', p.getProfile);
r.put(
  '/me/profile',
  [
    body('fullName').optional().trim(),
    body('sportPreference').optional().isIn(['cricket', 'football', 'badminton']),
    body('skillLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('playerCategory').optional().isIn(['batsman', 'bowler', 'allrounder']),
  ],
  p.updateProfile
);
r.post('/me/profile-photo', uploadImage.single('image'), p.uploadProfilePhoto);
r.get('/recommendations', [query('limit').optional().isInt({ min: 3, max: 5 })], p.getRecommendations);
r.get('/coaches/:coachId/profile', p.getCoachPublicProfile);
r.get('/coaches/:coachId/feedback', p.listCoachPublicFeedback);
r.get('/coaches/:coachId/certificates', p.listCoachCertificates);
r.get('/coaches/:coachId/certificates/:docId/file', p.streamCoachCertificateFile);
r.post('/training-requests', [body('coachId').notEmpty()], p.createTrainingRequest);
r.get('/training-requests', p.listMyTrainingRequests);
r.get('/training-sessions', p.listTrainingSessions);
r.get('/training-plans', p.listTrainingPlans);
r.post(
  '/ground-bookings/hold',
  [body('groundId').notEmpty(), body('startTime').notEmpty(), body('endTime').notEmpty()],
  p.holdGroundBooking
);
r.post('/ground-bookings/:id/payment-intent', p.createGroundBookingPaymentIntent);
r.post('/ground-bookings/:id/confirm-payment', p.confirmGroundPayment);
r.get('/ground-bookings', p.listMyGroundBookings);
r.delete('/ground-bookings/:id', p.cancelGroundBooking);
r.get('/performance', p.getPerformance);
r.get('/products', p.browseProducts);
r.post('/orders/payment-intent', p.createOrderPaymentIntent);
r.post('/orders', p.createOrder);
r.get('/orders', p.listMyOrders);
r.post('/coaches/:coachId/feedback', [body('rating').isInt({ min: 1, max: 5 })], p.submitCoachFeedback);
r.post(
  '/payments/coach/payment-intent',
  [body('coachId').notEmpty(), body('amount').isFloat({ min: 0.01 })],
  p.createCoachPaymentIntent
);
r.post(
  '/payments/coach',
  [body('coachId').notEmpty(), body('amount').isFloat({ min: 0.01 })],
  p.payCoach
);
r.get('/notifications', p.listNotifications);
r.patch('/notifications/:id/read', p.markNotificationRead);
r.post('/complaints', [body('subject').notEmpty(), body('description').notEmpty()], p.fileComplaint);

module.exports = r;
