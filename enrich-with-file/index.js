'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const fileCache = new Map();

async function readFile(filePath) {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath);
  }

  const raw = await fsp.readFile(filePath, 'utf8');
  const content = JSON.parse(raw);

  fileCache.set(filePath, content);

  return content;
}

function indexContent(content, sourceField) {
  const index = new Map();

  if (!Array.isArray(content)) {
    return index;
  }

  for (const row of content) {
    if (!row || row[sourceField] === undefined) {
      continue;
    }

    if (!index.has(row[sourceField])) {
      index.set(row[sourceField], row);
    }
  }

  return index;
}

module.exports = function () {
  const req = this.request;
  const logger = this.logger;

  let configHeader = req.header('enrich-with-file-config');

  let configFile;
  let config = [];

  return new Promise(async (resolve, reject) => {
    try {
      configFile = JSON.parse(configHeader);
    } catch (e) {
      reject(new Error(`Cannot parse the content of the config header: ${configHeader}`));
      return;
    }

    for (let key in configFile) {
      const entry = configFile[key];

      // if entry is null/undefined or is not an object
      if (!entry || typeof entry !== 'object') {
        logger.error('[enrich-with-file]: Invalid config entry, skipping');
        continue;
      }

      const filename = entry.filename;
      const sourceField = entry.sourceField;

      // check if filename is a string and defined
      if (typeof filename !== 'string' || !filename) {
        logger.error('[enrich-with-file]: Missing or invalid filename, skipping entry');
        continue;
      }
      // check if sourceField is a string and defined
      if (typeof sourceField !== 'string' || !sourceField) {
        logger.error('[enrich-with-file]: Missing or invalid sourceField, skipping entry');
        continue;
      }

      // check if enrichedFields is an array of non-empty strings
      const enrichedFields = Array.isArray(entry.enrichedFields)
        ? entry.enrichedFields.filter((f) => typeof f === 'string' && f.trim()).map((f) => f.trim())
        : [];

      enrichedFields.forEach((field) => {
        if (!this.job.outputFields.added.includes(field)) {
          this.job.outputFields.added.push(field);
        }
      });

      const dataDir = path.resolve(__dirname, 'data');
      const filePath = path.resolve(dataDir, filename);
      if (!filePath.startsWith(dataDir + path.sep)) {
        logger.error(`[enrich-with-file]: Invalid filename (path traversal): ${filename}`);
        reject(new Error(`Invalid filename: ${filename}`));
        return;
      }

      if (!fs.existsSync(filePath)) {
        logger.error('[enrich-with-file]: File not found');
        reject(new Error(`File not found: ${filename}`));
        return;
      }

      let content;
      try {
        content = await readFile(filePath);
      } catch (e) {
        logger.error(`[enrich-with-file]: Cannot read/parse file ${filename}: ${e.message}`);
        reject(new Error(`Cannot parse file: ${filename}`));
        return;
      }

      const index = indexContent(content, sourceField);

      config.push({
        filename,
        sourceField,
        enrichedFields,
        index
      });
    }

    resolve(process);
  });

  function process(ec, next) {
    if (!ec) { return next(); }

    for (const { sourceField, enrichedFields, index } of config) {

      // check if ec[sourceField] is present
      if (ec[sourceField] === undefined) {
        continue;
      }

      const alreadyEnriched = enrichedFields.every((field) => ec[field] !== undefined);
      if (alreadyEnriched) {
        continue;
      }

      const value = ec[sourceField];

      const record = index.get(value);

      if (!record) {
        continue;
      }

      for (const field of enrichedFields) {
        if (record[field] !== undefined && ec[field] === undefined) {
          ec[field] = record[field];
        }
      }
    }

    next();
  }
};