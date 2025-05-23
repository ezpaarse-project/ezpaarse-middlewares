# ip-to-abesid

Add ABES-ID based on IP.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| abes-id | String | ABES ID |

## Prerequisites

ip-to-abesid enrichment middleware needs ip in ec.

You need to find the file autorisation-abes.json on Inist Gitlab on Istex repo and put at the folder of this middleware.

**You must use ip-to-abesid after filter, parser, deduplicator middleware.**

## Headers

+ **ip-to-abesid-source-field** : Fields in the ec for enrichment. "ip" by default.
+ **ip-to-abesid-enriched-field** : Enriched fields in the EC. "abes-id" by default

### Example

## How to use

### ezPAARSE admin interface

You can add ip-to-abesid by default to all your enrichments, To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use ip-to-abesid for an enrichment process. You just add the middleware.

![image](./docs/process-interface.png)

### ezp

You can use ip-to-abesid for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: ip-to-abes" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: ip-to-abes" 

```

### curl

You can use ip-to-abesid for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: ip-to-abes" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```