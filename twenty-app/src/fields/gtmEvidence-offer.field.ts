import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '6e2476bd-e44a-51cc-8e19-ead6b4d765d5', objectUniversalIdentifier: '1b26adb5-ed93-5ab8-ad2f-79930e72d970',
  name: 'offer', label: 'offer', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'dd1195b3-b1d5-5bab-b820-262a19f707c8',
  relationTargetFieldMetadataUniversalIdentifier: 'ea0eff2c-7eed-59e3-b3de-bc9c24df8f44',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'offerId' }
});
