// middleware/validate.js
import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        errors: error.issues
      });
    }
    return res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};