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
        delimiter: ';',
        skip_empty_lines: true,
      })
    );

    parser.on('data', (row) => {
      results.push(row);
    });

    parser.on('end', () => {
      const data = Object.fromEntries(
        results.map(item => [item['ID Etablissement'], item['Nom Etablissement']])
      );
      resolve(data);
    });

    parser.on('error', (err) => {
      return reject(err);
    });
  });
};

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  const sourceField = req.header('abesid-to-etab-source-field') || 'abes-id';

  const enrichedField = req.header('abesid-to-etab-enriched-field') || 'institutionName';

  let institutions = {};

  const filePath = path.resolve(__dirname, 'Etablissements.csv');

  return new Promise((resolve, reject) => {
    parseCSVToJSON(filePath)
      .then((jsonData) => {
        institutions = jsonData;
        logger.info('[abesid-to-etab]: Successfully read CSV File');
        return resolve(process);
      })
      .catch((err) => {
        logger.error('[abesid-to-etab]: Cannot read CSV File', err);
        this.job._stop(err);
        return reject(err);
      });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }

    if (institutions[ec[sourceField]]) {
      ec[enrichedField] = institutions[ec[sourceField]];
    }

    next();
  }
};
