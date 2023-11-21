public class CaseService {
    public void createCase() {
        Case c; // PMD: Avoid unused local variables
        insert c; // PMD: Avoid DML statements inside loops
    }

    public void updateCase() {
        for (Integer i = 0; i < 10; i++) {
            Case c = new Case(Subject = 'Test' + i);
            insert c; // PMD: Avoid DML statements inside loops
        }
    }

    public void deleteCase() {
        List<Case> cases = [SELECT Id FROM Case]; // PMD: Avoid SOQL queries inside loops
        for (Case c : cases) {
            delete c; // PMD: Avoid DML statements inside loops.
        }
    }
}
