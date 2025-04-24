'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'abes-id': 'ABES0000001' },
  { 'login': 'ABES0000001' },
  { 'abes-id': 'ABES0000004' },
];


describe('abesid-to-etab', () => {
  it('Should enrich institution info with "abes-id" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-filename'] = 'test.csv';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES0000001');
    expect(ec).to.have.property('institutionName', 'Etab01');
  });

  it('Should enrich institution info with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-filename'] = 'test.csv';
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES0000001');
    expect(ec).to.have.property('institutionName', 'Etab01');
  });

  it('Should enrich "custom id" with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-filename'] = 'test.csv';
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
      ctx.request.headers['abesid-to-etab-enriched-field'] = 'custom-id';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES0000001');
    expect(ec).to.have.property('custom-id', 'Etab01');
  });

  it('Should enrich institution info with "abes-id" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-filename'] = 'test.csv';
    });
    const ec = ecs[2];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES0000004');
    expect(ec).to.not.have.property('institutionName');
  });
});
