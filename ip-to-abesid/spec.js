'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const process = contextify(mw);
const { expect } = require('chai');

const ecs = [
  { ip: '95.138.124.9' },
  { ip : '140.77.15.50' }
];


describe('ip-to-abesid', () => {
  it('ip: Should enrich with abes-id', async () => {
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES5SYHNO3YL');
  });

  it('range ip: Should enrich with abes-id', async () => {
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES1DFEJD1V1');
  });
});
