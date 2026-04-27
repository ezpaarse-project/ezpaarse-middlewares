'use strict';

const co = require('co');
const data = require('./istex-rtype.json'); // matching between ezPAARSE and Istex types
const cache = ezpaarse.lib('cache')('istex');

const tiffCorpus = new Set(['EEBO', 'ECCO']);


const fields = [
  'publicationDate',
  'copyrightDate',
  'corpusName',
  'language',
  'genre',
  'host',
  'doi',
  'pii',
  'arkIstex',
  'accessCondition'
];

const doiRegex = /^10\./i;
const arkRegex = /^ark:/i;
const piiRegex = /^(?:[SB][a-z0-9]{16}|[a-z0-9]{17})$/i;

/**
 * Enrich ECs with istex data
 */
module.exports = function () {
  const self = this;
  const report = this.report;
  const req = this.request;
  const activated = /^true$/i.test(req.header('istex-enrich'));
  const cacheEnabled = !/^false$/i.test(req.header('istex-cache'));

  if (!activated) { return function (ec, next) { next(); }; }

  self.logger.info('Istex cache: %s', cacheEnabled ? 'enabled' : 'disabled');

  // Time-to-live of cached documents
  const ttl = parseInt(req.header('istex-ttl')) || 3600 * 24 * 7;
  // Minimum wait time before each request (in ms)
  const throttle = parseInt(req.header('istex-throttle')) || 100;
  // Maximum number of ID to query
  const packetSize = parseInt(req.header('istex-paquet-size')) || 150;
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('istex-buffer-size'));
  // Maximum number of trials before passing the EC in error
  let maxAttempts = parseInt(req.header('istex-max-attempts'));

  if (isNaN(bufferSize)) {
    bufferSize = 1000;
  }

  const buffer = [];
  let busy = false;
  let finalCallback = null;

  if (!cache) {
    const err = new Error('failed to connect to mongodb, cache not available for istex');
    err.status = 500;
    return err;
  }

  report.set('general', 'istex-queries', 0);
  report.set('general', 'istex-fails', 0);

  return new Promise(function (resolve, reject) {
    cache.checkIndexes(ttl, function (err) {
      if (err) {
        self.logger.error('istex: failed to ensure indexes' + err);
        return reject(new Error('failed to ensure indexes for the cache of istex'));
      }

      resolve(process);
    });
  });

  /**
   * enrich ec with cache or api istex
   * @param  {object} ec the EC to process, null if no EC left
   * @param  {Function} next the function to call when we are done with the given EC
   */
  function process(ec, next) {
    if (!ec) {
      finalCallback = next;
      if (!busy) {
        drainBuffer().then(() => {
          finalCallback();
        }).catch(err => {
          this.job._stop(err);
        });
      }
      return;
    }

    if (/ezpaarse/i.test(ec['user-agent']) || /ezpaarse/i.test(ec.sid)) {
      const err = new Error('irrelevant EC');
      err.type = 'EIRRELEVANT';
      return next(err);
    }

    buffer.push([ec, next]);

    if (buffer.length > bufferSize && !busy) {
      busy = true;
      self.saturate();

      drainBuffer().then(() => {
        busy = false;
        self.drain();

        if (finalCallback) { finalCallback(); }
      }).catch(err => {
        this.job._stop(err);
      });
    }
  }

  function getPacket() {
    const packet = {
      'ecs': [],
      'ids': new Set()
    };

    return co(function* () {

      while (packet.ids.size < packetSize) {
        const [ec, done] = buffer.shift() || [];
        if (!ec) { break; }

        const platforms = ['istex', 'sd'];

        if (!ec.unitid) {
          done();
          continue;
        }

        if (!platforms.includes(ec.platform)) {
          done();
          continue;
        }

        if (cacheEnabled) {
          const cachedDoc = yield checkCache(ec.unitid);

          if (cachedDoc) {
            enrichEc(ec, cachedDoc);
            done();
            continue;
          }
        }

        packet.ecs.push([ec, done]);
        packet.ids.add(ec.unitid);
      }

      return packet;
    });
  }

  function checkCache(identifier) {
    return new Promise((resolve, reject) => {
      if (!identifier) { return resolve(); }

      cache.get(identifier, (err, cachedDoc) => {
        if (err) { return reject(err); }
        resolve(cachedDoc);
      });
    });
  }

  function drainBuffer(callback) {
    return co(function* () {

      while (buffer.length >= bufferSize || (finalCallback && buffer.length > 0)) {

        const packet = yield getPacket();

        if (packet.ecs.length === 0 || packet.ids.size === 0) {
          self.logger.silly('Istex: no IDs in the paquet');
          yield new Promise(resolve => { setImmediate(resolve); });
          continue;
        }

        let tries = 0;
        let istexResults;

        while (!istexResults) {
          if (++tries > maxAttempts) {
            const err = new Error(`Failed to query Istex ${maxAttempts} times in a row`);
            return Promise.reject(err);
          }

          const ids = Array.from(packet.ids);

          try {
            istexResults = yield queryIstex(ids);
          } catch (e) {
            self.logger.error('Istex:', e);
          }
          yield wait();
        }

        for (const [ec, done] of packet.ecs) {
          const idType = getTypeOfId(ec.unitid);

          let enrichData;

          if (idType === 'ark') {
            enrichData = istexResults.filter(doc => { return doc.arkIstex === ec.unitid; });
          } else if (idType === 'doi') {
            enrichData = istexResults.filter(doc => { return doc.doi[0] === ec.unitid || ec.doi; });
          } else if (idType === 'pii') {
            enrichData = istexResults.filter(doc => {
              // PII in istex is like S1359-6454(07)00782-3
              return doc?.pii?.[0].replace(/[()-]/g, '') === ec.unitid; });
          } else {
            enrichData = istexResults.filter(doc => { return doc.id === ec.unitid; });
          }

          if (enrichData.length === 1) {
            enrichData = enrichData[0];
          }

          try {
            yield cacheResult(ec.unitid, enrichData);
          } catch (e) {
            report.inc('general', 'istex-cache-fail');
          }

          enrichEc(ec, enrichData || {});

          done();
        }
      }
    });
  }

  function wait() {
    return new Promise(resolve => { setTimeout(resolve, throttle); });
  }

  function sortIds(ids) {
    const arkIds = ids.filter(id => arkRegex.test(id));
    const doiIds = ids.filter(id => doiRegex.test(id));
    const piiIds = ids.filter(id => piiRegex.test(id));
    const istexIds
      = ids.filter(id => !arkIds.includes(id) && !doiIds.includes(id) && !piiIds.includes(id));

    return { arkIds, doiIds, piiIds, istexIds };
  }

  function getTypeOfId (id) {
    if (arkRegex.test(id)) { return 'ark'; }
    if (doiRegex.test(id)) { return 'doi'; }
    if (piiRegex.test(id)) { return 'pii'; }
    return 'istex-id';
  }

  function queryIstex(ids) {
    report.inc('general', 'istex-queries');
    const { arkIds, doiIds, piiIds, istexIds } = sortIds(ids);

    let istexRequest = 'https://api.istex.fr/document/?q=';

    if (arkIds.length > 0) {
      istexRequest = `${istexRequest}ark:("${arkIds.join('","')}")`;
    }

    if (doiIds.length > 0) {
      istexRequest = `${istexRequest}doi.raw:("${doiIds.join('","')}")`;
    }

    if (piiIds.length > 0) {
      istexRequest = `${istexRequest}pii:("${piiIds.join('","')}")`;
    }

    if (istexIds.length > 0) {
      istexRequest = `${istexRequest}id:("${istexIds.join('","')}")`;
    }

    const output = fields.join(',');

    istexRequest = `${istexRequest}&output=${output}&sid=ezpaarse&size=${ids.length}`;

    return fetch(istexRequest)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(json => {
        if (!Array.isArray(json && json.hits)) {
          report.inc('general', 'istex-fails');
          throw new Error('invalid response');
        }
        return json.hits;
      })
      .catch(err => {
        report.inc('general', 'istex-fails');
        throw err;
      });
  }

  function cacheResult(id, item) {
    return new Promise((resolve, reject) => {
      if (!id || !item) { return resolve(); }

      // The entire object can be pretty big
      // We only cache what we need to limit memory usage
      let cached = {};
      if (Object.keys(item).length > 0) {
        cached = {
          publicationDate: item.publicationDate,
          copyrightDate: item.copyrightDate,
          corpusName: item.corpusName,
          language: item.language,
          genre: item.genre,
          host: item.host,
          doi: item.doi,
          arkIstex: item.arkIstex,
          accessCondition: item.accessCondition
        };
      }

      cache.set(id, cached, (err, result) => {
        if (err) { return reject(err); }
        resolve(result);
      });
    });
  }

  /**
   * Enrich ec with api istex and to cache the data in database
   */
  function enrichEc(ec, result) {
    const {
      publicationDate,
      copyrightDate,
      corpusName,
      language,
      genre,
      host,
      doi,
      arkIstex,
      accessCondition,
    } = result;

    if (accessCondition) {
      ec['access_type'] = accessCondition.contentType;
      ec['oa_status'] = accessCondition.value;
    }

    if (corpusName) {
      ec['publisher_name'] = corpusName;

      if (tiffCorpus.has(corpusName.toUpperCase())) {
        ec['mime'] = 'TIFF';
      }
    }

    if (host) {
      if (host.isbn) { ec['print_identifier'] = getValue(host.isbn); }
      if (host.issn) { ec['print_identifier'] = getValue(host.issn); }
      if (host.eisbn) { ec['online_identifier'] = getValue(host.eisbn); }
      if (host.eissn) { ec['online_identifier'] = getValue(host.eissn); }
      if (host.title) { ec['publication_title'] = getValue(host.title); }
      if (host.subject && host.subject.value) { ec['subject'] = getValue(host.subject).value; }
    }

    ec['publication_date'] = publicationDate || copyrightDate;

    if (doi) { ec['doi'] = getValue(doi); }
    if (arkIstex) { ec['ark'] = getValue(arkIstex); }
    if (genre) { ec['istex_genre'] = getValue(genre); }
    if (language) { ec['language'] = getValue(language); }

    switch (ec['istex_rtype']) {
    case 'fulltext':
      ec['rtype'] = data[genre] || 'MISC';
      break;
    case 'metadata':
    case 'enrichments':
    case 'record':
      ec['rtype'] = 'METADATA';
      break;
    default:
      ec['rtype'] = 'MISC';
    }
  }
};

/**
 * Returns the first element if the parameter is an array
 * Otherwise returns the parameter as is
 */
function getValue(o) {
  return Array.isArray(o) ? o[0] : o;
}
