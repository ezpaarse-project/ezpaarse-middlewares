# idp-to-abesid

Add ABESID with IDP.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| abes-id | String | ABES ID. |

## Prerequisites

## Prerequisites

idp-to-abesid enrichment middleware needs idp in ec.

**You must use idp-to-abesid after filter, parser, deduplicator middleware.**

## Example of structure of file

```
ABESID	IDP
ABES0123456789	https://ciboulette.institution.fr/idp/shibboleth
```

## Headers

+ **idp-to-abesid-source-field** : Fields in the ec for enrichment. "login" by default.
+ **idp-to-abesid-enriched-field** : Enriched fields in the CE. "abes-id" by default

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use idp-to-abesid for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: idp-to-abesid" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: idp-to-abesid" 

```

### curl

You can use idp-to-abesid for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: idp-to-abesid" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```