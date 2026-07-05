const { Router } = require('express');
const authRoutes = require('./auth.routes');
const playerRoutes = require('./player.routes');
const coachRoutes = require('./coach.routes');
const businessRoutes = require('./business.routes');
const adminRoutes = require('./admin.routes');
const publicRoutes = require('./public.routes');
const uploadRoutes = require('./upload.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/players', playerRoutes);
router.use('/coaches', coachRoutes);
router.use('/business', businessRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);

const healthController = require('../controllers/healthController');

router.get('/health', healthController.getHealth);

module.exports = router;
