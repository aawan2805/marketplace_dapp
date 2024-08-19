import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';  // Import the cors package
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const app = express();
const port = 8080;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

app.use(
    fileUpload({
        limits: {
            fileSize: 10000000,
        },
        abortOnLimit: true,
    })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/api/images', (req, res) => {
    // Get the file that was set to our field named "image"
    console.log(req.files.image)
    const { image } = req.files;

    // If no image submitted, exit
    if (!image) return res.sendStatus(400);

    const newUuid = uuidv4();

    // Create 'images' directory if it doesn't exist
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
    }

    // Move the uploaded image to our upload folder
    const imagePath = path.join(imagesDir, newUuid);
    image.mv(imagePath);

    // All good
    res.send({ imageId: newUuid });
});

// Return an image by ID
app.get('/api/images/:imageID', (req, res) => {
    const imageId = req.params.imageID;
    const imagePath = path.join(__dirname, 'images', imageId);

    // Check if the image exists
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.sendStatus(404);  // Image not found
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
