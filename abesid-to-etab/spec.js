'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const process = contextify(mw);
const { expect } = require('chai');

const ecs = [
  { 'abes-id': 'ABES5SYHNO3YL' },
];


describe('abes-id-to-etab', () => {
  it('Should not enrich with idp', async () => {
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
});
