'use strict';

const path = require('path');
const fs = require('fs');
const request = require('request');
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

  logger.info('Initializing ABES idp-metadata middleware');

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

  /**
   * Enrich an EC using the result of a query
   * @param {Object} ec the EC to be enriched
   * @param {Function} next the function to call when the EC process is over
   */
  function process(ec, next) {
    if (!ec || !ec.unitid) { return next(); }

    const idp = ec['Shib-Identity-Provider'];

    if (idp) {
      logger.info(`[idp-metadata]: try to find an IDP label for ${idp} , to the EC ${ec.unitid}`);
      ec.libelle_idp = idpList.get(idp) || 'sans objet';
    } else {
      ec.libelle_idp = 'sans objet';
    }

    next();
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
};
