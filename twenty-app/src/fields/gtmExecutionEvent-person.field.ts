import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'ce866d79-9d67-5c11-ba66-40535d47f52b', objectUniversalIdentifier: 'ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd',
  name: 'person', label: 'person', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: '22feeaf0-50b2-5791-a6cc-92c0b2ca6c4d',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'personId' }
});
