import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  "universalIdentifier": "fd214dce-6c9e-58b3-9c03-0103bb802eff",
  "nameSingular": "gtmCampaign",
  "namePlural": "gtmCampaigns",
  "labelSingular": "Campaign",
  "labelPlural": "Campaigns",
  "description": "GTM campaign review and preparation campaign",
  "icon": "IconClipboard",
  "fields": [
    {
      "universalIdentifier": "e329726d-b707-5c4b-b88d-9722dc9ee2ba",
      "name": "version",
      "type": FieldType.NUMBER,
      "label": "Version",
      "isNullable": true
    },
    {
      "universalIdentifier": "1e6e01cf-881c-5fce-a85d-a10178c48242",
      "name": "senderReady",
      "type": FieldType.BOOLEAN,
      "label": "SenderReady",
      "isNullable": true
    },
    {
      "universalIdentifier": "9f3aa6ef-8e8e-5a48-abf3-b64c2e842c11",
      "name": "senderReason",
      "type": FieldType.TEXT,
      "label": "SenderReason",
      "isNullable": true
    },
    {
      "universalIdentifier": "92b4ccdd-043f-5283-962b-8b9160aca003",
      "name": "approvedCopy",
      "type": FieldType.RAW_JSON,
      "label": "ApprovedCopy",
      "isNullable": true
    },
    {
      "universalIdentifier": "6ca570c1-7883-57d4-bcd3-841b4bcb1a08",
      "name": "sourceRows",
      "type": FieldType.RAW_JSON,
      "label": "SourceRows",
      "isNullable": true
    }
  ]
});
