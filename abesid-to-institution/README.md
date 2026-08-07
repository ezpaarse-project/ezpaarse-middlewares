# abesid-to-institution

Add information about institution with abesID.

## Enriched fields

| Name | Type | Description |
| --- | --- | --- |
| institutionName | String | Name of institution. |

## Prerequisites

abesid-to-institution enrichment middleware needs abes-id.
You need to find the file Etablissement.csv on Inist Gitlab on Istex repo and put at the folder of this middleware.

**You must use abesid-to-institution after filter, parser, deduplicator middleware.**

## Example of structure of file

```
ID Etablissement;Siren;Nom Etablissement;Type de l'etablissement;Adresse de l'etablissement;Ville;Telephone contact;Nom et prenom contact;Adresse mail contact;IP validees
ID_ETAB_001;123456789;Etablissement A;Type A;1 Rue Exemple, 75000 Exempleville;Exempleville;0123456789;DUPONT Jean;jean.dupont@exemple.fr;192.168.1.1, 192.168.1.2, 192.168.1.3
```

## Headers

+ **abesid-to-institution-source-field** : Fields in the ec for enrichment. "abes-id" by default.
+ **abesid-to-institution-enriched-field** : Enriched field in the EC. "institution-name" by default.

## How to use

### ezPAARSE admin page

On the `/admin/middlewares` page, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezPAARSE process page

On the `/process` page, under the “2 Settings” tab, in the ‘Settings’ menu, you can choose to move the middleware from “Available Middleware” to “Active Middleware for Processing.”

### ezp

You can use abesid-to-institution for an enrichment process with [ezp](https://github.com/ezpaarse-project/node-ezpaarse) like this:

```bash
# enrich with one file
ezp process <path of your file> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: abesid-to-institution" \
  --out ./result.csv

# enrich with multiples files
ezp bulk <path of your directory> \
  --host <host of your ezPAARSE instance> \
  --settings <settings-id> \
  --header "ezPAARSE-Middlewares: abesid-to-institution" 

```

### curl

You can use abesid-to-institution for an enrichment process with curl like this:

```bash
curl -X POST -v http://localhost:59599 \
  -H "ezPAARSE-Middlewares: abesid-to-institution" \
  -H "Log-Format-Ezproxy: <line format>" \
  -F "file=@<log file path>"

```