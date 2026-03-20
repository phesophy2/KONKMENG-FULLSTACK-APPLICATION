// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Log error for debugging
    console.error('❌ ERROR:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        path: req.path,
        method: req.method
    });
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(e => e.message).join(', ');
        err = new AppError(message, 400);
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        err = new AppError(`${field} already exists`, 400);
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        err = new AppError('Invalid token', 401);
    }
    
    if (err.name === 'TokenExpiredError') {
        err = new AppError('Token expired', 401);
    }
    
    // Send error response
    res.status(err.statusCode).json({
        success: false,
        error: err.message,
        status: err.status,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Async handler wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
