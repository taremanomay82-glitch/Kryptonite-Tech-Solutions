const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const escapeHtml = (str) =>
  str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "contact.html"));
});

app.post("/submit-contact", (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim();
  const subject = (req.body.subject || "").trim();
  const message = (req.body.message || "").trim();

  if (!name || !EMAIL_RE.test(email) || !message) {
    return res.status(400).send("Please fill in name, a valid email, and message.");
  }

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `${timestamp} | ${name} | ${email} | ${subject} | ${message.replace(/\n/g, " ")}\n`;
  fs.appendFileSync(path.join(__dirname, "messages.txt"), line);

  res.send(`<h2>Thank you, ${escapeHtml(name)}. Your message has been received.</h2>`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "payment.html"));
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Project Plan" },
            unit_amount: 2500, // amount in cents: 2500 = $25.00
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:${PORT}/success.html`,
      cancel_url: `http://localhost:${PORT}/payment`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not start checkout. Please try again.");
  }
});
