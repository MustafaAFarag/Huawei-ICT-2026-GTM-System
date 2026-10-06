import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  "universalIdentifier": "1b26adb5-ed93-5ab8-ad2f-79930e72d970",
  "nameSingular": "gtmEvidence",
  "namePlural": "gtmEvidenceRecords",
  "labelSingular": "Evidence",
  "labelPlural": "Evidence",
  "description": "GTM campaign review and preparation evidence",
  "icon": "IconClipboard",
  "fields": [
    {
      "universalIdentifier": "3d48fb40-f773-5c98-a0b7-e89e6853e8de",
      "name": "sourceUrl",
      "type": FieldType.TEXT,
      "label": "SourceUrl",
      "isNullable": true
    },
    {
      "universalIdentifier": "a842098e-d3d3-59e6-bc39-be946ce597fb",
      "name": "sourceDate",
      "type": FieldType.DATE_TIME,
      "label": "SourceDate",
      "isNullable": true
    },
    {
      "universalIdentifier": "4a869c0f-19d3-56fa-998a-6c2690a3207e",
      "name": "excerpt",
      "type": FieldType.TEXT,
      "label": "Excerpt",
      "isNullable": true
    },
    {
      "universalIdentifier": "f9e4168b-0e9c-5a23-a371-bdf38f40820e",
      "name": "origin",
      "type": FieldType.TEXT,
      "label": "Origin",
      "isNullable": true
    },
    {
      "universalIdentifier": "febf61ef-3c42-503f-b8b9-b9adad1cbed3",
      "name": "reviewDecision",
      "type": FieldType.TEXT,
      "label": "ReviewDecision",
      "isNullable": true
    },
    {
      "universalIdentifier": "d8f6bdd9-8ca6-5ab6-879e-9d4bde005d86",
      "name": "reviewer",
      "type": FieldType.TEXT,
      "label": "Reviewer",
      "isNullable": true
    },
    {
      "universalIdentifier": "bb0a0824-66d9-54ae-b6da-9ec0480d16cd",
      "name": "reviewedAt",
      "type": FieldType.DATE_TIME,
      "label": "ReviewedAt",
      "isNullable": true
    }
  ]
});
