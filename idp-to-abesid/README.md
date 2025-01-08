# idp-to-abesid

Add ABES ID based on IDP.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| abes-id | String | ABES ID. |

### Example

## How to use

### ezPAARSE admin interface

You can add idp-to-abesid by default to all your enrichments, To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use idp-to-abesid for an enrichment process. You just add the middleware.

![image](./docs/process-interface.png)

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