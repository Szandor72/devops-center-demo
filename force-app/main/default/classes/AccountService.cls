public class AccountService {
    public void createAccount() {
        Account a; // PMD: Avoid unused local variables
        insert a; // PMD: Avoid DML statements inside loops
    }

    public void updateAccount() {
        for (Integer i = 0; i < 10; i++) {
            Account a = new Account(Name = 'Test' + i);
            insert a; // PMD: Avoid DML statements inside loops
        }
    }

    public void deleteAccount() {
        List<Account> accounts = [SELECT Id FROM Account]; // PMD: Avoid SOQL queries inside loops
        for (Account a : accounts) {
            delete a; // PMD: Avoid DML statements inside loops.
        }
    }
}
