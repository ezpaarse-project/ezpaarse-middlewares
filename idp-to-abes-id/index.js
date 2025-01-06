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
          acc[item.id_abes] = item.IDP;
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

  let idps = {};

  const filePath = path.resolve(__dirname, 'abes_idp_2024-10.tsv');

  parseCSVToJSON(filePath)
    .then((jsonData) => {
      idps = jsonData;
      logger.info('[idp-to-abes-id]: Successfully read CSV File');
    })
    .catch((err) => {
      logger.error('[idp-to-abes-id]: Cannot read CSV File', err);
      this.job._stop(err);
    });

  return process;

  function process(ec, next) {
    if (!ec || ec.auth !== 'ip' || !ec['istex-id']) { return next(); }
    if (idps[ec['istex-id']]) {
      ec.idp = idps[ec['istex-id']];
    }

    next();
  }
};
