import { defineField, FieldType, RelationType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'c3f5d581-81e1-5116-beec-abe56a9c7fbd', objectUniversalIdentifier: 'e72231ad-239c-548c-b360-63a6ae32d355',
  name: 'campaign', label: 'campaign', type: FieldType.RELATION,
  relationTargetObjectMetadataUniversalIdentifier: 'fd214dce-6c9e-58b3-9c03-0103bb802eff',
  relationTargetFieldMetadataUniversalIdentifier: '2aa888cd-801c-5311-98fa-97b6f4172bba',
  universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.SET_NULL, joinColumnName: 'campaignId' }
});
