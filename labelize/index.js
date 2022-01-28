const config = ezpaarse.config;

const labelize = function () {
  this.logger.verbose('Initializing labelize middleware');

  const customLabel = config.EZPAARSE_LABELIZE;

  if (!customLabel) {
    return;
  }

  if (!Array.isArray(customLabel)) {
    const err = new Error(`invalid labelize config: EZPAARSE_LABELIZE need to be an array`);
    err.status = 400;
    return err;
  }

  for (const label of customLabel) {
    if (!label.from) {
      const err = new Error(`invalid labelize config: require "from" in ${label}`);
      err.status = 400;
      return err;
    }

    if (!label.resultField) {
      const err = new Error(`invalid labelize config: require "resultField" in ${label}`);
      err.status = 400;
      return err;
    }

    if (!label.mapping) {
      const err = new Error(`invalid labelize config: require "mapping" in ${label}`);
      err.status = 400;
      return err;
    }
  }

  customLabel.forEach((label) => {
    if (this.job.outputFields.added.indexOf(label.resultField) === -1) {
      this.job.outputFields.added.push(label.resultField);
    }
  });

  return function process(ec, next) {
    if (!ec) {
      return next();
    }

    for (const label of customLabel) {
      const { from, mapping } = label;
      const field = label.resultField;
    
      const sourceField = ec[from];

      if (!sourceField) {
        const err = new Error(`field [${from}] not found`);
        return next(err);
      }

      if (ec[field]) return;

      ec[field] = mapping[ec[from]] ? mapping[ec[from]] : '';
    }

    next();
  }
};

module.exports = labelize;
