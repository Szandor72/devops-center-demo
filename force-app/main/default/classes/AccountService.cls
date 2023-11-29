/**
 * AccountService Class
 * Provides various services related to Account object
 */
public class AccountService {
    /**
     * Fetches details for a given account
     * @param accountId The ID of the account
     * @return Account The details of the account
     */
    public Account getAccDetails(Id accountId) {
        // SOQL query inside a loop - bad practice
        for (Id accId : new List<Id>{ accountId }) {
            Account acc = [SELECT Id, Name, Industry FROM Account WHERE Id = :accId];
            return acc;
        }
        return null;
    }

    // This method lacks ApexDocs
    public void UpdateAccount(List<Account> accounts) {
        // DML operation inside a loop - bad practice
        for (Account acc : accounts) {
            acc.Name += ' - Updated';
            update acc; // This should be done in bulk outside the loop
        }
    }

    /**
     * Deletes a specified account
     * @param accountId The ID of the account to be deleted
     */
    public void delete_Account(Id accountId) {
        // Hardcoding IDs - bad practice
        Id hardCodedId = '001xx000003DGAXAA4';
        delete [SELECT Id FROM Account WHERE Id = :hardCodedId];
    }

    // This method lacks ApexDocs
    public List<Account> ListAccounts() {
        // Not using bulkified approach - bad practice
        List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 1];
        return accounts;
    }

    /**
     * Calculates the annual revenue
     * - This ApexDoc is incomplete and lacks parameter description
     * @return Decimal The calculated annual revenue
     */
    public Decimal CalculateAnnualRevenue() {
        // Lack of null checks and exception handling - bad practice
        Account acc = [SELECT Industry FROM Account WHERE Id = '001xx000003DGAZAA4'];
        return acc.Industry;
    }
}
