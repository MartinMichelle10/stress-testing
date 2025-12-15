// login-users.js
// Script to login all users from users.json and generate CSV file with tokens

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

// Configuration
const USERS_FILE = args["users-file"] || process.env.USERS_FILE || "users.json";
const OUTPUT_CSV = args["output"] || process.env.OUTPUT_CSV || "tokens.csv";
const BASE_URL = args["base-url"] || process.env.BASE_URL || "https://qa-env.eastus2.cloudapp.azure.com";
const DELAY_MS = parseInt(args["delay"] || process.env.DELAY || "300", 10);

const endpoints = {
  token: `${BASE_URL}/api/identity/v1/token`,
};

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginUser(username, password) {
  const params = new URLSearchParams();
  params.append("grant_type", "username:password");
  params.append("username", username);
  params.append("password", password);

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json, text/plain, */*",
    "x-client-timestamp": new Date().toISOString(),
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
    
    const accessToken =
      tokenData.access_token ||
      tokenData.accessToken ||
      tokenData.token ||
      tokenData.data?.access_token ||
      null;

    return accessToken;
  } catch (err) {
    throw new Error(`Login failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
  }
}

async function main() {
  // Read users.json
  const usersFilePath = path.resolve(USERS_FILE);
  if (!fs.existsSync(usersFilePath)) {
    console.error(`ERROR: Users file not found: ${usersFilePath}`);
    process.exit(1);
  }

  let usersData;
  try {
    const fileContent = fs.readFileSync(usersFilePath, "utf8");
    usersData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`ERROR: Failed to read or parse users file: ${err.message}`);
    process.exit(1);
  }

  if (!usersData.users || !Array.isArray(usersData.users)) {
    console.error("ERROR: Invalid users.json format. Expected 'users' array.");
    process.exit(1);
  }

  const users = usersData.users;
  console.error(`Found ${users.length} users in ${USERS_FILE}`);

  // Use fixed password for all users
  const password = "P@ssw0rd1";

  // Login all users and collect tokens
  const tokens = [];
  console.error(`Logging in ${users.length} users with password: ${password}...`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const username = user.username;

    if (!username) {
      console.error(`Skipping user ${i + 1}: missing username`);
      continue;
    }

    try {
      const token = await loginUser(username, password);
      if (token) {
        tokens.push(token);
        console.error(`Login successful ${i + 1}/${users.length}: ${username}`);
      } else {
        console.error(`Login failed ${i + 1}/${users.length} (${username}): No token in response`);
      }
    } catch (err) {
      console.error(`Login failed ${i + 1}/${users.length} (${username}): ${err.message}`);
    }

    await wait(DELAY_MS);
  }

  // Generate CSV file
  const csvPath = path.resolve(OUTPUT_CSV);
  const csvLines = ["token"];
  csvLines.push(...tokens);

  try {
    fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
    console.error(`CSV file generated: ${csvPath}`);
    console.error(`Total tokens: ${tokens.length}`);
  } catch (err) {
    console.error(`ERROR: Failed to write CSV file: ${err.message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

