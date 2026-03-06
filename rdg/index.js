'use strict';

const co = require('co');
const request = require('request');
const { bufferedProcess, wait } = require('../utils.js');
const cache = ezpaarse.lib('cache')('rdg');


module.exports = function () {
  this.logger.verbose('Initializing RDG middleware');

  const logger = this.logger;
  const report = this.report;
  const req    = this.request;

  const cacheEnabled = !/^false$/i.test(req.header('rdg-cache'));

  logger.verbose(`RDG cache: ${cacheEnabled ? 'enabled' : 'disabled'}`);

  this.job.outputFields.added.push('publication_title');
  this.job.outputFields.added.push('citation');

  // Strategy to adopt when an enrichment reaches maxTries : abort, ignore, retry
  let onFail = (req.header('rdg-on-fail') || 'abort').toLowerCase();
  let onFailValues = ['abort', 'ignore', 'retry'];

  if (onFail && !onFailValues.includes(onFail)) {
    const err = new Error(`RDG-On-Fail should be one of: ${onFailValues.join(', ')}`);
    err.status = 400;
    return err;
  }

  // Time-to-live of cached documents
  let ttl = parseInt(req.header('rdg-ttl'));
  // Minimum wait time before each request (in ms)
  let throttle = parseInt(req.header('rdg-throttle'));
  // Maximum number of DOIs to query
  let packetSize = parseInt(req.header('rdg-packet-size'));
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('rdg-buffer-size'));
  // Maximum enrichment attempts
  let maxTries = parseInt(req.header('rdg-max-tries'));

  if (isNaN(packetSize)) { packetSize = 10; }
  if (isNaN(bufferSize)) { bufferSize = 200; }
  if (isNaN(throttle)) { throttle = 100; }
  if (isNaN(ttl)) { ttl = 3600 * 24 * 7; }
  if (isNaN(maxTries)) { maxTries = 5; }

  if (!cache) {
    const err = new Error('failed to connect to mongodb, cache not available for RDG');
    err.status = 500;
    return err;
  }

  report.set('general', 'rdg-queries', 0);
  report.set('general', 'rdg-query-fails', 0);
  report.set('general', 'rdg-cache-fails', 0);

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
        logger.error(`RDG: failed to verify indexes : ${err}`);
        return reject(new Error('failed to verify indexes for the cache of RDG'));
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

    yield Promise.all(ecs.map(([ec, done]) => co.wrap(processEc)(ec, done)));
  }

  /**
   * Enrich an EC using the result of a query
   * @param {Object} ec the EC to be enriched
   * @param {Object} result the document used to enrich the EC
   */
  function enrichEc(ec, result) {
    if (result.title) {
      ec.publication_title = result.title;
    }

    if (result.citation) {
      ec.citation = result.citation;
    }
  }

  /**
   * Process and enrich one EC
   * @param {Object} ec the EC to process
   * @param {Function} done the callback
   */
  function* processEc (ec, done) {
    let tries = 0;
    let result;

    while (typeof result !== 'object') {
      if (tries >= maxTries) {
        if (onFail === 'ignore') {
          logger.error(`RDG: ignoring EC enrichment after ${maxTries} failed attempts`);
          done();
          return;
        }

        if (onFail === 'abort') {
          const err = new Error(`Failed to query RDG ${maxTries} times in a row`);
          return Promise.reject(err);
        }
      }

      try {
        result = yield query(ec.doi);
      } catch (e) {
        logger.error(`RDG: ${e.message}`);
      }

      yield wait(throttle * Math.pow(2, tries));
      tries += 1;
    }

    try {
      // If we can't find a result for a given DOI, we cache an empty document
      yield cacheResult(ec.doi, result || {});
    } catch (e) {
      report.inc('general', 'rdg-cache-fails');
    }

    if (result) {
      enrichEc(ec, result);
    }

    done();
  }

  /**
   * Request metadata from rdg API for a given DOI
   * @param {Array} dois the doi to query
   */
  function query(doi) {
    report.inc('general', 'rdg-queries');

    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        uri: 'https://entrepot.recherche.data.gouv.fr/api/datasets/export',
        json: true,
        qs: {
          exporter: 'dataverse_json',
          persistentId: `doi:${doi}`,
        }
      };

      request(options, (err, response, body) => {
        if (err) {
          report.inc('general', 'rdg-query-fails');
          return reject(err);
        }

        if (response.statusCode === 404) {
          return resolve({});
        }

        if (response.statusCode === 403) {
          // Some DOI are forbidden / protected
          return resolve({});
        }

        if (response.statusCode !== 200 && response.statusCode !== 304) {
          report.inc('general', 'rdg-query-fails');
          return reject(new Error(`${response.statusCode} ${response.statusMessage}`));
        }

        const data = body?.datasetVersion?.metadataBlocks?.citation?.fields;



        const title = data.find((f) => f.typeName === 'title')?.value;
        const citation = data.find((f) => f.typeName === 'publication')?.value
          .find((f) => f?.publicationCitation?.typeName === 'publicationCitation')?.
          publicationCitation?.value;

        const result = {
          title,
          citation
        };

        resolve(result);
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
      const cached = {};
      cached.title = item.title;
      cached.citation = item.citation;

      cache.set(id, cached, (err, result) => {
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
