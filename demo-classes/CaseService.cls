/*
 * @description service related updates
 */
public with sharing class CaseService {
  public static void doUpdates(Set<Id> caseIds) {
    List<Case> cases = [SELECT Id, Status FROM Case WHERE Id IN :caseIds];
    for (Case c : cases) {
      c.Status = 'Closed';
      // raise pmd error
      update c;
    }
  }
}
