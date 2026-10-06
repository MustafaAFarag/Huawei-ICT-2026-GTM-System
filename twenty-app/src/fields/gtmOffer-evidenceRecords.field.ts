import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'ea0eff2c-7eed-59e3-b3de-bc9c24df8f44', objectUniversalIdentifier: 'dd1195b3-b1d5-5bab-b820-262a19f707c8',
  name: 'evidenceRecords', label: 'evidenceRecords', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: '1b26adb5-ed93-5ab8-ad2f-79930e72d970',
  relationTargetFieldMetadataUniversalIdentifier: '6e2476bd-e44a-51cc-8e19-ead6b4d765d5',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
