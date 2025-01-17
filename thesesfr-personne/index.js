const co = require('co');
const request = require('request');
const { bufferedProcess, wait } = require('../utils.js');

const cache = ezpaarse.lib('cache')('thesesfr-personne');

module.exports = function () {
  const { logger } = this;
  const { report } = this;
  const req = this.request;

  logger.info('[thesesfr-personne]: Initializing');

  const cacheEnabled = !/^false$/i.test(req.header('thesesfr-personne-cache'));

  logger.info(`[thesesfr-personne]: cache: ${cacheEnabled ? 'enabled' : 'disabled'}`);

  // Time-to-live of cached documents
  let ttl = parseInt(req.header('thesesfr-personne-ttl'), 10);
  // Minimum wait time before each request (in ms)
  let throttle = parseInt(req.header('thesesfr-personne-throttle'), 10);
  // Base wait time after a request fails
  let baseWaitTime = parseInt(req.header('thesesfr-personne-base-wait-time'), 10);
  // Maximum number of Theses or Persons to query
  let packetSize = parseInt(req.header('thesesfr-personne-packet-size'), 10);
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('thesesfr-personne-buffer-size'), 10);
  // Maximum number of trials before passing the EC in error
  let maxAttempts = parseInt(req.header('thesesfr-personne-max-attempts'), 10);
  // Specify what to send in the `User-Agent` header when querying thesesfr-personne API
  let userAgent = req.header('thesesfr-personne-user-agent');

  if (Number.isNaN(packetSize)) { packetSize = 100; }
  if (Number.isNaN(bufferSize)) { bufferSize = 1000; }
  if (Number.isNaN(baseWaitTime)) { baseWaitTime = 1000; }
  if (Number.isNaN(throttle)) { throttle = 100; }
  if (Number.isNaN(ttl)) { ttl = 3600 * 24 * 7; }
  if (Number.isNaN(maxAttempts)) { maxAttempts = 5; }
  if (!userAgent) { userAgent = 'ezPAARSE (https://readmetrics.org; mailto:ezteam@couperin.org)'; }


  const baseUrl = 'https://theses.fr/api/v1/personnes/recherche/';

  if (!cache) {
    const err = new Error('[thesesfr-personne]: failed to connect to mongodb, cache not available for Thesesfr');
    err.status = 500;
    return err;
  }

  report.set('thesesfr-personne', 'thesesfr-queries', 0);
  report.set('thesesfr-personne', 'thesesfr-query-fails', 0);
  report.set('thesesfr-personne', 'thesesfr-cache-fails', 0);

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
          if (Object.keys(cachedDoc).length === 0) {
            logger.warn(`[thesefr-organisme]: missed cache, doc from thesesfr-organisme is empty for unitid: [${ec.unitid}] rtype: ${ec.rtype}`);
          } else {
            logger.debug(`[thesefr-organisme]: unitid: [${ec.unitid}] rtype :[${ec.rtype}] come from cache`);
            enrichEc(ec, cachedDoc);
          }
          return false;
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
        logger.error(`Thesesfr: failed to verify indexes : ${err}`);
        return reject(new Error('failed to verify indexes for the cache of Thesesfr'));
      }

      return resolve(process);
    });
  });

  /**
     * Process a packet of ECs
     * @param {Array<Object>} ecs
     * @param {Map<String, Set<String>>} groups
     */
  function* onPacket({ ecs }) {
    if (ecs.length === 0) { return; }

    const unitids = ecs.filter(([ec]) => ec.rtype === 'RECORD').map(([ec]) => ec.unitid);

    let tries = 0;
    let docs;

    while (!docs) {
      if (tries > maxAttempts) {
        logger.error(`[thesesfr-personne]: Cannot request thesesfr-personne ${maxAttempts} times in a row`);
        return;
      }

      tries += 1;

      try {
        docs = yield query(unitids);
      } catch (e) {
        logger.error(`Thesesfr: ${e.message}`);
      }

      yield wait(throttle);
      yield wait(tries === 0 ? throttle : baseWaitTime * 2 ** tries);
    }

    const docResults = new Map();
    docs.forEach((doc) => {
      if (doc && doc.id) {
        docResults.set(doc.id, doc);
      }
    });

    for (const [ec, done] of ecs) {
      const { unitid } = ec;
      const doc = docResults.get(unitid);

      try {
        // If we can't find a result for a given ID, we cache an empty document
        yield cacheResult(unitid, doc || {});
      } catch (e) {
        report.inc('thesesfr-personne', 'thesesfr-cache-fails');
      }

      if (doc) {
        enrichEc(ec, doc);
      }

      done();
    }
  }

  /**
   * Enrich an EC using the result of a query
   *
   * @param {Object} ec the EC to be enriched
   * @param {Object} result the document used to enrich the EC
   */
  function enrichEc(ec, result) {
    // il s'agit d'une Personne (PPN)
    if (result.nom && result.prenom) {
      ec.personneN = `${result.nom} ${result.prenom}`;
      ec.personnePpn = ec.unitid;
      // update rtype to BIO to ignore it for the next middleware
      ec.rtype = 'BIO';
      ec.nnt = 'sans objet';
      ec.numSujet = 'sans objet';
      // TODO doiThese > sans objet > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec.doiThese = 'sans objet';
      ec.etabSoutenanceN = 'sans objet';
      ec.etabSoutenancePpn = 'sans objet';
      ec.codeCourt = 'sans objet';
      ec.dateSoutenance = 'sans objet';
      ec.anneeSoutenance = 'sans objet';
      ec.dateInscription = 'sans objet';
      ec.anneeInscription = 'sans objet';
      ec.statut = 'sans objet';
      // TODO accessible > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec.accessible = 'sans objet';
      // TODO source > sans objet > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec.source = 'sans objet';
      ec.discipline = 'sans objet';
      // TODO domaine > obligatoire  > à masquer tant que non présent dans l'API theses > supprimé provisoirement du header (champs pour la sortie)
      // ec.domaine = 'sans objet';
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
      ec.organismeN = 'sans objet';
      ec.organismePpn = 'sans objet';
      ec.idp_etab_nom = 'sans objet';
      ec.idp_etab_ppn = 'sans objet';
      ec.idp_etab_code_court = 'sans objet';
      ec.platform_name = 'Personne';
    }
  }

  /**
   * Request metadata from ThesesFr API for given IDs
   *
   * @param {Array} unitids the ids to query
   */
  function query(unitids) {
    report.inc('thesesfr-personne', 'thesesfr-queries');

    const subQueries = [];
    const ppns = [];

    unitids.forEach((id) => {
      ppns.push(id);
    });

    if (ppns.length > 0) {
      subQueries.push(`${ppns.join(' OR ')}`);
    }

    const queryParams = `?nombre=200&q=${subQueries.join(' OR ')}`;

    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        json: true,
        headers: {
          'User-Agent': userAgent,
        },
        uri: `${baseUrl}${queryParams}`,
      };

      request(options, (err, response, result) => {
        if (err) {
          report.inc('thesesfr-personne', 'thesesfr-query-fails');
          return reject(err);
        }

        if (response.statusCode === 404) {
          return resolve({});
        }

        if (response.statusCode !== 200 && response.statusCode !== 304) {
          report.inc('thesesfr-personne', 'thesesfr-query-fails');
          return reject(new Error(`${response.statusCode} ${response.statusMessage}`));
        }

        if (!Array.isArray(result && result.personnes)) {
          report.inc('thesesfr-personne', 'thesesfr-query-fails');
          return reject(new Error('invalid response'));
        }

        return resolve(result.personnes);
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
