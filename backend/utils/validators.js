const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["client", "freelancer"])
});

const jobSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  budget: z.number().positive("Budget must be a positive number"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  category: z.string().min(2, "Category is required")
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({ 
      success: false, 
      message: issues.map(e => e.message).join(', ') 
    });
  }
};

module.exports = {
  registerSchema,
  jobSchema,
  validate
};
