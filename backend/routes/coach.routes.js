const { Router } = require('express');
const { body, param } = require('express-validator');
const c = require('../controllers/coachController');
const { authenticate, requireRole, loadUser } = require('../middleware/auth');
const { requireCoachPlatformSubscription } = require('../middleware/coachPlatformSubscription');
const { upload, uploadImage } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validate');

const r = Router();
r.use(authenticate, loadUser, requireRole('coach'));

/** Profile, verification docs, notifications, and platform subscription — no active sub required */
r.get('/me/profile', c.getProfile);
r.put('/me/profile', c.updateProfile);
r.put('/me/availability', c.updateAvailability);
r.post('/me/profile-photo', uploadImage.single('image'), c.uploadProfilePhoto);
r.post('/me/academy-photos', uploadImage.single('image'), c.uploadAcademyPhoto);
r.delete('/me/academy-photos', [body('url').trim().notEmpty()], validateRequest, c.removeAcademyPhoto);
r.get('/subscription/status', c.getCoachSubscriptionStatus);
r.post(
  '/subscription/payment-intent',
  [body('action').isIn(['subscribe', 'renew'])],
  validateRequest,
  c.createCoachSubscriptionPaymentIntent
);
r.post('/subscription', c.subscribeCoachPlatform);
r.post('/subscription/renew', c.renewCoachPlatform);
r.post('/documents', upload.single('file'), c.uploadDocumentMeta);
r.get('/documents', c.listDocuments);
r.get('/documents/:docId/file', [param('docId').isMongoId()], validateRequest, c.streamOwnDocumentFile);
r.get('/notifications', c.listNotifications);
r.get('/dashboard', c.getDashboard);

r.use(requireCoachPlatformSubscription);

r.get('/training-requests', c.listTrainingRequests);
r.patch(
  '/training-requests/:id',
  [
    body('status').isIn(['accepted', 'rejected', 'pending']),
    body('scheduledAt').optional().isISO8601(),
    body('meetingLocation').optional().trim(),
    body('meetingAcademyName').optional().trim(),
  ],
  validateRequest,
  c.updateTrainingRequest
);
r.post(
  '/training-requests/:id/mark-fees-cleared',
  [param('id').isMongoId(), body('coachRollNo').optional().trim().isLength({ min: 1, max: 32 })],
  validateRequest,
  c.markTrainingFeesCleared
);
r.post(
  '/training-requests/:id/start-session',
  [
    param('id').isMongoId(),
    body('scheduledAt').isISO8601().withMessage('Training session date and time required'),
    body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
  ],
  validateRequest,
  c.startTrainingFromRequest
);
r.get('/training-sessions', c.listTrainingSessions);
r.post(
  '/training-sessions',
  [
    body('playerId').isMongoId().withMessage('Valid player id required'),
    body('scheduledAt').isISO8601().withMessage('Valid schedule time required'),
    body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
    body('location').optional().trim(),
  ],
  validateRequest,
  c.createTrainingSession
);
r.patch(
  '/training-sessions/:id',
  [
    param('id').isMongoId(),
    body('scheduledAt').optional().isISO8601(),
    body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
    body('location').optional().trim(),
  ],
  validateRequest,
  c.updateTrainingSession
);
r.post(
  '/training-plans/auto-draft',
  [
    body('playerId').isMongoId().withMessage('Valid player id required'),
    body('weekStartDate').optional(),
    body('publishNow').optional().isBoolean(),
    body('replaceExisting').optional().isBoolean(),
  ],
  validateRequest,
  c.generateAutoTrainingPlan
);
r.post(
  '/training-plans',
  [
    body('player').isMongoId().withMessage('Valid player user id required'),
    body('weekStartDate').notEmpty(),
  ],
  validateRequest,
  c.createTrainingPlan
);
r.get('/training-plans', c.listTrainingPlans);
r.delete('/training-plans/:id', c.deleteTrainingPlan);
r.put('/training-plans/:id', c.updateTrainingPlan);
r.get('/attendance', c.listAttendance);
r.post(
  '/sessions/:sessionId/attendance',
  [param('sessionId').isMongoId(), body('present').isBoolean()],
  validateRequest,
  c.markAttendance
);
r.get('/evaluation-rubrics', c.listEvaluationRubricsHandler);
r.get('/evaluation-rubric', c.getEvaluationRubricHandler);
r.post(
  '/performance',
  [
    body('playerId').notEmpty(),
    body('weekStartDate').notEmpty(),
    body('technique').optional().isFloat({ min: 0, max: 100 }),
    body('fitness').optional().isFloat({ min: 0, max: 100 }),
    body('attitude').optional().isFloat({ min: 0, max: 100 }),
    body('skillScores').optional().isArray(),
    body('skillScores.*.category').optional().isString(),
    body('skillScores.*.skill').optional().isString(),
    body('skillScores.*.score').optional().isFloat({ min: 0, max: 100 }),
  ],
  validateRequest,
  c.addPerformance
);
r.get('/players/:playerId/progress', c.getPlayerProgress);
r.post(
  '/ground-bookings/hold',
  [body('groundId').notEmpty(), body('startTime').notEmpty(), body('endTime').notEmpty()],
  validateRequest,
  c.holdGroundBooking
);
r.post('/ground-bookings/:id/easypaisa/initiate', [param('id').isMongoId()], validateRequest, c.initiateGroundEasypaisaPayment);
r.post('/ground-bookings/:id/confirm-payment', c.confirmGroundPayment);
r.get('/ground-bookings', c.listCoachGroundBookings);
r.delete('/ground-bookings/:id', c.cancelGroundBooking);
r.get('/feedback', c.listFeedback);
r.post('/feedback/:id/reply', [body('reply').notEmpty()], c.replyFeedback);
r.get('/payments', c.listPayments);
r.get('/student-fees', c.listStudentFees);
r.put('/student-fees', c.upsertStudentFee);
r.delete('/student-fees/:id', [param('id').isMongoId()], validateRequest, c.deleteStudentFee);
r.post(
  '/payments/withdrawal',
  [body('amount').isFloat({ min: 0.01 })],
  validateRequest,
  c.requestWithdrawal
);

module.exports = r;
