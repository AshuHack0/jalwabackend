// Express middleware: validates req.body against Zod schema; on success sets req.validated, on failure returns 400.
export const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);

        if (result.success) {
            req.validated = result.data;
            return next();
        }

        // Extra safety in case result.error is missing or in an unexpected shape
        const zodError = result.error;
        const flattened = zodError?.flatten ? zodError.flatten() : { fieldErrors: {} };

        const firstMessage =
            zodError?.errors?.[0]?.message ||
            "Validation failed";

        return res.status(400).json({
            success: false,
            message: firstMessage,
            errors: flattened.fieldErrors,
        });
    } catch (err) {
        // If something goes wrong during validation itself, delegate to global error handler
        return next(err);
    }
};
