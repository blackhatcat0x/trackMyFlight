// test-scraper-simple.js
const axios = require('axios');

async function testScraper() {
  console.log('🧪 Testing PlaneFinder Scraper via API\n');
  
  try {
    console.log('Making request to http://localhost:3000/api/test-scraper...\n');
    
    const response = await axios.get('http://localhost:3000/api/test-scraper');
    
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testScraper();