'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'ip': '192.168.2.2' },
  { 'ip': '100.0.0.1' },
  { 'ip': '100.0.2.1' },
];

describe('ip-to-entity', () => {
  it('Should enrich idp with "machineName" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-entity-filename'] = 'test.json';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('machineName', 'One machine');
  });

  it('Should enrich idp with "machineName" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-entity-filename'] = 'test.json';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('machineName', 'Workers');
  });

  it('Should enrich idp with "machineName" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-entity-filename'] = 'test.json';
    });
    const ec = ecs[2];
    process(ec, () => {});
    expect(ec).to.have.property('machineName', 'Workers');
  });
});