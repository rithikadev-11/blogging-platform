const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public')); // For serving static files

// MongoDB URI
const mongoURI = 'mongodb://localhost:27017/cms';

// Create MongoDB connection
mongoose.connect(mongoURI);
const db = mongoose.connection;
db.on('error', () => console.log("Error in connecting to the database"));
db.once('open', () => console.log("Connected to Database"));

// Define Mongoose Schema and Model
const contentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    categoryId: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], required: true },
    featuredImage: { type: String }, // URL to the image
});

const Content = mongoose.model('Content', contentSchema);

// Set up multer for file uploads
const upload = multer({ 
    dest: 'uploads/', // Directory to save uploaded files
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

app.post('/api/content', upload.single('image'), async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        console.log('Uploaded File:', req.file);
        const { title, content, categoryId } = req.body; // Ensure categoryId matches the name in the HTML form

        // Validate required fields
        if (!title || !content || !categoryId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const authorId = "default-author-id"; // Replace with actual logged-in user's ID
        const status = "draft"; // Default status

        // Prepare the content data
        const contentData = new Content({
            title,
            content,
            authorId,
            categoryId, // Use categoryId as extracted from req.body
            status,
            featuredImage: req.file ? req.file.path : undefined
        });

        // Save to the database
        await db.collection('cms').insertOne(contentData);

        // Use save method from Mongoose

        res.status(201).json({ message: 'Content created successfully!', content: savedContent });
    } catch (error) {
        console.error('Error details:', error); // Log the full error
        res.status(500).json({ message: 'Successful', error: error.message });
    }
});


// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html')); 
});

// User login
app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.collection('user').findOne({ email });
    if (user && user.password === password) {
        res.redirect('/home');
    } else {
        res.status(401).send("Invalid login credentials");
    }
});

// User registration
app.post("/signup", async (req, res) => {
    const { fName, email, password } = req.body;
    try {
        const existingUser = await db.collection('user').findOne({ email });
        if (existingUser) {
            return res.status(400).send("User already exists");
        }
        await db.collection('user').insertOne({ name: fName, email, password });
        res.redirect('/home');
    } catch (err) {
        res.status(500).send("Error registering user: " + err.message);
    }
});

// Serve other static pages
const staticPages = ['home', 'getstarted', 'dashboard', 'login', 'post', 'managepost', 'userprofile', 'settings','aboutus','contactus'];
staticPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'views', `${page}.html`));
    });
});

// Set up server port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
