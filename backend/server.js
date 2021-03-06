const app= require('./app');

const connectDatabase = require('./config/database');

const dotenv = require('dotenv');
const bodyparser = require('body-parser')
const cloudinary = require('cloudinary')
//Handle the uncaught exceptions

process.on('uncaughtException', err =>{

    console.log(`Error: ${err.message}`);
    console.log('Shutting down due to uncaught exceptions.')
    process.exit(1);
})

//Setting up config file
dotenv.config({path:'backend/config/config.env'})

//connecting to DataBase
connectDatabase();

const server=app.listen(process.env.PORT, ()=>{

    console.log(`server started at port: ${process.env.PORT} in ${process.env.NODE_ENV} mode`)
});
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})
//Handle unhandle promise rejection

process.on('unhandledRejection',err =>{

    console.log(`ERROR: ${err.message}`);
    console.log("Shutting down the server due to unhandled promise rejection.");
    server.close(()=> {
        process.exit(1);
    });
})