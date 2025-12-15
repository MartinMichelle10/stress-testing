// create-users.js
// Node 18+ recommended (uses global fetch via axios but axios is used here).
// Install dependencies: npm install axios dotenv

require("dotenv").config();
const axios = require("axios");
const { URLSearchParams } = require("url");
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const args = parseArgs();

// Required
const COUNT = parseInt(args["count"] || process.env.COUNT || "0", 10);

if (!COUNT || isNaN(COUNT) || COUNT <= 0) {
  console.error("ERROR: --count must be a positive integer (or set COUNT env).");
  process.exit(1);
}

// Optional - Admin credentials (used if ADMIN_TOKEN is not provided)
const ADMIN_TOKEN = args["admin-token"] || process.env.ADMIN_TOKEN;
const ADMIN_USERNAME = args["admin-username"] || process.env.ADMIN_USERNAME || "mot.admin";
const ADMIN_PASSWORD = args["admin-password"] || process.env.ADMIN_PASSWORD || "P@ssw0rd";

// Optional - Other settings
const BASE_URL = args["base-url"] || process.env.BASE_URL || "https://qa-env.eastus2.cloudapp.azure.com";
const ENTITY_ID = parseInt(args["entityId"] || process.env.ENTITY_ID || "2", 10);
const ROLE_ID = args["roleId"] || process.env.ROLE_ID || "6935daa548fb9a6bd193f7ce";
const USERNAME_PREFIX = args["username-prefix"] || process.env.USERNAME_PREFIX || "test-user";
const FINAL_PASSWORD = args["password"] || process.env.FINAL_PASSWORD || "P@ssw0rd1";
const DELAY_MS = parseInt(args["delay"] || process.env.DELAY || "300", 10); // small pause between requests
const OUTPUT_FILE = args["output"] || process.env.OUTPUT_FILE || "users.json";

const endpoints = {
  createUser: `${BASE_URL}/api/identity/v1/account/user`,
  token: `${BASE_URL}/api/identity/v1/token`,
  changePassword: `${BASE_URL}/api/identity/v1/account/password`,
};

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginAsAdmin() {
  const params = new URLSearchParams();
  params.append("grant_type", "username:password");
  params.append("username", ADMIN_USERNAME);
  params.append("password", ADMIN_PASSWORD);

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json, text/plain, */*",
    "sec-ch-ua-platform": '"Windows"',
    Referer: `${BASE_URL}/login`,
    "Accept-Language": "ar-EG",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };

  try {
    const res = await axios.post(endpoints.token, params.toString(), { headers, timeout: 30000 });
    const tokenData = res.data;
    
    // Extract access token from response
    const accessToken =
      tokenData.access_token ||
      tokenData.accessToken ||
      tokenData.token ||
      null;

    if (!accessToken) {
      throw new Error("Admin login succeeded but no access token found in response");
    }

    return accessToken;
  } catch (err) {
    throw new Error(`Admin login failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
  }
}

async function createUser(username, index, adminToken) {
  // Generate random values for firstName and lastName
  const randomSuffix = Math.floor(Math.random() * 10000);
  const payload = {
    username,
    firstName: `User${randomSuffix}`,
    lastName: `Test${randomSuffix}`,
    entityId: ENTITY_ID,
    title: "SWE",
    rolesIds: [ROLE_ID],
    isSuperAdmin: false,
  };

  const headers = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "x-client-timestamp": new Date().toISOString(),
    Referer: `${BASE_URL}/settings/users/add`,
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };

  const res = await axios.post(endpoints.createUser, payload, { headers, timeout: 30000 });
  return res.data; // expected { accountId: "...", password: "..." }
}

async function requestTokenForUser(username, password, adminToken) {
  const params = new URLSearchParams();
  params.append("grant_type", "username:password");
  params.append("username", username);
  params.append("password", password);

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${adminToken}`,
    "x-client-timestamp": new Date().toISOString(),
    "sec-ch-ua-platform": '"Windows"',
    Referer: `${BASE_URL}/login`,
    "Accept-Language": "ar-EG",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };

  const res = await axios.post(endpoints.token, params.toString(), { headers, timeout: 30000 });
  return res.data; // expected to include access_token or similar
}

async function changePasswordWithUserToken(userAccessToken, newPassword) {
  const headers = {
    Authorization: `Bearer ${userAccessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "x-client-timestamp": new Date().toISOString(),
    "sec-ch-ua-platform": '"Windows"',
    Referer: `${BASE_URL}/change-password`,
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };
  const body = { newPassword };
  const res = await axios.patch(endpoints.changePassword, body, { headers, timeout: 30000 });
  return res.data;
}

async function main() {
  const results = [];
  let adminToken = ADMIN_TOKEN;

  // Phase 1: Login as admin if token not provided
  if (!adminToken) {
    console.error("Admin token not provided. Attempting to login as admin...");
    try {
      adminToken = await loginAsAdmin();
      console.error("Admin login successful.");
    } catch (err) {
      console.error("ERROR: Failed to login as admin:", err.message);
      process.exit(1);
    }
  }

  // Phase 2: Create all users
  const createdUsers = [];
  console.error(`Creating ${COUNT} users...`);
  
  for (let i = 1; i <= COUNT; i++) {
    // Generate random string (6 characters: letters and numbers)
    const randomChars = Math.random().toString(36).substring(2, 8);
    const username = `${USERNAME_PREFIX}-${String(i).padStart(2, "0")}-${randomChars}`;
    const record = {
      username,
      createdAt: new Date().toISOString(),
      accountId: null,
      initialPassword: null,
      error: null,
    };

    try {
      const createRes = await createUser(username, i, adminToken);
      record.accountId = createRes.accountId || createRes.accountID || null;
      record.initialPassword = createRes.password || createRes.initialPassword || null;

      if (!record.initialPassword) {
        throw new Error("No initial password returned from create user response");
      }

      createdUsers.push(record);
      console.error(`Created user ${i}/${COUNT}: ${username}`);
    } catch (err) {
      record.error = (err?.response?.data && JSON.stringify(err.response.data)) || err.message || String(err);
      console.error(`Failed to create user ${i}/${COUNT} (${username}):`, record.error);
    }

    results.push(record);
    await wait(DELAY_MS);
  }

  // Phase 3: Reset passwords for all created users
  console.error(`Resetting passwords for ${createdUsers.length} users...`);
  
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const resultRecord = results.find((r) => r.username === user.username);
    
    if (user.error || !user.initialPassword) {
      console.error(`Skipping password reset for ${user.username} (creation failed)`);
      continue;
    }

    resultRecord.tokenResponse = null;
    resultRecord.userAccessToken = null;
    resultRecord.passwordChangeResponse = null;

    try {
      // Login as the user
      let tokenData;
      try {
        tokenData = await requestTokenForUser(user.username, user.initialPassword, adminToken);
        resultRecord.tokenResponse = tokenData;
      } catch (err) {
        // try a fallback: include no admin header
        try {
          const params = new URLSearchParams();
          params.append("grant_type", "username:password");
          params.append("username", user.username);
          params.append("password", user.initialPassword);

          const res = await axios.post(endpoints.token, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            timeout: 30000,
          });
          tokenData = res.data;
          resultRecord.tokenResponse = tokenData;
        } catch (err2) {
          throw new Error("Token request failed (both attempts). " + (err2?.message || err?.message));
        }
      }

      // Extract access token
      const userAccessToken =
        tokenData.access_token ||
        tokenData.accessToken ||
        tokenData.token ||
        tokenData.data?.access_token ||
        null;

      if (!userAccessToken) {
        resultRecord.error = "Login succeeded but no access token found in response";
        console.error(`Failed to get token for ${user.username}`);
        await wait(DELAY_MS);
        continue;
      }

      resultRecord.userAccessToken = userAccessToken;
      await wait(DELAY_MS);

      // Change password
      try {
        const changeRes = await changePasswordWithUserToken(userAccessToken, FINAL_PASSWORD);
        resultRecord.passwordChangeResponse = changeRes;
        console.error(`Password reset successful for ${i + 1}/${createdUsers.length}: ${user.username}`);
      } catch (err) {
        resultRecord.error = "Change password failed: " + (err?.response?.data ? JSON.stringify(err.response.data) : err?.message || String(err));
        console.error(`Failed to reset password for ${user.username}:`, resultRecord.error);
      }
    } catch (err) {
      resultRecord.error = (err?.response?.data && JSON.stringify(err.response.data)) || err.message || String(err);
      console.error(`Failed to process ${user.username}:`, resultRecord.error);
    }

    await wait(DELAY_MS);
  }

  // Save users and passwords to JSON file
  const usersData = {
    baseUrl: BASE_URL,
    createdAt: new Date().toISOString(),
    totalUsers: results.length,
    successfulUsers: results.filter((r) => !r.error && r.passwordChangeResponse).length,
    users: results.map((r) => ({
      username: r.username,
      password: r.passwordChangeResponse ? FINAL_PASSWORD : null,
      accountId: r.accountId,
      createdAt: r.createdAt,
      success: !r.error && r.passwordChangeResponse !== null,
      error: r.error || null,
    })),
  };

  try {
    const outputPath = path.resolve(OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(usersData, null, 2), "utf8");
    console.error(`Users data saved to: ${outputPath}`);
  } catch (err) {
    console.error(`Failed to save users data to file: ${err.message}`);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
