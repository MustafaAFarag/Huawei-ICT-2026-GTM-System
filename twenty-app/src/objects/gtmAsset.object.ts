import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  "universalIdentifier": "e72231ad-239c-548c-b360-63a6ae32d355",
  "nameSingular": "gtmAsset",
  "namePlural": "gtmAssets",
  "labelSingular": "Asset",
  "labelPlural": "Assets",
  "description": "GTM campaign review and preparation asset",
  "icon": "IconClipboard",
  "fields": [
    {
      "universalIdentifier": "6c461484-9545-53e9-b209-3acec8e037f9",
      "name": "kind",
      "type": FieldType.TEXT,
      "label": "Kind",
      "isNullable": true
    },
    {
      "universalIdentifier": "9afe24af-c141-57b0-9167-e321a9a768f7",
      "name": "language",
      "type": FieldType.TEXT,
      "label": "Language",
      "isNullable": true
    },
    {
      "universalIdentifier": "f18e831c-7e49-503f-807a-d57a9f68db64",
      "name": "snapshot",
      "type": FieldType.RAW_JSON,
      "label": "Snapshot",
      "isNullable": true
    },
    {
      "universalIdentifier": "67163f58-0c14-54dc-b6d0-3fc62d3b3f3c",
      "name": "editableHtml",
      "type": FieldType.TEXT,
      "label": "EditableHtml",
      "isNullable": true
    },
    {
      "universalIdentifier": "8f4f412c-f704-5428-9a0a-bb2effac54dc",
      "name": "campaignVersion",
      "type": FieldType.NUMBER,
      "label": "CampaignVersion",
      "isNullable": true
    }
  ]
});
