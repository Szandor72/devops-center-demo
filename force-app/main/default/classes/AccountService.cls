// demo class with lots of issues
public without sharing class AccountService {
    
    public static void queryInLoop() {
        
        for (Integer i = 0; i < 201; i++) {
            
            List<Account> accounts = [select id from account];
        }
        
    }
}