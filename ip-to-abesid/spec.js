'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { ip: '127.0.0.4' }, // simple ip
  { ip: '127.0.11.52' }, // in range ip
  { login: '127.0.0.4' }, // simple ip
  { ip: '127.0.0.5' }, // simple ip
];


describe('ip-to-abesid', () => {
  it('ip: Should enrich with "abes-id"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-abesid-filename'] = 'test.json';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES0000001');
  });

  it('range ip: Should enrich with "abes-id"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-abesid-filename'] = 'test.json';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('abes-id', 'ABES0000002');
  });

  it('range ip: Should enrich with "custom-id"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-abesid-filename'] = 'test.json';
      ctx.request.headers['ip-to-abesid-enriched-field'] = 'custom-id';
    });
    const ec = ecs[0];
    process(ec, () => {});
    expect(ec).to.have.property('custom-id', 'ABES0000001');
  });

  it('range ip: Should enrich with "custom-id" for custom source field "login"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-abesid-filename'] = 'test.json';
      ctx.request.headers['ip-to-abesid-source-field'] = 'login';
      ctx.request.headers['ip-to-abesid-enriched-field'] = 'custom-id';
    });
    const ec = ecs[2];
    process(ec, () => {});
    expect(ec).to.have.property('custom-id', 'ABES0000001');
  });

  it('ip: Should enrich with "abes-id"', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['ip-to-abesid-filename'] = 'test.json';
    });
    const ec = ecs[3];
    process(ec, () => {});
    expect(ec).to.not.have.property('abes-id');
  });
});
