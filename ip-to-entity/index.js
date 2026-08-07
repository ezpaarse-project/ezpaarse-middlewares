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

  let sourceField = req.header('ip-to-entity-source-field');
  let enrichedField = req.header('ip-to-entity-source-field-enriched-field');
  let filenameField = req.header('ip-to-entity-filename');

  if (!sourceField) { sourceField = 'ip'; }
  if (!enrichedField) { enrichedField = 'machineName'; }
  if (!filenameField) { filenameField = 'inist-ip.json'; }

  let simpleIPs = {};
  let rangeIPs = [];

  return new Promise((resolve, reject) => {
    const inistIpPath = path.resolve(__dirname, filenameField);

    if (!fs.existsSync(inistIpPath)) {
      logger.error(`[ip-to-entity]: ${filenameField} not found`);
      reject(new Error(`${filenameField} not found`));
      return;
    }

    fs.promises.readFile(inistIpPath, 'utf-8').then((inistIpData) => {
      let inistIpJson;

      try {
        inistIpJson = JSON.parse(inistIpData);
      } catch (error) {
        logger.error(`[ip-to-entity]: Cannot parse ${filenameField}`);
        reject(error);
        return;
      }

      if (!Array.isArray(inistIpJson.ips)) {
        logger.error(`[ip-to-entity]: No ips found in ${filenameField}`);
        reject(new Error(`No ips found in ${filenameField}`));
        return;
      }

      simpleIPs = inistIpJson.ips.reduce((acc, { ip, _id, _comment }) => {
        acc[ip] = { _id, _comment };
        return acc;
      }, {});

      if (inistIpJson.ipRanges) {
        rangeIPs = inistIpJson.ipRanges;
      }

      resolve(process);
    })
      .catch((err) => {
        logger.error('[ip-to-entity]: Cannot read file');
        reject(err);
      });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }


    const simpleIP = simpleIPs[ec[sourceField]];

    if (simpleIP) {
      ec[enrichedField] = simpleIP._comment;
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/);
    if (!match) {
      return next();
    }

    const resultIP = findMatchingRangeId(ec[sourceField], rangeIPs);

    if (resultIP) {
      ec[enrichedField] = resultIP._comment;
    }
    next();
  }
};