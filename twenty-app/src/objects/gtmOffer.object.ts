import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  "universalIdentifier": "dd1195b3-b1d5-5bab-b820-262a19f707c8",
  "nameSingular": "gtmOffer",
  "namePlural": "gtmOffers",
  "labelSingular": "Offer",
  "labelPlural": "Offers",
  "description": "GTM campaign review and preparation offer",
  "icon": "IconClipboard",
  "fields": [
    {
      "universalIdentifier": "cf58fea8-fba9-5b24-a683-9cdf0dbaa4ca",
      "name": "description",
      "type": FieldType.TEXT,
      "label": "Description",
      "isNullable": true
    },
    {
      "universalIdentifier": "d240d560-0eb7-5844-80e5-6db5f873889c",
      "name": "approvedClaims",
      "type": FieldType.RAW_JSON,
      "label": "ApprovedClaims",
      "isNullable": true
    },
    {
      "universalIdentifier": "6de10978-9a94-5796-b5bb-3accccb9d074",
      "name": "rankingTerms",
      "type": FieldType.RAW_JSON,
      "label": "RankingTerms",
      "isNullable": true
    },
    {
      "universalIdentifier": "00c62840-280c-5f17-9bff-a71e2f7fb71c",
      "name": "version",
      "type": FieldType.NUMBER,
      "label": "Version",
      "isNullable": true
    }
  ]
});
