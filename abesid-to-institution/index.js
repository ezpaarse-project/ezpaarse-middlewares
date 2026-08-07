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
      console.error('[abesid-to-institution]: Cannot read CSV File', err);
      return reject(err);
    });
  });
};

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('abesid-to-institution-source-field');
  let enrichedField = req.header('abesid-to-institution-enriched-field');
  let filenameField = req.header('abesid-to-institution-filename');

  if (!sourceField) { sourceField = 'abes-id'; }
  if (!enrichedField) { enrichedField = 'institutionName'; }
  if (!filenameField) { filenameField = 'listAll.csv'; }

  let institutions = {};



  return new Promise((resolve, reject) => {
    if (!/^[a-zA-Z0-9_.-]+$/.test(filenameField)) {
      reject(new Error(`Invalid filename: ${filenameField}`));
      return;
    }

    const filePath = path.resolve(__dirname, filenameField);

    parseCSVToJSON(filePath)
      .then((jsonData) => {
        institutions = jsonData;
        logger.info('[abesid-to-institution]: Successfully read CSV File');
        return resolve(process);
      })
      .catch((err) => {
        logger.error('[abesid-to-institution]: Cannot read CSV File', err);
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
