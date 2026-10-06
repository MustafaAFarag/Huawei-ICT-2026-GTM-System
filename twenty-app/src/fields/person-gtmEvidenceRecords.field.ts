import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '7d0d350a-ce5e-5c0d-ba3a-aba660c62b87', objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'gtmEvidenceRecords', label: 'gtmEvidenceRecords', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: '1b26adb5-ed93-5ab8-ad2f-79930e72d970',
  relationTargetFieldMetadataUniversalIdentifier: 'a50e331b-7732-5b33-86e2-da771eaaa3f7',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
