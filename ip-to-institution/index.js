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

  let sourceField = req.header('ip-to-institution-source-field');
  let enrichedField = req.header('ip-to-institution-enriched-field');
  let institutionNameEnrich = req.header('ip-to-institution-institution-name-enrich');
  let filenameField = req.header('ip-to-institution-filename');

  if (!sourceField) { sourceField = 'ip'; }
  if (!enrichedField) { enrichedField = 'abes-id'; }
  if (!institutionNameEnrich) { institutionNameEnrich = false; }
  if (!filenameField) { filenameField = 'autorisation-abes.json'; }

  let simpleIPs = {};
  let rangeIPs = [];

  return new Promise((resolve, reject) => {
    if (!/^[a-z0-9_.-]+$/.test(filenameField)) {
      reject(new Error(`Invalid filename: ${filenameField}`));
      return;
    }
    const filePath = path.resolve(__dirname, filenameField);

    if (!fs.existsSync(filePath)) {
      logger.error('[ip-to-institution]: File not found');
      reject(new Error(`File not found: ${filenameField}`));
      return;
    }

    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        logger.error('[ip-to-institution]: Cannot read file');
        reject(err);
        return;
      }

      try {
        const listIP = JSON.parse(data);

        if (!Array.isArray(listIP.ips)) {
          logger.error('[ip-to-institution]: No ips found in file');
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
        logger.error('[ip-to-institution]: Cannot parse ips');
        reject(error);
      }
    });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField] || ec[enrichedField]) { return next(); }


    const abesId = simpleIPs[ec[sourceField]];

    if (abesId) {
      ec[enrichedField] = abesId._id;
      if (institutionNameEnrich) {
        ec['institutionName']  = abesId._comment;
      }
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/);
    if (!match) {
      return next();
    }

    const result = findMatchingRangeId(ec[sourceField], rangeIPs);

    if (result) {
      ec[enrichedField] = result._id;
      if (institutionNameEnrich) {
        ec['institutionName']  = result._comment;
      }
    }
    next();
  }
};
