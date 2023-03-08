public with sharing class DemoClass {
  public static List<sObject> getObjectPerms() {
    return [
      SELECT
        sObjectType,
        PermissionsCreate,
        PermissionsRead,
        PermissionsEdit,
        PermissionsDelete,
        PermissionsModifyAllRecords,
        PermissionsViewAllRecords
      FROM ObjectPermissions
      WHERE
        ParentId IN (
          SELECT Id
          FROM PermissionSet
          WHERE PermissionSet.Profile.Name = 'System Administrator'
        )
      WITH SECURITY_ENFORCED
    ];
  }
}
