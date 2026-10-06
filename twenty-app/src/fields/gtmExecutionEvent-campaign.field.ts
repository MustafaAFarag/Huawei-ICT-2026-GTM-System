import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '69cd4d35-ef67-5369-8df0-838dc59c2524', objectUniversalIdentifier: 'ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd',
  name: 'campaign', label: 'campaign', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'fd214dce-6c9e-58b3-9c03-0103bb802eff',
  relationTargetFieldMetadataUniversalIdentifier: '35e78a41-2539-5246-84c2-412e27c1f267',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'campaignId' }
});
