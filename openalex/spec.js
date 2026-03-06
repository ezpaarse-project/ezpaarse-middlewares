'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'doi': '10.1007/978-3-030-68796-0' },
  { 'doi': '10.1590/s1414-462x2013000200009' },
];

// https://api.openalex.org/works?filter=doi:10.1007/978-3-030-68796-0|10.1590/s1414-462x2013000200009
const results = [
  {
    doi: '10.1007/978-3-030-68796-0',
    publication_title: 'Pattern Recognition. ICPR International Workshops and Challenges',
    publication_date: '2021-01-01',
    language: 'en',
    is_oa: true,
    oa_status: 'green',
    journal_is_in_doaj: false,
    issnl: '',
    type: 'book',
  },
  {
    doi: '10.1590/s1414-462x2013000200009',
    publication_title: 'Sobrevida e evolução leucêmica de portadores de síndromes mielodisplásicas',
    publication_date: '2013-06-01',
    language: 'pt',
    is_oa: true,
    oa_status: 'diamond',
    journal_is_in_doaj: true,
    issnl: '1414-462X',
    type: 'article',
  }
];

describe('openalex', () => {
  it('Should enrich ec with date from openalex', async () => {
    const process = await contextify(mw, (ctx) => {});

    await Promise.all(
      ecs.map(ec => new Promise(resolve => process(ec, resolve))),
      new Promise(resolve => process(null, resolve)),
    );

    const ec1 = ecs[0];
    const ec2 = ecs[1];

    expect(ec1).to.have.property('oa_request_date').that.is.a('string');
    expect(ec2).to.have.property('oa_request_date').that.is.a('string');

    delete ec1.oa_request_date;
    delete ec2.oa_request_date;

    expect(ec1).to.deep.equal(results[0]);
    expect(ec2).to.deep.equal(results[1]);
  });
});