const { validationResult, body } = require('express-validator');

const testEmail = 'admin@alinea.com';

// Simulasi normalizeEmail behavior
const normalizer = body('email').isEmail().normalizeEmail();
const mockReq = { body: { email: testEmail }, headers: {}, cookies: {} };

// Run validator
normalizer.run(mockReq).then(() => {
  console.log('Email sebelum normalizeEmail:', testEmail);
  console.log('Email setelah normalizeEmail :', mockReq.body.email);
  console.log('Apakah berbeda?', testEmail !== mockReq.body.email);
}).catch(e => console.error(e));
