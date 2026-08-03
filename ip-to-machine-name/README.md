# ip-to-machine-name

Add machineName with ip.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| machienName | String | Name of machine. |

## Prerequisites

ip-to-machine-name enrichment middleware needs ip.
You need to find the file inist-ip.json.

**You must use ip-to-machine-name after filter, parser, deduplicator middleware.**

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

+ **ip-to-machine-name-source-field** : Fields in the ec for enrichment. "ip" by default.
+ **ip-to-machine-name-enriched-field** : Enriched field in the EC. "institution-name" by default.

## How to use

### ezPAARSE admin interface

You can add ip-to-machine-name by default to all your enrichments, To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use ip-to-machine-name for an enrichment process. You just add the middleware.

![image](./docs/process-interface.png)

### ezp

You can use ip-to-machine-name for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: ip-to-machine-name" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: ip-to-machine-name" 

```

### curl

You can use ip-to-machine-name for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: ip-to-machine-name" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```