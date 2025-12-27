# JMeter Test Cases Documentation

This document lists all JMX test files and their required CSV data files.

## Correspondence Test Cases

| JMX File | CSV File | Required Variables |
|----------|----------|-------------------|
| Add-reminder-correspondence-.jmx | ReminderCorrespondence.csv | correspondenceId, userId, reminderText, reminderDate |
| Archived-list-of-the-correspondence.jmx | ArchivedCorrespondence.csv | correspondenceId, organizationId, userId |
| browse-correspondence-.jmx | BrowseCorrespondence.csv | correspondenceId, organizationId, contactEmployeeId, userId |
| browse-correspondence-and-view-attachments.jmx | BrowseCorrespondenceAttachments.csv | correspondenceId, correspondenceId2, correspondenceId3, organizationId, contactEmployeeId, userId, attachmentKey |
| BROWSE-correspondence-data.jmx | BrowseCorrespondenceData.csv | correspondenceId, organizationId, contactEmployeeId, userId |
| Change-correspondence-filters.jmx | correspondence-parameters.csv | pageIndex, pageSize, desc, cti, byref |
| change-correspondence-sorting.jmx | CorrespondenceSorting.csv | userId, cti, pageSize |
| complete-Draft-correspondence-.jmx | DraftCorrespondence.csv | correspondenceId, organizationId, contactEmployeeId, entityId, userId, typeId, subject, externalReference, priorityId, sourceId, statusId, correspondencePropertyId, propertyName, propertyValue, filePath, mimeType |
| Create-correspondence-with-attachments-and-linked-correspondence.jmx | CreateCorrespondenceAttachments.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName, userId, linkedCorrespondenceId |
| Create-correspondence-with-attachments-and-without-linked-correspondence.jmx | CreateCorrespondence.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName, entityId, subjectNames, attachmentFilePath, attachmentMimeType, correspondencePropertyId, propertyName, propertyValue |
| Create-correspondence-without-attachments-and-linked-correspondence.jmx | CreateCorrespondence.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName |
| Create-inbound-correspondence-with-task-transfer.jmx | CreateCorrespondenceTaskTransfer.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName, assigneeUserId, taskTypeId, entityId, correspondencePropertyId |
| Create-internal-correspondence-with-attachments-and-linked-correspondence.jmx | CreateCorrespondence.csv + InternalCorrespondenceData.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName, entityId, linkedCorrespondenceId1, linkedCorrespondenceId2, correspondencePropertyId, propertyValue, subjectNames, attachmentFilePath, attachmentMimeType |
| Create-outbound-correspondence-with-attachments-and-without-linked-correspondence.jmx | CreateOutboundCorrespondence.csv | organizationId, contactEmployeeId, externalReference, subject, priorityId, typeId, sourceId, statusId, organizationName, employeeName, userId, linkedCorrespondenceId |
| Draft-correspondence-list.jmx | DraftCorrespondenceList.csv | correspondenceId, organizationId, contactEmployeeId, entityId, userId, typeId, subject, externalReference, pageIndex, listPageSize, attachmentPageSize |
| Edit-correspondence-attachments.jmx | EditCorrespondenceAttachments.csv | correspondenceId, organizationId, contactEmployeeId, entityId, userId, priorityId, typeId, sourceId, statusId, subject, externalReference, subjectNames, correspondencePropertyId, propertyValue, pageIndex, listPageSize, attachmentPageSize, maxPageSize, attachmentFilePath, attachmentMimeType |
| Edit-correspondence-data.jmx | EditCorrespondence.csv | correspondenceId, organizationId, contactEmployeeId, entityId, userId, priorityId, typeId, sourceId, statusId, subject, externalReference, organizationName, employeeName, correspondencePropertyId, dueDate, receivedDate, sentDate, subjectNames, attachmentFile |
| Filter-by-all-correspondence-.jmx | FilterCorrespondenceData.csv | pageIndex, pageSize, desc, correspondenceTypeId, statusId, priorityId, sourceId, searchText |
| Move-to-correspondence-tab-on-the-side-navbar.jmx | MoveToCorrespondenceTab.csv | typeId, pageIndex, listPageSize, maxPageSize |
| open-change-history-log-details-of-correspondence-.jmx | ChangeHistoryCorrespondenceData.csv | correspondenceId, userId, desc, pageIndex, pageSize |
| print-correspondence-workflow.jmx | PrintCorrespondence.csv | correspondenceId, userId |
| Save-correspondence-as-draft.jmx | DraftCorrespondenceData.csv | correspondenceId, correspondencePropertyId, propertyValue, contactOrganizationId, contactEmployeeId, entityId, userId, typeId, priorityId, sourceId, statusId, pageIndex, pageSize, listPageSize, attachmentPageSize, sortBy, sortDirection, desc, organizationName |
| View-document.jmx | ViewDocument.csv | correspondenceId, userId, attachmentKey, attachmentKey2 |

---

## Tasks Test Cases

| JMX File | CSV File | Required Variables |
|----------|----------|-------------------|
| Add-task-from-correspondence-.jmx | AddTaskFromCorrespondence.csv | correspondenceId, assigneeUserId, correspondenceTypeId, typeId, priorityId, entityId, attachmentId, assigneeDisplayName, entityName, typeName, typeNameEn, accountId, username, tenantId, creatorDisplayName, firstName, lastName, emailAddress, userTitle, phoneNumber, localeId, roleAccountId, roleId, roleName, createdAt |
| Brows-tasks.jmx | BrowseTasks.csv | taskId, correspondenceId, userId, assigneeId, taskId2, correspondenceId2, attachmentId |
| CC-tasks-close.jmx | CCTasksClose.csv | taskId, correspondenceId, userId, originalTaskId, observedTaskId, ccTaskId, creatorUserId, assigneeUserId |
| Change-task-filter-to-all-tasks.jmx | ChangeTaskFilterToAllTasks.csv | taskId, correspondenceId, attachmentId, pageIndex, pageSize, sortDirection |
| Change-task-filter-to-cc.jmx | task_parameters.csv | taskId, pageIndex, pageSize, sortDirection, createdAtFrom, createdAtTo, assignedAtFrom, assignedAtTo, filePath, mimeType |
| Change-task-filter-to-follow-up.jmx | follow_up_parameters.csv | taskId, pageIndex, pageSize, sortDirection, createdAtFrom, createdAtTo, assignedAtFrom, assignedAtTo, filePath, mimeType |
| Change-task-filter-to-my-closed-task.jmx | ChangeTaskFilterMyClosedTask.csv | taskId, correspondenceId, attachmentId |
| Change-task-filter-to-task-was-send-by-me.jmx | ChangeTaskFilterToTaskWasSendByMe.csv | taskId, correspondenceId, attachmentId, pageIndex, pageSize, sortDirection |
| Change-task-filter-to-UNrEAD-task.jmx | unread_task_parameters.csv | taskId, pageIndex, pageSize, sortDirection, createdAtFrom, createdAtTo, assignedAtFrom, assignedAtTo, filePath, mimeType |
| change-sort-tasks.jmx | ChangeSortTasks.csv | pageIndex, pageSize, sortDirection |
| close-task-with-attachments-and-CC.jmx | CloseTaskWithCC.csv | taskId, correspondenceId, userId, ccUserId, closeComment, pageIndex, pageSize, sortDirection, assigneeUserId1, assigneeUserId2, assigneeUserId3, uploadFilePath |
| close-task-with-attachments-and-without-CC.jmx | CloseTaskWithAttachments.csv | taskId, correspondenceId, closeComment, pageIndex, pageSize, sortDirection |
| close-task-without-attachments-and-CC.jmx | CloseTaskWithoutAttachmentsAndCC.csv | taskId, correspondenceId, userId, closeComment |
| Create-outbound-correspondence-from-task.jmx | CreateOutboundFromTask.csv | taskId, sourceCorrespondenceId, newCorrespondenceId, organizationId, contactEmployeeId, entityId, subject |
| follow-task.jmx | FollowTask.csv | taskId, correspondenceId, userId, pageIndex, pageSize, sortDirection |
| task-add-reminder.jmx | TaskReminder.csv | taskId, correspondenceId, userId, reminderText, reminderDate |
| tasks-attachment-tab.jmx | TaskAttachments.csv | taskId, correspondenceId, attachmentId, attachmentId2, downloadKey, userId, pageIndex, pageSize, sortDirection |
| tasks-electronic-correspondence-tab-.jmx | BrowseTasks.csv | taskId, correspondenceId, userId, assigneeId |
| tasks-one-transfer-without-CC.jmx | TransferTask.csv | taskId, correspondenceId, attachmentId, correspondenceTypeId, priorityId, typeId, assigneeUserId1, assigneeUserId2, assigneeUserId3, title, comment |
| tasks-open-attachment-.jmx | TaskAttachments.csv | taskId, correspondenceId, attachmentId, userId |
| tasks-reply-to-sender-without-CC.jmx | ReplyToSender.csv | taskId, correspondenceId, userId, replyComment |
| tasks-seprate-transfer-plus-CC.jmx | TransferTaskWithCC.csv | taskId, correspondenceId, attachmentId, correspondenceTypeId, priorityId, typeId, assigneeUserId1, assigneeUserId2, assigneeUserId3, ccUserId1, ccUserId2, ccUserId3, title, comment |
| tasks-transfer-more-than-10-assignees.jmx | TransferTaskMultipleAssignees.csv | taskId, correspondenceId, userId, assigneeUserIds |
| Unfollow-task.jmx | UnfollowTask.csv | taskId, correspondenceId, userId |

---

## Usage

### Running a Test

```bash
jmeter -n -t correspondence/browse-correspondence-.jmx -JdataDir=./csv -JbaseUrl=qa-env.eastus2.cloudapp.azure.com
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-JdataDir` | Path to CSV data directory | `csv` |
| `-JbaseUrl` | Base URL for API calls | `qa-env.eastus2.cloudapp.azure.com` |

### CSV File Locations

- Correspondence CSVs: `correspondence/csv/`
- Task CSVs: `tasks/csv/`

### Common Required Files

All tests require `UserTokens.csv` with authentication tokens:
```
token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Generate Test Data

Use the CSV generator script to create test data from the database:

```bash
# Generate 10 rows per CSV (default)
node generate-csv-data.js

# Generate custom number of rows
node generate-csv-data.js 100
```

Output is saved to `output/YYYY-MM-DD_HH-MM-SS/` folder.
