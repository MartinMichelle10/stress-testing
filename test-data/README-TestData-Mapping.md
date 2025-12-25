# JMeter Test Data - CSV Files Mapping

## Overview
This document maps each JMeter test scenario (.jmx) to its corresponding CSV test data file.

---

## Correspondence Scenarios

| JMX File | CSV File | Key Parameters |
|----------|----------|----------------|
| `browse-correspondence-.jmx` | `correspondence/BrowseCorrespondence.csv` | correspondenceId, organizationId, userId |
| `browse-correspondence-and-view-attachments.jmx` | `correspondence/BrowseCorrespondence.csv` | correspondenceId, organizationId, userId |
| `BROWSE-correspondence-data.jmx` | `correspondence/BrowseCorrespondence.csv` | correspondenceId, organizationId, userId |
| `Create-correspondence-with-attachments-and-linked-correspondence.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject, externalReference |
| `Create-correspondence-with-attachments-and-without-linked-correspondence.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject, externalReference |
| `Create-correspondence-without-attachments-and-linked-correspondence.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject, externalReference |
| `Create-inbound-correspondence-with-task-transfer.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject, externalReference |
| `Create-internal-correspondence-with-attachments-and-linked-correspondence.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject (typeId=3) |
| `Create-outbound-correspondence-with-attachments-and-without-linked-correspondence.jmx` | `correspondence/CreateCorrespondence.csv` | organizationId, contactEmployeeId, subject (typeId=2) |
| `Edit-correspondence-data.jmx` | `correspondence/EditCorrespondence.csv` | correspondenceId, organizationId, entityId, all IDs |
| `Edit-correspondence-attachments.jmx` | `correspondence/EditCorrespondence.csv` | correspondenceId, organizationId, userId |
| `Draft-correspondence-list.jmx` | `correspondence/DraftCorrespondence.csv` | correspondenceId, organizationId, userId |
| `Save-correspondence-as-draft.jmx` | `correspondence/DraftCorrespondence.csv` | correspondenceId, organizationId, entityId, userId |
| `complete-Draft-correspondence-.jmx` | `correspondence/DraftCorrespondence.csv` | correspondenceId, organizationId, userId |
| `Archived-list-of-the-correspondence.jmx` | `correspondence/ArchivedCorrespondence.csv` | correspondenceId, userId |
| `Add-reminder-correspondence-.jmx` | `correspondence/ReminderCorrespondence.csv` | correspondenceId, userId, reminderText |
| `print-correspondence-workflow.jmx` | `correspondence/PrintCorrespondence.csv` | correspondenceId, userId |
| `open-change-history-log-details-of-correspondence-.jmx` | `correspondence/ChangeHistoryCorrespondence.csv` | correspondenceId, userId |
| `View-document.jmx` | N/A (uses document keys) | documentKey (dynamic) |
| `Change-correspondence-filters.jmx` | N/A (no entity IDs) | Filter parameters only |
| `change-correspondence-sorting.jmx` | N/A (no entity IDs) | Sort parameters only |
| `Filter-by-all-correspondence-.jmx` | N/A (no entity IDs) | Pagination only |
| `Move-to-correspondence-tab-on-the-side-navbar.jmx` | N/A (no entity IDs) | Navigation only |

---

## Task Scenarios

| JMX File | CSV File | Key Parameters |
|----------|----------|----------------|
| `Brows-tasks.jmx` | `tasks/BrowseTasks.csv` | taskId, correspondenceId, userId |
| `Add-task-from-correspondence-.jmx` | `tasks/AddTaskFromCorrespondence.csv` | correspondenceId, assigneeUserId, comment |
| `close-task-with-attachments-and-CC.jmx` | `tasks/CloseTaskWithCC.csv` | taskId, correspondenceId, ccUserId |
| `close-task-with-attachments-and-without-CC.jmx` | `tasks/CloseTask.csv` | taskId, correspondenceId, closeComment |
| `close-task-without-attachments-and-CC.jmx` | `tasks/CloseTask.csv` | taskId, correspondenceId, closeComment |
| `CC-tasks-close.jmx` | `tasks/CCTasks.csv` | taskId, correspondenceId, originalTaskId |
| `tasks-one-transfer-without-CC.jmx` | `tasks/TransferTask.csv` | taskId, correspondenceId, transferToUserId |
| `tasks-seprate-transfer-plus-CC.jmx` | `tasks/TransferTask.csv` | taskId, correspondenceId, transferToUserId |
| `tasks-transfer-more-than-10-assignees.jmx` | `tasks/TransferTaskMultipleAssignees.csv` | taskId, assigneeUserIds (pipe-separated) |
| `tasks-reply-to-sender-without-CC.jmx` | `tasks/ReplyToSender.csv` | taskId, correspondenceId, replyComment |
| `follow-task.jmx` | `tasks/FollowTask.csv` | taskId, correspondenceId, userId |
| `Unfollow-task.jmx` | `tasks/FollowTask.csv` | taskId, correspondenceId, userId |
| `task-add-reminder.jmx` | `tasks/TaskReminder.csv` | taskId, reminderText, reminderDate |
| `tasks-attachment-tab.jmx` | `tasks/TaskAttachments.csv` | taskId, correspondenceId, attachmentId |
| `tasks-open-attachment-.jmx` | `tasks/TaskAttachments.csv` | taskId, correspondenceId, attachmentId |
| `tasks-electronic-correspondence-tab-.jmx` | `tasks/BrowseTasks.csv` | taskId, correspondenceId |
| `Create-outbound-correspondence-from-task.jmx` | `tasks/CreateOutboundFromTask.csv` | taskId, organizationId, subject |
| `Change-task-filter-to-all-tasks.jmx` | N/A (no entity IDs) | Filter parameters only |
| `Change-task-filter-to-cc.jmx` | N/A (no entity IDs) | Filter parameters only |
| `Change-task-filter-to-follow-up.jmx` | N/A (no entity IDs) | Filter parameters only |
| `Change-task-filter-to-my-closed-task.jmx` | N/A (no entity IDs) | Filter parameters only |
| `Change-task-filter-to-task-was-send-by-me.jmx` | N/A (no entity IDs) | Filter parameters only |
| `Change-task-filter-to-UNrEAD-task.jmx` | N/A (no entity IDs) | Filter parameters only |
| `change-sort-tasks.jmx` | N/A (no entity IDs) | Sort parameters only |

---

## CSV File Structure Summary

### Correspondence CSVs

#### BrowseCorrespondence.csv
```
correspondenceId,organizationId,contactEmployeeId,userId
```

#### CreateCorrespondence.csv
```
organizationId,contactEmployeeId,externalReference,subject,priorityId,typeId,sourceId,statusId,organizationName,employeeName
```

#### EditCorrespondence.csv
```
correspondenceId,organizationId,contactEmployeeId,entityId,userId,priorityId,typeId,sourceId,statusId,subject,externalReference,organizationName,employeeName,correspondencePropertyId
```

#### DraftCorrespondence.csv
```
correspondenceId,organizationId,contactEmployeeId,entityId,userId,typeId,subject,externalReference
```

#### ArchivedCorrespondence.csv
```
correspondenceId,organizationId,userId
```

#### ReminderCorrespondence.csv
```
correspondenceId,userId,reminderText,reminderDate
```

#### PrintCorrespondence.csv
```
correspondenceId,userId
```

#### ChangeHistoryCorrespondence.csv
```
correspondenceId,userId
```

---

### Task CSVs

#### BrowseTasks.csv
```
taskId,correspondenceId,userId,assigneeId
```

#### AddTaskFromCorrespondence.csv
```
correspondenceId,assigneeUserId,taskTypeId,comment,dueDate
```

#### CloseTask.csv
```
taskId,correspondenceId,userId,closeComment
```

#### CloseTaskWithCC.csv
```
taskId,correspondenceId,userId,ccUserId,closeComment
```

#### CCTasks.csv
```
taskId,correspondenceId,userId,originalTaskId
```

#### TransferTask.csv
```
taskId,correspondenceId,userId,transferToUserId,comment
```

#### TransferTaskMultipleAssignees.csv
```
taskId,correspondenceId,userId,assigneeUserIds
```
*Note: assigneeUserIds uses pipe (|) as separator for multiple IDs*

#### FollowTask.csv
```
taskId,correspondenceId,userId
```

#### TaskReminder.csv
```
taskId,correspondenceId,userId,reminderText,reminderDate
```

#### ReplyToSender.csv
```
taskId,correspondenceId,userId,replyComment
```

#### CreateOutboundFromTask.csv
```
taskId,correspondenceId,organizationId,contactEmployeeId,subject,externalReference
```

#### TaskAttachments.csv
```
taskId,correspondenceId,attachmentId,userId
```

---

## How to Use

### 1. Add CSV Data Set Config in JMeter
```xml
<CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="CSV Data Set Config">
  <stringProp name="filename">${DATA_DIR}/correspondence/EditCorrespondence.csv</stringProp>
  <stringProp name="variableNames">correspondenceId,organizationId,contactEmployeeId,entityId,userId,priorityId,typeId,sourceId,statusId,subject,externalReference,organizationName,employeeName,correspondencePropertyId</stringProp>
  <stringProp name="delimiter">,</stringProp>
  <boolProp name="ignoreFirstLine">true</boolProp>
  <boolProp name="recycle">true</boolProp>
</CSVDataSet>
```

### 2. Define DATA_DIR Variable
```xml
<elementProp name="DATA_DIR" elementType="Argument">
  <stringProp name="Argument.name">DATA_DIR</stringProp>
  <stringProp name="Argument.value">${__P(dataDir,d:/in3/jmeter/test-data)}</stringProp>
</elementProp>
```

### 3. Run with Different Data
```bash
# Using default data directory
jmeter -n -t cases/correspondence/Edit-correspondence-data.jmx

# Using custom data directory
jmeter -n -t cases/correspondence/Edit-correspondence-data.jmx -JdataDir=/path/to/custom/data
```

---

## Environment Configuration

For multi-environment support, create environment-specific CSV files:

```
test-data/
├── qa/
│   ├── correspondence/
│   └── tasks/
├── staging/
│   ├── correspondence/
│   └── tasks/
└── prod/
    ├── correspondence/
    └── tasks/
```

Then run with:
```bash
jmeter -n -t test.jmx -JdataDir=d:/in3/jmeter/test-data/staging
```
