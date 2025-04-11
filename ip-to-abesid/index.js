'use strict';


const listIP = require('./autorisation-abes.json');

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

  if (!sourceField) { sourceField = 'ip'; }
  if (!enrichedField) { enrichedField = 'abes-id'; }

  let simpleIPs = {};
  let rangeIPs = {};


  // TODO 2025-04-11: fetch file from Inist Gitlab

  return new Promise((resolve, reject) => {
    simpleIPs = listIP.ips.reduce((acc, { ip, _id }) => {
      acc[ip] = _id;
      return acc;
    }, {});

    rangeIPs = listIP.ipRanges;
    resolve(process);
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
