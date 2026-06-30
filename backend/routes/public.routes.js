const { Router } = require('express');
const pub = require('../controllers/publicController');

const r = Router();
r.get('/grounds', pub.listGrounds);
r.get('/grounds/:groundId/slots/check', pub.checkGroundSlotAvailability);
r.get('/grounds/:groundId/slots', pub.listGroundDaySlots);
r.get('/products', pub.listProducts);

module.exports = r;
