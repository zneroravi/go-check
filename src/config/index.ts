export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH || "6", 10),
};
