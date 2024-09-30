const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB using the URI from the environment variable
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log(err);
  });

// Define the Invoice Schema
const invoiceSchema = new mongoose.Schema({
  title: { required: true, type: String },
  description: String,
  amount: { required: true, type: Number },
  dueDate: { required: true, type: Date },
});

const invoiceModel = mongoose.model('Invoice', invoiceSchema);

// Middleware to validate the API key from query parameters
const expectedApiKey = "PMAK-66fa416262258b0001fb20b3-4a77abb7ff9808f68a315ad7e71f4c1ddc";

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.query.apiKey; // Get the API key from query parameters

  if (apiKey && apiKey === expectedApiKey) {
    next(); // Valid API key, proceed to the next middleware/route handler
  } else {
    res.status(403).json({ message: "Invalid API key" }); // Forbidden
  }
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
app.get('/invoices', apiKeyMiddleware, async (req, res) => {
  try {
    const invoices = await invoiceModel.find();
    res.json(invoices);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Update an invoice with API key validation
app.put('/invoices/:id', apiKeyMiddleware, async (req, res) => {
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
app.delete('/invoices/:id', apiKeyMiddleware, async (req, res) => {
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
  console.log("Server is listening on port " + port);
});
