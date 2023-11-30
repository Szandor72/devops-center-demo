trigger ContentDocumentTrigger on ContentDocument(after insert) {
    ContentDocumentTRiggerHandler.notifyOnLegacyCodeScanFileUploads(Trigger.newMap);
}
