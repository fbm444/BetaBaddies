import { readFile } from "fs/promises";
import { resolve } from "path";

async function main() {
  try {
    const frontendPackagePath = resolve(
      process.cwd(),
      "..",
      "frontend",
      "ats-tracker",
      "package.json"
    );

    const raw = await readFile(frontendPackagePath, "utf-8");
    const pkg = JSON.parse(raw);

    if (!pkg?.scripts?.build) {
      throw new Error(
        "Frontend package.json is missing a build script required for GitHub Actions."
      );
    }

    if (!pkg?.name) {
      throw new Error(
        "Frontend package.json must include a project name for GitHub Actions metadata."
      );
    }

    console.log("✅ Frontend GitHub Actions check passed: build script and name are present.");
  } catch (error) {
    console.error("❌ Frontend GitHub Actions check failed:", error.message);
    process.exit(1);
  }
}

await main();

