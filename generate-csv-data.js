require('dotenv').config();
const sql = require('mssql');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

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

// Fixed tenant ID from environment
const TENANT_ID = process.env.TENANT_ID;

// Table mappings for MSSQL
const tableMappings = {
    // User-related IDs
    userId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserId1: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserId2: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserId3: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserIds: { table: '[dbo].[User]', idColumn: 'ID', multiple: true, count: 11 },
    ccUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    ccUserId1: { table: '[dbo].[User]', idColumn: 'ID' },
    ccUserId2: { table: '[dbo].[User]', idColumn: 'ID' },
    ccUserId3: { table: '[dbo].[User]', idColumn: 'ID' },
    transferToUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    creatorUserId: { table: '[dbo].[User]', idColumn: 'ID' },

    // Task-related IDs
    taskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    taskId2: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    originalTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    observedTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    ccTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },

    // Correspondence-related IDs
    correspondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    correspondenceId2: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    correspondenceId3: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    linkedCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    linkedCorrespondenceId1: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    linkedCorrespondenceId2: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    sourceCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    newCorrespondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID' },

    // Organization & Contact IDs
    organizationId: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID' },
    contactOrganizationId: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID' },
    organizationName: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID', nameColumn: 'Name' },
    contactEmployeeId: { table: '[dbo].[ContactEmployees]', idColumn: 'ID' },
    employeeName: { table: '[dbo].[ContactEmployees]', idColumn: 'ID', nameColumn: 'Name' },

    // Lookup Table IDs
    entityId: { table: '[dbo].[LkStructureEntity]', idColumn: 'ID' },
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
const csvDefinitions = {
    // Correspondence CSVs
    'correspondence/csv/ReminderCorrespondence': ['correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'correspondence/csv/ArchivedCorrespondence': ['correspondenceId', 'organizationId', 'userId'],
    'correspondence/csv/BrowseCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'userId'],
    'correspondence/csv/BrowseCorrespondenceAttachments': ['correspondenceId', 'correspondenceId2', 'correspondenceId3', 'organizationId', 'contactEmployeeId', 'userId', 'attachmentKey'],
    'correspondence/csv/BrowseCorrespondenceData': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'userId'],
    'correspondence/csv/correspondence-parameters': ['pageIndex', 'pageSize', 'desc', 'cti', 'byref'],
    'correspondence/csv/CorrespondenceSorting': ['userId', 'cti', 'pageSize'],
    'correspondence/csv/DraftCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'subject', 'externalReference', 'priorityId', 'sourceId', 'statusId', 'correspondencePropertyId', 'propertyName', 'propertyValue', 'filePath', 'mimeType'],
    'correspondence/csv/CreateCorrespondenceAttachments': ['organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'userId', 'linkedCorrespondenceId'],
    'correspondence/csv/CreateCorrespondence': ['organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'entityId', 'subjectNames', 'attachmentFilePath', 'attachmentMimeType', 'correspondencePropertyId', 'propertyName', 'propertyValue'],
    'correspondence/csv/CreateCorrespondenceTaskTransfer': ['organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'assigneeUserId', 'taskTypeId', 'entityId', 'correspondencePropertyId'],
    'correspondence/csv/InternalCorrespondenceData': ['entityId', 'linkedCorrespondenceId1', 'linkedCorrespondenceId2', 'correspondencePropertyId', 'propertyValue', 'subjectNames', 'attachmentFilePath', 'attachmentMimeType'],
    'correspondence/csv/CreateOutboundCorrespondence': ['organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName', 'userId', 'linkedCorrespondenceId'],
    'correspondence/csv/DraftCorrespondenceList': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'subject', 'externalReference', 'pageIndex', 'listPageSize', 'attachmentPageSize'],
    'correspondence/csv/EditCorrespondenceAttachments': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'priorityId', 'typeId', 'sourceId', 'statusId', 'subject', 'externalReference', 'subjectNames', 'correspondencePropertyId', 'propertyValue', 'pageIndex', 'listPageSize', 'attachmentPageSize', 'maxPageSize', 'attachmentFilePath', 'attachmentMimeType'],
    'correspondence/csv/EditCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'priorityId', 'typeId', 'sourceId', 'statusId', 'subject', 'externalReference', 'organizationName', 'employeeName', 'correspondencePropertyId', 'dueDate', 'receivedDate', 'sentDate', 'subjectNames', 'attachmentFile'],
    'correspondence/csv/FilterCorrespondenceData': ['pageIndex', 'pageSize', 'desc', 'correspondenceTypeId', 'statusId', 'priorityId', 'sourceId', 'searchText'],
    'correspondence/csv/MoveToCorrespondenceTab': ['typeId', 'pageIndex', 'listPageSize', 'maxPageSize'],
    'correspondence/csv/ChangeHistoryCorrespondenceData': ['correspondenceId', 'userId', 'desc', 'pageIndex', 'pageSize'],
    'correspondence/csv/PrintCorrespondence': ['correspondenceId', 'userId'],
    'correspondence/csv/DraftCorrespondenceData': ['correspondenceId', 'correspondencePropertyId', 'propertyValue', 'contactOrganizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'priorityId', 'sourceId', 'statusId', 'pageIndex', 'pageSize', 'listPageSize', 'attachmentPageSize', 'sortBy', 'sortDirection', 'desc', 'organizationName'],
    'correspondence/csv/ViewDocument': ['correspondenceId', 'userId', 'attachmentKey', 'attachmentKey2'],
    'correspondence/csv/create-correspondence-parameters': ['pageIndex', 'pageSize', 'sortBy', 'sortDirection', 'cti', 'desc', 'entityId', 'correspondenceId', 'contactId', 'employeeId', 'externalOutboundReference', 'subjectNames', 'subjectText', 'confidentialityLevel', 'correspondenceClassification'],
    'correspondence/csv/ChangeHistoryCorrespondence': ['correspondenceId', 'userId'],

    // Tasks CSVs
    'tasks/csv/AddTaskFromCorrespondence': ['correspondenceId', 'assigneeUserId', 'correspondenceTypeId', 'typeId', 'priorityId', 'entityId', 'attachmentId', 'assigneeDisplayName', 'entityName', 'typeName', 'typeNameEn', 'accountId', 'username', 'tenantId', 'creatorDisplayName', 'firstName', 'lastName', 'emailAddress', 'userTitle', 'phoneNumber', 'localeId', 'roleAccountId', 'roleId', 'roleName', 'createdAt'],
    'tasks/csv/BrowseTasks': ['taskId', 'correspondenceId', 'userId', 'assigneeId', 'taskId2', 'correspondenceId2', 'attachmentId'],
    'tasks/csv/CCTasksClose': ['taskId', 'correspondenceId', 'userId', 'originalTaskId', 'observedTaskId', 'ccTaskId', 'creatorUserId', 'assigneeUserId'],
    'tasks/csv/ChangeTaskFilterToAllTasks': ['taskId', 'correspondenceId', 'attachmentId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/task_parameters': ['taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/follow_up_parameters': ['taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/ChangeTaskFilterMyClosedTask': ['taskId', 'correspondenceId', 'attachmentId'],
    'tasks/csv/ChangeTaskFilterToTaskWasSendByMe': ['taskId', 'correspondenceId', 'attachmentId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/unread_task_parameters': ['taskId', 'pageIndex', 'pageSize', 'sortDirection', 'createdAtFrom', 'createdAtTo', 'assignedAtFrom', 'assignedAtTo', 'filePath', 'mimeType'],
    'tasks/csv/ChangeSortTasks': ['pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/CloseTaskWithCC': ['taskId', 'correspondenceId', 'userId', 'ccUserId', 'closeComment', 'pageIndex', 'pageSize', 'sortDirection', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'uploadFilePath'],
    'tasks/csv/CloseTaskWithAttachments': ['taskId', 'correspondenceId', 'closeComment', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/CloseTaskWithoutAttachmentsAndCC': ['taskId', 'correspondenceId', 'userId', 'closeComment'],
    'tasks/csv/CreateOutboundFromTask': ['taskId', 'sourceCorrespondenceId', 'newCorrespondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'subject'],
    'tasks/csv/FollowTask': ['taskId', 'correspondenceId', 'userId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/TaskReminder': ['taskId', 'correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'tasks/csv/TaskAttachments': ['taskId', 'correspondenceId', 'attachmentId', 'attachmentId2', 'downloadKey', 'userId', 'pageIndex', 'pageSize', 'sortDirection'],
    'tasks/csv/ElectronicCorrespondenceTab': ['taskId', 'correspondenceId', 'userId', 'assigneeId'],
    'tasks/csv/TransferTask': ['taskId', 'correspondenceId', 'attachmentId', 'correspondenceTypeId', 'priorityId', 'typeId', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'title', 'comment'],
    'tasks/csv/TaskOpenAttachment': ['taskId', 'correspondenceId', 'attachmentId', 'userId'],
    'tasks/csv/ReplyToSenderWithoutCC': ['taskId', 'correspondenceId', 'userId', 'replyComment'],
    'tasks/csv/TransferTaskWithCC': ['taskId', 'correspondenceId', 'attachmentId', 'correspondenceTypeId', 'priorityId', 'typeId', 'assigneeUserId1', 'assigneeUserId2', 'assigneeUserId3', 'ccUserId1', 'ccUserId2', 'ccUserId3', 'title', 'comment'],
    'tasks/csv/TransferTaskMultipleAssignees': ['taskId', 'correspondenceId', 'userId', 'assigneeUserIds'],
    'tasks/csv/UnfollowTask': ['taskId', 'correspondenceId', 'userId']
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

// Cache for random IDs from database
const idCache = {};
const mongoCache = {};

async function getRandomId(pool, mapping) {
    const cacheKey = mapping.table + (mapping.nameColumn || '');

    if (!idCache[cacheKey]) {
        try {
            const columns = mapping.nameColumn ? `${mapping.idColumn}, ${mapping.nameColumn}` : mapping.idColumn;
            const query = `SELECT TOP 100 ${columns} FROM ${mapping.table} ORDER BY NEWID()`;
            const result = await pool.request().query(query);
            idCache[cacheKey] = result.recordset;
        } catch (err) {
            console.error(`Error fetching from ${mapping.table}:`, err.message);
            idCache[cacheKey] = [];
        }
    }

    if (idCache[cacheKey].length === 0) {
        return mapping.nameColumn ? { id: 1, name: 'Default' } : 1;
    }

    const randomRow = idCache[cacheKey][Math.floor(Math.random() * idCache[cacheKey].length)];
    if (mapping.nameColumn) {
        return { id: randomRow[mapping.idColumn], name: randomRow[mapping.nameColumn] };
    }
    return randomRow[mapping.idColumn];
}

async function getMongoRandomId(mongoDb, mapping) {
    const cacheKey = mapping.collection;

    if (!mongoCache[cacheKey]) {
        try {
            const filter = TENANT_ID ? { tenantId: TENANT_ID } : {};
            const docs = await mongoDb.collection(mapping.collection).find(filter).limit(100).toArray();
            mongoCache[cacheKey] = docs;
        } catch (err) {
            console.error(`Error fetching from MongoDB ${mapping.collection}:`, err.message);
            mongoCache[cacheKey] = [];
        }
    }

    if (mongoCache[cacheKey].length === 0) {
        return 'default_id';
    }

    const randomDoc = mongoCache[cacheKey][Math.floor(Math.random() * mongoCache[cacheKey].length)];
    return randomDoc[mapping.idField].toString();
}

async function getMultipleRandomIds(pool, mapping, count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
        const id = await getRandomId(pool, mapping);
        ids.push(id);
    }
    return [...new Set(ids)].join('|');
}

async function generateValue(pool, mongoDb, field) {
    // Handle tenantId from env
    if (field === 'tenantId') {
        return TENANT_ID || 'default_tenant';
    }

    // Check if it's a MongoDB field
    const mongoMapping = mongoMappings[field];
    if (mongoMapping && mongoDb) {
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
        return await getMultipleRandomIds(pool, mapping, mapping.count || 5);
    }

    const result = await getRandomId(pool, mapping);
    if (mapping.nameColumn) {
        return result.name;
    }
    return result;
}

async function generateCsvRow(pool, mongoDb, columns) {
    const row = {};
    for (const column of columns) {
        row[column] = await generateValue(pool, mongoDb, column);
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
    console.log('Connecting to MSSQL database...');

    let pool;
    try {
        pool = await sql.connect(dbConfig);
        console.log('MSSQL connected successfully!');
    } catch (err) {
        console.error('MSSQL connection failed:', err.message);
        process.exit(1);
    }

    // Connect to MongoDB
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

    // Create output folder with date
    const now = new Date();
    const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const outputDir = path.join(__dirname, 'output', dateFolder);

    // Create directories
    fs.mkdirSync(path.join(outputDir, 'correspondence', 'csv'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'tasks', 'csv'), { recursive: true });

    console.log(`\nGenerating CSV files in: ${outputDir}\n`);

    // Generate each CSV file
    for (const [csvName, columns] of Object.entries(csvDefinitions)) {
        try {
            console.log(`Generating ${csvName}.csv with ${ROW_COUNT} row(s)...`);
            const rows = [];
            for (let i = 0; i < ROW_COUNT; i++) {
                const row = await generateCsvRow(pool, mongoDb, columns);
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
    console.log('\nDone! All CSV files generated.');
}

main().catch(console.error);
