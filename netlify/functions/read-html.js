const fs = require('fs');
const path = require('path');

exports.handler = async () => {
  try {
    const htmlPath = path.join(__dirname, '../../index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: content
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.toString()
    };
  }
};
