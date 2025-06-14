import mongoose from "mongoose";

global.mongoose = {
    conn: null,
    promise: null,
}

export async function dbConnect() {
    if(global.mongoose  && global.mongoose.conn) {
        console.log("Using existing database connection");
        return global.mongoose.conn;
    }else{
        const conString = process.env.MONGODB_URI || "mongodb://localhost:27017/portfolio";
        const promise = mongoose.connect(conString, {
            autoIndex: true,
        });
        global.mongoose = {
            conn: await promise,
            promise,
        }
        console.log("New database connection established");
        return await global.mongoose.conn;
    }

}
