async function convertAmazonLink(shortUrl) {
  try {
    console.log('Original:', shortUrl);

    const response = await fetch(shortUrl, {
      redirect: 'follow',
    });

    const finalUrl = response.url;

    console.log('Final URL:', finalUrl);

    // Check that it reached Amazon
    if (!finalUrl.includes('amazon.in')) {
      throw new Error('Link did not resolve to Amazon India');
    }

    // Extract ASIN from /dp/ASIN
    const match = finalUrl.match(/\/dp\/([A-Z0-9]{10})/i);

    if (!match) {
      throw new Error('Could not find Amazon ASIN');
    }

    const asin = match[1].toUpperCase();

    const affiliateUrl =
      `https://www.amazon.in/dp/${asin}?tag=fantasticd001-21`;

    console.log('ASIN:', asin);
    console.log('Affiliate URL:', affiliateUrl);

    return affiliateUrl;
  } catch (error) {
    console.error('Error:', error.message);
  }
}


// Test
convertAmazonLink('https://amzn.to/4AC3azk');