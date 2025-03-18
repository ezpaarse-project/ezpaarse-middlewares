'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

/**
 * Check if ip is in range
 * 
 * @param {string} ip ip of ec
 * @param {Array} ranges Range IP with their id-abes
 * [[ '127.1.100-150.0-256', 'ABES1234'], [ '127.1.50-100.0-256', 'ABES5678']]
 * @returns 
 */
function isIpInRange(ip, ranges) {
  const [ipBlock1, ipBlock2, ipBlock3, ipBlock4] = ip.split('.');

  const ipBase = `${ipBlock1}.${ipBlock2}`
  for (const [range, ibabes] of ranges) {
    // 127.0.100-110.0-256
    if (!range) {
      continue;
    }
    const suffix = range.split(`${ipBase}.`)[1];
    if (!suffix) {
      continue;
    }
    const [rangeBlock3, rangeBlock4] = suffix.split('.');
    if (rangeBlock3.includes('-')) {
      // inf3: 100
      // supp3: 110
      const [inf3, supp3] = rangeBlock3.split('-');
      if (ipBlock3 >= inf3 || ipBlock3 <= supp3) {
        if (rangeBlock4.includes('-')) {
          // inf4: 0
          // supp4: 256
          const [inf4, supp4] = rangeBlock4.split('-');
          if (ipBlock4 >= inf4 || ipBlock4 <= supp4) {
            return ibabes
          }
        }
      }
    } else {
      if (rangeBlock3 === block3) {
        const [inf4, supp4] = rangeBlock4.split('-');
        if (ipBlock4 >= inf4 || ipBlock4 <= supp4) {
          return ibabes
        }
      }
    }
  };

  return null;
};

function parseCSVToJSON (filePath) {
  return new Promise((resolve, reject) => {
    let results = [];

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
      let data = {};
      results = results.map((res) => {
        return { ip: res['IP validees'], idabes: res['Identifiant Abes'] }
      })

      let rangeIPs = {};
      let simpleIPs = {};

      results.forEach((res) => {
        let ids = res.ip.split(',');
        ids.forEach((id) => {
          id = id.trim();
          if (id.includes('-') && !id.includes(':')) {
            rangeIPs[id] = res.idabes
          } else {
            simpleIPs[id] = res.idabes
          }
        })
      })

  
      resolve({ simpleIPs, rangeIPs });
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = function () {
  const job = this.job;
  const report = this.report;
  const req = this.request;
  const logger = this.logger;



  let sourceField = req.header('ip-to-abesid-source-field');
  let enrichedField = req.header('ip-to-abesid-enriched-field');

  if (!sourceField) { sourceField = 'ip'; }
  if (!enrichedField) { enrichedField = 'abes-id'; }

  const abesFilePath = path.resolve(__dirname, 'Etablissements.csv');

  let simpleIPs = {};
  let rangeIPs = {}


  return new Promise((resolve, reject) => {
    parseCSVToJSON(abesFilePath)
      .then((jsonData) => {
        simpleIPs = jsonData.simpleIPs;
        rangeIPs = jsonData.rangeIPs;
        logger.info('[ip-to-abesid]: Successfully read CSV File');
        resolve(process);
      })
      .catch((err) => {
        logger.error('[ip-to-abesid]: Cannot read CSV File', err);
        this.job._stop(err);
        reject(err);
      });
  });


  function process(ec, next) {
    if (!ec || !ec[sourceField] || ec[enrichedField]) { return next(); }

    
    const abesId = simpleIPs[ec[sourceField]];

    if (abesId) {
      ec[enrichedField] = abesId
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/)
    if (!match) {
      return next();
    }
    const ipBase = match[1];

    const matchRange = Object.entries(rangeIPs)
      .filter(([key]) => key.startsWith(ipBase));

    const result = isIpInRange(ec[sourceField], matchRange);

    if (result) {
      ec[enrichedField] = result
    }

    next();
  }
};
