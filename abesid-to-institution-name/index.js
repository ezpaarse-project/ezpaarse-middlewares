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
      console.error('[abesid-to-institution-name]: Cannot read CSV File', err);
      return reject(err);
    });
  });
};

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('abesid-to-institution-name-source-field');
  let enrichedField = req.header('abesid-to-institution-name-enriched-field');
  let filenameField = req.header('abesid-to-institution-name-filename');

  if (!sourceField) { sourceField = 'abes-id'; }
  if (!enrichedField) { enrichedField = 'institutionName'; }
  if (!filenameField) { filenameField = 'Etablissements.csv'; }

  let institutions = {};

  const filePath = path.resolve(__dirname, filenameField);

  return new Promise((resolve, reject) => {
    parseCSVToJSON(filePath)
      .then((jsonData) => {
        institutions = jsonData;
        logger.info('[abesid-to-institution-name]: Successfully read CSV File');
        return resolve(process);
      })
      .catch((err) => {
        logger.error('[abesid-to-institution-name]: Cannot read CSV File', err);
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
