'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const dataset = [
  {
    // If the IDP exists, the label should be filled
    input: {
      'Shib-Identity-Provider': 'https://idp.lecnam.net/idp/shibboleth',
      unitid: '000000000',
    },
    validate: (ec) => {
      expect(ec).to.have.property('libelle_idp').that.equals('Le Cnam');
    }
  },
  {
    // If the IDP does not exist, the label should be "sans objet"
    input: {
      'Shib-Identity-Provider': 'https://some-random-unknown-idp.com/idp/shibboleth',
      unitid: '000000000',
    },
    validate: (ec) => {
      expect(ec).to.have.property('libelle_idp').that.equals('sans objet');
    }
  },
  {
    // If the EC has no unitid, the label should not be set
    input: {
      'Shib-Identity-Provider': 'https://some-random-unknown-idp.com/idp/shibboleth',
    },
    validate: (ec) => {
      expect(ec).to.not.have.property('libelle_idp');
    }
  },
  {
    // If the EC has no IDP, the label should be "sans objet"
    input: {
      unitid: '000000000',
    },
    validate: (ec) => {
      expect(ec).to.have.property('libelle_idp').that.equals('sans objet');
    }
  }
];

describe('thesesfr-personne', function () {
  this.timeout(10000);

  it('should correctly fill IDP label', async () => {
    const ecValidationFunctions = new Map(dataset.map(({ input, validate }) => [input, validate]));
    const ecs = Array.from(ecValidationFunctions.keys());
    const process = await contextify(mw);

    await Promise.all(
      ecs.map(ec => new Promise(resolve => process(ec, resolve))),
      new Promise(resolve => process(null, resolve)),
    );

    ecs.forEach((ec) => { ecValidationFunctions.get(ec)(ec); });
  });
});
