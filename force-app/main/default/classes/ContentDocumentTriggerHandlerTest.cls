/**
 * @description Test class for ContentDocumentTriggerHandler
 */
@isTest
private class ContentDocumentTriggerHandlerTest {
    /**
     * @description Test method for handleLegacyCodeScanFileUploads
     */
    @isTest
    static void testHandleLegacyCodeScanFileUploads() {
        ContentVersion cv = new ContentVersion(
            Title = 'legacy-scan-results_AND_SOME_HASH.csv',
            PathOnClient = 'legacy-scan-results_AND_SOME_HASH.csv',
            VersionData = Blob.valueOf('Test Content')
        );
        insert cv;
        cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
        Map<Id, ContentDocument> newContentDocumentMap = new Map<Id, ContentDocument>{
            cv.ContentDocumentId => [
                SELECT Id, Title, FileExtension
                FROM ContentDocument
                WHERE Id = :cv.ContentDocumentId
            ]
        };

        Test.startTest();
        String unexpectedExceptionMessage = '';
        try {
            ContentDocumentTriggerHandler.notifyOnLegacyCodeScanFileUploads(newContentDocumentMap);
        } catch (Exception e) {
            unexpectedExceptionMessage = e.getMessage();
        }
        Assert.isTrue(
            String.isBlank(unexpectedExceptionMessage),
            'No Exception accepted. Code needs to exit gracefully all of the times. ' +
            unexpectedExceptionMessage
        );
        Test.stopTest();
    }
}
