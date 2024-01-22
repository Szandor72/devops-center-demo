public without sharing class NewApexClass {
    
    public static void queryInLoop() {
        
        for (Integer i = 0; i < 201; i++) {
            
            List<Account> accounts = [select id from account];
        }
        
    }
}