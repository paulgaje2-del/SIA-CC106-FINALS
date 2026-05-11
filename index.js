// index.js
import express from "express";
import mysql from "mysql2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 3000; // Render assigns PORT dynamically
const SECRET_KEY = process.env.JWT_SECRET || "smartattend_secret_key";

// Middleware
app.use(express.json());

// Database connection (use environment variables in Render dashboard)
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "your_password",
    database: process.env.DB_NAME || "smartattend",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Authentication Route
app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: "User not found" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.user_id, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ token });
    });
});

// Students Routes
app.get("/api/students", (req, res) => {
    db.query("SELECT * FROM students", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post("/api/students", (req, res) => {
    const { name, class_name } = req.body;
    db.query("INSERT INTO students (name, class) VALUES (?, ?)", [name, class_name], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student added", id: result.insertId });
    });
});

// Attendance Routes
app.post("/api/attendance", (req, res) => {
    const { student_id, class_id, date, status } = req.body;
    db.query("INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)",
        [student_id, class_id, date, status], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Attendance recorded", id: result.insertId });
        });
});

app.get("/api/attendance/:class_id", (req, res) => {
    const { class_id } = req.params;
    db.query("SELECT * FROM attendance WHERE class_id = ?", [class_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Health check route (important for Render)
app.get("/", (req, res) => {
    res.send("SmartAttend backend is running ✅");
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
