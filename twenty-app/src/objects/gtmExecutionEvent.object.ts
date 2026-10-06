import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  "universalIdentifier": "ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd",
  "nameSingular": "gtmExecutionEvent",
  "namePlural": "gtmExecutionEvents",
  "labelSingular": "Execution Event",
  "labelPlural": "Execution Events",
  "description": "GTM campaign review and preparation execution event",
  "icon": "IconClipboard",
  "fields": [
    {
      "universalIdentifier": "e88fe3cf-e663-5bc0-9903-195f06ad9eb7",
      "name": "eventKey",
      "type": FieldType.TEXT,
      "label": "EventKey",
      "isNullable": true
    },
    {
      "universalIdentifier": "c2f434ce-5f26-598d-a96a-9d3321725de8",
      "name": "provider",
      "type": FieldType.TEXT,
      "label": "Provider",
      "isNullable": true
    },
    {
      "universalIdentifier": "b5c41ac2-f1b3-58aa-9064-f61b71145002",
      "name": "externalIdentifier",
      "type": FieldType.TEXT,
      "label": "ExternalIdentifier",
      "isNullable": true
    },
    {
      "universalIdentifier": "27445379-a447-506e-beb9-fe39730bad61",
      "name": "eventKind",
      "type": FieldType.TEXT,
      "label": "EventKind",
      "isNullable": true
    },
    {
      "universalIdentifier": "990de60b-315b-5d36-aea4-1233eb202569",
      "name": "simulated",
      "type": FieldType.BOOLEAN,
      "label": "Simulated",
      "isNullable": true
    },
    {
      "universalIdentifier": "74602628-b655-50c5-a143-76228a3620ba",
      "name": "occurredAt",
      "type": FieldType.DATE_TIME,
      "label": "OccurredAt",
      "isNullable": true
    },
    {
      "universalIdentifier": "f4e458e5-e82f-5703-957b-68a1c734f088",
      "name": "copyVersion",
      "type": FieldType.NUMBER,
      "label": "CopyVersion",
      "isNullable": true
    }
  ]
});
