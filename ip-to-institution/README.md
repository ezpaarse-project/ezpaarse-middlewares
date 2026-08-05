# ip-to-institution

Add ABES-ID based on IP.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| abes-id | String | ABES ID |

## Prerequisites

ip-to-institution enrichment middleware needs ip in ec.

You need to find the file autorisation-abes.json on Inist Gitlab on Istex repo and put at the folder of this middleware.

**You must use ip-to-institution after filter, parser, deduplicator middleware.**

## Example of structure of file

```
{
  "ips": [
    {
			"ip": "127.0.0.1",
			"_comment": "Insititution 1"
		},
  ],
  "ipRanges": [
    {
			"from": "128.0.0.100",
			"to": "128.0.1.110",
			"_comment": "Institution 2"
		},
  ]
}
```

## Headers

+ **ip-to-institution-source-field** : Fields in the ec for enrichment. "ip" by default.
+ **ip-to-institution-enriched-field** : Enriched fields in the EC. "abes-id" by default
+ **ip-to-institution-institution-name-enrich** : Enrich with name of institution. Desactivated by default

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use ip-to-institution for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

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

You can use ip-to-institution for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: ip-to-abes" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```