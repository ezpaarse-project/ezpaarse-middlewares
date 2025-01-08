'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

function isIpInRange(ip, ranges) {
  const splitIP = ip.split('.')
  const [ipBlock1, ipBlock2, ipBlock3, ipBlock4] = rangeBlock3.split('-');

  const ipBase = `${ipBlock1}.${ipBlock2}`
  for (const [range, value] of Object.entries(ranges)) {
    // 127.0.100-110.0-256
    const suffix = range.split(`${ipBase}.`)[1]
    // rangeBlock3: 100-110 
    // rangeBlock4: 0-256 
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
            return value
          }
        }
      }
    } else {
      if (rangeBlock3 === block3) {
        const [inf4, supp4] = rangeBlock4.split('-');
        if (ipBlock4 >= inf4 || ipBlock4 <= supp4) {
          return value
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

  let simpleIPs = {};
  let rangeIPs = {}

  const filePath = path.resolve(__dirname, 'Etablissements.csv');

  parseCSVToJSON(filePath)
    .then((jsonData) => {
      simpleIPs = jsonData.simpleIPs;
      rangeIPs = jsonData.rangeIPs;
      logger.info('[ip-to-abesid]: Successfully read CSV File');
    })
    .catch((err) => {
      logger.error('[ip-to-abesid]: Cannot read CSV File', err);
      this.job._stop(err);
    });

  return process;

  function process(ec, next) {
    if (!ec || !ec.ip) { return next(); }

    
    const abesId = simpleIPs[ec.ip];

    if (abesId) {
      ec['abes-id'] = abesId
      return next();
    }

    const ipBase = ec.ip.match(/^(\d+\.\d+)/)[1];

    const matchRange = Object.entries(rangeIPs)
      .filter(([key]) => key.startsWith(ipBase))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const result = isIpInRange(ec.ip, matchRange);

    if (result) {
      ec['abes-id'] = result
    }

    next();
  }
};
