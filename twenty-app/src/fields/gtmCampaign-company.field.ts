import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '7c9175b5-60f1-5904-a796-71bc4cb18396', objectUniversalIdentifier: 'fd214dce-6c9e-58b3-9c03-0103bb802eff',
  name: 'company', label: 'company', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: '40021b18-1f3c-5995-8918-d6ef935ac5f4',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'companyId' }
});
