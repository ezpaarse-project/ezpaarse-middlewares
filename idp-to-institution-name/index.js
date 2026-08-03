'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('idp-to-institution-name-source-field');
  let enrichedField = req.header('idp-to-institution-name-enriched-field');
  let filenameField = req.header('idp-to-institution-name-filename');

  if (!sourceField) { sourceField = 'login'; }
  if (!enrichedField) { enrichedField = 'institutionName'; }
  if (!filenameField) { filenameField = 'ListIdpdc.json'; }

  let idp;

  const filePath = path.resolve(__dirname, filenameField);

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      logger.error('[idp-to-institution-name]: File not found');
      reject(new Error(`File not found: ${filenameField}`));
      return;
    }

    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        logger.error('[idp-to-institution-name]: Cannot read file');
        reject(err);
        return;
      }

      try {
        const parsedData = JSON.parse(data);

        idp = parsedData.reduce((acc, item) => {
          acc[item.IdP] = item.institutionName;
          return acc;
        }, {});

        resolve(process);
      } catch (error) {
        logger.error('[idp-to-institution-name]: Cannot parse ips');
        reject(error);
      }
    });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }

    if (idp[ec[sourceField]]) {
      ec[enrichedField] = idp[ec[sourceField]];
    }

    next();
  }

};