'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const dataset = [
  {
    // Access to a person
    input: { platform: 'thesesfr', rtype: 'RECORD', unitid: '026988070' },
    validate: (ec) => {
      expect(ec).to.have.property('platform_name').that.equals('Personne');
      expect(ec).to.have.property('personnePpn').that.equals('026988070');
      expect(ec).to.have.property('rtype').that.equals('BIO');
      expect(ec).to.have.property('personneN').that.is.a('string').and.is.not.empty;
      expect(ec).to.have.property('nnt').that.equals('sans objet');
    }
  },
  {
    // Access to a person that does not exist
    input: { platform: 'thesesfr', rtype: 'RECORD', unitid: '000000000' },
    validate: (ec) => {
      expect(ec).to.deep.equal({ platform: 'thesesfr', rtype: 'RECORD', unitid: '000000000' });
    }
  },
  {
    // Access to a person, but type is not RECORD
    input: { platform: 'thesesfr', rtype: 'ABS', unitid: '026988070' },
    validate: (ec) => {
      expect(ec).to.deep.equal({ platform: 'thesesfr', rtype: 'ABS', unitid: '026988070' });
    }
  },
];

describe('thesesfr-personne', function () {
  this.timeout(10000);

  it('should correctly return person information', async () => {
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
