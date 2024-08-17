import express from'express';
import fileUpload from'express-fileupload';
import path from'path';
import { fileURLToPath } from'url';
import cors from'cors';  // Import the cors package
import { v4 as uuidv4 } from'uuid';
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
    const { image } = req.files;

    // If no image submitted, exit
    if (!image) return res.sendStatus(400);
    const newUuid = uuidv4();
    // Move the uploaded image to our upload folder
    image.mv(path.join(__dirname, 'images', newUuid));

    // All good
    res.send({imageId: newUuid})
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
