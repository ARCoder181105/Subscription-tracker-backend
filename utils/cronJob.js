// cron/reminderCron.js
import cron from "node-cron";
import { Subscription } from "../models/subscription.js";
import { sendEmail } from "../utils/mailer.js";
import { ApiError } from './ApiError.js'

cron.schedule("0 8 * * *", async () => {
    console.log("🔔 Running daily subscription reminder...");

    try {
        const subs = await Subscription.find({ status: "Active" })
            .populate("userId", "email username");

        for (const sub of subs) {
            if (!sub.isInReminderWindow) continue;

            await sendEmail({
                to: sub.userId.email,
                subject: `Reminder: ${sub.platformName} payment due`,
                html: `
          <p>Hi ${sub.userId.username},</p>
          <p>Your subscription for <b>${sub.platformName}</b> 
          (${sub.price.amount} ${sub.price.currency}) is due on 
          <b>${sub.nextBillingDate.toDateString()}</b>.</p>
        `,
            });

            sub.lastReminderSent = new Date();
            await sub.save();
            console.log(`📩 Sent reminder to ${sub.userId.email}`);
        }
    } catch (err) {
        throw new ApiError(404, "❌ Reminder job failed", err);
    }
});
