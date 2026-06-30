const mongoose = require('mongoose');

/** Weekly time window: dayOfWeek 0=Sun … 6=Sat, start/end as "HH:mm" */
const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true },
  },
  { _id: false }
);

module.exports = scheduleSlotSchema;
