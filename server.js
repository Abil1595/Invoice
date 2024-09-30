const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Load environment variables

// Load environment variables
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1); // Exit the application if MongoDB URI is not defined
}

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB using the URI from the environment variable
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the Invoice Schema
const invoiceSchema = new mongoose.Schema({
  title: { required: true, type: String },
  description: String,
  amount: { required: true, type: Number },
  dueDate: { required: true, type: Date },
});

const invoiceModel = mongoose.model('Invoice', invoiceSchema);

// Define the ApiKey Schema
const apiKeySchema = new mongoose.Schema({
  key: { required: true, type: String, unique: true },
  userId: { required: true, type: String }, // You can adjust this as per your user model
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

// Route to generate API key
app.post('/generate-api-key', async (req, res) => {
  const { userId } = req.body; // Assume user ID is sent in the request body

  // Generate a unique API key
  const apiKey = uuidv4();

  // Save the API key in MongoDB
  const newApiKey = new ApiKey({ key: apiKey, userId });

  try {
    await newApiKey.save();
    res.status(201).json({ apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Middleware to validate API key from query parameters
const validateApiKey = async (req, res, next) => {
  const apiKey = req.query.apiKey; // Get the API key from the query parameter

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const validKey = await ApiKey.findOne({ key: apiKey });
  if (!validKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next(); // Proceed to the next middleware or route handler
};

// Create a new invoice (no API key required for creation)
app.post('/invoices', async (req, res) => {
  const { title, description, amount, dueDate } = req.body;

  try {
    const newInvoice = new invoiceModel({ title, description, amount, dueDate });
    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Get all invoices with API key validation
app.get('/invoices', validateApiKey, async (req, res) => {
  try {
    const invoices = await invoiceModel.find();
    res.json(invoices);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Update an invoice with API key validation
app.put('/invoices/:id', validateApiKey, async (req, res) => {
  const { title, description, amount, dueDate } = req.body;
  const id = req.params.id;

  try {
    const updatedInvoice = await invoiceModel.findByIdAndUpdate(
      id,
      { title, description, amount, dueDate },
      { new: true }
    );

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(updatedInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an invoice with API key validation
app.delete('/invoices/:id', validateApiKey, async (req, res) => {
  const id = req.params.id;

  try {
    await invoiceModel.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Start the server using the PORT from the environment variable
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
