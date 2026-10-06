import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '35e78a41-2539-5246-84c2-412e27c1f267', objectUniversalIdentifier: 'fd214dce-6c9e-58b3-9c03-0103bb802eff',
  name: 'executionEvents', label: 'executionEvents', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd',
  relationTargetFieldMetadataUniversalIdentifier: '69cd4d35-ef67-5369-8df0-838dc59c2524',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
