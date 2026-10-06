import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'd4097185-dbbc-5c2d-a3d6-f83e4ee2e41b', objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'gtmEvidenceRecords', label: 'gtmEvidenceRecords', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: '1b26adb5-ed93-5ab8-ad2f-79930e72d970',
  relationTargetFieldMetadataUniversalIdentifier: '920c75e3-d7d1-5481-8256-b1f0ff7114b7',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
