const User = require('../models/user');

const ErrorHandler = require('../utils/errorHandler');

const catchAysnError = require('../middlewares/catchAsyncError');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');

const crypto = require('crypto');
const cloudinary =require('cloudinary')

// Register a user

exports.registerUser = catchAysnError( async(req,res,next)=>{

    const result= await cloudinary.v2.uploader.upload(req.body.avatar,{
        folder:'avatars',
        width:150,
        crop:'scale'
    })
    const {name, email, password} = req.body;
    
    const user = await User.create({
        name,
        email,
        password,
        avatar:{
            public_id:result.public_id,
            url:result.secure_url
        }
    })
    

    

    
    sendToken(user, 200,res)
})

//Login User

exports.loginUser = catchAysnError(async(req,res,next) =>{

    const {email,password} = req.body;

    //Checks if email and password is entered by user
    if(!email || !password){

        return next(new ErrorHandler('Please enter email and password',400))
    }

    //Finding User in database
    const user = await User.findOne({email}).select('+password');

    if(!user){

        return next(new ErrorHandler('Invalid Email and Passowrd',401))
    }

    //checks if password is corrdct or not

    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched){

        return next(new ErrorHandler('Invalid Email and Passowrd',401));
    }
    sendToken(user, 200,res)
})

// Forgot password
exports.forgotPassword = catchAysnError(async (req,res,next)=>{

    const user = await User.findOne({email:req.body.email});
        if(!user){
            return next(new ErrorHandler('User not found',404));
        }
        // Get reset Token
        const resetToken = user.getResetPasswordToken();

        await user.save({validateBeforeSave:false})

        // Create reset password url
        const resetUrl = `${req.protocol}://${req.get('host')}/password/reset/${resetToken}`;

        const message = `Your password reset token is follow:\n\n${resetUrl}\n\n
        If you have not requested this email then ignore it.`
        try {
            await sendEmail({

                email: user.email,
                subject: 'Password Recovery',
                message
            })
            res.status(200).json({
                success:true,
                message:`Email sent to ${user.email}`
            })
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({validateBeforeSave:false});

            return next(new ErrorHandler(error.message,500))
        }
})

// Reset password
exports.resetPassword = catchAysnError(async (req,res,next)=>{


    //Hash URL token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({

        resetPasswordToken,
        resetPasswordExpire:{$gt:Date.now()}
    })
    if(!user){

        return next (new ErrorHandler('Password reset token is invalid or has been expired',400))
    }

    if(req.body.password !== req.body.confirmPassword){
        return next (new ErrorHandler('Password does not match',400))
    }

    //Setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user,200,res)
})

//Get currently Logged in  user Details

exports.getUserProfile = catchAysnError(async(req,res,next)=>{

    const user = await User.findById(req.user.id);

    res.status(200).json({

        success:true,
        user
    })
} )

//Update or Change password
exports.updatePassword = catchAysnError(async(req,res,next)=>{

    const user = await User.findById(req.user.id).select('+password');

    //check previous password

    const isMatched = await user.comparePassword(req.body.oldPassword)

    if(!isMatched){
        return next(new ErrorHandler('Old password is incorrect',400));
    }
    user.password =  req.body.password;

    await user.save();

    sendToken(user,200,res)

})

//Update User Profile

exports.updateProfile = catchAysnError(async(req,res,next)=>{

    const newUserData = {
        name:req.body.name,
        email:req.body.email
    }
    //Update Avatar
    if(req.body.avatar !== ''){
        const user = await User.findById(req.user.id)

        const image_id = user.avatar.public_id;

        const res= await cloudinary.v2.uploader.destroy(image_id);
        const result= await cloudinary.v2.uploader.upload(req.body.avatar,{
            folder:'avatars',
            width:150,
            crop:'scale'
        })

        newUserData.avatar = {
            public_id:result.public_id,
            url:result.secure_url
        }
    }

    const user = await User.findByIdAndUpdate(req.user.id,newUserData,{

        new:true,
        runValidators:true,
        useFindAndModify:false
    })
    res.status(200).json({

        success:true,

    })
})
//Logout user 

exports.logout = catchAysnError( async(req,res,next)=>{

     res.cookie('token',null,{

        expires:new Date(Date.now()),
        httpOnly: true,
        
        
     })
     res.status(200).json({
         success:true,
         message:"Logged out"
     })
})

//Admin Routes

//Get All Users
exports.allUsers = catchAysnError(async(req,res,next)=>{

    const users = await User.find();

    res.status(200).json({

        success:true,
        users
    })
})

//Get Specific User Details

exports.getUserDetails = catchAysnError(async(req,res,next)=>{

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`))
    }
    res.status(200).json({
        success:true,
        user
    })
})

//Update User Profile by Admin
exports.updateUser = catchAysnError(async(req,res,next)=>{

    const newUserData = {
        name:req.body.name,
        email:req.body.email,
        role:req.body.role
    }

    const user = await User.findByIdAndUpdate(req.params.id,newUserData,{

        new:true,
        runValidators:true,
        useFindAndModify:false
    })
    res.status(200).json({

        success:true,

    })
})

//Delete User

exports.deleteUser = catchAysnError(async(req,res,next)=>{

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`))
    }

    //Remove avatar from cloudinary: TODO
    await user.remove();
    res.status(200).json({
        success:true,
        
    })
})

