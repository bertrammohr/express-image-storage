const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config()

const app = express();
const port = process.env.PORT || 3000;

// CORS options
const corsOptions = {
    origin: process.env.CORS_ORIGIN
};

// Use the CORS middleware with the specified options
app.use(cors(corsOptions));

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

const checkAuthorization = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader === process.env.API_KEY) {
      next(); // Authorization header is correct, proceed to the next middleware or route handler
    } else {
      res.status(401).json({ error: 'Unauthorized' }); // Authorization header is incorrect, respond with 401 Unauthorized
    }
};

const awaitedFileUploads = new Map();

// Public folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => res.send('Hello! Use /upload to upload an image.'));

app.post('/upload', (req, res) => {
    const imageName = req.query?.imageName;

    // console.log("#1")

    if (!imageName || !awaitedFileUploads.has(imageName)) {
        // console.log("#2")
        res.status(400).json({ error: 'No imageName or imageName is not allowed to post' });
        return 
    }

    const uploadType = awaitedFileUploads.get(imageName);

    // console.log("#3", uploadType, imageName);

    upload(req, res, async (err) => {
        if (err) {
            // console.log("#4");
            console.error(err);
            res.status(400).send(err);
        } else {
            // console.log("#5")
            if (req.file == undefined) {
                // console.log("#6")
                res.status(400).send('Error: No File Selected!');
            } else {
                // console.log("#7")
                try {
                    // console.log("#8")
                    const uploadDir = './uploads';
                    if (!fs.existsSync(uploadDir)) {
                        // console.log("#9")
                        fs.mkdirSync(uploadDir);
                    }
                    if (!fs.existsSync(path.join(uploadDir, uploadType))) {
                        fs.mkdirSync(path.join(uploadDir, uploadType))
                        // console.log("#9.5");
                    }

                    const filename = imageName + '.jpg';
                    const filepath = path.join(uploadDir, uploadType, filename);

                    // console.log("#10")
                    // Convert image to JPEG and save

                    // console.log(req.file.buffer);

                    await sharp(req.file.buffer)
                        .jpeg()
                        .toFile(filepath);
                    // console.log("#11")
                    res.json({
                        message: 'File uploaded and converted successfully!',
                        file: `uploads/${filename}`
                    });
                } catch (error) {
                    console.error(error);
                    // console.log("#12");
                    res.status(500).send('Error processing image');
                }
            }
        }
    });
});

app.get("/allowFileName", checkAuthorization, (req, res) => {
    const imageName = req.query?.imageName;
    const type = req.query?.type;

    if (!imageName || !type) {
        res.status(400).json({ error: 'Bad request' });
        return 
    }

    // console.log(`Adding ${imageName} to the awaitedFileUploads`);

    awaitedFileUploads.set(imageName, type);

    setTimeout(() => {
        awaitedFileUploads.delete(imageName);
        // console.log(`Removed ${imageName} from the awaitedFileUploads`);
    }, 60000)

    res.sendStatus(200);
})

// TODO
app.get("/deleteImage", checkAuthorization, (req, res) => {
    const imageName = req.query?.imageName;
    const type = req.query?.type;

    // console.log("delete", imageName, type)

    if (!imageName || !type) {
        // console.log("400")
        res.status(400).json({ error: 'Bad request' });
        return
    }

    // Attempt to delete file

    
    try {
        const imagePath = path.join("./uploads", type, imageName);
        fs.unlinkSync(`${imagePath}.jpg`);
        // console.log(`File ${imagePath} was deleted successfully`);
        res.status(200);
    } catch (err) {
        console.log(`Error deleting file`);
        console.error(err);
        res.status(500);
    }
})

app.listen(port, () => console.log(`Server started on port ${port}`));