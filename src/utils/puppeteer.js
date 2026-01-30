import puppeteerCore from "puppeteer-core";
import puppeteerFull from "puppeteer";

export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // 👉 EasyPanel / Docker
    return puppeteerCore.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
  }

  // 👉 Local (Windows / Mac / Linux)
  return puppeteerFull.launch({
    headless: true
  });
}
