import puppeteerCore from "puppeteer-core";
import puppeteerFull from "puppeteer";
import fs from "fs";

export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const chromePath = "/usr/bin/google-chrome";

    if (!fs.existsSync(chromePath)) {
      throw new Error("Google Chrome no está instalado en el contenedor");
    }

    return puppeteerCore.launch({
      headless: "new",
      executablePath: chromePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
  }

  // Local (Windows / Linux / Mac)
  return puppeteerFull.launch({
    headless: true
  });
}
