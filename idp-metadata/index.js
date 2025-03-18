'use strict';

const path = require('path');
const fs = require('fs');
const co = require('co');
const request = require('request');
const { bufferedProcess } = require('../utils.js');
const { XMLParser } = require('fast-xml-parser');

const localMappingFile = path.resolve(__dirname, 'list_idp.xml');

const xmlParseOption = {
  alwaysCreateTextNode: true,
  ignoreAttributes: false,
};

const oneDay = 24 * 60 * 60 * 1000;
let lastRefresh = Date.now();
let idpList;

module.exports = function () {
  const logger = this.logger;
  const report = this.report;
  const req = this.request;

  logger.info('Initializing ABES idp-metadata middleware');

  // Maximum number of Theses or Persons to query
  let packetSize = parseInt(req.header('idp-metadata-packet-size'));
  // Minimum number of ECs to keep before resolving them
  let bufferSize = parseInt(req.header('idp-metadata-buffer-size'));
  if (isNaN(packetSize)) { packetSize = 100; } //Default : 50
  if (isNaN(bufferSize)) { bufferSize = 1000; } //Default : 1000

  report.set('idp-metadata', 'idp-metadata-queries', 0);
  report.set('idp-metadata', 'idp-metadata-query-fails', 0);
  report.set('idp-metadata', 'idp-metadata-cache-fails', 0);

  const process = bufferedProcess(this, {
    packetSize,
    bufferSize,
    /**
    * Filter ECs that should be enriched
    * @param {Object} ec
    * @returns {Boolean|Promise} true if the EC as an unitid, false otherwise
    */
    filter: ec => ec.unitid,
    onPacket: co.wrap(onPacket)
  });

  /**
  * Takes the XML string of a metadata file and creates a map
  * that match IDP URL with the french display name
  * @param {string} xmlString
  */
  function loadIDPMappingFromXMLString(xmlString) {
    const parser = new XMLParser(xmlParseOption);
    idpList = parser.parse(xmlString);

    const entities = idpList['md:EntitiesDescriptor']['md:EntityDescriptor']

    idpList = new Map(
      entities
        .filter((entity) => (entity && entity['@_entityID']))
        .map((entity) => {
          const entityID = entity['@_entityID'];
          const displayNames =
            entity['md:IDPSSODescriptor']
            && entity['md:IDPSSODescriptor']['md:Extensions']
            && entity['md:IDPSSODescriptor']['md:Extensions']['mdui:UIInfo']
            && entity['md:IDPSSODescriptor']['md:Extensions']['mdui:UIInfo']['mdui:DisplayName'];

          let displayName;

          if (Array.isArray(displayNames)) {
            const labelNode = displayNames.find((displayName) => displayName['@_xml:lang'] === 'fr');
            displayName = labelNode && labelNode['#text'];
          }
          return [entityID, displayName];
        })
    );
  }

  // Load the local mapping file
  function loadLocalMapping() {
    return new Promise((resolve, reject) => {
      fs.readFile(localMappingFile, 'utf8', (err, content) => {
        if (err) {
          return reject(err);
        }

        loadIDPMappingFromXMLString(content);
        resolve();
      });
    });
  }

  // Load mapping from the Renater web service
  function loadRemoteMappingFile() {
    const optionsIdP = {
      method: 'GET',
      uri: `https://pub.federation.renater.fr/metadata/renater/main/main-idps-renater-metadata.xml`
    };

    return new Promise((resolve, reject) => {
      request(optionsIdP, (errIdP, responseIdP, resultIdP) => {
        // If error, load local file list_idp.xml
        if (errIdP || responseIdP.statusCode !== 200) {
          reject(errIdP || new Error(`Got unexpected status code ${responseIdP.statusCode}`));
        } else {
          // convert xml to json
          loadIDPMappingFromXMLString(resultIdP);
          lastRefresh = Date.now();
          resolve();
        }

      });
    });
  }

  const promiseIdP = new Promise((resolve, reject) => {

    if (idpList && ((Date.now() - lastRefresh) < oneDay)) { return resolve(); }

    logger.info('[idp-metadata]: reloading mapping...');

    loadRemoteMappingFile()
    .then(() => {
      logger.info('[idp-metadata]: mapping reloaded');
      resolve();
    })
    .catch((err) => {
      logger.error(`[idp-metadata]: Fail to request main-idps-renater-metadata.xml from web service : ${err}`);
      logger.error(`[idp-metadata]: Loading local XML file ${localMappingFile}`);

      loadLocalMapping()
        .then(() => {
          logger.info('[idp-metadata]: local mapping loaded');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  });

  return promiseIdP
    .then(() => process)
    .catch((err) => {
      logger.error(`[idp-metadata]: fail to load the mapping : ${err}`);
      throw err;
    });

  /**
  * Process a packet of ECs
  * @param {Array<Object>} ecs
  * @param {Map<String, Set<String>>} groups
  */
  function* onPacket({ ecs }) {
    if (ecs.length === 0) { return; }
    for (const [ec, done] of ecs) {
      enrichEc(ec)
      done();
    }
  }

  /**
  * Enrich an EC using the result of a query
  * @param {Object} ec the EC to be enriched
  * @param {Object} result the document used to enrich the EC
  */
  function enrichEc(ec) {
    const idp = ec['Shib-Identity-Provider'];

    if (!idp) {
      ec.libelle_idp = 'sans objet';
      return;
    }

    logger.info(`[idp-metadata]: try to find an IDP label for ${idp} , to the EC ${ec.unitid}`);

    ec.libelle_idp = idpList.get(idp) || 'sans objet';
  }
};
