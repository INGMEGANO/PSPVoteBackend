import puppeteerCore from "puppeteer-core";
import puppeteerFull from "puppeteer";

export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return puppeteerCore.launch({
      headless: "new",
      executablePath:
        "/root/.cache/puppeteer/chrome/linux-144.0.7559.96/chrome-linux64/chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
  }

  // Local
  return puppeteerFull.launch({
    headless: true
  });
}
