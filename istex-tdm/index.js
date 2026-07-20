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

  if (!sourceField) { sourceField = 'ip'; }

  let simpleIPs = {};
  let rangeIPs = [];

  return new Promise((resolve, reject) => {
    const autorisationAbesFilename = 'autorisation-abes.json';
    const inistIpFilename = 'inist-ip.json';

    const autorisationAbesPath = path.resolve(__dirname, autorisationAbesFilename);
    const inistIpPath = path.resolve(__dirname, inistIpFilename);

    if (!fs.existsSync(autorisationAbesPath)) {
      logger.error(`[istex-tdm]: ${autorisationAbesFilename} not found`);
      reject(new Error(`${autorisationAbesFilename} not found`));
      return;
    }

    if (!fs.existsSync(inistIpPath)) {
      logger.error(`[istex-tdm]: ${inistIpFilename} not found`);
      reject(new Error(`${inistIpFilename} not found`));
      return;
    }

    Promise.all([
      fs.promises.readFile(autorisationAbesPath, 'utf-8'),
      fs.promises.readFile(inistIpPath, 'utf-8'),
    ])
      .then(([autorisationAbesData, inistIpData]) => {
        let autorisationAbesJson;
        let inistIpJson;

        try {
          autorisationAbesJson = JSON.parse(autorisationAbesData);
        } catch (error) {
          logger.error(`[istex-tdm]: Cannot parse ${autorisationAbesFilename}`);
          reject(error);
          return;
        }

        try {
          inistIpJson = JSON.parse(inistIpData);
        } catch (error) {
          logger.error(`[istex-tdm]: Cannot parse ${inistIpFilename}`);
          reject(error);
          return;
        }

        if (!Array.isArray(autorisationAbesJson.ips)) {
          logger.error(`[istex-tdm]: No ips found in ${autorisationAbesFilename}`);
          reject(new Error(`No ips found in ${autorisationAbesFilename}`));
          return;
        }

        if (!Array.isArray(inistIpJson.ips)) {
          logger.error(`[istex-tdm]: No ips found in ${inistIpFilename}`);
          reject(new Error(`No ips found in ${inistIpFilename}`));
          return;
        }

        const mergedIps = [...autorisationAbesJson.ips, ...inistIpJson.ips];

        simpleIPs = mergedIps.reduce((acc, { ip, _id, _comment }) => {
          acc[ip] = { _id, _comment };
          return acc;
        }, {});

        const mergedIpRanges = [
          ...(autorisationAbesJson.ipRanges || []),
          ...(inistIpJson.ipRanges || []),
        ];

        if (mergedIpRanges.length > 0) {
          rangeIPs = mergedIpRanges;
        }

        resolve(process);
      })
      .catch((err) => {
        logger.error('[istex-tdm]: Cannot read file');
        reject(err);
      });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField]) { return next(); }


    const simpleIP = simpleIPs[ec[sourceField]];

    if (simpleIP) {
      ec['institutionName'] = simpleIP._comment;
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/);
    if (!match) {
      return next();
    }

    const resultIP = findMatchingRangeId(ec[sourceField], rangeIPs);

    if (resultIP) {
      ec['institutionName'] = resultIP._comment;
    }
    next();
  }
};
