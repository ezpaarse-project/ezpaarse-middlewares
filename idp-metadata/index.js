'use strict';

const path = require('path');
const fs = require('fs');
const request = require('request');
const { XMLParser } = require('fast-xml-parser');

const localMappingFile = path.resolve(__dirname, 'idps.json');

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
 * Load the local IDP mapping file
 *
 * @returns {Promise<void>}
 */
  function loadLocalFile() {
    return new Promise((resolve, reject) => {
      fs.readFile(localMappingFile, (err, content) => {
        if (err) { return reject(err); }

        idpList = JSON.parse(content);
        resolve();
      });
    });
  }

  /**
  * Takes the XML string of a metadata file and returns a map
  * that match IDP URL with the french display name
  * @param {string} xmlString
  * @returns {Object}
  */
  function getMappingFromXML(xmlString) {
    const parser = new XMLParser(xmlParseOption);
    const metadata = parser.parse(xmlString);
    const entities = metadata['md:EntitiesDescriptor']['md:EntityDescriptor']

    return Object.fromEntries(
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

  /**
   * Fetch the latest IDP XML from Renater and update the mapping file
   * @return {Promise<void>}
   */
  function updateIDPList() {
    const optionsIdP = {
      method: 'GET',
      uri: `https://pub.federation.renater.fr/metadata/renater/main/main-idps-renater-metadata.xml`
    };

    return new Promise((resolve, reject) => {
      request(optionsIdP, (errIdP, responseIdP, resultIdP) => {
        if (errIdP || responseIdP.statusCode !== 200) {
          return reject(errIdP || new Error(`Got unexpected status code ${responseIdP.statusCode}`));
        }

        idpList = getMappingFromXML(resultIdP);

        fs.writeFile(localMappingFile, JSON.stringify(idpList, null, 2), (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
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
      ec.libelle_idp = idpList[idp] || 'sans objet';
    } else {
      ec.libelle_idp = 'sans objet';
    }

    next();
  }

  /**
   * Check if the IDP mapping must be updated and update it if necessary (max once a day)
   * @returns {Promise<void>}
   */
  function checkUpdate() {
    return new Promise((resolve, reject) => {
  const promiseIdP = new Promise((resolve, reject) => {

    if (idpList && ((Date.now() - lastRefresh) < oneDay)) { return resolve(); }
      if (idpList && ((Date.now() - lastRefresh) < oneDay)) {
        return resolve();
      }

      logger.info('[idp-metadata]: reloading mapping...');

      updateIDPList()
        .then(() => {
          lastRefresh = Date.now();
          logger.info('[idp-metadata]: mapping reloaded');
          resolve();
        })
        .catch((err) => {
          logger.error(`[idp-metadata]: Fail to request main-idps-renater-metadata.xml from web service : ${err}`);
          reject(err);
        });
    });
  }

  /**
   * Initialize the process
   * Load the local mapping file if it exists, otherwise check for updates
   * @returns {Promise<void>}
   */
  function init() {
    if (idpList) {
      return checkUpdate();
    }

    return loadLocalFile()
      .then(() => {
        logger.info(`[idp-metadata]: local mapping file loaded`);
      })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          logger.error(`[idp-metadata]: Local mapping file not found`);
        } else {
          logger.error(`[idp-metadata]: Failed to load local mapping file`, err);
        }
      })
      .finally(checkUpdate);
  }

  return init()
    .then(() => process)
    .catch((err) => {
      logger.error(`[idp-metadata]: fail to load the mapping`, err);
      throw err;
    });
};
