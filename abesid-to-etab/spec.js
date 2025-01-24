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
    expect(ec).to.have.property('siren', '200034528');
    expect(ec).to.have.property('institutionName', 'CHU Martinique');
    expect(ec).to.have.property('institutionType', 'CHR-CHU');
    expect(ec).to.have.property('institutionAddress', 'CHU Maartinique 97261 CS 90632 CEDEX');
    expect(ec).to.have.property('institutionCity', 'Fort-de-France');
    expect(ec).to.have.property('institutionPhone', '596722037');
    expect(ec).to.have.property('institutionContact', 'ALPHONSE Sylvie');
    expect(ec).to.have.property('institutionEmail', 'sylvie.alphonse@univ-antilles.fr');
    expect(ec).to.have.property('institutionIpRange', '95.138.124.9, 5.187.120.33, 95.138.127.113, 213.16.1.153, 213.16.2.141, 213.16.1.154');
  });

  it('Should enrich institution info with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES5SYHNO3YL');
    expect(ec).to.have.property('siren', '200034528');
    expect(ec).to.have.property('institutionName', 'CHU Martinique');
    expect(ec).to.have.property('institutionType', 'CHR-CHU');
    expect(ec).to.have.property('institutionAddress', 'CHU Maartinique 97261 CS 90632 CEDEX');
    expect(ec).to.have.property('institutionCity', 'Fort-de-France');
    expect(ec).to.have.property('institutionPhone', '596722037');
    expect(ec).to.have.property('institutionContact', 'ALPHONSE Sylvie');
    expect(ec).to.have.property('institutionEmail', 'sylvie.alphonse@univ-antilles.fr');
    expect(ec).to.have.property('institutionIpRange', '95.138.124.9, 5.187.120.33, 95.138.127.113, 213.16.1.153, 213.16.2.141, 213.16.1.154');
  });

  it('Should enrich "custom id" with "login" as source field', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['abesid-to-etab-source-field'] = 'login';
      ctx.request.headers['abesid-to-etab-enriched-fields'] = '{ "Siren": "custom-id" }';
    });
    const ec = ecs[1];
    process(ec, () => {});
    expect(ec).to.have.property('login', 'ABES5SYHNO3YL');
    expect(ec).to.have.property('custom-id', '200034528');
  });
});
