'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');
const cache = ezpaarse.lib('cache')('istex');

const ecs = [
  {
    platform: 'istex',
    method: 'GET',
    url: '/ark:/67375/0T8-RT7Z6PLB-T/fulltext.pdf?sid=hal',
    unitid: 'ark:/67375/0T8-RT7Z6PLB-T',
    status: 302
  },
];

describe('istex', () => {
  it('test enrich', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['istex-buffer-size'] = 5;
      ctx.request.headers['istex-enrich'] = true;
      ctx.request.headers['istex-cache'] = true;
    });

    const ec1 = ecs[0];

    await Promise.all([
      new Promise(resolve => process(ec1, resolve)),
      new Promise(resolve => process(null, resolve)),
    ]);

    // https://api.istex.fr/ark:/67375/0T8-RT7Z6PLB-T/record.json
    expect(ec1).to.have.property('access_type', 'isNotOpenAccess');
    expect(ec1).to.have.property('oa_status', 'closed');
    expect(ec1).to.have.property('publisher_name', 'iop');
    expect(ec1).to.have.property('print_identifier', '0268-1242');
    expect(ec1).to.have.property('online_identifier', '1361-6641');
    expect(ec1).to.have.property('publication_title', 'Semiconductor Science and Technology');
    expect(ec1).to.have.property('publication_date', '2003');
    expect(ec1).to.have.property('doi', '10.1088/0268-1242/18/11/303');
    expect(ec1).to.have.property('ark', 'ark:/67375/0T8-RT7Z6PLB-T');
    expect(ec1).to.have.property('istex_genre', 'other');
    expect(ec1).to.have.property('language', 'eng');
    expect(ec1).to.have.property('rtype', 'MISC');
  });
});
