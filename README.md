# Stress Testing - CSV Test Data Generator

A Node.js script that generates CSV test data by fetching random IDs from MSSQL database tables.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database Connections

Edit the `.env` file with your database credentials:

```env
# MSSQL Configuration
DB_SERVER=your_server_ip
DB_NAME=your_database_name
DB_USER=sa
DB_PASSWORD=your_password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=taaboraDB

# Tenant ID (fixed value for MongoDB queries)
TENANT_ID=your_tenant_id_here
```

### Data Sources

| Field | Source | Notes |
|-------|--------|-------|
| userId, assigneeId, ccUserId, etc. | MSSQL `[dbo].[User]` | Random user IDs |
| taskId, originalTaskId, etc. | MSSQL `[dbo].[Tasks]` | Random task IDs |
| correspondenceId | MSSQL `[dbo].[Correspondences]` | Random correspondence IDs |
| organizationId | MSSQL `[dbo].[ContactOrganizations]` | Random org IDs |
| tenantId | Environment variable `TENANT_ID` | Fixed value |
| accountId | MongoDB `useraccounts` | Filtered by tenantId |
| roleAccountId, roleId | MongoDB `roles` | Filtered by tenantId |

## Usage

### Generate CSV Files

```bash
# Generate 10 rows per CSV (default)
node generate-csv-data.js

# Generate specific number of rows
node generate-csv-data.js 5      # 5 rows per CSV
node generate-csv-data.js 100    # 100 rows per CSV
node generate-csv-data.js 1000   # 1000 rows per CSV
```

### Output

CSV files are generated in timestamped folders:

```
output/
└── 2025-12-25_14-30-45/
    ├── EditCorrespondenceTestData.csv
    ├── correspondence/
    │   ├── BrowseCorrespondence.csv
    │   ├── CreateCorrespondence.csv
    │   ├── EditCorrespondence.csv
    │   ├── DraftCorrespondence.csv
    │   ├── ArchivedCorrespondence.csv
    │   ├── ReminderCorrespondence.csv
    │   ├── PrintCorrespondence.csv
    │   └── ChangeHistoryCorrespondence.csv
    └── tasks/
        ├── BrowseTasks.csv
        ├── AddTaskFromCorrespondence.csv
        ├── CloseTask.csv
        ├── CloseTaskWithCC.csv
        ├── CCTasks.csv
        ├── TransferTask.csv
        ├── TransferTaskMultipleAssignees.csv
        ├── FollowTask.csv
        ├── TaskReminder.csv
        ├── ReplyToSender.csv
        ├── CreateOutboundFromTask.csv
        └── TaskAttachments.csv
```

## Data Sources

### Database Tables (Random IDs)

| CSV Key | Database Table |
|---------|----------------|
| userId, assigneeId, assigneeUserId, ccUserId, transferToUserId | [dbo].[User] |
| taskId, originalTaskId | [dbo].[Tasks] |
| organizationId, organizationName | [dbo].[ContactOrganizations] |
| contactEmployeeId, employeeName | [dbo].[ContactEmployees] |
| correspondenceId | [dbo].[Correspondences] |
| attachmentId | [dbo].[Attachments] |
| entityId | [dbo].[LkStructureEntity] |
| typeId | [dbo].[LKCorrespondenceTypes] |
| taskTypeId | [dbo].[TaskType] |
| statusId | [dbo].[LKStatuses] |
| priorityId | [dbo].[LKPriorities] |
| sourceId | [dbo].[LKCorrespondenceSources] |
| correspondencePropertyId | [dbo].[CorrespondenceProperty] |

### Generated Random Data

| CSV Key | Generated Value |
|---------|-----------------|
| subject | Random subject text + timestamp |
| comment, closeComment, replyComment | Random comment text |
| reminderText | Random reminder text |
| externalReference | REF-{random number} |
| reminderDate, dueDate | Random future date (1-30 days) |
| assigneeUserIds | Multiple user IDs separated by `\|` |

## Example Output

**BrowseTasks.csv:**
```csv
taskId,correspondenceId,userId,assigneeId
273292,76673,2350,4410
273291,76674,2351,4411
273209,185759,2352,4412
```

**TaskReminder.csv:**
```csv
taskId,correspondenceId,userId,reminderText,reminderDate
273292,76673,2350,Follow up on task progress,2025-12-28
273293,76674,2351,Review pending items,2025-12-29
```
