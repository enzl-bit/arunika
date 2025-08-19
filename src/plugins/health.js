export default function health(app, opts = { path: "/status" }) {
app.get(opts.path, (req, res) => {
res.json({ status: "ok", uptime: process.uptime() });
});
}