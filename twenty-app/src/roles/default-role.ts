import { defineApplicationRole } from 'twenty-sdk/define';
export default defineApplicationRole({
  "universalIdentifier": "c02ddd51-8204-511b-85b4-e3e161116131",
  "label": "Campaign application",
  "description": "Campaign objects only; no settings or destructive record access.",
  "canReadAllObjectRecords": false,
  "canUpdateAllObjectRecords": false,
  "canSoftDeleteAllObjectRecords": false,
  "canDestroyAllObjectRecords": false,
  "canUpdateAllSettings": false,
  "canBeAssignedToAgents": false,
  "canBeAssignedToUsers": false,
  "canBeAssignedToApiKeys": false,
  "objectPermissions": [
    {
      "objectUniversalIdentifier": "dd1195b3-b1d5-5bab-b820-262a19f707c8",
      "canReadObjectRecords": true,
      "canUpdateObjectRecords": true,
      "canSoftDeleteObjectRecords": false,
      "canDestroyObjectRecords": false
    },
    {
      "objectUniversalIdentifier": "1b26adb5-ed93-5ab8-ad2f-79930e72d970",
      "canReadObjectRecords": true,
      "canUpdateObjectRecords": true,
      "canSoftDeleteObjectRecords": false,
      "canDestroyObjectRecords": false
    },
    {
      "objectUniversalIdentifier": "fd214dce-6c9e-58b3-9c03-0103bb802eff",
      "canReadObjectRecords": true,
      "canUpdateObjectRecords": true,
      "canSoftDeleteObjectRecords": false,
      "canDestroyObjectRecords": false
    },
    {
      "objectUniversalIdentifier": "e72231ad-239c-548c-b360-63a6ae32d355",
      "canReadObjectRecords": true,
      "canUpdateObjectRecords": true,
      "canSoftDeleteObjectRecords": false,
      "canDestroyObjectRecords": false
    },
    {
      "objectUniversalIdentifier": "ba5f223d-f833-58a0-aa1a-e41f2cb6c7dd",
      "canReadObjectRecords": true,
      "canUpdateObjectRecords": true,
      "canSoftDeleteObjectRecords": false,
      "canDestroyObjectRecords": false
    }
  ],
  "fieldPermissions": [],
  "permissionFlagUniversalIdentifiers": []
});
