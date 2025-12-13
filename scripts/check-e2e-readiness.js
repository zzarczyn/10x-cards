#!/usr/bin/env node

/**
 * E2E Readiness Check Script
 * Verifies that the environment is ready for running E2E tests
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    log(`✅ ${description}`, "green");
    return true;
  } else {
    log(`❌ ${description}`, "red");
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(rootDir, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

  if (exists) {
    log(`✅ ${description}`, "green");
    return true;
  } else {
    log(`⚠️  ${description} (will be created automatically)`, "yellow");
    return true; // Not critical
  }
}

async function checkServer() {
  try {
    const response = await fetch("http://localhost:4321");
    if (response.ok || response.status < 500) {
      log("✅ Development server is running on http://localhost:4321", "green");
      return true;
    }
  } catch (error) {
    log("❌ Development server is NOT running on http://localhost:4321", "red");
    log("   Run: npm run dev", "yellow");
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(rootDir, ".env.test");

  if (!fs.existsSync(envPath)) {
    log("❌ .env.test file does not exist", "red");
    log("   Create it from env.test.example", "yellow");
    return false;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const hasBaseUrl = content.includes("BASE_URL");
  const hasEmail = content.includes("TEST_USER_EMAIL");
  const hasPassword = content.includes("TEST_USER_PASSWORD");

  if (hasBaseUrl && hasEmail && hasPassword) {
    log("✅ .env.test file exists and contains required variables", "green");
    return true;
  } else {
    log("⚠️  .env.test file exists but may be missing some variables", "yellow");
    if (!hasBaseUrl) log("   Missing: BASE_URL", "yellow");
    if (!hasEmail) log("   Missing: TEST_USER_EMAIL", "yellow");
    if (!hasPassword) log("   Missing: TEST_USER_PASSWORD", "yellow");
    return false;
  }
}

async function main() {
  log("\n🔍 E2E Testing Environment Readiness Check\n", "cyan");

  const checks = [];

  // Check files
  log("📁 Checking configuration files...", "blue");
  checks.push(checkFile("playwright.config.ts", "Playwright config exists"));
  checks.push(checkFile("e2e/global.setup.ts", "Global setup file exists"));
  checks.push(checkEnvFile());
  checks.push(checkFile("env.test.example", "Example env file exists"));

  log("\n📂 Checking directories...", "blue");
  checks.push(checkDirectory("e2e", "E2E test directory exists"));
  checks.push(checkDirectory("e2e/pages", "Page objects directory exists"));
  checks.push(checkDirectory("e2e/page-objects", "Component objects directory exists"));
  checkDirectory("e2e/.auth", "Auth directory exists");

  log("\n🌐 Checking development server...", "blue");
  const serverRunning = await checkServer();
  checks.push(serverRunning);

  log("\n📦 Checking Playwright installation...", "blue");
  try {
    const { execSync } = await import("child_process");
    const version = execSync("npx playwright --version", { encoding: "utf-8" });
    log(`✅ Playwright is installed: ${version.trim()}`, "green");
    checks.push(true);
  } catch (error) {
    log("❌ Playwright is not installed", "red");
    log("   Run: npm install", "yellow");
    checks.push(false);
  }

  // Summary
  log("\n" + "=".repeat(60), "cyan");
  const passed = checks.filter(Boolean).length;
  const total = checks.length;

  if (passed === total) {
    log(`\n✅ ALL CHECKS PASSED (${passed}/${total})`, "green");
    log("\n🚀 You are ready to run E2E tests!", "green");
    log("\nRun: npm run test:e2e:ui", "cyan");
  } else {
    log(`\n⚠️  SOME CHECKS FAILED (${passed}/${total})`, "yellow");
    log("\n📋 Please fix the issues above before running tests.", "yellow");
    log("\nFor detailed instructions, see: E2E_READINESS_CHECK.md", "cyan");
  }

  log("\n" + "=".repeat(60) + "\n", "cyan");

  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  log(`\n❌ Error running checks: ${error.message}`, "red");
  process.exit(1);
});
