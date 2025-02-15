public class MakePMDFail {
	public void doBadStuff() {
        // 1) Unused local variable
        String unusedVar = 'I am never used';
        
        // 2) Hard-coded ID
        Id recordId = Id.valueOf('006D0000008XYZ9');
        
        // 3) Avoid SOQL in loops
        for (Integer i = 0; i < 2; i++) {
            List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 1];
            System.debug('Queried accounts: ' + accounts);
        }
        
        // 4) Tautological condition
        if (1 == 1) {
            System.debug('This condition is always true.');
        }
        
        // 5) Empty catch block
        try {
            // Some risky operation
            Integer x = 5 / 0;
        } catch (Exception e) {
            // Violates "EmptyCatchBlock" rule
        }
    }
}