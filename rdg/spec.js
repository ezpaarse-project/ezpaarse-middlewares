/* eslint-disable max-len */
'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { 'doi': '10.57745/ISNA0C' },
];

// https://entrepot.recherche.data.gouv.fr/api/datasets/export?exporter=dataverse_json&persistentId=doi:10.57745/ISNA0C
const results = [
  {
    'doi': '10.57745/ISNA0C',
    'publication_title': 'Tilleul (lime tree, Tilia europaea)',
    'citation': 'Badel E ; Arnould O., Bozonnet C., Conchon P., Duhamel Y., Ruelle J., Viguier J. WoodSun : un projet collaboratif de science ouverte du GDR 3544 Sciences du Bois : La structure du bois agrandie en 3D. 12ème Journées scientifiques du GDR Sciences du Bois. Limoges. 22-24 Nov. 2023'
  },
];


describe('rdg', () => {
  it('Should enrich ec with title and citation with RDG API', async () => {
    const process = await contextify(mw, (ctx) => {});

    await Promise.all(
      ecs.map(ec => new Promise(resolve => process(ec, resolve))),
      new Promise(resolve => process(null, resolve)),
    );

    const ec = ecs[0];

    expect(ec).to.deep.equal(results[0]);
  });
});