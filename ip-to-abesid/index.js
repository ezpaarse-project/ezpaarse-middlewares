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
      return range._id;
    }
  }

  return null;
}

module.exports = function () {
  const req = this.request;

  let sourceField = req.header('ip-to-abesid-source-field');
  let enrichedField = req.header('ip-to-abesid-enriched-field');
  let filenameField = req.header('ip-to-abesid-filename');

  if (!sourceField) { sourceField = 'ip'; }
  if (!enrichedField) { enrichedField = 'abes-id'; }
  if (!filenameField) { filenameField = 'autorisation-abes.json'; }

  let simpleIPs = {};
  let rangeIPs = [];

  // TODO 2025-04-11: fetch file from Inist Gitlab

  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, filenameField), 'utf-8', (err, data) => {
      if (err) { reject(`[ip-to-abesid]: Cannot read file: ${err}`); }

      try {
        const listIP = JSON.parse(data);

        if (!Array.isArray(listIP.ips)) {
          reject('[ip-to-abesid]: No ips found in file');
          return;
        }

        simpleIPs = listIP.ips.reduce((acc, { ip, _id }) => {
          acc[ip] = _id;
          return acc;
        }, {});

        if (listIP.ipRanges) {
          rangeIPs = listIP.ipRanges;
        }

        resolve(process);
      } catch (error) {
        reject(`[ip-to-abesid]: Cannot parse ips: ${error}`);
      }
    });
  });

  function process(ec, next) {
    if (!ec || !ec[sourceField] || ec[enrichedField]) { return next(); }


    const abesId = simpleIPs[ec[sourceField]];

    if (abesId) {
      ec[enrichedField] = abesId;
      return next();
    }

    const match = ec[sourceField].match(/^(\d+\.\d+)/);
    if (!match) {
      return next();
    }


    const result = findMatchingRangeId(ec[sourceField], rangeIPs);

    if (result) {
      ec[enrichedField] = result;
    }

    next();
  }
};
