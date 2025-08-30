import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const db = await mongoose.connect(`${process.env.MONGODB_URI}/subsDB`)
        console.log(`\n ✅MongoDB connected !! DB HOST: ${db.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}