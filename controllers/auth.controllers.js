import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import { sendLoginMail, sendLogOutMail, sendWelcomeMail } from "../utils/mailer.js";

const DEFAULT_AVATAR = "https://icons.veryicon.com/png/o/miscellaneous/rookie-official-icon-gallery/225-default-avatar.png";



const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

export const registerUser = async (req, res, next) => {
    try {
        console.log(req.body);
        const { username, email, password } = req.body;

        if ([email, username, password].some((field) => !field || field.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        let avatarUrl = DEFAULT_AVATAR;
        if (req.file?.path) {
            const uploaded = await uploadOnCloudinary(req.file.path);
            if (uploaded?.secure_url) {
                avatarUrl = uploaded.secure_url;
            }
        }

        const user = new User({
            username,
            email,
            password,
            avatar: avatarUrl,
        });

        await user.save();

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (createdUser) {
            sendWelcomeMail(createdUser.email, createdUser.username)
        }

        return res.status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(201, {
                    user: createdUser, accessToken, refreshToken
                }, "User registered successfully")
            );

    } catch (error) {
        console.error("Register error:", error);
        next(new ApiError(500, "Something went wrong while registering"));
    }
};

export const loginUser = async (req, res, next) => {
    // console.log(req);
    const { username, password } = req.body;
    try {

        const user = await User.findOne({ username: username });

        const isMatch = user.isPasswordCorrect(password)

        if (!isMatch) {
            throw new ApiError(401, "Invalid Credentials");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (createdUser) {
            sendLoginMail(createdUser.email, createdUser.username);
        }

        return res.status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(201, {
                    user: createdUser, accessToken, refreshToken
                }, "User Logged In successfully")
            );


    } catch (error) {
        console.error("Register error:", error);
        next(new ApiError(500, "Something went wrong while login"));
    }

}

export const googleAuthCallback = async (req, res, next) => {
    try {
        const user = req.user; // already from DB

        if (!user) throw new ApiError(400, "Google authentication failed");

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        res.cookie("accessToken", accessToken, options);
        res.cookie("refreshToken", refreshToken, options);

        // instead of sending JSON, redirect to frontend app
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
        console.error("Google Auth Callback Error:", error);
        next(new ApiError(500, "Something went wrong while Google login"));
    }
};

export const githubAuthCallback = async (req, res, next) => {
    try {
        const user = req.user; // already from DB

        if (!user) throw new ApiError(400, "GitHub authentication failed");

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            // path: "/api/v1/auth/refresh", // important!
        };

        res.cookie("accessToken", accessToken, options);
        res.cookie("refreshToken", refreshToken, options);

        // instead of sending JSON, redirect to frontend app
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
        console.error("GitHub callback error:", error);
        next(new ApiError(500, "Something went wrong while github login"));
    }
};

export const getNewAcessToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new ApiError(401, "Refresh token missing");
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decoded._id);

        if (!user || user.refreshToken !== refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Generate new tokens
        const accessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        // Save new refresh token
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        console.error("Refresh token error:", error);
        next(new ApiError(401, "Could not refresh token, please login again"));
    }
};

export const logoutUser = async (req, res, next) => {
    try {
        const userId = req.user._id;

        await User.findByIdAndUpdate(userId, { refreshToken: null });

        // Clear cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        if (req.user && req.user.email && req.user.username) {
            sendLogOutMail(req.user.email, req.user.username);
        }

        return res
            .status(200)
            .json(new ApiResponse(200, "Logged out successfully"));
    } catch (error) {
        next(new ApiError(500, "Something went wrong while logging out"));
    }
};
//future aspects is to implement forgot password functionality we can send a special link to email to reset the password

