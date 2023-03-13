@isTest
private class DataAvailable_Test {
  @isTest
  private static void assertNoAccountsAvailable() {
    Assert.areEqual(
      0,
      [SELECT id FROM account].size(),
      'Expects to find no account data'
    );
  }
}
