require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Get row count from command line argument or default to 10
const ROW_COUNT = parseInt(process.argv[2]) || 10;
console.log(`Will generate ${ROW_COUNT} row(s) per CSV file\n`);

// Database configuration
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

// Table mappings for each key
const tableMappings = {
    userId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    assigneeUserIds: { table: '[dbo].[User]', idColumn: 'ID', multiple: true, count: 5 },
    ccUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    transferToUserId: { table: '[dbo].[User]', idColumn: 'ID' },
    taskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    originalTaskId: { table: '[dbo].[Tasks]', idColumn: 'ID' },
    organizationId: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID' },
    organizationName: { table: '[dbo].[ContactOrganizations]', idColumn: 'ID', nameColumn: 'Name' },
    attachmentId: { table: '[dbo].[Attachments]', idColumn: 'ID' },
    correspondenceId: { table: '[dbo].[Correspondences]', idColumn: 'ID' },
    contactEmployeeId: { table: '[dbo].[ContactEmployees]', idColumn: 'ID' },
    employeeName: { table: '[dbo].[ContactEmployees]', idColumn: 'ID', nameColumn: 'Name' },
    correspondencePropertyId: { table: '[dbo].[CorrespondenceProperty]', idColumn: 'ID' },
    entityId: { table: '[dbo].[LkStructureEntity]', idColumn: 'ID' },
    typeId: { table: '[dbo].[LKCorrespondenceTypes]', idColumn: 'ID' },
    taskTypeId: { table: '[dbo].[TaskType]', idColumn: 'ID' },
    statusId: { table: '[dbo].[LKStatuses]', idColumn: 'ID' },
    priorityId: { table: '[dbo].[LKPriorities]', idColumn: 'ID' },
    sourceId: { table: '[dbo].[LKCorrespondenceSources]', idColumn: 'ID' }
};

// CSV file definitions with their required columns
const csvDefinitions = {
    'EditCorrespondenceTestData': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'subject', 'externalReference'],
    'correspondence/BrowseCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'userId'],
    'correspondence/CreateCorrespondence': ['organizationId', 'contactEmployeeId', 'externalReference', 'subject', 'priorityId', 'typeId', 'sourceId', 'statusId', 'organizationName', 'employeeName'],
    'correspondence/EditCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'priorityId', 'typeId', 'sourceId', 'statusId', 'subject', 'externalReference', 'organizationName', 'employeeName', 'correspondencePropertyId'],
    'correspondence/DraftCorrespondence': ['correspondenceId', 'organizationId', 'contactEmployeeId', 'entityId', 'userId', 'typeId', 'subject', 'externalReference'],
    'correspondence/ArchivedCorrespondence': ['correspondenceId', 'organizationId', 'userId'],
    'correspondence/ReminderCorrespondence': ['correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'correspondence/PrintCorrespondence': ['correspondenceId', 'userId'],
    'correspondence/ChangeHistoryCorrespondence': ['correspondenceId', 'userId'],
    'tasks/BrowseTasks': ['taskId', 'correspondenceId', 'userId', 'assigneeId'],
    'tasks/AddTaskFromCorrespondence': ['correspondenceId', 'assigneeUserId', 'taskTypeId', 'comment', 'dueDate'],
    'tasks/CloseTask': ['taskId', 'correspondenceId', 'userId', 'closeComment'],
    'tasks/CloseTaskWithCC': ['taskId', 'correspondenceId', 'userId', 'ccUserId', 'closeComment'],
    'tasks/CCTasks': ['taskId', 'correspondenceId', 'userId', 'originalTaskId'],
    'tasks/TransferTask': ['taskId', 'correspondenceId', 'userId', 'transferToUserId', 'comment'],
    'tasks/TransferTaskMultipleAssignees': ['taskId', 'correspondenceId', 'userId', 'assigneeUserIds'],
    'tasks/FollowTask': ['taskId', 'correspondenceId', 'userId'],
    'tasks/TaskReminder': ['taskId', 'correspondenceId', 'userId', 'reminderText', 'reminderDate'],
    'tasks/ReplyToSender': ['taskId', 'correspondenceId', 'userId', 'replyComment'],
    'tasks/CreateOutboundFromTask': ['taskId', 'correspondenceId', 'organizationId', 'contactEmployeeId', 'subject', 'externalReference'],
    'tasks/TaskAttachments': ['taskId', 'correspondenceId', 'attachmentId', 'userId']
};

// Random data generators for text fields
function generateRandomText(field) {
    const subjects = ['Urgent Request', 'Follow Up Required', 'Document Review', 'Meeting Notes', 'Budget Approval', 'Contract Update', 'Project Status', 'Action Required'];
    const comments = ['Please review and process', 'Awaiting your response', 'Completed successfully', 'Requires immediate attention', 'For your information', 'Please approve', 'Forwarded for action'];
    const reminders = ['Follow up on this item', 'Check status update', 'Submit final response', 'Review pending changes', 'Escalate if needed'];

    switch (field) {
        case 'subject':
            return subjects[Math.floor(Math.random() * subjects.length)] + ' - ' + Date.now();
        case 'replyComment':
        case 'closeComment':
        case 'comment':
            return comments[Math.floor(Math.random() * comments.length)];
        case 'reminderText':
            return reminders[Math.floor(Math.random() * reminders.length)];
        case 'externalReference':
            return 'REF-' + Math.floor(Math.random() * 100000);
        case 'reminderDate':
        case 'dueDate':
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
            return futureDate.toISOString().split('T')[0];
        default:
            return 'Generated-' + Date.now();
    }
}

// Cache for random IDs from database
const idCache = {};

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

async function getMultipleRandomIds(pool, mapping, count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
        const id = await getRandomId(pool, mapping);
        ids.push(id);
    }
    return [...new Set(ids)].join('|');
}

async function generateValue(pool, field) {
    const textFields = ['subject', 'replyComment', 'externalReference', 'reminderDate', 'reminderText', 'closeComment', 'comment', 'dueDate'];

    if (textFields.includes(field)) {
        return generateRandomText(field);
    }

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

async function generateCsvRow(pool, columns) {
    const row = {};
    for (const column of columns) {
        row[column] = await generateValue(pool, column);
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
    console.log('Connecting to database...');

    let pool;
    try {
        pool = await sql.connect(dbConfig);
        console.log('Connected successfully!');
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }

    // Create output folder with date
    const now = new Date();
    const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const outputDir = path.join(__dirname, 'output', dateFolder);

    // Create directories
    fs.mkdirSync(path.join(outputDir, 'correspondence'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'tasks'), { recursive: true });

    console.log(`\nGenerating CSV files in: ${outputDir}\n`);

    // Generate each CSV file
    for (const [csvName, columns] of Object.entries(csvDefinitions)) {
        try {
            console.log(`Generating ${csvName}.csv with ${ROW_COUNT} row(s)...`);
            const rows = [];
            for (let i = 0; i < ROW_COUNT; i++) {
                const row = await generateCsvRow(pool, columns);
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
    console.log('\nDone! All CSV files generated.');
}

main().catch(console.error);
