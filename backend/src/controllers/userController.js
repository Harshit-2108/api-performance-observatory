const User = require('../models/User');

// @desc    Update user notification preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updatePreferences = async (req, res, next) => {
  try {
    const { emailEnabled, slowThreshold } = req.body;

    if (emailEnabled === undefined || !slowThreshold) {
      return res.status(400).json({
        success: false,
        message: 'Please provide emailEnabled and slowThreshold'
      });
    }

    const thresholdVal = Number(slowThreshold);
    if (isNaN(thresholdVal) || thresholdVal < 100) {
      return res.status(400).json({
        success: false,
        message: 'Slow response threshold must be a number representing at least 100ms'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        notificationPreferences: {
          emailEnabled,
          slowThreshold: thresholdVal
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
