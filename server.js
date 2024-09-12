const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("./models/Useres"); // Ensure this is the correct path to your User model

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://daneshkumar580:6Zc8LuLSF6hJvTDl@cluster0.9yxhkhc.mongodb.net/your_db_name",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

// Comments Section start //
// Define a Schema for Comments
const commentSchema = new mongoose.Schema({
  videoId: String,
  text: String,
  author: String,
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model("Comment", commentSchema);

// Routes
app.get("/comments/:videoId", async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.videoId });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/comments", async (req, res) => {
  const comment = new Comment({
    videoId: req.body.videoId,
    text: req.body.text,
    author: req.body.author,
  });
  try {
    const newComment = await comment.save();
    res.status(201).json(newComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Comments Section End //

      // Text Poll section start //
let communityData = [];
app.post("/api/submit", (req, res) => {
  const { question, addition1, addition2 } = req.body;

  // Simulate saving data to a database
  const newEntry = { question, addition1, addition2 };
  communityData.push(newEntry);

  console.log("Received data:", newEntry);

  res
    .status(200)
    .json({ message: "Data received successfully", data: newEntry });
});
app.get("/api/data", (req, res) => {
  res.status(200).json({ data: communityData });
});
      // TextPoll section end //

//  Video Upload Section  start //
const videoSchema = new mongoose.Schema({
  description: String,
  title: String,
  videoPath: String,
});

const Video = mongoose.model("Video", videoSchema);

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    console.log({ file });
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB in bytes
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed!"), false);
    }
    cb(null, true);
  },
});

// API to upload a video
app.post("/upload", upload.single("video"), async (req, res) => {
  const { title } = req.body;
  const { description } = req.body;
  try {
    const video = new Video({
      description,
      title,
      videoPath: req.file.path,
    });
    await video.save();
    res.status(201).json({ message: "Video uploaded successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to upload video", error: err.message });
  }
});

// API to fetch all videos
app.get("/videos", async (req, res) => {
  try {
    const searchQuery = req.query.q;
    let videos;
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i"); // 'i' makes the search case-insensitive
      videos = await Video.find({
        $or: [{ title: regex }, { description: regex }], // Search in both title and description fields
      });
    } else {
      // If no search query, return all videos
      videos = await Video.find({});
    }

    res.status(200).json(videos);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch videos", error: err.message });
  }
});


// API to delete a video
app.delete("/videos/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    fs.unlink(path.join(__dirname, video.videoPath), (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ message: "Failed to delete video file" });
      }
    });

    await Video.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Video deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete video", error: err.message });
  }
});

// API to PUT a videos
app.put("/videos/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedVideo = await Video.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json(updatedVideo);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update video", error: err.message });
  }
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

//  Video Upload Section  start //

// Register route
app.post("/api/user/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login route
app.post("/api/user/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, "your_jwt_secret", {
      expiresIn: "1h",
    });
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
