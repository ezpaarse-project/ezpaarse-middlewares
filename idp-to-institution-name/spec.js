'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'login': 'https://institution.renater.fr/idp/shibboleth' },
];

describe('idp-to-institution-name', () => {
  it('Should enrich idp with "institution-name" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['idp-to-institution-name-filename'] = 'test.json';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('institution-name', 'Institution of test');
  });
});