# abesid-to-etab

Add information about institution with abesID

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| siren | String | IDP. |
| institutionName | String | Name of institution. |
| institutionType | String | Type of institution. |
| institutionAddress | String | Postal address of institution. |
| institutionCity | String | City of institution. |
| institutionPhone | String | Phone of institution. |
| institutionContact | String | Contact of institution. |
| institutionEmail | String | Contact email of institution. |
| institutionIpRange | String | IP range of institution. |

## Prerequisites

abesid-to-etab enrichment middleware needs abes-id.

**You must use abesid-to-etab after filter, parser, deduplicator middleware.**

## Headers

+ **abesid-to-etab-source-field** : Fields in the ec for enrichment. "abes-id" by default.
+ **abesid-to-etab-enriched-fields** : Enriched fields in the CE.
```json
{
  "Siren": "siren",
  "Nom de l'etablissement": "institutionName",
  "Type de l'etablissement": "institutionType",
  "Adresse de l'etablissement": "institutionAddress",
  "Ville": "institutionCity",
  "Telephone contact": "institutionPhone",
  "Nom et prenom contact": "institutionContact",
  "Adresse mail contact": "institutionEmail",
  "IP validees": "institutionIpRange"
}
```
By default.
Example : "<Field in csv file>": "<Field in EC>"
Is not recommended to update field in csv file.

### Example

## How to use

### ezPAARSE admin interface

You can add abesid-to-etab by default to all your enrichments, To do this, go to the middleware section of administration.

![image](./docs/admin-interface.png)

### ezPAARSE process interface

You can use abesid-to-etab for an enrichment process. You just add the middleware.

![image](./docs/process-interface.png)

### ezp

You can use abesid-to-etab for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: abesid-to-etab" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: abesid-to-etab" 

```

### curl

You can use abesid-to-etab for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: abesid-to-etab" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```