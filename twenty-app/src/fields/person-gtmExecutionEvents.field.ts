import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '22feeaf0-50b2-5791-a6cc-92c0b2ca6c4d', objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'gtmExecutionEvents', label: 'gtmExecutionEvents', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd',
  relationTargetFieldMetadataUniversalIdentifier: 'ce866d79-9d67-5c11-ba66-40535d47f52b',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
