'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('idp-to-institution-source-field');
  let enrichedField = req.header('idp-to-institution-enriched-field');
  let filenameField = req.header('idp-to-institution-filename');

  if (!sourceField) { sourceField = 'login'; }
  if (!enrichedField) { enrichedField = 'institutionName'; }
  if (!filenameField) { filenameField = 'ListIdpdc.json'; }

  let idp;



  return new Promise((resolve, reject) => {
    if (!/^[a-z0-9_.-]+$/.test(filenameField)) {
      reject(new Error(`Invalid filename: ${filenameField}`));
      return;
    }

    const filePath = path.resolve(__dirname, filenameField);

    if (!fs.existsSync(filePath)) {
      logger.error('[idp-to-institution]: File not found');
      reject(new Error(`File not found: ${filenameField}`));
      return;
    }

    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        logger.error('[idp-to-institution]: Cannot read file');
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
        logger.error('[idp-to-institution]: Cannot parse ips');
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