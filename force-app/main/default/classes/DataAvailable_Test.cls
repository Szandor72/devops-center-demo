@isTest
private class DataAvailable_Test {

    @isTest
    private static void assertNoAccountsAvailable() {
        Assert.areEqual(1, [select id from account].size(), 'Deliberately failing test');
    }
}