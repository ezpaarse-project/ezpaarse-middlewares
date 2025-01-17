# thesesfr

Fetches thesesfr API from ABES

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| rtype | String | |
| nnt | | |
| numSujet | String | |
| etabSoutenanceN | String | |
| etabSoutenancePpn | String | |
| codeCourt | String | |
| dateSoutenance | String | |
| anneeSoutenance | String | |
| dateInscription | String | |
| anneeInscription | String | |
| statut | String | |
| discipline | String | |
| ecoleDoctoraleN | String | |
| ecoleDoctoralePpn | String | |
| partenaireRechercheN | String | |
| partenaireRecherchePpn | String | |
| auteurN | String | |
| auteurPpn | String | |
| directeurN | String | |
| directeurPpn | String | |
| presidentN | String | |
| presidentPpn | String | |
| rapporteursN | String | |
| rapporteursPpn | String | |
| membresN | String | |
| membresPpn | String | |
| personneN | String | |
| personnePpn | String | |
| organismeN | String | |
| organismePpn | String | |
| idp_etab_nom | String | |
| idp_etab_ppn | String | |
| idp_etab_code_court | String | |
| platform_name | String | |
| publication_title | String | |
| source | String | Coming soon |
| domaine | String | Coming soon |
| doiThese | String | Coming soon |
| accessible | String | Coming soon | 
| langue | String | Coming soon | 

## Prerequisites

**You must use thesesfr after filter, parser, deduplicator middleware.**

## Recommendation

// TODO

## Headers

+ **thesesfr-ttl** : Lifetime of cached documents, in seconds. Defaults to ``7 days (3600 * 24 * 7)``.
+ **thesesfr-throttle** : Minimum time to wait between queries, in milliseconds. Defaults to ``200``ms.
+ **thesesfr-base-wait-time** : Time to wait before retrying after a query fails, in milliseconds. Defaults to ``1000``ms. This time ``doubles`` after each attempt.
+ **thesesfr-paquet-size** : Maximum number of identifiers to send for query in a single request. Defaults to ``50``.
+ **thesesfr-buffer-size** : Maximum number of memorized access events before sending a request. Defaults to ``1000``.
+ **thesesfr-max-attempts** : Maximum number of trials before passing the EC in error. Defaults to ``5``.
+ **thesesfr-user-agent** : Specify what to send in the `User-Agent` header when querying thesesfr. Defaults to `ezPAARSE (https://readmetrics.org; mailto:ezteam@couperin.org)`.

## How to use

### ezPAARSE admin interface

You can add or remove thesesfr by default to all your enrichments, provided you have added an API key in the config. To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use thesesfr for an enrichment process. You just add the middleware

![image](./docs/process-interface.png)

### ezp

You can use thesesfr for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: thesesfr" 
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: thesesfr" 

```

### curl

You can use thesesfr for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: thesesfr" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```