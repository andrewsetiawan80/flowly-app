/**
 * Send a notification to a Slack incoming webhook URL
 */
export async function sendSlackNotification(
  webhookUrl: string,
  options: {
    text: string;
    taskTitle?: string;
    taskStatus?: string;
    taskPriority?: string;
    event?: string;
  }
): Promise<boolean> {
  try {
    const priorityEmoji: Record<string, string> = {
      LOW: ":white_circle:",
      MEDIUM: ":large_yellow_circle:",
      HIGH: ":large_orange_circle:",
      URGENT: ":red_circle:",
    };

    const statusEmoji: Record<string, string> = {
      TODO: ":clipboard:",
      DOING: ":hourglass_flowing_sand:",
      DONE: ":white_check_mark:",
      CANCELED: ":no_entry_sign:",
    };

    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:zap: *Flowly Notification*\n${options.text}`,
        },
      },
    ];

    if (options.taskTitle) {
      const fields = [];
      fields.push({
        type: "mrkdwn",
        text: `*Task:* ${options.taskTitle}`,
      });
      if (options.taskStatus) {
        fields.push({
          type: "mrkdwn",
          text: `*Status:* ${statusEmoji[options.taskStatus] || ""} ${options.taskStatus}`,
        });
      }
      if (options.taskPriority) {
        fields.push({
          type: "mrkdwn",
          text: `*Priority:* ${priorityEmoji[options.taskPriority] || ""} ${options.taskPriority}`,
        });
      }
      blocks.push({
        type: "section",
        fields,
      });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: options.text, // Fallback text
        blocks,
      }),
      signal: AbortSignal.timeout(10000),
    });

    return res.ok;
  } catch (err) {
    console.error("Slack notification failed:", err);
    return false;
  }
}
