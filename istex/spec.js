'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');
const cache = ezpaarse.lib('cache')('istex');


// https://api.istex.fr/document/?q=
// ark:("ark:/67375/GT4-FJLCPBW9-Q","ark:/67375/6H6-XR9SK36N-F")
// id:("43B80EFC8F04F6D728C4C78B8A2447F1A9B515F1","62C2495F8EA6AAF791AD1BE02565D01EE1F22A5D")
// pii:("S1359645407007823","0198025482902217")
// &output
// =publicationDate,copyrightDate,corpusName,language,genre,host,doi,pii,arkIstex,accessCondition
const ecs = [
  { unitid: 'ark:/67375/GT4-FJLCPBW9-Q', platform: 'istex' },
  { unitid: 'ark:/67375/6H6-XR9SK36N-F', platform: 'istex' },
  { unitid: '43B80EFC8F04F6D728C4C78B8A2447F1A9B515F1', platform: 'istex' },
  { unitid: '62C2495F8EA6AAF791AD1BE02565D01EE1F22A5D', platform: 'istex' },
  { unitid: 'S1359645407007823', platform: 'sd' },
  { unitid: '0198025482902217', platform: 'sd' },
];

describe('istex', () => {
  it('Should enrich ec from istex', async () => {
    let report;

    const ecsForTest1 = JSON.parse(JSON.stringify(ecs));
    const ecsForTest2 = JSON.parse(JSON.stringify(ecs));

    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['istex-enrich'] = true;
      report = ctx.report;
    });

    await Promise.all(
      ecsForTest1.map(ec => new Promise(resolve => process(ec, resolve))),
      new Promise(resolve => process(null, resolve)),
    );

    // test report
    expect(report.getJson().general['istex-queries']).equal(1);

    // test ECs enrich with istex API
    expect(ecsForTest1[0]).to.have.property('doi').equal('10.1038/ncb2001');
    expect(ecsForTest1[0]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest1[1]).to.have.property('doi').equal('10.1016/j.plantsci.2013.05.003');
    expect(ecsForTest1[1]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest1[2]).to.have.property('doi').equal('10.1038/368326a0');
    expect(ecsForTest1[2]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest1[3]).to.have.property('doi').equal('10.1007/BF00419453');
    expect(ecsForTest1[3]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest1[4]).to.have.property('doi').equal('10.1016/j.actamat.2007.11.012');
    expect(ecsForTest1[4]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest1[5]).to.have.property('doi').equal('10.1016/0198-0254(82)90221-7');
    expect(ecsForTest1[5]).to.have.property('rtype').equal('MISC');

    const cachedDoc = await new Promise((resolve, reject) => {
      cache.get('ark:/67375/GT4-FJLCPBW9-Q', (error, res) => {
        if (error) { reject(error); }
        else { resolve(res); }
      });
    });

    expect(cachedDoc).to.have.property('doi').to.deep.equal(['10.1038/ncb2001']);

    // test enrich with cache
    const process2 = await contextify(mw, (ctx) => {
      ctx.request.headers['istex-enrich'] = true;
      report = ctx.report;
    });

    await Promise.all(
      ecsForTest2.map(ec => new Promise(resolve => process2(ec, resolve))),
      new Promise(resolve => process2(null, resolve)),
    );

    // test report
    expect(report.getJson().general['istex-queries']).equal(0);

    // test ECs enrich with cache
    expect(ecsForTest2[0]).to.have.property('doi').equal('10.1038/ncb2001');
    expect(ecsForTest2[0]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest2[1]).to.have.property('doi').equal('10.1016/j.plantsci.2013.05.003');
    expect(ecsForTest2[1]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest2[2]).to.have.property('doi').equal('10.1038/368326a0');
    expect(ecsForTest2[2]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest2[3]).to.have.property('doi').equal('10.1007/BF00419453');
    expect(ecsForTest2[3]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest2[4]).to.have.property('doi').equal('10.1016/j.actamat.2007.11.012');
    expect(ecsForTest2[4]).to.have.property('rtype').equal('MISC');

    expect(ecsForTest2[5]).to.have.property('doi').equal('10.1016/0198-0254(82)90221-7');
    expect(ecsForTest2[5]).to.have.property('rtype').equal('MISC');
  });
});
