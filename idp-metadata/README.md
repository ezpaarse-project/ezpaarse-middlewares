# idp-metadata

Fetches Identity Providers (IDP) list from Renater, and enrich EC with the IDP label.

## Enriched fields

| Name | Type   | Description |
| --- |--------|-------------|
| libelle_idp | String | IDP Label   |

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use idp-metadata for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: idp-metadata"
  --header "Output-Fields: +libelle_idp"
  --out ./result.csv


# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> 
  --header "ezPAARSE-Middlewares: idp-metadata" 
  --header "Output-Fields: +libelle_idp"  
```

### curl

You can use idp-metadata for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: idp-metadata" \
  -H "Output-Fields: +libelle_idp"
-F "file=@<log file path>"
```
