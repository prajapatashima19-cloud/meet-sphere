import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  console.log("MIDDLEWARE HIT");

  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("TOKEN:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED USER:", decoded);

    req.user = decoded; 
    next();

  } catch (err) {
    console.log("JWT ERROR:", err.message);

    return res.status(401).json({
      message: err.message,
    });
  }
};

export default authenticate;
