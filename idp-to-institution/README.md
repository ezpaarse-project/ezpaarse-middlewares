# idp-to-institution

Add information about institution with abesID.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| institutionName | String | Name of institution. |

## Prerequisites

idp-to-institution enrichment middleware needs abes-id.
You need to find the file Etablissement.csv on Inist Gitlab on Istex repo and put at the folder of this middleware.

**You must use idp-to-institution after filter, parser, deduplicator middleware.**

### Example

## Headers

```
+ **idp-to-institution-source-field** : Fields in the ec for enrichment. "abes-id" by default.
+ **idp-to-institution-enriched-field** : Enriched field in the EC. "institution-name" by default.
```

## How to use

### ezPAARSE admin interface

You can add idp-to-institution by default to all your enrichments, To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use idp-to-institution for an enrichment process. You just add the middleware.

![image](./docs/process-interface.png)

### ezp

You can use idp-to-institution for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: idp-to-institution" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: idp-to-institution" 

```

### curl

You can use idp-to-institution for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: idp-to-institution" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```