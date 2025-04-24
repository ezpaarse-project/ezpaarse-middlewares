'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const parseCSVToJSON = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    const parser = fs.createReadStream(filePath).pipe(
      parse({
        columns: (header) => header.map((h) => h.trim()),
        delimiter: '\t',
        skip_empty_lines: true,
      })
    );

    parser.on('data', (row) => {
      results.push(row);
    });

    parser.on('end', () => {
      const data = results.reduce((acc, item) => {
        if (item.id_abes && item.IDP) {
          acc[item.IDP] = item.id_abes;
        }
        return acc;
      }, {});
      resolve(data);
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = function () {
  const job = this.job;
  const report = this.report;
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('idp-to-abesid-source-field') || 'login';
  let enrichedField = req.header('idp-to-abesid-enriched-field') || 'abes-id';

  let idsAbes = {};

  const filePath = path.resolve(__dirname, 'abes_idp_2024-10.tsv');

  return new Promise((resolve, reject) => {
    parseCSVToJSON(filePath)
      .then((jsonData) => {
        idsAbes = jsonData;
        logger.info('[idp-to-abesid]: Successfully read CSV File');
        resolve(process);
      })
      .catch((err) => {
        logger.error('[idp-to-abesid]: Cannot read CSV File', err);
        this.job._stop(err);
        reject(err);
      });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }


    if (idsAbes[ec[sourceField]]) {
      ec[enrichedField] = idsAbes[ec[sourceField]];
    }

    next();
  }
};
