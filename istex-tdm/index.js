'use strict';

const fs = require('fs');
const path = require('path');

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

function findMatchingRangeId(ip, ipRanges) {
  const ipNum = ipToNumber(ip);

  for (const range of ipRanges) {
    const fromNum = ipToNumber(range.from);
    const toNum = ipToNumber(range.to);
    if (ipNum >= fromNum && ipNum <= toNum) {
      return range;
    }
  }

  return null;
}

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let sourceField = req.header('istex-tdm-source-field');
  let abesidEnrichField = req.header('istex-tdm-abesid-enriched-field');
  let filenameField = req.header('istex-tdm-filename');

  if (!sourceField) { sourceField = 'ip'; }
  if (!abesidEnrichField) { abesidEnrichField = 'abes-id'; }
  if (!filenameField) { filenameField = 'autorisation-abes.json'; }

  let simpleIPs = {};
  let rangeIPs = [];

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.resolve(__dirname, filenameField))) {
      logger.error('[istex-tdm]: File not found');
      reject(new Error(`File not found: ${filenameField}`));
      return;
    }

    fs.readFile(path.resolve(__dirname, filenameField), 'utf-8', (err, data) => {
      if (err) {
        logger.error('[istex-tdm]: Cannot read file');
        reject(err);
        return;
      }

      try {
        const listIP = JSON.parse(data);

        if (!Array.isArray(listIP.ips)) {
          logger.error('[istex-tdm]: No ips found in file');
          reject(new Error('No ips found in file'));
          return;
        }

        simpleIPs = listIP.ips.reduce((acc, { ip, _id, _comment }) => {
          acc[ip] = { _id, _comment };
          return acc;
        }, {});

        if (listIP.ipRanges) {
          rangeIPs = listIP.ipRanges;
        }

        resolve(process);
      } catch (error) {
        logger.error('[istex-tdm]: Cannot parse ips');
        reject(error);
      }
    });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField] || ec[abesidEnrichField]) { return next(); }


    const abesId = simpleIPs[ec[sourceField]];

    if (abesId) {
      ec[abesidEnrichField] = abesId._id;
      ec['institutionName']  = abesId._comment;
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/);
    if (!match) {
      return next();
    }

    const result = findMatchingRangeId(ec[sourceField], rangeIPs);

    if (result) {
      ec[abesidEnrichField] = result._id;
      ec['institutionName']  = result._comment;
    }
    next();
  }
};
