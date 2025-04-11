'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'abes-id': 'ABES5SYHNO3YL' },
  { 'login': 'ABES5SYHNO3YL' },
];


describe('abesid-to-etab', () => {
  it('Should enrich institution info with "abes-id" as source field', async () => {
    const process = await contextify(mw);
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES5SYHNO3YL');
    expect(ec).to.have.property('institutionName', 'CHU MARTINIQUE');
  });

  it('Should enrich institution info with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES5SYHNO3YL');
    expect(ec).to.have.property('institutionName', 'CHU MARTINIQUE');
  });

  it('Should enrich "custom id" with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
      ctx.request.headers['abesid-to-etab-enriched-field'] = 'custom-id';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES5SYHNO3YL');
    expect(ec).to.have.property('custom-id', 'CHU MARTINIQUE');
  });
});
