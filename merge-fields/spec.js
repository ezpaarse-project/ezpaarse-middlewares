'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'toto': 'val1', 'titi': 'val2' },
];

describe('idp-to-institution', () => {
  it('Should enrich idp with "institution-name" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['merge'] = 'toto+-+titi=newField';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('newField', 'val1-val2');
  });
});