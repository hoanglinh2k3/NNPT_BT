const express = require("express");
const userRoutes = require("./routes/user.routes");
const roleRoutes = require("./routes/role.routes");

const app = express();

app.use(express.json());

app.use("/users", userRoutes);
app.use("/roles", roleRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});