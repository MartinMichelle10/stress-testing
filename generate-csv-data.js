require('dotenv').config();
const sql = require('mssql');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { URLSearchParams } = require('url');

// Get row count from command line argument or default to 10
const ROW_COUNT = parseInt(process.argv[2]) || 10;
console.log(`Will generate ${ROW_COUNT} row(s) per CSV file\n`);

// Database configuration - MSSQL
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

// MongoDB configuration
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/taaboraDB';

// API configuration
const BASE_URL = process.env.BASE_URL || 'https://staging.tarasolcms.com';
const USERS_FILE = process.env.USERS_FILE || 'users.json';
const USER_PASSWORD = process.env.FINAL_PASSWORD || 'P@ssw0rd';

// Fixed tenant ID from environment
const TENANT_ID = process.env.TENANT_ID;

// Will be populated from users.json at runtime
let loadedUsers = [];

// Permitted IDs per user (loaded at runtime) - keyed by userId
const permittedCorrespondencesMap = new Map();
const permittedTasksMap = new Map();

// Authentication and user loading functions
async function loadUsersFromFile() {
    const usersFilePath = path.resolve(USERS_FILE);
    if (!fs.existsSync(usersFilePath)) {
        throw new Error(`Users file not found: ${usersFilePath}`);
    }

    const fileContent = fs.readFileSync(usersFilePath, 'utf8');
    const usersData = JSON.parse(fileContent);

    if (!usersData.users || !Array.isArray(usersData.users)) {
        throw new Error("Invalid users.json format. Expected 'users' array.");
    }

    return usersData.users.filter(u => u.username && u.success !== false);
}

async function authenticateUser(username, password) {
    const params = new URLSearchParams();
    params.append('grant_type', 'username:password');
    params.append('username', username);
    params.append('password', password);

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        'x-client-timestamp': new Date().toISOString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    try {
        const res = await axios.post(`${BASE_URL}/api/identity/v1/token`, params.toString(), {
            headers,
            timeout: 30000
        });

        const tokenData = res.data;
        const accessToken = tokenData.access_token || tokenData.accessToken || tokenData.token || tokenData.data?.access_token || null;

        return accessToken;
    } catch (err) {
        throw new Error(`Authentication failed for ${username}: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
}

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        const payload = Buffer.from(parts[1], 'base64').toString('utf8');
        return JSON.parse(payload);
    } catch (err) {
        throw new Error(`Failed to decode JWT: ${err.message}`);
    }
}

function extractUserIdFromToken(token) {
    const payload = decodeJwtPayload(token);
    // The userId is stored in this claim
    const userId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    if (!userId) {
        throw new Error('userId not found in token payload');
    }
    return parseInt(userId, 10);
}

async function authenticateAndResolveUsers(users) {
    const resolvedUsers = [];

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const password = user.password || USER_PASSWORD;

        try {
            console.log(`Authenticating user ${i + 1}/${users.length}: ${user.username}...`);
            const token = await authenticateUser(user.username, password);

            if (!token) {
                console.warn(`  No token received for ${user.username}, skipping`);
                continue;
            }

            const userId = extractUserIdFromToken(token);
            console.log(`  Resolved userId: ${userId}`);

            resolvedUsers.push({
                username: user.username,
                accountId: user.accountId,
                userId: userId,
                token: token
            });
        } catch (err) {
            console.error(`  Failed to authenticate ${user.username}: ${err.message}`);
        }
    }

    return resolvedUsers;
}

// Table mappings for MSSQL
const tableMappings = {
    // User-related IDs
    userId: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeId: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeUserId: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeUserId1: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeUserId2: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeUserId3: { table: '[dbo].[Users]', idColumn: 'ID' },
    assigneeUserIds: { table: '[dbo].[Users]', idColumn: 'ID', multiple: true, count: 11 },
    ccUserId: { table: '[dbo].[Users]', idColumn: 'ID' },
    ccUserId1: { table: '[dbo].[Users]', idColumn: 'ID' },
    ccUserId2: { table: '[dbo].[Users]', idColumn: 'ID' },
    ccUserId3: { table: '[dbo].[Users]', idColumn: 'ID' },
    transferToUserId: { table: '[dbo].[Users]', idColumn: 'ID' },
    creatorUserId: { table: '[dbo].[Users]', idColumn: 'ID' },

    // Task-related IDs
    taskId: { table: '[dbo].[Tasks]', idColumn: 'ID', filter: 'IsDeleted = 0' },
    taskId2: { table: '[dbo].[Tasks]', idColumn: 'ID', filter: 'IsDeleted = 0' },
    originalTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID', filter: 'IsDeleted = 0' },
    observedTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID', filter: 'IsDeleted = 0' },
    ccTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID', filter: 'IsDeleted = 0' },

    // Correspondence-related IDs (StatusID = 1 means Open, IsDeleted = 0 means not deleted)
    correspondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    correspondenceId2: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    correspondenceId3: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    linkedCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    linkedCorrespondenceId1: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    linkedCorrespondenceId2: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    sourceCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },
    newCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID', filter: 'StatusID = 1 AND IsDeleted = 0' },

    // Organization & Contact IDs
    organizationId: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID' },
    contactOrganizationId: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID' },
    organizationName: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID', nameColumn: 'Name' },
    contactEmployeeId: { table: '[dbo].[ContactEmployees]', idColumn: 'ID' },
    employeeName: { table: '[dbo].[ContactEmployees]', idColumn: 'ID', nameColumn: 'Name' },

    // Lookup Table IDs
    entityId: { table: '[dbo].[LKEntityStucture]', idColumn: 'ID' },
    typeId: { table: '[dbo].[LKCorrespondenceTypes]', idColumn: 'ID' },
    correspondenceTypeId: { table: '[dbo].[LKCorrespondenceTypes]', idColumn: 'ID' },
    taskTypeId: { table: '[dbo].[TaskType]', idColumn: 'ID' },
    statusId: { table: '[dbo].[LKStatuses]', idColumn: 'ID' },
    priorityId: { table: '[dbo].[LKPriorities]', idColumn: 'ID' },
    sourceId: { table: '[dbo].[LKCorrespondenceSources]', idColumn: 'ID' },

    // Attachment IDs
    attachmentId: { table: '[dbo].[Attachments]', idColumn: 'ID' },
    attachmentId2: { table: '[dbo].[Attachments]', idColumn: 'ID' },

    // Other IDs
    correspondencePropertyId: { table: '[dbo].[CorrespondenceProperty]', idColumn: 'ID' }
};

// MongoDB collection mappings
const mongoMappings = {
    accountId: { collection: 'useraccounts', idField: '_id' },
    roleAccountId: { collection: 'roles', idField: '_id' },
    roleId: { collection: 'roles', idField: '_id' }
};

// CSV file definitions - ALL from JMX test cases
// Each CSV includes 'token' as the first column - all data in the row is tied to that token's user
const csvDefinitions = {
    // Correspondence CSVs
    'correspondence/csv/ReminderCorrespondence': ['token', 'correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'correspondence/csv/ArchivedCorrespondence': ['token', 'correspondenceId', 'organizationId', 'userId'],
    'correspondence/csv/BrowseCorrespondence': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'userId'],
    'correspondence/csv/BrowseCorrespondenceAttachments': ['token', 'correspondenceId', 'correspondenceId2', 'correspondenceId3', 'organizationId', 'contactEmployeeId', 'userId', 'attachmentKey'],
    'correspondence/csv/BrowseCorrespondenceData': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'userId'],
    'correspondence/csv/correspondence-parameters': ['token', 'pageIndex', 'pageSize', 'desc', 'cti', 'byref'],
    'correspondence/csv/CorrespondenceSorting': ['token', 'userId', 'cti', 'pageSize'],
    'correspondence/csv/DraftCorrespondence': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'subject', 'externalReference', 'priorityId', 'sourceId', 'statusId', 'correspondencePropertyId', 'propertyName', 'propertyValue', 'filePath', 'mimeType'],
    'correspondence/csv/CreateCorrespondenceAttachments': ['token', 'organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'userId', 'linkedCorrespondenceId'],
    'correspondence/csv/CreateCorrespondence': ['token', 'organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'entityId', 'subjectNames', 'attachmentFilePath', 'attachmentMimeType', 'correspondencePropertyId', 'propertyName', 'propertyValue'],
    'correspondence/csv/CreateCorrespondenceTaskTransfer': ['token', 'organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'assigneeUserId', 'taskTypeId', 'entityId', 'correspondencePropertyId'],
    'correspondence/csv/InternalCorrespondenceData': ['token', 'entityId', 'linkedCorrespondenceId1', 'linkedCorrespondenceId2', 'correspondencePropertyId', 'propertyValue', 'subjectNames', 'attachmentFilePath', 'attachmentMimeType'],
    'correspondence/csv/CreateOutboundCorrespondence': ['token', 'organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'userId', 'linkedCorrespondenceId'],
    'correspondence/csv/DraftCorrespondenceList': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'subject', 'externalReference', 'pageIndex', 'listPageSize', 'attachmentPageSize'],
    'correspondence/csv/EditCorrespondenceAttachments': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'priorityId', 'typeId', 'sourceId', 'statusId', 'subject', 'externalReference', 'subjectNames', 'correspondencePropertyId', 'propertyValue', 'pageIndex', 'listPageSize', 'attachmentPageSize', 'maxPageSize', 'attachmentFilePath', 'attachmentMimeType'],
    'correspondence/csv/EditCorrespondence': ['token', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'priorityId', 'typeId', 'sourceId', 'statusId', 'subject', 'externalReference', 'organizationName', 'employeeName', 'correspondencePropertyId', 'dueDate', 'receivedDate', 'sentDate', 'subjectNames', 'attachmentFile'],
    'correspondence/csv/FilterCorrespondenceData': ['token', 'pageIndex', 'pageSize', 'desc', 'correspondenceTypeId', 'statusId', 'priorityId', 'sourceId', 'searchText'],
    'correspondence/csv/MoveToCorrespondenceTab': ['token', 'typeId', 'pageIndex', 'listPageSize', 'maxPageSize'],
    'correspondence/csv/ChangeHistoryCorrespondenceData': ['token', 'correspondenceId', 'userId', 'desc', 'pageIndex', 'pageSize'],
    'correspondence/csv/PrintCorrespondence': ['token', 'correspondenceId', 'userId'],
    'correspondence/csv/DraftCorrespondenceData': ['token', 'correspondenceId', 'correspondencePropertyId', 'propertyValue', 'contactOrganizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'priorityId', 'sourceId', 'statusId', 'pageIndex', 'pageSize', 'listPageSize', 'attachmentPageSize', 'sortBy', 'sortDirection', 'desc', 'organizationName'],
    'correspondence/csv/ViewDocument': ['token', 'correspondenceId', 'userId', 'attachmentKey', 'attachmentKey2'],
    'correspondence/csv/create-correspondence-parameters': ['token', 'pageIndex', 'pageSize', 'sortBy', 'sortDirection', 'cti', 'desc', 'entityId', 'correspondenceId', 'contactId', 'employeeId', 'externalOutboundReference', 'subjectNames', 'subjectText', 'confidentialityLevel', 'correspondenceClassification'],
    'correspondence/csv/ChangeHistoryCorrespondence': ['token', 'correspondenceId', 'userId'],

    // Tasks CSVs
    'tasks/csv/AddTaskFromCorrespondence': ['token', 'correspondenceId', 'assigneeUserId', 'correspondenceTypeId', 'typeId', 'priorityId', 'entityId', 'attachmentId', 'assigneeDisplayName', 'entityName', 'typeName', 'typeNameEn', 'accountId', 'username', 'tenantId', 'creatorDisplayName', 'firstName', 'lastName', 'emailAddress', 'userTitle', 'phoneNumber', 'localeId', 'roleAccountId', 'roleId', 'roleName', 'createdAt'],
    'tasks/csv/BrowseTasks': ['token', 'taskId', 'correspondenceId', 'userId', 'assigneeId', 'taskId2', 'correspondenceId2', 'attachmentId'],
    'tasks/csv/CCTasksClose': ['token', 'taskId', 'correspondenceId', 'userId', 'originalTaskId', 'observedTaskId', 'ccTaskId', 'creatorUserId', 'assigneeUserId'],
    'tasks/csv/ChangeTaskFilterToAllTasks': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/task_parameters': ['token', 'taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/follow_up_parameters': ['token', 'taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/ChangeTaskFilterMyClosedTask': ['token', 'taskId', 'correspondenceId', 'attachmentId'],
    'tasks/csv/ChangeTaskFilterToTaskWasSendByMe': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/unread_task_parameters': ['token', 'taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/ChangeSortTasks': ['token', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/CloseTaskWithCC': ['token', 'taskId', 'correspondenceId', 'userId', 'ccUserId', 'closeComment', 'pageIndex', 'pageSize', 'sortDirection', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'uploadFilePath'],
    'tasks/csv/CloseTaskWithAttachments': ['token', 'taskId', 'correspondenceId', 'closeComment', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/CloseTaskWithoutAttachmentsAndCC': ['token', 'taskId', 'correspondenceId', 'userId', 'closeComment'],
    'tasks/csv/CreateOutboundFromTask': ['token', 'taskId', 'sourceCorrespondenceId', 'newCorrespondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'subject'],
    'tasks/csv/FollowTask': ['token', 'taskId', 'correspondenceId', 'userId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/TaskReminder': ['token', 'taskId', 'correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'tasks/csv/TaskAttachments': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'attachmentId2', 'downloadKey', 'userId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/ElectronicCorrespondenceTab': ['token', 'taskId', 'correspondenceId', 'userId', 'assigneeId'],
    'tasks/csv/TransferTask': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'correspondenceTypeId', 'priorityId', 'typeId', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'title', 'comment'],
    'tasks/csv/TaskOpenAttachment': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'userId'],
    'tasks/csv/ReplyToSenderWithoutCC': ['token', 'taskId', 'correspondenceId', 'userId', 'replyComment'],
    'tasks/csv/TransferTaskWithCC': ['token', 'taskId', 'correspondenceId', 'attachmentId', 'correspondenceTypeId', 'priorityId', 'typeId', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'ccUserId1', 'ccUserId2', 'ccUserId3', 'title', 'comment'],
    'tasks/csv/TransferTaskMultipleAssignees': ['token', 'taskId', 'correspondenceId', 'userId', 'assigneeUserIds'],
    'tasks/csv/UnfollowTask': ['token', 'taskId', 'correspondenceId', 'userId']
};

// Random data generators for text fields
function generateRandomText(field) {
    const subjects = ['Urgent Request', 'Follow Up Required', 'Document Review', 'Meeting Notes', 'Budget Approval', 'Contract Update', 'Project Status', 'Action Required'];
    const comments = ['Please review and process', 'Awaiting your response', 'Completed successfully', 'Requires immediate attention', 'For your information', 'Please approve', 'Forwarded for action'];
    const reminders = ['Follow up on this item', 'Check status update', 'Submit final response', 'Review pending changes', 'Escalate if needed'];
    const names = ['Ahmed Hassan', 'Mohamed Ali', 'Sara Ahmed', 'Omar Khaled', 'Fatima Nour', 'John Smith', 'Jane Doe'];
    const titles = ['Mr.', 'Ms.', 'Dr.', 'Eng.'];

    switch (field) {
        case 'subject':
        case 'subjectText':
            return subjects[Math.floor(Math.random() * subjects.length)] + ' - ' + Date.now();
        case 'replyComment':
        case 'closeComment':
        case 'comment':
            return comments[Math.floor(Math.random() * comments.length)];
        case 'reminderText':
            return reminders[Math.floor(Math.random() * reminders.length)];
        case 'externalReference':
        case 'externalOutboundReference':
            return 'REF-' + Math.floor(Math.random() * 100000);
        case 'reminderDate':
        case 'dueDate':
        case 'receivedDate':
        case 'sentDate':
        case 'createdAt':
        case 'createdAtFrom':
        case 'createdAtTo':
        case 'assignedAtFrom':
        case 'assignedAtTo':
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
            return futureDate.toISOString().split('T')[0];
        case 'title':
            return 'Task Title - ' + Date.now();
        case 'propertyName':
            return 'Property_' + Math.floor(Math.random() * 100);
        case 'propertyValue':
            return 'Value_' + Math.floor(Math.random() * 1000);
        case 'subjectNames':
            return 'Subject Name ' + Math.floor(Math.random() * 100);
        case 'searchText':
            return 'search_' + Math.floor(Math.random() * 100);
        case 'attachmentFilePath':
        case 'filePath':
        case 'uploadFilePath':
        case 'attachmentFile':
            return 'C:/test-files/document.pdf';
        case 'attachmentMimeType':
        case 'mimeType':
            return 'application/pdf';
        case 'attachmentKey':
        case 'attachmentKey2':
        case 'downloadKey':
            return 'key_' + Math.random().toString(36).substring(7);
        case 'assigneeDisplayName':
        case 'creatorDisplayName':
            return names[Math.floor(Math.random() * names.length)];
        case 'entityName':
            return 'Entity ' + Math.floor(Math.random() * 100);
        case 'typeName':
        case 'typeNameEn':
            return 'Type ' + Math.floor(Math.random() * 10);
        case 'username':
            return 'user_' + Math.floor(Math.random() * 1000);
        case 'firstName':
            return ['Ahmed', 'Mohamed', 'Sara', 'Omar', 'John'][Math.floor(Math.random() * 5)];
        case 'lastName':
            return ['Hassan', 'Ali', 'Ahmed', 'Khaled', 'Smith'][Math.floor(Math.random() * 5)];
        case 'emailAddress':
            return 'user' + Math.floor(Math.random() * 1000) + '@example.com';
        case 'userTitle':
            return titles[Math.floor(Math.random() * titles.length)];
        case 'phoneNumber':
            return '+1' + Math.floor(Math.random() * 9000000000 + 1000000000);
        case 'roleName':
            return 'Role ' + Math.floor(Math.random() * 10);
        case 'confidentialityLevel':
            return ['Public', 'Internal', 'Confidential'][Math.floor(Math.random() * 3)];
        case 'correspondenceClassification':
            return ['Normal', 'Urgent', 'Important'][Math.floor(Math.random() * 3)];
        case 'sortBy':
            return ['createdAt', 'updatedAt', 'subject'][Math.floor(Math.random() * 3)];
        case 'sortDirection':
            return ['ascending', 'descending'][Math.floor(Math.random() * 2)];
        case 'desc':
        case 'byref':
            return ['true', 'false'][Math.floor(Math.random() * 2)];
        case 'cti':
            return Math.floor(Math.random() * 5) + 1;
        case 'pageIndex':
            return 0;
        case 'pageSize':
        case 'listPageSize':
        case 'attachmentPageSize':
            return 10;
        case 'maxPageSize':
            return 100;
        case 'contactId':
        case 'employeeId':
            return Math.floor(Math.random() * 1000) + 1;
        case 'localeId':
            return 'ar-EG';
        default:
            return 'Generated-' + Date.now();
    }
}



async function loadPermittedCorrespondencesForUser(pool, userId) {
    if (!userId) return [];

    const query = `
        SELECT DISTINCT c.ID
        FROM [dbo].[Correspondences] c
        INNER JOIN [dbo].[CorrespondenceAccessRight] car ON c.ID = car.CorrespondenceId
        WHERE car.AccessEntityType = 'User'
          AND car.AccessEntityId = ${userId}
          AND c.StatusID = 1
          AND c.IsDeleted = 0
    `;
    try {
        const result = await pool.request().query(query);
        return result.recordset.map(r => r.ID);
    } catch (err) {
        console.error(`Error loading permitted correspondences for user ${userId}:`, err.message);
        return [];
    }
}

async function loadPermittedTasksForUser(pool, userId) {
    if (!userId) return [];

    // Step 1: Get the user's entityId
    let entityId = null;
    try {
        const entityResult = await pool.request().query(
            `SELECT [EntityId] FROM [dbo].[User] WHERE [Id] = ${userId}`
        );
        if (entityResult.recordset.length > 0) {
            entityId = entityResult.recordset[0].EntityId;
        }
    } catch (err) {
        console.error(`Error fetching entityId for user ${userId}:`, err.message);
    }

    // Step 2: Get task IDs using comprehensive query
    const query = `
        SELECT DISTINCT [Task].[Id]
        FROM [dbo].[Task] AS [Task]
        WHERE
            [Task].[isArchived] = 0
            AND [Task].[isDeleted] = 0
            AND (
                EXISTS(
                    SELECT 1
                    FROM [dbo].[TaskAssignment] AS [assignments]
                    WHERE [Task].[id] = [assignments].[taskId]
                    AND (
                        [assignments].[assigneeUserId] = ${userId}
                        ${entityId ? `OR [assignments].[assigneeEntityId] = ${entityId}` : ''}
                    )
                )
                OR [Task].[creatorUserId] = ${userId}
            )
    `;
    try {
        const result = await pool.request().query(query);
        return result.recordset.map(r => r.Id);
    } catch (err) {
        console.error(`Error loading permitted tasks for user ${userId}:`, err.message);
        return [];
    }
}

async function loadPermittedDataForUsers(pool, users) {
    console.log('\nLoading permitted correspondences and tasks for each user...');
    for (const user of users) {
        const correspondences = await loadPermittedCorrespondencesForUser(pool, user.userId);
        const tasks = await loadPermittedTasksForUser(pool, user.userId);
        permittedCorrespondencesMap.set(user.userId, correspondences);
        permittedTasksMap.set(user.userId, tasks);
        console.log(`  User ${user.username} (ID: ${user.userId}): ${correspondences.length} correspondences, ${tasks.length} tasks`);
    }
}

function getRandomFromArray(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

async function getRandomId(pool, mapping, currentUser) {
    // Check if this is a user field - return the current user's ID
    if (mapping.table === '[dbo].[Users]' && currentUser) {
        return currentUser.userId;
    }

    // Check if this is a correspondence field and we have permitted list for this user
    if (mapping.table === '[dbo].[Correspondences]' && currentUser) {
        const permitted = permittedCorrespondencesMap.get(currentUser.userId);
        if (permitted && permitted.length > 0) {
            return getRandomFromArray(permitted);
        }
    }

    // Check if this is a task field and we have permitted list for this user
    if (mapping.table === '[dbo].[Tasks]' && currentUser) {
        const permitted = permittedTasksMap.get(currentUser.userId);
        if (permitted && permitted.length > 0) {
            return getRandomFromArray(permitted);
        }
    }

    // Fall back to random DB query
    try {
        const columns = mapping.nameColumn ? `${mapping.idColumn}, ${mapping.nameColumn}` : mapping.idColumn;
        const whereClause = mapping.filter ? `WHERE ${mapping.filter}` : '';
        const query = `SELECT TOP 1 ${columns} FROM ${mapping.table} ${whereClause} ORDER BY NEWID()`;
        const result = await pool.request().query(query);

        if (result.recordset.length === 0) {
            return mapping.nameColumn ? { id: 1, name: 'Default' } : 1;
        }

        const randomRow = result.recordset[0];
        if (mapping.nameColumn) {
            return { id: randomRow[mapping.idColumn], name: randomRow[mapping.nameColumn] };
        }
        return randomRow[mapping.idColumn];
    } catch (err) {
        console.error(`Error fetching from ${mapping.table}:`, err.message);
        return mapping.nameColumn ? { id: 1, name: 'Default' } : 1;
    }
}

async function getMongoRandomId(mongoDb, mapping) {
    try {
        const filter = TENANT_ID ? { tenantId: Number(TENANT_ID) } : {};
        const docs = await mongoDb.collection(mapping.collection).aggregate([
            { $match: filter },
            { $sample: { size: 1 } }
        ]).toArray();

        if (docs.length === 0) {
            return 'default_id';
        }

        return docs[0][mapping.idField].toString();
    } catch (err) {
        console.error(`Error fetching from MongoDB ${mapping.collection}:`, err.message);
        return 'default_id';
    }
}

async function getMultipleRandomIds(pool, mapping, count, currentUser) {
    const ids = [];
    for (let i = 0; i < count; i++) {
        const id = await getRandomId(pool, mapping, currentUser);
        ids.push(id);
    }
    return [...new Set(ids)].join('|');
}

async function generateValue(pool, mongoDb, field, csvName, currentUser) {
    // Handle token field - return the current user's token
    if (field === 'token') {
        return currentUser ? currentUser.token : '';
    }

    // Handle tenantId from env
    if (field === 'tenantId') {
        return TENANT_ID || 'default_tenant';
    }

    // Handle typeId based on CSV context (task vs correspondence)
    if (field === 'typeId' && csvName && csvName.startsWith('tasks/')) {
        // For task CSVs, typeId refers to TaskType table
        return await getRandomId(pool, tableMappings['taskTypeId'], currentUser);
    }

    // Check if it's a MongoDB field
    const mongoMapping = mongoMappings[field];
    if (mongoMapping && mongoDb) {
        // For accountId, use the current user's accountId if available
        if (field === 'accountId' && currentUser && currentUser.accountId) {
            return currentUser.accountId;
        }
        return await getMongoRandomId(mongoDb, mongoMapping);
    }

    // Check if it's a text/generated field
    const textFields = [
        'subject', 'replyComment', 'externalReference', 'reminderDate', 'reminderText',
        'closeComment', 'comment', 'dueDate', 'title', 'propertyName', 'propertyValue',
        'subjectNames', 'attachmentFilePath', 'attachmentMimeType', 'attachmentKey',
        'attachmentKey2', 'downloadKey', 'assigneeDisplayName', 'entityName', 'typeName',
        'typeNameEn', 'username', 'creatorDisplayName', 'firstName', 'lastName',
        'emailAddress', 'userTitle', 'phoneNumber', 'roleName', 'createdAt',
        'pageIndex', 'pageSize', 'sortDirection', 'sortBy', 'desc', 'cti', 'byref',
        'listPageSize', 'attachmentPageSize', 'maxPageSize', 'filePath', 'mimeType',
        'uploadFilePath', 'attachmentFile', 'searchText', 'createdAtFrom', 'createdAtTo',
        'assignedAtFrom', 'assignedAtTo', 'confidentialityLevel', 'correspondenceClassification',
        'externalOutboundReference', 'subjectText', 'contactId', 'employeeId', 'receivedDate', 'sentDate', 'localeId'
    ];

    // Handle username field - use current user's username
    if (field === 'username' && currentUser) {
        return currentUser.username;
    }

    if (textFields.includes(field)) {
        return generateRandomText(field);
    }

    // Check MSSQL mapping
    const mapping = tableMappings[field];
    if (!mapping) {
        console.warn(`No mapping found for field: ${field}`);
        return 1;
    }

    if (mapping.multiple) {
        return await getMultipleRandomIds(pool, mapping, mapping.count || 5, currentUser);
    }

    const result = await getRandomId(pool, mapping, currentUser);
    if (mapping.nameColumn) {
        return result.name;
    }
    return result;
}

async function generateCsvRow(pool, mongoDb, columns, csvName, currentUser) {
    const row = {};

    // For task CSVs that need typeId, typeName, typeNameEn - fetch TaskType record once
    let taskTypeRecord = null;
    if (csvName && csvName.startsWith('tasks/') &&
        columns.includes('typeId') &&
        (columns.includes('typeName') || columns.includes('typeNameEn'))) {
        try {
            const result = await pool.request().query(
                `SELECT TOP 1 Id, Name,Name as NameEn FROM TaskType WHERE Active = 1 ORDER BY NEWID()`
            );
            if (result.recordset.length > 0) {
                taskTypeRecord = result.recordset[0];
            }
        } catch (err) {
            console.error('Error fetching TaskType:', err.message);
        }
    }

    for (const column of columns) {
        // Use pre-fetched TaskType data for related fields
        if (taskTypeRecord) {
            if (column === 'typeId') {
                row[column] = taskTypeRecord.Id;
                continue;
            }
            if (column === 'typeName') {
                row[column] = taskTypeRecord.Name || 'Default Type';
                continue;
            }
            if (column === 'typeNameEn') {
                row[column] = taskTypeRecord.NameEn || 'Default Type';
                continue;
            }
        }
        row[column] = await generateValue(pool, mongoDb, column, csvName, currentUser);
    }
    return row;
}

function escapeValue(val) {
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

function createCsvContent(columns, rows) {
    const header = columns.join(',');
    const lines = rows.map(row =>
        columns.map(col => escapeValue(row[col])).join(',')
    );
    return `${header}\n${lines.join('\n')}\n`;
}

async function main() {
    console.log('=== Configuration ===');
    console.log(`MSSQL Server: ${dbConfig.server}`);
    console.log(`MSSQL Database: ${dbConfig.database}`);
    console.log(`MSSQL User: ${dbConfig.user}`);
    console.log(`MongoDB URI: ${mongoUri}`);
    console.log(`API Base URL: ${BASE_URL}`);
    console.log(`Users File: ${USERS_FILE}`);
    console.log('=====================\n');

    // Step 1: Load users from users.json
    console.log('Loading users from users.json...');
    let usersFromFile;
    try {
        usersFromFile = await loadUsersFromFile();
        console.log(`Found ${usersFromFile.length} user(s) in ${USERS_FILE}`);
    } catch (err) {
        console.error('Failed to load users:', err.message);
        process.exit(1);
    }

    if (usersFromFile.length === 0) {
        console.error('No valid users found in users.json');
        process.exit(1);
    }

    // Step 2: Authenticate users and resolve userIds
    console.log('\n=== Authenticating Users ===');
    loadedUsers = await authenticateAndResolveUsers(usersFromFile);

    if (loadedUsers.length === 0) {
        console.error('No users could be authenticated');
        process.exit(1);
    }

    console.log(`\nSuccessfully authenticated ${loadedUsers.length} user(s)`);

    // Step 3: Connect to MSSQL
    console.log('\nConnecting to MSSQL database...');
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        console.log(`MSSQL connected successfully to: ${dbConfig.server}/${dbConfig.database}`);
    } catch (err) {
        console.error('MSSQL connection failed:', err.message);
        process.exit(1);
    }

    // Step 4: Connect to MongoDB
    let mongoClient;
    let mongoDb;
    try {
        console.log('Connecting to MongoDB...');
        mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
        mongoDb = mongoClient.db();
        console.log('MongoDB connected successfully!');
        console.log(`Using tenantId: ${TENANT_ID || 'not set'}`);
    } catch (err) {
        console.warn('MongoDB connection failed (will use defaults):', err.message);
        mongoDb = null;
    }

    // Step 5: Load permitted correspondences and tasks for each user
    await loadPermittedDataForUsers(pool, loadedUsers);

    // Step 6: Create output folder with date
    const now = new Date();
    const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const outputDir = path.join(__dirname, 'output', dateFolder);

    // Create directories
    fs.mkdirSync(path.join(outputDir, 'correspondence', 'csv'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'tasks', 'csv'), { recursive: true });

    console.log(`\n=== Generating CSV Files ===`);
    console.log(`Output directory: ${outputDir}`);
    console.log(`Rows per CSV: ${ROW_COUNT}`);
    console.log(`Users: ${loadedUsers.length}`);
    console.log(`Strategy: Round-robin across users\n`);

    // Step 7: Generate each CSV file - iterate over users for each row
    for (const [csvName, columns] of Object.entries(csvDefinitions)) {
        try {
            console.log(`Generating ${csvName}.csv with ${ROW_COUNT} row(s)...`);
            const rows = [];
            for (let i = 0; i < ROW_COUNT; i++) {
                // Round-robin: select user based on row index
                const currentUser = loadedUsers[i % loadedUsers.length];
                const row = await generateCsvRow(pool, mongoDb, columns, csvName, currentUser);
                rows.push(row);
            }
            const csvContent = createCsvContent(columns, rows);
            const filePath = path.join(outputDir, `${csvName}.csv`);
            fs.writeFileSync(filePath, csvContent);
            console.log(`  Created ${ROW_COUNT} row(s)`);
        } catch (err) {
            console.error(`  Error generating ${csvName}:`, err.message);
        }
    }

    await pool.close();
    if (mongoClient) {
        await mongoClient.close();
    }

    console.log('\n=== Summary ===');
    console.log(`Users processed: ${loadedUsers.length}`);
    loadedUsers.forEach(u => console.log(`  - ${u.username} (userId: ${u.userId})`));
    console.log(`CSV files generated in: ${outputDir}`);
    console.log('\nDone! All CSV files generated.');
}

main().catch(console.error);
