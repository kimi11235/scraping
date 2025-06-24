// スクレイピングで取得するデータの型定義
export interface ScrapedJob {
  title: string;
  companyName: string;
  location: string;
  salary: string;
  sourceUrl: string;
}

/**
 * Browserless.ioを使用してIndeedの求人情報をスクレイピングする
 * @param url スクレイピング対象のURL
 * @returns 求人情報の配列
 */
export async function scrapeWithRemoteBrowser(url: string): Promise<ScrapedJob[]> {
  try {
    const apiKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!apiKey) {
      throw new Error("BROWSERLESS_API_KEY is not set");
    }

    const response = await fetch(`https://chrome.browserless.io/scrape?token=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        elements: [
          {
            selector: "div.job_seen_beacon",
            multiple: true,
            elements: [
              {
                selector: "h2.jobTitle span[title]",
                as: "title"
              },
              {
                selector: "span.companyName",
                as: "companyName"
              },
              {
                selector: "div.companyLocation",
                as: "location"
              },
              {
                selector: "div.salary-snippet-container",
                as: "salary"
              },
              {
                selector: "h2.jobTitle a",
                as: "sourceUrl",
                attribute: "href"
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const results = json.data?.[0]?.results || [];

    return results
      .map((job: Record<string, string>) => ({
        title: job.title || "",
        companyName: job.companyName || "",
        location: job.location || "",
        salary: job.salary || "",
        sourceUrl: job.sourceUrl ? new URL(job.sourceUrl, "https://jp.indeed.com").href : ""
      }))
      .filter((job: ScrapedJob) => job.title && job.sourceUrl);

  } catch (error) {
    console.error("Scraping error:", error);
    return [];
  }
} 