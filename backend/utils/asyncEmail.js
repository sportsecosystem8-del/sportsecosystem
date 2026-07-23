/**
 * Fire-and-forget email delivery so HTTP handlers respond quickly under load.
 */
function queueEmail(task) {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((e) => {
        console.error('[mailer][async] email task failed:', e?.stack || e?.message || e);
      });
  });
}

module.exports = { queueEmail };
