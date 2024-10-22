import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import type { PaperFormat } from "puppeteer";
import puppeteer from "puppeteer";
import { z, ZodError, type ZodIssue } from "zod";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.json({ status: "ok", time: new Date().toLocaleString(), host: "some" });
});

app.get("/pdf", async (c) => {
  const paramsSchema = z.object({
    url: z.string().url(),
    printBackground: z.string().default("false"),
    format: z.string().default("A4"),
  });

  const options = paramsSchema.parse(c.req.query());

  const browser = await puppeteer.launch({
    args: [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=9222",
      "--remote-debugging-address=0.0.0.0",
    ],
  });

  const page = await browser.newPage();

  // set A4 viewport  1440px
  await page.setViewport({
    width: 1440, // 1400
    height: 900, //
    deviceScaleFactor: 1,
  });

  //go to page
  await page.goto(options.url, { waitUntil: "networkidle2" });

  const pdf = await page.pdf({
    format: options.format as PaperFormat,
    printBackground: options.printBackground === "true",
  });

  await page.close();

  await browser.close();

  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", "filename=sample.pdf");
  return c.body(pdf);
});

app.notFound((c) => {
  c.status(404);
  return c.json({ message: "Not found " + c.req.url, status: 404 });
});

app.onError((err, c) => {
  console.error(err);
  if (err instanceof ZodError) {
    const messages = err.errors.map((issue: ZodIssue) => ({
      message: issue.message,
      error: issue.code,
      path: issue.path.join("."),
    }));

    return c.json({ message: messages, status: 400, type: "zod" });
  }

  return c.json({ message: "Something went wrong", status: 500 });
});

const port = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port }, () => console.log(`Server is running on port http://localhost:${port}`));
