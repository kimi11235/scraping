import { createClient } from "@supabase/supabase-js";
import { scrapeWithRemoteBrowser, type ScrapedJob } from "./scraper.ts";

// スクレイピング対象のURL
const TARGET_URL = "https://jp.indeed.com/jobs?q=python&l=東京";

// Supabaseクライアントの初期化
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials are not set");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * スクレイピングを実行し、結果をデータベースに保存する
 */
async function runScraping() {
  console.log("Starting scraping job...");
  
  const jobs = await scrapeWithRemoteBrowser(TARGET_URL);
  
  if (jobs.length === 0) {
    console.log("No jobs found");
    return;
  }

  console.log(`Found ${jobs.length} jobs`);

  // データベースのカラム名に合わせてキーを変換
  const dbJobs = jobs.map((job: ScrapedJob) => ({
    title: job.title,
    company_name: job.companyName,
    location: job.location,
    salary: job.salary,
    source_url: job.sourceUrl
  }));

  const { error } = await supabase.from("jobs").insert(dbJobs);

  if (error) {
    if (error.code === "23505") {
      console.log("Some jobs were already in the database (duplicate entries)");
    } else {
      console.error("Database error:", error);
    }
  } else {
    console.log(`Successfully inserted ${jobs.length} jobs`);
  }
}

// 日本時間の午前9時に実行するようにスケジュール設定
Deno.cron("Daily Job Scraping", "0 9 * * *", () => {
  runScraping();
});

// 初回実行（開発時のテスト用）
await runScraping(); 