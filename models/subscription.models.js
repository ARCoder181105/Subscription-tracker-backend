import mongoose from 'mongoose';

// 🔹 Utility: Calculate next billing date based on cycle
const calculateNextDate = (startDate, cycle) => {
    const date = new Date(startDate);
    switch (cycle) {
        case 'Weekly': date.setDate(date.getDate() + 7); break;
        case 'Monthly': date.setMonth(date.getMonth() + 1); break;
        case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
        case 'Yearly': date.setFullYear(date.getFullYear() + 1); break;
        default: date.setMonth(date.getMonth() + 1);
    }
    return date;
};

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // user-wise lookups
    },
    platformName: {
        type: String,
        required: true,
        trim: true,
        set: v => v && typeof v === 'string'
            ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
            : v
    },
    price: {
        amount: { type: Number, required: true, min: 0 },
        currency: {
            type: String,
            required: true,
            enum: ['USD', 'EUR', 'INR', 'GBP', 'JPY'],
            default: 'INR'
        }
    },
    billingCycle: {
        type: String,
        required: true,
        enum: ['Weekly', 'Monthly', 'Quarterly', 'Yearly'],
        default: 'Monthly'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    nextBillingDate: {
        type: Date,
        required: false,
        index: true // needed for cron reminders
    },
    status: {
        type: String,
        enum: ['Active', 'Cancelled', 'Paused', 'Expired'],
        default: 'Active',
        index: true // faster filtering in cron
    },
    category: {
        type: String,
        required: true,
        default: 'Other'
    },
    reminderDaysBefore: {
        type: Number,
        default: 3, // send reminders 3 days before billing
        min: 0,
        max: 30
    },
    lastReminderSent: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


// 🔹 Auto-calculate next billing date before save
subscriptionSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('startDate') || this.isModified('billingCycle')) {
        this.nextBillingDate = calculateNextDate(this.startDate, this.billingCycle);
    }
    next();
});


// 🔹 Mark subscription as paid and set new billing cycle
subscriptionSchema.methods.markAsPaid = async function (paidDate = null) {
    const effectiveDate = paidDate ? new Date(paidDate) : new Date();
    this.startDate = effectiveDate;
    this.nextBillingDate = calculateNextDate(effectiveDate, this.billingCycle);
    return await this.save();
};


// 🔹 Mark subscription as expired
subscriptionSchema.methods.markAsExpired = async function () {
    this.status = 'Expired';
    return await this.save();
};


// Virtual: check if subscription is in reminder window
subscriptionSchema.virtual('isInReminderWindow').get(function () {
    if (!this.nextBillingDate || this.status !== 'Active') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminderStart = new Date(this.nextBillingDate);
    reminderStart.setDate(reminderStart.getDate() - this.reminderDaysBefore);

    //avoid duplicate reminders (if already sent today)
    if (this.lastReminderSent) {
        const lastSent = new Date(this.lastReminderSent);
        lastSent.setHours(0, 0, 0, 0);
        if (lastSent.getTime() === today.getTime()) return false;
    }

    return today >= reminderStart && today <= this.nextBillingDate;
});


// Compound indexes (optimize queries for cron + user dashboards)
subscriptionSchema.index({ status: 1, nextBillingDate: 1, userId: 1 });


export const Subscription = mongoose.model('Subscription', subscriptionSchema);
