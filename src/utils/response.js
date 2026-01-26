export const successResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
});

export const errorResponse = (message, errors) => ({
  success: false,
  message,
  errors,
});
