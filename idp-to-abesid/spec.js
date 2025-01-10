'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'login': 'https://idp.lecnam.net/idp/shibboleth', auth: 'fede' },
  { 'login': 'ABESH0B2ZCGBD', auth: 'ip' },
  { 'idp': 'https://idp.lecnam.net/idp/shibboleth', auth: 'fede' },
];

describe('idp-to-abed-id', () => {
  it('Should enrich "abes-id" with idp', async () => {
    const process = await contextify(mw);
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABESAXC2B5AHV');
  });


  it('Should not enrich abes-id with idp', async () => {
    const process = await contextify(mw);
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.not.have.property('abes-id');
  });

  it('Should enrich "custom-id" with idp', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['idp-to-abesid-enriched-field'] = 'custom-id';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('custom-id', 'ABESAXC2B5AHV');
  });

  it('Should enrich "custom-id" with idp for custom source field "idp"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['idp-to-abesid-source-field'] = 'idp';
      ctx.request.headers['idp-to-abesid-enriched-field'] = 'custom-id';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('custom-id', 'ABESAXC2B5AHV');
  });
});
