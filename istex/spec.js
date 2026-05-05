'use strict';

const { contextify } = require('../mock');
const mw = require('.');
const { expect } = require('chai');

const ecs = [
  { unitid: 'ark:/67375/GT4-FJLCPBW9-Q', platform: 'istex' },
  { unitid: 'ark:/67375/6H6-XR9SK36N-F', platform: 'istex' },
  { unitid: '43B80EFC8F04F6D728C4C78B8A2447F1A9B515F1', platform: 'istex' },
  { unitid: '62C2495F8EA6AAF791AD1BE02565D01EE1F22A5D', platform: 'istex' },
  { unitid: 'S1359645407007823', platform: 'sd' },
  { unitid: '0198025482902217', platform: 'sd' },
];

describe('istex', () => {
  it('Should enrich ec with date from istex', async () => {
    const process = await contextify(mw, (ctx) => {
      ctx.request.headers['istex-enrich'] = true;
    });

    await Promise.all(
      ecs.map(ec => new Promise(resolve => process(ec, resolve))),
      new Promise(resolve => process(null, resolve)),
    );

    expect(ecs[0]).to.have.property('doi').equal('10.1038/ncb2001');
    expect(ecs[0]).to.have.property('rtype').equal('MISC');

    expect(ecs[1]).to.have.property('doi').equal('10.1016/j.plantsci.2013.05.003');
    expect(ecs[1]).to.have.property('rtype').equal('MISC');

    expect(ecs[2]).to.have.property('doi').equal('10.1038/368326a0');
    expect(ecs[2]).to.have.property('rtype').equal('MISC');

    expect(ecs[3]).to.have.property('doi').equal('10.1007/BF00419453');
    expect(ecs[3]).to.have.property('rtype').equal('MISC');

    expect(ecs[4]).to.have.property('doi').equal('10.1016/j.actamat.2007.11.012');
    expect(ecs[4]).to.have.property('rtype').equal('MISC');

    expect(ecs[5]).to.have.property('doi').equal('10.1016/0198-0254(82)90221-7');
    expect(ecs[5]).to.have.property('rtype').equal('MISC');
  });
});

// https://api.istex.fr/document/?q=
// ark:("ark:/67375/GT4-FJLCPBW9-Q","ark:/67375/6H6-XR9SK36N-F")
// id:("43B80EFC8F04F6D728C4C78B8A2447F1A9B515F1","62C2495F8EA6AAF791AD1BE02565D01EE1F22A5D")
// pii:("S1359645407007823","0198025482902217")
// &output
// =publicationDate,copyrightDate,corpusName,language,genre,host,doi,pii,arkIstex,accessCondition
const results = [
  {
    'corpusName': 'elsevier',
    'pii': [
      '0198-0254(82)90221-7'
    ],
    'accessCondition': {
      'contentType': 'isNotOpenAccess',
      'value': 'closed'
    },
    'genre': [
      'abstract'
    ],
    'host': {
      'volume': '29',
      'pii': [
        'S0198-0254(00)X0003-9'
      ],
      'pages': {
        'first': '780'
      },
      'issn': [
        '0198-0254'
      ],
      'issue': '12',
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'title': 'Deep-Sea Research Part B, Oceanographic Literature Review',
      'publicationDate': '1982'
    },
    'arkIstex': 'ark:/67375/6H6-KF8BXKBV-B',
    'language': [
      'eng'
    ],
    'publicationDate': '1982',
    'copyrightDate': '1982',
    'doi': [
      '10.1016/0198-0254(82)90221-7'
    ],
    'id': '24D5E8497C3748E458767030669D4AB13AB16F83',
    'score': 13.82822
  },
  {
    'corpusName': 'elsevier',
    'pii': [
      'S1359-6454(07)00782-3'
    ],
    'genre': [
      'research-article'
    ],
    'host': {
      'volume': '56',
      'pii': [
        'S1359-6454(08)X0004-7'
      ],
      'pages': {
        'last': '1208',
        'first': '1196'
      },
      'issn': [
        '1359-6454'
      ],
      'issue': '6',
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'title': 'Acta Materialia',
      'publicationDate': '2008'
    },
    'arkIstex': 'ark:/67375/6H6-XPJ5GMT8-0',
    'language': [
      'eng'
    ],
    'publicationDate': '2008',
    'copyrightDate': '2007',
    'doi': [
      '10.1016/j.actamat.2007.11.012'
    ],
    'id': '726EDDB9EDF61ADF25956C1AE854F44C853A87E9',
    'score': 12.920307
  },
  {
    'corpusName': 'nature',
    'accessCondition': {
      'contentType': 'isOpenAccess',
      'value': 'greenOpenAccess'
    },
    'genre': [
      'research-article'
    ],
    'host': {
      'volume': '12',
      'pages': {
        'total': '10',
        'last': '40',
        'first': '31'
      },
      'issn': [
        '1465-7392'
      ],
      'issue': '1',
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'eissn': [
        '1476-4679'
      ],
      'title': 'Nature Cell Biology'
    },
    'arkIstex': 'ark:/67375/GT4-FJLCPBW9-Q',
    'language': [
      'eng'
    ],
    'publicationDate': '2010',
    'copyrightDate': '2010',
    'doi': [
      '10.1038/ncb2001'
    ],
    'id': '087661D669BF44CA05AA6CE08ADD6399F6A439C4',
    'score': 10.870015
  },
  {
    'corpusName': 'elsevier',
    'pii': [
      'S0168-9452(13)00111-8'
    ],
    'accessCondition': {
      'contentType': 'isNotOpenAccess',
      'value': 'closed'
    },
    'genre': [
      'research-article'
    ],
    'host': {
      'volume': '210',
      'pii': [
        'S0168-9452(13)X0007-X'
      ],
      'pages': {
        'last': '60',
        'first': '53'
      },
      'issn': [
        '0168-9452'
      ],
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'title': 'Plant Science',
      'publicationDate': '2013'
    },
    'arkIstex': 'ark:/67375/6H6-XR9SK36N-F',
    'language': [
      'eng'
    ],
    'publicationDate': '2013',
    'copyrightDate': '2013',
    'doi': [
      '10.1016/j.plantsci.2013.05.003'
    ],
    'id': '82610287447F0228F8A251CA8D30C65541A85810',
    'score': 10.767802
  },
  {
    'corpusName': 'springer-journals',
    'genre': [
      'research-article'
    ],
    'host': {
      'volume': '12',
      'pages': {
        'last': '437',
        'first': '425'
      },
      'issn': [
        '0959-3993'
      ],
      'issue': '5',
      'subject': [
        {
          'value': 'Chemistry/Food Science, general'
        },
        {
          'value': 'Biochemistry, general'
        },
        {
          'value': 'Microbiology'
        },
        {
          'value': 'Animal Anatomy / Morphology / Histology'
        },
        {
          'value': 'Environmental Biotechnology'
        }
      ],
      'journalId': [
        '11274'
      ],
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'eissn': [
        '1573-0972'
      ],
      'title': 'World Journal of Microbiology and Biotechnology',
      'publicationDate': '1996',
      'copyrightDate': '1996'
    },
    'accessCondition': {
      'contentType': 'isNotOpenAccess',
      'value': 'closed'
    },
    'language': [
      'eng'
    ],
    'arkIstex': 'ark:/67375/1BB-RPZFX5NS-X',
    'publicationDate': '1996',
    'copyrightDate': '1996',
    'doi': [
      '10.1007/BF00419453'
    ],
    'id': '62C2495F8EA6AAF791AD1BE02565D01EE1F22A5D',
    'score': 1
  },
  {
    'corpusName': 'nature',
    'accessCondition': {
      'contentType': 'isNotOpenAccess',
      'value': 'closed'
    },
    'genre': [
      'other'
    ],
    'host': {
      'volume': '368',
      'pages': {
        'last': '330',
        'first': '326'
      },
      'issn': [
        '0028-0836'
      ],
      'issue': '6469',
      'genre': [
        'journal'
      ],
      'language': [
        'unknown'
      ],
      'title': 'Nature'
    },
    'arkIstex': 'ark:/67375/GT4-Z63V1C1H-P',
    'language': [
      'eng'
    ],
    'publicationDate': '1994',
    'copyrightDate': '1994',
    'doi': [
      '10.1038/368326a0'
    ],
    'id': '43B80EFC8F04F6D728C4C78B8A2447F1A9B515F1',
    'score': 1
  }
];