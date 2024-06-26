const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const ip = require("my-ip");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
const DATA_DIR = process.env.DATA_DIR || "data";

const basePath = path.join(__dirname, DATA_DIR);

app.use(express.static("public"));
app.use("/data", express.static(basePath));
app.use(express.json());

// Function to recursively read directories and list files
function getDirectoryStructure(dir, relativePath = "") {
  const structure = [];
  const list = fs.readdirSync(dir);

  list.forEach((item) => {
    const absolutePath = path.join(dir, item);
    const relativeItemPath = path.join(relativePath, item);
    const stat = fs.statSync(absolutePath);

    if (stat && stat.isDirectory()) {
      structure.push({
        name: item,
        type: "folder",
        children: getDirectoryStructure(absolutePath, relativeItemPath),
      });
    } else if (item.endsWith(".pdf")) {
      structure.push({
        name: item,
        type: "file",
        path: relativeItemPath,
      });
    }
  });

  return structure;
}

// Route to get directory structure
app.get("/api/structure", (req, res) => {
  try {
    const structure = getDirectoryStructure(basePath);
    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: "Failed to read directory structure" });
  }
});

// Route to replace a PDF file
const upload = multer({ dest: basePath });
app.post("/api/replace-pdf", upload.single("pdfFile"), (req, res) => {
  const file = req.file;
  const fileName = req.body.fileName;
  const oldFilePath = path.join(basePath, req.body.oldFileName);

  if (!file) {
    res.status(400).json({ error: "No PDF file uploaded" });
    return;
  }

  if (!fs.existsSync(oldFilePath)) {
    res.status(404).json({ error: "Old PDF file not found" });
    return;
  }

  const dirPath = oldFilePath.split(path.sep).slice(0, -1).join(path.sep);
  const newFilePath = path.join(dirPath, fileName);
  fs.copyFile(file.path, newFilePath, (err) => {
    if (err) {
      console.error("Error copying new PDF file:", err);
      return res.status(500).json({ error: "Failed to replace PDF file" });
    } else {
      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.error("Error deleting old PDF file:", err);
          return res.status(500).json({ error: "Failed to replace PDF file" });
        } else {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.error("Error deleting temporary file:", err);
            }
          });
          return res.json({
            success: true,
            path: path.join(
              DATA_DIR,
              newFilePath.split(path.sep).slice(-3).join(path.sep)
            ),
          });
        }
      });
    }
  });
});

// Route to delete a PDF file
app.delete("/api/delete-pdf/:path", (req, res) => {
  const { path } = req.params;
  const filePath = path.join(basePath, path);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting PDF file:", err);
      return res.status(500).json({ error: "Failed to delete PDF file" });
    } else {
      return res.json({ success: true });
    }
  });
});

const PORT = process.env.PORT || 5000;
const MyIP = ip();

app.listen(PORT, () => {
  console.log(`Server started on http://${MyIP}:${PORT}`);
});
