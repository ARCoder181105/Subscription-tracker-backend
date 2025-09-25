// cron/reminderCron.js
import cron from "node-cron";
import { Subscription } from "../models/subscription.models.js";
import { sendReminderEmail, sendReminder1Day, sendReminderToday } from "../utils/mailer.js";

// Run every day at 8 AM
cron.schedule("0 8 * * *", async () => {
  console.log("🔔 Running subscription reminder job...");

  try {
    const subs = await Subscription.find({ status: "Active" })
      .populate("userId", "email username");

    for (const sub of subs) {
      if (!sub.isInReminderWindow) continue;

      const userEmail = sub.userId.email;
      const username = sub.userId.username;
      const platform = sub.platformName;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextBilling = new Date(sub.nextBillingDate);
      nextBilling.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((nextBilling - today) / (1000 * 60 * 60 * 24));

      // Different reminder mails based on days left
      if (diffDays > 1) {
        await sendReminderEmail(userEmail, platform);
      } else if (diffDays === 1) {
        await sendReminder1Day(userEmail, username, platform);
      } else if (diffDays === 0) {
        await sendReminderToday(userEmail, username, platform);
      }

      // mark reminder sent
      sub.lastReminderSent = new Date();
      await sub.save();
      console.log(`📩 Reminder email sent to ${userEmail} (${platform})`);
    }
  } catch (err) {
    console.error("❌ Reminder job failed:", err.message);
  }
});
