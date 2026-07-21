const { Router } = require('express');
const { body, param } = require('express-validator');
const b = require('../controllers/businessController');
const { authenticate, requireRole, loadUser } = require('../middleware/auth');
const { upload, uploadImage } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validate');

const r = Router();
r.use(authenticate, loadUser, requireRole('business_owner'));

r.get('/me/profile', b.getProfile);
r.put('/me/profile', b.updateProfile);
r.post(
  '/subscription/payment-intent',
  [body('action').isIn(['subscribe', 'renew', 'change'])],
  validateRequest,
  b.createSubscriptionPaymentIntent
);
r.post('/subscription', [body('package').isIn(['basic', 'pro', 'premium'])], b.subscribe);
r.post('/subscription/renew', b.renewSubscription);
/** Change listing package */
r.put(
  '/subscription/plan',
  [body('package').isIn(['basic', 'pro', 'premium'])],
  validateRequest,
  b.changeSubscription
);
r.put('/store', b.updateStore);
r.post('/store/logo', uploadImage.single('image'), b.uploadStoreLogo);
r.delete('/store/logo', b.removeStoreLogo);
r.post('/store/banner', uploadImage.single('image'), b.uploadStoreBanner);
r.delete('/store/banner', b.removeStoreBanner);
r.post('/store/shop-photos', uploadImage.single('image'), b.uploadShopPhoto);
r.delete('/store/shop-photos', [body('url').trim().notEmpty()], validateRequest, b.removeShopPhoto);
r.get('/products', b.listMyProducts);
r.post('/products', b.addProduct);
r.put('/products/:id', b.updateProduct);
r.delete('/products/:id', b.deleteProduct);
r.patch('/products/:id/pricing', [body('price').isFloat({ min: 0 })], b.patchPricing);
r.patch('/products/:id/stock', [body('stock').isInt({ min: 0 })], b.patchStock);
r.post('/products/:id/images', upload.single('image'), b.addProductImage);
r.delete(
  '/products/:id/images',
  [body('url').trim().notEmpty()],
  validateRequest,
  b.removeProductImage
);
r.get('/orders', b.listOrders);
r.patch(
  '/orders/:id',
  [
    body('status')
      .optional()
      .isIn(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']),
    body('trackingNumber').optional().isString(),
  ],
  validateRequest,
  b.updateOrderStatus
);
r.get('/reports/sales', b.salesReport);
r.get('/coaches', b.listCoachesDirectory);
r.post('/coaches/:coachId/partnership', [body('message').notEmpty()], b.sendPartnership);
r.get('/notifications', b.listNotifications);
r.post('/documents', upload.single('file'), b.uploadBusinessDoc);
r.get('/documents', b.listBusinessDocs);
r.get('/documents/:docId/file', [param('docId').isMongoId()], validateRequest, b.streamOwnBusinessDocumentFile);
r.get('/grounds', b.listMyGrounds);
r.post('/grounds', b.createBusinessGround);
r.put('/grounds/:id', b.updateBusinessGround);
r.delete('/grounds/:id', b.deleteBusinessGround);
r.get('/ground-bookings', b.listBusinessGroundBookings);

module.exports = r;
