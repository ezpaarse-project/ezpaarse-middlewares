'use strict';
const fs = require('fs');
const path = require('path');
const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'webserviceRequest': 'affiliations-tools-/v1/addresses/parse' },
  { 'webserviceRequest': 'aiabstract-check-/v1/AiAbstract-check' },
];

const file1Content = [
  {
    webserviceRequest: 'affiliations-tools-/v1/addresses/parse',
    webService: 'addressSplit',
    traitement: 'Prétraitement'
  },
  {
    webserviceRequest: 'aiabstract-check-/v1/AiAbstract-check',
    webService: 'aiAbstractCheck',
    traitement: 'Validation'
  }
];

const file2Content = [
  {
    webserviceRequest: 'affiliations-tools-/v1/addresses/parse',
    test: 'Sylverster Stallone, best actor ever'
  }
];

describe('enrich-with-file', () => {
  const filepath1 = path.resolve(__dirname, 'data', 'test1.json');
  const filepath2 = path.resolve(__dirname, 'data', 'test2.json');

  before(() => {
    fs.writeFileSync(filepath1, JSON.stringify(file1Content));
    fs.writeFileSync(filepath2, JSON.stringify(file2Content));
  });

  after(() => {
    fs.unlinkSync(filepath1);
    fs.unlinkSync(filepath2);
  });

  it('Should enrich the file based on “sourceField” with the fields from “enrichedFields”', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['enrich-with-file-config'] = `
        [
          {
            "filename":"test1.json",
            "sourceField": "webserviceRequest",
            "enrichedFields": ["webService", "traitement"]
          },
          {
            "filename":"test2.json",
            "sourceField": "webserviceRequest",
            "enrichedFields": ["test"]
          }
        ]
      `;
    });

    const ec1 = ecs[0];
    process(ec1, () => { });
    expect(ec1).to.have.property('webService', 'addressSplit');
    expect(ec1).to.have.property('traitement', 'Prétraitement');
    expect(ec1).to.have.property('test', 'Sylverster Stallone, best actor ever');

    const ec2 = ecs[1];
    process(ec2, () => { });
    expect(ec2).to.have.property('webService', 'aiAbstractCheck');
    expect(ec2).to.have.property('traitement', 'Validation');
  });
});