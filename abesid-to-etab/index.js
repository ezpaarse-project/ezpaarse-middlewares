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
      const data = results.reduce((acc, item) => {
        acc[item['Identifiant Abes']] = {
          ['Siren']: item['Siren'],
          ['Nom de l\'etablissement']: item['Nom de l\'etablissement'],
          ['Type de l\'etablissement']: item['Type de l\'etablissement'],
          ['Adresse de l\'etablissement']: item['Adresse de l\'etablissement'],
          ['Ville']: item['Ville'],
          ['Telephone contact']: item['Telephone contact'],
          ['Nom et prenom contact']: item['Nom et prenom contact'],
          ['Adresse mail contact']: item['Adresse mail contact'],
          ['IP validees']: item['IP validees'],
        };
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

  let sourceField = req.header('abesid-to-etab-source-field');
  let enrichedField = req.header('abesid-to-etab-enriched-field');

  if (!sourceField) { sourceField = 'abes-id'; }

  const enrichedFields = [
    { 'Siren': 'siren' },
    { 'Nom de l\'etablissement': 'institutionName' },
    { 'Type de l\'etablissement': 'institutionType' },
    { 'Adresse de l\'etablissement': 'institutionAddress' },
    { 'Ville': 'institutionCity' },
    { 'Telephone contact': 'institutionPhone' },
    { 'Nom et prenom contact': 'institutionContact' },
    { 'Adresse mail contact': 'institutionEmail' },
    { 'IP validees': 'institutionIpRange' }
  ]

  let institutions = {};

  const filePath = path.resolve(__dirname, 'Etablissements.csv');

  parseCSVToJSON(filePath)
    .then((jsonData) => {
      institutions = jsonData;
      logger.info('[abesid-to-etab]: Successfully read CSV File');
    })
    .catch((err) => {
      logger.error('[abesid-to-etab]: Cannot read CSV File', err);
      this.job._stop(err);
    });

  return process;

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }

    if (institutions[ec[sourceField]]) {
      const dataFromCSV = institutions[ec[sourceField]];
  
      enrichedFields.forEach((enrichedField) => {
        const keyFromCSV = Object.keys(enrichedField)[0];
        const enrichedKey = Object.values(enrichedField)[0];
        ec[enrichedKey] = dataFromCSV[keyFromCSV];
      })
    }

    next();
  }
};
