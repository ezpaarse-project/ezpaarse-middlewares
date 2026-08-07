# filter

Filters irrelevant consultation events.

**This middleware is activated by default.**

## Prerequisites

**You must use filter at the begin.**

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: filter" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: filter" \

```

### curl

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: filter" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```