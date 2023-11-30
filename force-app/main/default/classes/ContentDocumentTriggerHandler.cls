/**
 * @description Handles legacy metadata scan file uploads from GitHub
 */
public with sharing class ContentDocumentTriggerHandler {
    /**
     * @description sends a notification for legacy scan file uploads
     * @param newContentDocumentMap - received from trigger
     */
    @SuppressWarnings('PMD.ApexCRUDViolation')
    public static void notifyOnLegacyCodeScanFileUploads(
        Map<Id, ContentDocument> newContentDocumentMap
    ) {
        Boolean isBulkOperation = newContentDocumentMap.values().size() > 1;
        if (isBulkOperation) {
            return;
        }
        List<CustomNotificationType> notificationTypes = [
            SELECT Id, DeveloperName
            FROM CustomNotificationType
            WHERE DeveloperName = 'NewMetadataScanAvailable'
        ];
        if (notificationTypes.isEmpty()) {
            return;
        }
        CustomNotificationType notificationType = notificationTypes[0];
        for (
            ContentDocument matchingFile : filterContentDocuments(newContentDocumentMap.values())
        ) {
            Messaging.CustomNotification notification = new Messaging.CustomNotification();

            notification.setTitle('New Metadata Scan Available');
            notification.setBody(
                'Please review the scan and discuss necessary changes with the developer'
            );

            notification.setNotificationTypeId(notificationType.Id);
            notification.setTargetId(matchingFile.Id);

            // TODO identify targets for notification, i.e. public group's first level members?
            // uploading user should be a technical user
            try {
                notification.send(new Set<String>{ UserInfo.getUserId() });
            } catch (Exception e) {
                return;
            }
        }
    }

    /**
     * @description Filter ContentDocument sobjects by file extension and title
     * @param contentDocuments list of ContentDocument sobjects to filter
     * @return matchingContentDocuments
     */
    public static List<ContentDocument> filterContentDocuments(
        List<ContentDocument> contentDocuments
    ) {
        List<ContentDocument> matchingContentDocuments = new List<ContentDocument>();
        for (ContentDocument uploadedFile : contentDocuments) {
            if (
                uploadedFile.FileExtension == 'csv' &&
                String.isNotBlank(uploadedFile.Title) &&
                uploadedFile.Title.contains('legacy-scan-results')
            ) {
                matchingContentDocuments.add(uploadedFile);
            }
        }
        return matchingContentDocuments;
    }
}
