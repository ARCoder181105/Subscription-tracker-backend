import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Subscription } from '../models/subscription.models.js'
import { User } from '../models/user.models.js';

export const getUserSubscriptions = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const subscriptions = await Subscription.find({ userId })
            .sort({ nextBillingDate: 1 })
            .lean();

        // if (!subscriptions || subscriptions.length === 0) {
        //     throw new ApiError(404, "No subscriptions found");
        // }

        return res
            .status(200)
            .json(new ApiResponse(200, subscriptions, "Subscriptions fetched successfully"));
    } catch (error) {
        console.error("Unable to fetch subscription list", error);
        next(error instanceof ApiError ? error : new ApiError(500, "Unexpected error"));
    }
};

export const getUserSubscriptionById = async (req, res, next) => {
    try {
        const { _id: userId } = req.user;
        const { id: subscriptionId } = req.params;

        if (!subscriptionId || !userId) {
            throw new ApiError(400, "Missing subscriptionId or userId");
        }

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (subscription.userId.toString() !== userId.toString()) {
            throw new ApiError(403, "Forbidden: You cannot access this subscription");
        }

        res.status(200).json(
            new ApiResponse(200, { subscription }, "Subscription fetched successfully")
        );
    } catch (error) {
        console.error("Error in fetching subscription", error);
        next(error instanceof ApiError ? error : new ApiError(500, "Unexpected error"));
    }
};

export const addUserSubscriptions = async (req, res, next) => {
    try {
        const { _id: userId } = req.user;

        const {
            platformName,
            price,
            billingCycle,
            startDate,
            status,
            category,
            reminderDaysBefore,
        } = req.body;

        if (!platformName || !price || !billingCycle || !startDate) {
            throw new ApiError(400, "Required fields missing");
        }

        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate)) {
            throw new ApiError(400, "Invalid startDate");
        }

        const newSubscription = new Subscription({
            userId,
            platformName,
            price: {
                amount: price.amount,
                currency: price.currency
            },
            billingCycle,
            startDate: parsedStartDate,
            status,
            category,
            reminderDaysBefore
        });

        const savedSubscription = await newSubscription.save();

        res.status(201).json(
            new ApiResponse(201, { subscription: savedSubscription }, "Subscription saved successfully")
        );
    } catch (error) {
        console.error("Unable to add subscription", error);
        next(new ApiError(500, "Unable to add subscription"));
    }
};

export const editUserSubscription = async (req, res, next) => {
    try {
        const { id: subscriptionId } = req.params;
        const { _id: userId } = req.user;

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (subscription.userId.toString() !== userId.toString()) {
            throw new ApiError(403, "Forbidden: You cannot edit this subscription");
        }

        const updateData = req.body;

        Object.keys(updateData).forEach(key => {
            if (key === "price" && typeof updateData.price === "object") {
                subscription.price = { ...subscription.price, ...updateData.price };
            } else {
                subscription[key] = updateData[key];
            }
        });

        const updatedSubscription = await subscription.save();

        res.status(200).json(
            new ApiResponse(200, { subscription: updatedSubscription }, "Subscription updated successfully")
        );
    } catch (error) {
        console.error("Error updating subscription", error);
        next(error instanceof ApiError ? error : new ApiError(500, "Unexpected error"));
    }
};

export const deleteUserSubscription = async (req, res, next) => {
    try {
        const { _id: userId } = req.user;
        const { id: subscriptionId } = req.params;

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (subscription.userId.toString() !== userId.toString()) {
            throw new ApiError(403, "Forbidden: You cannot delete this subscription");
        }

        await Subscription.deleteOne({ _id: subscriptionId });

        res.status(200).json(
            new ApiResponse(200, null, "Subscription deleted successfully")
        );
    } catch (error) {
        console.error("Unable to delete subscription", error);
        next(new ApiError(500, "Unable to delete subscription"));
    }
};

export const markSubsCriptionAsDone = async (req, res, next) => {
    try {
        const { id: subscriptionId } = req.params;
        const { _id: userId } = req.user;
        const { paidDate } = req.body; // <-- moved to body

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (subscription.userId.toString() !== userId.toString()) {
            throw new ApiError(403, "Forbidden: You cannot update this subscription");
        }

        await subscription.markAsPaid(paidDate);

        res.status(200).json(
            new ApiResponse(200, { subscription }, "Subscription marked as paid successfully")
        );
    } catch (error) {
        console.error("Error marking subscription as paid", error);
        next(new ApiError(500, "Error marking subscription as paid"));
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const { _id: userId } = req.user;

        // Example: Find user by userId (you can adjust logic as needed)
        const user = await User.findOne({ _id: userId }).select('-password -googleId -githubId -refreshToken -__v');

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // console.log( new ApiResponse(200, { user: user }, "User profile fetched successfully"));

        res.status(200).json(
            new ApiResponse(200, { user: user }, "User profile fetched successfully")
        );
    } catch (error) {
        console.error("Error fetching user profile", error);
        next(error instanceof ApiError ? error : new ApiError(500, "Unexpected error"));
    }
}