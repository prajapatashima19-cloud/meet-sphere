// Fake environment variables so modules that read process.env at import time
// (passport config, mailer, jwt) don't blow up during tests.
// Real secrets must NEVER be committed — these are dummy test-only values.
process.env.JWT_SECRET = "test-jwt-secret";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GITHUB_CLIENT_ID = "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
process.env.SERVER_URL = "http://localhost:5000";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URL = "mongodb://127.0.0.1:27017/test-db";
process.env.SESSION_SECRET = "test-session-secret";