const fs = require("fs");
const path = require("path");

console.log("=== BUILD ENV ===");
console.log("Node:", process.version);
console.log("Platform:", process.platform);
console.log("Arch:", process.arch);
console.log(
  "Package manager:",
  process.env.npm_config_user_agent || "unknown"
);

console.log("\n=== PACKAGE RESOLUTION ===");

for (const pkg of [
  "agora-agent-uikit",
  "agora-agent-uikit/rtc",
  "agora-rtc-react",
  "agora-agent-client-toolkit",
]) {
  try {
    console.log(`\n${pkg}`);
    console.log("resolved:", require.resolve(pkg));
  } catch (error) {
    console.error(`FAILED TO RESOLVE ${pkg}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log("\n=== AGORA AGENT UIKIT PACKAGE ===");

try {
  const entry = require.resolve("agora-agent-uikit");
  const distDir = path.dirname(entry);
  const packageRoot = path.dirname(distDir);
  const packageJsonPath = path.join(packageRoot, "package.json");

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8")
  );

  console.log("package root:", packageRoot);
  console.log("version:", packageJson.version);
  console.log("main:", packageJson.main);
  console.log("module:", packageJson.module);
  console.log(
    "exports:",
    JSON.stringify(packageJson.exports, null, 2)
  );

  const baseMjs = path.join(packageRoot, "dist", "index.mjs");
  const rtcMjs = path.join(packageRoot, "dist", "rtc", "index.mjs");

  console.log("\n=== ESM FILE CHECK ===");

  if (fs.existsSync(baseMjs)) {
    const contents = fs.readFileSync(baseMjs, "utf8");

    console.log("base index.mjs:", baseMjs);
    console.log(
      "contains AgentVisualizer:",
      contents.includes("AgentVisualizer")
    );
  } else {
    console.log("MISSING:", baseMjs);
    process.exitCode = 1;
  }

  if (fs.existsSync(rtcMjs)) {
    const contents = fs.readFileSync(rtcMjs, "utf8");

    console.log("rtc index.mjs:", rtcMjs);
    console.log(
      "contains MicButtonWithVisualizer:",
      contents.includes("MicButtonWithVisualizer")
    );
  } else {
    console.log("MISSING:", rtcMjs);
    process.exitCode = 1;
  }
} catch (error) {
  console.error("FAILED TO INSPECT AGORA AGENT UIKIT");
  console.error(error);
  process.exitCode = 1;
}