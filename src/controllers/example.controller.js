export const exampleController = {
  getExample: ({ query }) => {
    return {
      success: true,
      message: "Example GET endpoint",
      data: {
        query,
        timestamp: new Date().toISOString(),
      },
    };
  },

  createExample: ({ body }) => {
    return {
      success: true,
      message: "Example POST endpoint",
      data: body,
    };
  },
};
