import jwt from "jsonwebtoken";


export default function auth(secret) {
return (req, res, next) => {
if (req.url.startsWith("/api")) {
const auth = req.headers["authorization"];
if (!auth || !auth.startsWith("Bearer ")) {
return res.status(401).json({ error: "Unauthorized" });
}
try {
const decoded = jwt.verify(auth.split(" ")[1], secret);
req.user = decoded;
} catch (e) {
return res.status(401).json({ error: "Invalid token" });
}
}
next();
};
}