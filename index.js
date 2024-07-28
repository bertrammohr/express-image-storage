const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;

// Set up storage engine
const storage = multer.memoryStorage(); // Store files in memory for processing

// Initialize upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 3000000
    }, // Limit file size to 3MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Check file type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|heic/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Public folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => res.send('Hello! Use /upload to upload an image.'));

app.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            res.status(400).send(err);
        } else {
            if (req.file == undefined) {
                res.status(400).send('Error: No File Selected!');
            } else {
                try {
                    const uploadDir = './uploads';
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir);
                    }

                    const filename = Date.now() + '.jpg';
                    const filepath = path.join(uploadDir, filename);

                    // Convert image to JPEG and save
                    await sharp(req.file.buffer)
                        .jpeg()
                        .toFile(filepath);

                    res.json({
                        message: 'File uploaded and converted successfully!',
                        file: `uploads/${filename}`
                    });
                } catch (error) {
                    res.status(500).send('Error processing image');
                }
            }
        }
    });
});

app.listen(port, () => console.log(`Server started on port ${port}`));