# merge-field

Merge the contents of two fields, separated by a delimiter, into another field

## Prerequisites

Your EC needs 2 fields that exist.

**You must use merge-field after filter, parser, deduplicator middleware.**

## Headers

+ **merge** : This header takes 4 parameters which are ``sourceField1``, ``separator``,``sourceField2`` and ``enrichedField``, e.g: ``sourceField1+separator+sourceField2=enrichedField``

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use merge-field for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash

# Use with split function

# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: merge-field" \
  --header "merge: container-name+-+unitid=entity" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: merge-field" \
  --header "merge: container-name+-+unitid=entity"
```

### curl

You can use merge-field for an enrichment process with curl like this:

```bash
# Use with split function
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: merge-field" \
  -H "merge: container-name+-+unitid=entit" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"
```