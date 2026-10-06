import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'a50e331b-7732-5b33-86e2-da771eaaa3f7', objectUniversalIdentifier: '1b26adb5-ed93-5ab8-ad2f-79930e72d970',
  name: 'person', label: 'person', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: '7d0d350a-ce5e-5c0d-ba3a-aba660c62b87',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'personId' }
});
