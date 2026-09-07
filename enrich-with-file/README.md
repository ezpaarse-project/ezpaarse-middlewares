# enrich-with-file

Enrich the EC with fields coming from local JSON files, based on a per-request configuration.

## Enriched fields

Enriched fields are **dynamic**: they depend on the `enrichedFields` property provided in the `enrich-with-file-config` header, for each configuration entry.

| Name | Type | Description |
| --- | --- | --- |
| *(dynamic)* | String | Any field listed in `enrichedFields`, copied from the matching record in the configured file |

## Prerequisites

enrich-with-file-config middleware needs the field defined in `sourceField` (see below) to be present in the ec.

The referenced files (e.g. `file1.json`) must be present in the `data` folder of this middleware.

## Example of structure of file

```json
[
  {
    "webserviceRequest": "affiliations-tools-/v1/addresses/parse",
    "webService": "addressSplit",
    "traitement": "Prétraitement"
  }
]
```

## Headers

+ **enrich-with-file-config**: JSON array describing one or more enrichment configurations. Required.

Each entry of the array accepts the following properties:

+ **filename**: Name of the JSON file to read, located in the `data` folder of this middleware.
+ **sourceField**: Field in the ec used to match a record in the file. The middleware looks for a record in the file whose value for this same field equals `ec[sourceField]`.
+ **enrichedFields**: Comma-separated list of fields to copy from the matching record into the ec (e.g. `"webService, traitement"`).

### Example of header

```json
[
  {
    "filename": "file1.json",
    "sourceField": "webserviceRequest",
    "enrichedFields": "webService, traitement"
  }
]
```

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use enrich-with-file for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: enrich-with-file" \
  --header 'enrich-with-file-config: [{"filename":"file1.json","sourceField":"webserviceRequest","enrichedFields":"webService, traitement"}]' \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: enrich-with-file" \
  --header 'enrich-with-file-config: [{"filename":"file1.json","sourceField":"webserviceRequest","enrichedFields":"webService, traitement"}]'

```

### curl

You can use enrich-with-file for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: enrich-with-file" \
  -H 'enrich-with-file-config: [{"filename":"file1.json","sourceField":"webserviceRequest","enrichedFields":"webService, traitement"}]' \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```