'use strict';

const co = require('co');
const request = require('request');
const { bufferedProcess, wait } = require('../utils.js');
const cache = ezpaarse.lib('cache')('openalex');

module.exports = function () {
  this.logger.verbose('Initializing openAlex middleware');

  const logger = this.logger;
  const report = this.report;
  const req = this.request;

  const cacheEnabled = !/^false$/i.test(req.header('openalex-cache'));

  // Time-to-live of cached documents
  let ttl = parseInt(req.header('openalex-ttl'));
  // Minimum wait time before each request (in ms)
  let throttle = parseInt(req.header('openalex-throttle'));
  // Minimum wait time before each request (in ms)
  let apikey = req.header('openalex-apikey');
  // Maximum number of DOIs to query
  let packetSize = parseInt(req.header('openalex-packet-size'));
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('openalex-buffer-size'));
  // Maximum number of trials before passing the EC in error
  let maxAttempts = parseInt(req.header('openalex-max-attempts'));

  if (isNaN(packetSize)) { packetSize = 100; }
  if (isNaN(bufferSize)) { bufferSize = 1000; }
  if (isNaN(throttle)) { throttle = 100; }
  if (isNaN(ttl)) { ttl = 3600 * 24 * 7; }
  if (isNaN(maxAttempts)) { maxAttempts = 5; }

  if (!cache) {
    const err = new Error('failed to connect to mongodb, cache not available for openalex');
    err.status = 500;
    return err;
  }

  this.job.outputFields.added.push('publication_title');
  this.job.outputFields.added.push('publication_date');
  this.job.outputFields.added.push('language');
  this.job.outputFields.added.push('is_oa');
  this.job.outputFields.added.push('oa_status');
  this.job.outputFields.added.push('journal_is_in_doaj');
  this.job.outputFields.added.push('issnl');
  this.job.outputFields.added.push('type');
  this.job.outputFields.added.push('oa_request_date');


  report.set('general', 'openalex-queries', 0);
  report.set('general', 'openalex-query-fails', 0);
  report.set('general', 'openalex-cache-fails', 0);

  const process = bufferedProcess(this, {
    packetSize,
    bufferSize,

    /**
     * Filter ECs that should be enriched
     * @param {Object} ec
     * @returns {Boolean|Promise} true if the EC should be enriched, false otherwise
     */
    filter: ec => {
      if (!ec.doi) { return false; }
      if (!cacheEnabled) { return true; }

      return findInCache(ec.doi).then(cachedDoc => {
        if (cachedDoc) {
          enrichEc(ec, cachedDoc);
          return false;
        }
        return true;
      });
    },

    onPacket: co.wrap(onPacket)
  });

  return new Promise(function (resolve, reject) {
    // Verify cache indices and time-to-live before starting
    cache.checkIndexes(ttl, function (err) {
      if (err) {
        logger.error(`openalex: failed to verify indexes : ${err}`);
        return reject(new Error('failed to verify indexes for the cache of openalex'));
      }

      resolve(process);
    });
  });


  /**
    * Process a packet of ECs
    * @param {Array<Object>} ecs
    * @param {Map<String, Set<String>>} groups
    */
  function* onPacket({ ecs }) {
    if (ecs.length === 0) { return; }

    const dois = ecs.map(([ec, done]) => ec.doi);

    let tries = 0;
    let docs;

    while (!docs) {
      if (++tries > maxAttempts) {
        const err = new Error(`Failed to query openalex ${maxAttempts} times in a row`);
        return Promise.reject(err);
      }

      try {
        docs = yield query(dois);
      } catch (e) {
        logger.error(`openalex: ${e.message}`);
      }

      yield wait(throttle);
    }

    const doiResults = new Map(docs.map(doc => [doc.doi.replace('https://doi.org/', ''), doc]));

    for (const [ec, done] of ecs) {
      const doc = doiResults.get(ec.doi);

      try {
        // If we can't find a result for a given ID, we cache an empty document
        yield cacheResult(ec.doi, doc || {});
      } catch (e) {
        report.inc('general', 'openalex-cache-fails');
      }

      if (doc) {
        enrichEc(ec, doc);
      }

      done();
    }
  }


  /**
   * Enrich an EC using the result of a query
   * @param {Object} ec the EC to be enriched
   * @param {Object} result the document used to enrich the EC
   */
  function enrichEc(ec, result) {
    const isOa = result.open_access.is_oa;

    const journalIsInDoaj = result && result.best_oa_location && result.best_oa_location.source
      && result.best_oa_location.source.is_in_doaj;

    const issnl = result && result.best_oa_location && result.best_oa_location.source
      && result.best_oa_location.source.issn_l || '';

    ec.publication_title = result.title || '';
    ec.publication_date = result.publication_date || '';
    ec.language = result.language || '';
    ec.is_oa = typeof isOa === 'boolean' ? isOa : undefined;
    ec.oa_status = result.open_access.oa_status || '';
    ec.journal_is_in_doaj = typeof journalIsInDoaj === 'boolean' ? journalIsInDoaj : undefined;
    ec.issnl = issnl || '';
    ec.type = result.type || '';
    ec.oa_request_date = result.oa_request_date || '';
  }

  /**
   * Request metadata from openalex API for a given DOI
   * @param {Array} dois the doi to query
   */
  function query(dois) {
    report.inc('general', 'openalex-queries');

    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        uri: 'https://api.openalex.org/works',
        json: true,
        qs: {
          filter: `doi:${dois.join('|')}`,
          api_key: apikey
        },
      };

      const now = new Date();

      request(options, (err, response, body) => {
        if (err) {
          report.inc('general', 'openalex-query-fails');
          return reject(err);
        }

        if (response.statusCode !== 200 && response.statusCode !== 304) {
          report.inc('general', 'openalex-query-fails');
          return reject(new Error(`${response.statusCode} ${response.statusMessage}`));
        }

        const result = body && body.results;

        if (!Array.isArray(result)) {
          return reject(new Error('invalid response'));
        }

        resolve(result.map(result => {
          result['oa_request_date'] = now.toISOString();
          return result;
        }));
      });
    });
  }


  /**
   * Cache an item with a given ID
   * @param {String} id the ID of the item
   * @param {Object} item the item to cache
   */
  function cacheResult(id, item) {
    return new Promise((resolve, reject) => {
      if (!id || !item) { return resolve(); }

      // The entire object can be pretty big
      // We only cache what we need to limit memory usage

      // TODO optimize size of cache

      cache.set(id, item, (err, result) => {
        if (err) { return reject(err); }
        resolve(result);
      });
    });
  }


  /**
   * Find the item associated with a given ID in the cache
   * @param {String} identifier the ID to find in the cache
   */
  function findInCache(identifier) {
    return new Promise((resolve, reject) => {
      if (!identifier) { return resolve(); }

      cache.get(identifier, (err, cachedDoc) => {
        if (err) { return reject(err); }
        resolve(cachedDoc);
      });
    });
  }
};

