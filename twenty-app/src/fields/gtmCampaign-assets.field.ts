import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '2aa888cd-801c-5311-98fa-97b6f4172bba', objectUniversalIdentifier: 'fd214dce-6c9e-58b3-9c03-0103bb802eff',
  name: 'assets', label: 'assets', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'e72231ad-239c-548c-b360-63a6ae32d355',
  relationTargetFieldMetadataUniversalIdentifier: 'c3f5d581-81e1-5116-beec-abe56a9c7fbd',
  universalSettings: { relationType: RelationType.ONE_TO_MANY }
});
