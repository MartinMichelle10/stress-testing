# CSV Test Data Generator Guide

A Node.js script that generates CSV test data files for JMeter stress testing by fetching random IDs from MSSQL and MongoDB databases.

## Prerequisites

- Node.js (v14 or higher)
- Access to MSSQL database
- Access to MongoDB database

## Installation

```bash
npm install
```

## Configuration

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
MONGO_URI=mongodb://username:password@host:port/database_name

# Tenant ID (fixed value for MongoDB queries)
TENANT_ID=your_tenant_id
```

## Usage

```bash
# Generate 10 rows per CSV (default)
node generate-csv-data.js

# Generate custom number of rows
node generate-csv-data.js 5       # 5 rows per CSV
node generate-csv-data.js 100     # 100 rows per CSV
node generate-csv-data.js 1000    # 1000 rows per CSV
```

## Output

CSV files are generated in timestamped folders:

```
output/
└── 2025-12-28_14-30-45/
    ├── correspondence/
    │   └── csv/
    │       ├── ReminderCorrespondence.csv
    │       ├── ArchivedCorrespondence.csv
    │       ├── BrowseCorrespondence.csv
    │       ├── CreateCorrespondence.csv
    │       ├── EditCorrespondence.csv
    │       └── ... (24 files)
    └── tasks/
        └── csv/
            ├── AddTaskFromCorrespondence.csv
            ├── BrowseTasks.csv
            ├── CloseTaskWithCC.csv
            ├── TransferTask.csv
            └── ... (23 files)
```

## Data Sources

### MSSQL Tables

| Field | Table | Description |
|-------|-------|-------------|
| userId, assigneeId, assigneeUserId, ccUserId, transferToUserId, creatorUserId | `[dbo].[Users]` | Random user IDs |
| assigneeUserId1, assigneeUserId2, assigneeUserId3, ccUserId1, ccUserId2, ccUserId3 | `[dbo].[Users]` | Multiple user IDs |
| assigneeUserIds | `[dbo].[Users]` | Pipe-separated user IDs (11 users) |
| taskId, taskId2, originalTaskId, observedTaskId, ccTaskId | `[dbo].[Tasks]` | Random task IDs |
| correspondenceId, correspondenceId2, correspondenceId3, linkedCorrespondenceId | `[dbo].[Correspondences]` | Random correspondence IDs |
| organizationId, contactOrganizationId | `[dbo].[ContactOrganizations]` | Random organization IDs |
| organizationName | `[dbo].[ContactOrganizations]` | Organization names |
| contactEmployeeId | `[dbo].[ContactEmployees]` | Random employee IDs |
| employeeName | `[dbo].[ContactEmployees]` | Employee names |
| entityId | `[dbo].[LkStructureEntity]` | Entity IDs |
| typeId, correspondenceTypeId | `[dbo].[LKCorrespondenceTypes]` | Correspondence type IDs |
| taskTypeId | `[dbo].[TaskType]` | Task type IDs |
| statusId | `[dbo].[LKStatuses]` | Status IDs |
| priorityId | `[dbo].[LKPriorities]` | Priority IDs |
| sourceId | `[dbo].[LKCorrespondenceSources]` | Source IDs |
| attachmentId, attachmentId2 | `[dbo].[Attachments]` | Attachment IDs |
| correspondencePropertyId | `[dbo].[CorrespondenceProperty]` | Property IDs |

### MongoDB Collections

| Field | Collection | Filter | Description |
|-------|------------|--------|-------------|
| accountId | `useraccounts` | `tenantId` | User account IDs |
| roleAccountId | `roles` | `tenantId` | Role account IDs |
| roleId | `roles` | `tenantId` | Role IDs |

### Environment Variables

| Field | Source | Description |
|-------|--------|-------------|
| tenantId | `TENANT_ID` env var | Fixed tenant ID |

### Generated Random Data

| Field | Type | Example |
|-------|------|---------|
| subject, subjectText | Text | "Urgent Request - 1735123456789" |
| comment, closeComment, replyComment | Text | "Please review and process" |
| reminderText | Text | "Follow up on this item" |
| externalReference | Text | "REF-12345" |
| reminderDate, dueDate, receivedDate, sentDate | Date | "2025-01-15" |
| createdAt, createdAtFrom, createdAtTo | Date | "2025-01-15" |
| assignedAtFrom, assignedAtTo | Date | "2025-01-15" |
| title | Text | "Task Title - 1735123456789" |
| propertyName | Text | "Property_42" |
| propertyValue | Text | "Value_123" |
| attachmentFilePath, filePath, uploadFilePath | Path | "C:/test-files/document.pdf" |
| attachmentMimeType, mimeType | MIME | "application/pdf" |
| attachmentKey, attachmentKey2, downloadKey | Key | "key_abc123" |
| assigneeDisplayName, creatorDisplayName | Name | "Ahmed Hassan" |
| firstName | Name | "Ahmed" |
| lastName | Name | "Hassan" |
| emailAddress | Email | "user123@example.com" |
| phoneNumber | Phone | "+11234567890" |
| username | Text | "user_123" |
| localeId | Fixed | "ar-EG" |
| pageIndex | Number | 0 |
| pageSize, listPageSize, attachmentPageSize | Number | 10 |
| maxPageSize | Number | 100 |
| sortDirection | Text | "ascending" or "descending" |
| desc, byref | Boolean | "true" or "false" |

## Example Output

**BrowseTasks.csv:**
```csv
taskId,correspondenceId,userId,assigneeId,taskId2,correspondenceId2,attachmentId
273292,76673,2350,4410,273209,185759,96491
273291,76674,2351,4411,273208,185760,96492
```

**AddTaskFromCorrespondence.csv:**
```csv
correspondenceId,assigneeUserId,correspondenceTypeId,typeId,priorityId,entityId,attachmentId,assigneeDisplayName,entityName,typeName,typeNameEn,accountId,username,tenantId,creatorDisplayName,firstName,lastName,emailAddress,userTitle,phoneNumber,localeId,roleAccountId,roleId,roleName,createdAt
76673,2350,1,2,3,100,96491,Ahmed Hassan,Entity 42,Type 1,Type 1,507f1f77bcf86cd799439011,user_123,37,Mohamed Ali,Ahmed,Hassan,user123@example.com,Mr.,+11234567890,ar-EG,507f1f77bcf86cd799439012,507f1f77bcf86cd799439013,Role 1,2025-01-15
```

## Troubleshooting

### MSSQL Connection Failed
- Verify `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`
- Ensure SQL Server allows remote connections
- Check firewall rules

### MongoDB Connection Failed
- Verify `MONGO_URI` format: `mongodb://user:password@host:port/database`
- Ensure MongoDB allows remote connections
- Check network connectivity

### Empty Data in CSV
- Verify tables have data in the database
- Check `TENANT_ID` matches existing records in MongoDB
- Review console output for specific table errors

## Files Generated

| Folder | Files | Purpose |
|--------|-------|---------|
| `correspondence/csv/` | 24 CSV files | Correspondence test data |
| `tasks/csv/` | 23 CSV files | Task test data |

Total: **47 CSV files** per run
