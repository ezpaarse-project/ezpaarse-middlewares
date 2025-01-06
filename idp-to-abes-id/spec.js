'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const process = contextify(mw);
const { expect } = require('chai');


const ecs = [
  { 'istex-id': 'https://idp.lecnam.net/idp/shibboleth', auth: 'fede' },
  { 'istex-id': 'ABESH0B2ZCGBD', auth: 'ip' },
];

describe('idp-to-abed-id', () => {
  it('Should not enrich with idp', async () => {
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.not.have.property('idp');
  });


  it('Should enrich with idp', async () => {
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('idp', 'https://idp.univ-paris13.fr/idp/shibboleth');
  });
});
