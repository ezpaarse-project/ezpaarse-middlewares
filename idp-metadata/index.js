'use strict';

const co = require('co');
const request = require('request');
const { bufferedProcess, wait } = require('../utils.js');
const xmlMapping = require('xml-mapping')

const oneDay = 24 * 60 * 60 * 1000;
let lastRefresh = Date.now();
let list_idp;

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

    // Load list_idp.xml file
    function loadMapping(filename, resolve, reject){
        fs.readFile(path.resolve(__dirname, filename), 'utf8', (err, content) => {
            if (err) {
                return reject(err);
            }

            try {
                logger.info(`[idp-metadata]: Fail to request main-idps-renater-metadata.xml from web service : load file ${filename} OK`);
                return resolve(content);
            } catch (e) {
                return reject(e);
            }
        });
    }



    const promiseIdP = new Promise((resolveIdP, rejectIdP) => {

        if (list_idp && ((Date.now() - lastRefresh) < oneDay)) { return resolveIdP(list_idp); }

        logger.info('[idp-metadata]: mapping reload');

        // Load mapping from Renater web service
        const optionsIdP = {
            method: 'GET',
            uri: `https://pub.federation.renater.fr/metadata/renater/main/main-idps-renater-metadata.xml`
        };

        request(optionsIdP, (errIdP, responseIdP, resultIdP) => {
            // If error, load local file list_idp.xml
            if (errIdP || responseIdP.statusCode !== 200) {
                // FIXME the result of loadMapping is not used
                loadMapping('list_idp.xml', resolveIdP, rejectIdP);

                
                lastRefresh = Date.now();
                // convert xml to json
                resolveIdP(xmlMapping.tojson(resultIdP));
            };
        });
    });

    return promiseIdP
        .then((result) => {
            list_idp = result;
            return process;
        })
        .catch((err) => {
            logger.error(`[idp-metadata]: fail to load the mapping : ${err}`);
            throw new Error('[idp-metadata]: fail to load the mapping');
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
        if(ec['Shib-Identity-Provider']) {
            logger.info(`[idp-metadata]: try to find an IDP label for ${ec['Shib-Identity-Provider']} , to the EC ${ec.unitid}`);
            const etab = list_idp.md$EntitiesDescriptor.md$EntityDescriptor.find((entityDescriptor) => entityDescriptor.entityID === ec['Shib-Identity-Provider']);
            ec.libelle_idp = "";
            if (etab) {
                const info = etab.md$IDPSSODescriptor.md$Extensions.mdui$UIInfo;
                const libelle_idp = info.mdui$DisplayName.find((displayName) => displayName.xml$lang === "fr");
                if (libelle_idp) {
                    ec.libelle_idp = libelle_idp.$t;
                }
            }
        }
        if (!ec.libelle_idp) {
            ec.libelle_idp = "sans objet"
        }
    }
};
