'use strict';

module.exports = function () {
  this.logger.verbose('Initializing merge-field middleware');

  const header = this.request.header('merge');

  const params = /^(.+?)\+(.+?)\+(.+?)=(.+?)$/.exec(header);

  if (!params) {
    const err = new Error('Invalid extract expression');
    err.status = 400;
    return err;
  }

  const sourceField1 = params[1].trim();
  const separator = params[2].trim();
  const sourceField2 = params[3].trim();
  const enrichedField = params[4].trim();

  this.job.outputFields.added.push(enrichedField);

  return function process(ec, next) {
    if (!ec || !ec[sourceField1] || !ec[sourceField2] || ec[enrichedField]) { return next(); }


    const result = ec[sourceField1] + separator + ec[sourceField2];
    ec[enrichedField] = result;

    next();
  };
};

