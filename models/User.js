const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        minlength: 8,
        select: false
    },
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpiry: Date,
    googleId: String,
    githubId: String,
    savedCodes: [{
        title: String,
        code: String,
        language: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    analysisHistory: [{
        code: String,
        language: String,
        analysis: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
    try {
        if (!this.isModified('password')) {
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        console.error('❌ Error hashing password:', error);
        throw error;
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('❌ Error comparing password:', error);
        return false;
    }
};

module.exports = mongoose.model('User', userSchema);
