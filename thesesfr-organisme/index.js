const co = require('co');
const request = require('request');
const { bufferedProcess, wait } = require('../utils.js');

const cache = ezpaarse.lib('cache')('thesesfr-organisme');

module.exports = function () {
  const { logger } = this;
  const { report } = this;
  const req = this.request;

  logger.info('[thesesfr-organisme]: Initializing');

  const cacheEnabled = !/^false$/i.test(req.header('thesesfr-organisme-cache'));

  logger.info(`[thesesfr-organisme]: cache: ${cacheEnabled ? 'enabled' : 'disabled'}`);

  // Time-to-live of cached documents
  let ttl = parseInt(req.header('thesesfr-organisme-ttl'), 10);
  // Minimum wait time before each request (in ms)
  let throttle = parseInt(req.header('thesesfr-organisme-throttle'), 10);
  // Base wait time after a request fails
  let baseWaitTime = parseInt(req.header('thesesfr-base-wait-time'), 10);
  // Maximum number of Theses or Persons to query
  let packetSize = parseInt(req.header('thesesfr-organisme-packet-size'), 10);
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('thesesfr-organisme-buffer-size'), 10);
  // Maximum number of trials before passing the EC in error
  let maxAttempts = parseInt(req.header('thesesfr-organisme-max-attempts'), 10);
  // Specify what to send in the `User-Agent` header when querying thesesfr API
  let userAgent = req.header('thesesfr-organisme-user-agent');

  if (Number.isNaN(packetSize)) { packetSize = 100; }
  if (Number.isNaN(bufferSize)) { bufferSize = 1000; }
  if (Number.isNaN(baseWaitTime)) { baseWaitTime = 1000; }
  if (Number.isNaN(throttle)) { throttle = 100; }
  if (Number.isNaN(ttl)) { ttl = 3600 * 24 * 7; }
  if (Number.isNaN(maxAttempts)) { maxAttempts = 5; }
  if (!userAgent) { userAgent = 'ezPAARSE (https://readmetrics.org; mailto:ezteam@couperin.org)'; }


  const baseUrl = 'https://theses.fr/api/v1/theses/getorganismename/';

  if (!cache) {
    const err = new Error('thesesfr-organisme: failed to connect to mongodb, cache not available');
    err.status = 500;
    return err;
  }

  report.set('thesesfr-organisme', 'thesesfr-queries', 0);
  report.set('thesesfr-organisme', 'thesesfr-query-fails', 0);
  report.set('thesesfr-organisme', 'thesesfr-cache-fails', 0);

  const process = bufferedProcess(this, {
    packetSize,
    bufferSize,
    /**
     * Filter ECs that should be enriched
     * @param {Object} ec
     * @returns {Boolean|Promise} true if the EC should be enriched, false otherwise
     */
    filter: (ec) => {
      if (!ec.unitid) { return false; }
      // no need to us cache if the EC is not a thesis record
      if (!(ec.rtype === 'RECORD')) { return false; }
      if (!cacheEnabled) { return true; }

      return findInCache(ec.unitid).then((cachedDoc) => {
        if (cachedDoc) {
          if (typeof cachedDoc === 'object') {
            const keysCount = Object.keys(cachedDoc).length;
            if (keysCount === 0) {
              logger.warn(`[thesesfr-organisme]: missed cache, doc from thesesfr-organisme is empty for unitid: [${ec.unitid}] rtype: ${ec.rtype}`);
            } else {
              logger.debug(`[thesesfr-organisme]: unitid: [${ec.unitid}] rtype: [${ec.rtype}] come from cache with ${keysCount} keys`);
              enrichEc(ec, cachedDoc);
              return false;
            }
          }
          // Normal case from thesesfr-organisme, the answer is a text string
          if (cachedDoc.length === 0) {
            logger.warn(`[thesesfr-organisme]: missed cache, doc from thesesfr-organisme DIFFERENT de objet mais taille 0 pour ec.unitid [${ec.unitid}] ec.rtype [${ec.rtype}]`);
          } else {
            logger.debug(`[thesesfr-organisme]: unitid: [${ec.unitid}] rtype: [${ec.rtype}] come from cache`);
            enrichEc(ec, cachedDoc);
            return false;
          }
        }

        return true;
      });
    },

    onPacket: co.wrap(onPacket),
  });

  return new Promise((resolve, reject) => {
    // Verify cache indices and time-to-live before starting
    cache.checkIndexes(ttl, (err) => {
      if (err) {
        logger.error(`[thesesfr-organisme]: failed to verify indexes : ${err}`);
        return reject(new Error('[thesesfr-organisme]: failed to verify indexes for the cache of Thesesfr'));
      }

      return resolve(process);
    });
  });

  /**
   * Process a packet of ECs
   *
   * @param {Array<Object>} ecs
   * @param {Map<String, Set<String>>} groups
   */
  function* onPacket({ ecs }) {
    if (ecs.length === 0) { return; }

    for (const [ec, done] of ecs) {
      const id = ec.unitid;

      let tries = 0;
      let doc;

      while (!doc) {
        if (tries > maxAttempts) {
          logger.error(`[thesesfr-organisme]: Cannot request thesesfr-organisme ${maxAttempts} times in a row`);
          return;
        }

        tries += 1;

        try {
          if (ec.rtype === 'RECORD') {
            doc = yield query(id);
          } else {
            doc = {};
          }
        } catch (e) {
          logger.error(`[thesesfr-organisme]: Cannot request thesesfr-organisme : ${e.message}`);
        }

        yield wait(throttle);
        yield wait(tries === 0 ? throttle : baseWaitTime * 2 ** tries);
      }

      const { unitid } = ec;

      try {
        // If we can't find a result for a given ID, we cache an empty document
        yield cacheResult(unitid, doc || {});
      } catch (e) {
        report.inc('thesesfr-organisme erreur yield cacheResult ', 'thesesfr-cache-fails');
      }

      if (doc && typeof doc === 'object' && Object.keys(doc).length > 0) {
        logger.warn(`[thesesfr-organisme]: Unexpected error, response is not empty with ${Object.keys(doc).length} keys for id: [${id}] and rtype: [${ec.rtype}]`);
      }

      if (doc && doc.missing) {
        logger.debug(`[thesesfr-organisme]: Missing data for ID ${id}. Enriching with default values.`);
        enrichEc(ec, doc);
      }

      if (doc && typeof doc !== 'object' && doc.length > 0) {
        enrichEc(ec, doc);
      }

      done();
    }
  }

  /**
   * Enrich an EC using a forged result (absent from quey response)
   *
   * @param {Object} ec the EC to be enriched
   * @param {Object} result the forged document used to enrich the EC
   */
  // FIXME result is not used
  function enrichForgedEc(ec, result) {
    // version Check EC qualification : middleware qualifier-other + middleware qualifer
    ec.rtype = 'OTHER';
    ec.nnt = 'NOT_FOUND';
    ec.numSujet = 'NOT_FOUND';
    ec.etabSoutenanceN = 'NOT_FOUND';
    ec.etabSoutenancePpn = 'NOT_FOUND';
    ec.codeCourt = 'NOT_FOUND';
    ec.dateSoutenance = 'NOT_FOUND';
    ec.anneeSoutenance = 'NOT_FOUND';
    ec.dateInscription = 'NOT_FOUND';
    ec.anneeInscription = 'NOT_FOUND';
    ec.statut = 'NOT_FOUND';
    ec.discipline = 'NOT_FOUND';
    ec.ecoleDoctoraleN = 'NOT_FOUND';
    ec.ecoleDoctoralePpn = 'NOT_FOUND';
    ec.partenaireRechercheN = 'NOT_FOUND';
    ec.partenaireRecherchePpn = 'NOT_FOUND';
    ec.auteurN = 'NOT_FOUND';
    ec.auteurPpn = 'NOT_FOUND';
    ec.directeurN = 'NOT_FOUND';
    ec.directeurPpn = 'NOT_FOUND';
    ec.presidentN = 'NOT_FOUND';
    ec.presidentPpn = 'NOT_FOUND';
    ec.rapporteursN = 'NOT_FOUND';
    ec.rapporteursPpn = 'NOT_FOUND';
    ec.membresN = 'NOT_FOUND';
    ec.membresPpn = 'NOT_FOUND';
    ec.personneN = 'NOT_FOUND';
    ec.personnePpn = 'NOT_FOUND';
    ec.organismeN = 'NOT_FOUND';
    ec.organismePpn = 'NOT_FOUND';
    ec.idp_etab_nom = 'NOT_FOUND';
    ec.idp_etab_ppn = 'NOT_FOUND';
    ec.idp_etab_code_court = 'NOT_FOUND';
    ec.platform_name = 'NOT_FOUND';
    ec.publication_title = 'NOT_FOUND';
  }

  /**
   * Enrich an EC using the result of a query
   *
   * @param {Object} ec the EC to be enriched
   * @param {Object} result the document used to enrich the EC
   */

  function enrichEc(ec, result) {
    // If doc is not available on API thesesfr-organisme
    if (result && result.missing) {
      logger.debug(`[thesesfr-organisme]: ${result.id} for ${ec.rtype} will be forged`);
      enrichForgedEc(ec, result);
      return;
    }

    // it is an Organisme PPN
    if (result && (typeof result === 'string') && (result.length !== 0)) {
      ec.organismeN = result;
      ec.organismePpn = ec.unitid;
      ec.rtype = 'ORGANISME';
      ec.nnt = 'sans objet';
      ec.numSujet = 'sans objet';
      // TODO doiThese > sans objet > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec['doiThese'] = 'sans objet';
      ec.etabSoutenanceN = 'sans objet';
      ec.etabSoutenancePpn = 'sans objet';
      ec.codeCourt = 'sans objet';
      ec.dateSoutenance = 'sans objet';
      ec.anneeSoutenance = 'sans objet';
      ec.dateInscription = 'sans objet';
      ec.anneeInscription = 'sans objet';
      ec.statut = 'sans objet';
      // TODO accessible > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec['accessible'] = 'sans objet';
      // TODO source > sans objet > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec['source'] = 'sans objet';
      ec.discipline = 'sans objet';
      // TODO domaine > obligatoire  > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec['domaine'] = 'sans objet';
      // TODO langue > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec['langue'] = 'sans objet';
      ec.ecoleDoctoraleN = 'sans objet';
      ec.ecoleDoctoralePpn = 'sans objet';
      ec.partenaireRechercheN = 'sans objet';
      ec.partenaireRecherchePpn = 'sans objet';
      // TODO coTutelleN, coTutellePpn > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      ec.auteurN = 'sans objet';
      ec.auteurPpn = 'sans objet';
      ec.directeurN = 'sans objet';
      ec.directeurPpn = 'sans objet';
      ec.presidentN = 'sans objet';
      ec.presidentPpn = 'sans objet';
      ec.rapporteursN = 'sans objet';
      ec.rapporteursPpn = 'sans objet';
      ec.membresN = 'sans objet';
      ec.membresPpn = 'sans objet';
      ec.personneN = 'sans objet';
      ec.personnePpn = 'sans objet';
      ec.idp_etab_nom = 'sans objet';
      ec.idp_etab_ppn = 'sans objet';
      ec.idp_etab_code_court = 'sans objet';
      ec.platform_name = 'Organisme';
    }
  }

  /**
   * Request metadata from ThesesFr API for given IDs
   *
   * @param {Array} unitids the ids to query
   */
  function query(id) {
    report.inc('thesesfr-organisme', 'thesesfr-queries');

    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
        },
        uri: `${baseUrl}${id}`,
      };

      request(options, (err, response, result) => {
        if (err) {
          report.inc('thesesfr-organisme', 'thesesfr-query-fails');
          return reject(err);
        }

        if (response.statusCode === 404) {
          return resolve({});
        }

        if (response.statusCode !== 200 && response.statusCode !== 304) {
          report.inc('thesesfr-organisme', 'thesesfr-query-fails');
          return reject(new Error(`${response.statusCode} ${response.statusMessage}`));
        }

        if ((response.statusCode === 200) && (!(Number(response.headers['content-length']) > 0))) {
          report.inc('thesesfr-organisme', 'thesesfr-query-empty-response');
          return resolve({ missing: true });
        }

        if (!(Number(response.headers['content-length']) > 0)) {
          report.inc('thesesfr-organisme', 'thesesfr-query-empty-response');
          return resolve({});
        }

        return resolve(result);
      });
    });
  }

  /**
   * Cache an item with a given ID
   *
   * @param {String} id the ID of the item
   * @param {Object} item the item to cache
   */
  function cacheResult(id, item) {
    return new Promise((resolve, reject) => {
      if (!id || !item) {
        resolve();
        return;
      }

      cache.set(id, item, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  /**
   * Find the item associated with a given ID in the cache
   *
   * @param {String} identifier the ID to find in the cache
   */
  function findInCache(identifier) {
    return new Promise((resolve, reject) => {
      if (!identifier) {
        resolve();
        return;
      }

      cache.get(identifier, (err, cachedDoc) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(cachedDoc);
      });
    });
  }
};
