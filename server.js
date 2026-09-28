const fs = require('fs');
const path = require('path');

const API_URL =
  'https://telegram-reader-anbe.onrender.com/telegram/messages';

const AMAZON_TAG = 'fantasticd001-21';

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;
  
const TELEGRAM_CHANNEL = '@FanTasticDealsOfficial';



// ==========================================
// GET MESSAGES
// ==========================================

async function getMessages() {
  try {
    console.log('Fetching messages...');

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('API returned success: false');
    }

    console.log('API Success:', data.success);
    console.log('Channel:', data.channel);
    console.log('Message count:', data.count);


    // ==========================================
    // PRODUCTS ARRAY
    // ==========================================

    const products = [];
// ==========================================
// LOAD ALREADY POSTED PRODUCTS
// ==========================================

const postedProducts = loadPostedProducts();

console.log(
  `📋 Already posted products: ${postedProducts.length}`
);



    // ==========================================
    // PROCESS MESSAGES
    // ==========================================

    for (const message of data.messages) {

      const amazonLinks = extractAmazonLinks(
        message.text || ''
      );


      // No Amazon link → ignore message
      if (amazonLinks.length === 0) {
        continue;
      }


      // ==========================================
      // PROCESS EACH AMAZON LINK
      // ==========================================

      for (const link of amazonLinks) {

        try {

          const result = await convertAmazonLink(link);


          // Search/category page with no ASIN
          // → skip
          if (!result) {
            continue;
          }


          // ==========================================
          // EXTRACT TITLE + VARIANT
          // ==========================================

          const productInfo = extractProductInfo(
            message.text || '',
            link
          );


          // ==========================================
          // CREATE PRODUCT OBJECT
          // ==========================================

          const product = {

            messageId: message.id,

            date: message.date,

            title: productInfo.title,

            variant: productInfo.variant,

            originalLink: link,

            asin: result.asin,

            affiliateLink: result.affiliateUrl,

          };


          products.push(product);


        } catch (error) {

          console.log(
            `❌ Could not convert: ${link}`
          );

          console.log(
            `Reason: ${error.message}`
          );

        }
      }
    }


    // ==========================================
    // SHOW STRUCTURED PRODUCTS
    // ==========================================

    console.log('\n=================================');
    console.log('STRUCTURED PRODUCTS ARRAY');
    console.log('=================================\n');

    console.log(
      JSON.stringify(products, null, 2)
    );


    console.log('\n=================================');
    console.log(
      `Total products: ${products.length}`
    );
    console.log('=================================\n');


    // ==========================================
    // SHOW TELEGRAM POSTS
    // ==========================================

    console.log('\n=================================');
    console.log('TELEGRAM POSTS');
    console.log('=================================\n');


    // for (const product of products) {

    //   console.log('-----------------------------');

    //   console.log(
    //     formatTelegramPost(product)
    //   );

    //   console.log('-----------------------------\n');

    // }

    // ==========================================
    // TEST: SEND ONLY ONE PRODUCT TO TELEGRAM
    // ==========================================
// ==========================================
// SEND NEW PRODUCTS TO TELEGRAM
// ==========================================

if (products.length === 0) {

  console.log('❌ No products found.');

} else {

  for (const product of products) {

    // ==========================================
    // CHECK IF ALREADY POSTED
    // ==========================================

    if (postedProducts.includes(product.asin)) {

      console.log(
        `⏭️ Already posted: ${product.asin}`
      );

      continue;
    }


    // ==========================================
    // FORMAT TELEGRAM POST
    // ==========================================

    const telegramPost =
      formatTelegramPost(product);


    console.log('\n=================================');
    console.log('SENDING TELEGRAM POST');
    console.log('=================================\n');

    console.log(telegramPost);


    try {

      // ==========================================
      // SEND TO TELEGRAM
      // ==========================================

      await sendTelegramMessage(
        telegramPost
      );


      // ==========================================
      // REMEMBER ASIN
      // ==========================================

      postedProducts.push(
        product.asin
      );

      savePostedProducts(
        postedProducts
      );


      console.log(
        `💾 Saved as posted: ${product.asin}`
      );


    } catch (error) {

      console.log(
        `❌ Failed to send ${product.asin}`
      );

      console.log(
        `Reason: ${error.message}`
      );

    }

  }

}


    // ==========================================
    // FINISHED
    // ==========================================

    console.log('=================================');
    console.log('PROCESS COMPLETE');
    console.log('=================================');


  } catch (error) {

    console.error(
      '❌ Error:',
      error.message
    );

  }
}



// ==========================================
// EXTRACT AMAZON LINKS
// ==========================================

function extractAmazonLinks(text) {

  const urlRegex = /https?:\/\/[^\s]+/g;

  const allLinks =
    text.match(urlRegex) || [];


  return allLinks
    .map((url) => {

      // Remove common punctuation that may
      // appear immediately after a URL.
      return url.replace(
        /[),.!?]+$/,
        ''
      );

    })
    .filter((url) => {

      return (
        url.includes('amzn.to') ||
        url.includes('link.amazon')
      );

    });

}



// ==========================================
// EXTRACT TITLE + VARIANT
// ==========================================

function extractProductInfo(text, link) {

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);


  let title = '';

  let variant = null;


  // ==========================================
  // FIND MESSAGE TITLE
  // ==========================================

  for (const line of lines) {

    // Skip exact Amazon link
    if (line === link) {
      continue;
    }


    // Skip Amazon link lines
    if (
      line.includes('https://amzn.to/') ||
      line.includes('https://link.amazon/')
    ) {
      continue;
    }


    // First remaining line
    // becomes title
    title = line;

    break;

  }


  // ==========================================
  // FIND VARIANT
  // ==========================================

  for (const line of lines) {

    if (!line.includes(link)) {
      continue;
    }


    const beforeLink = line
      .split(link)[0]
      .trim()
      .replace(/[:\-–—]\s*$/, '')
      .trim();


    if (beforeLink) {
      variant = beforeLink;
    }


    break;

  }


  // ==========================================
  // DON'T DUPLICATE TITLE
  // ==========================================

  if (variant === title) {
    variant = null;
  }


  return {
    title,
    variant,
  };

}


// ==========================================
// FORMAT TELEGRAM POST
// ==========================================

function formatTelegramPost(product) {

  let post = '';

  if (product.title) {
    post += `🔥 ${product.title}\n\n`;
  }

  if (product.variant) {
    post += `📦 Variant: ${product.variant}\n\n`;
  }

  post += `🛒 Buy on Amazon\n`;
  post += product.affiliateLink;

  return post;
}


// ==========================================
// POSTED PRODUCTS FILE
// ==========================================

const POSTED_FILE = path.join(
  __dirname,
  'posted.json'
);


// ==========================================
// LOAD POSTED PRODUCTS
// ==========================================

function loadPostedProducts() {

  try {

    const data = fs.readFileSync(
      POSTED_FILE,
      'utf8'
    );

    return JSON.parse(data);

  } catch (error) {

    console.log(
      '⚠️ Could not read posted.json. Starting empty.'
    );

    return [];

  }

}


// ==========================================
// SAVE POSTED PRODUCTS
// ==========================================

function savePostedProducts(postedProducts) {

  fs.writeFileSync(
    POSTED_FILE,
    JSON.stringify(
      postedProducts,
      null,
      2
    )
  );

}


// ==========================================
// SEND TELEGRAM MESSAGE
// ==========================================

async function sendTelegramMessage(text) {

  const url =
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL,
      text: text,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      data.description || 'Telegram API error'
    );
  }

  console.log(
    '✅ Telegram message sent successfully'
  );

  return data.result;
}
// async function sendTelegramMessage(text) {

//   const url =
//     `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

//   const response = await fetch(url, {
//     method: 'GET',

//     headers: {
//       'Content-Type': 'application/json',
//     },

//     body: JSON.stringify({
//       chat_id: TELEGRAM_CHANNEL,
//       text: text,
//     }),
//   });


//   const data = await response.json();


//   if (!data.ok) {
//     throw new Error(
//       data.description || 'Telegram API error'
//     );
//   }


//   console.log('✅ Telegram message sent');

//   return data.result;
// }



// ==========================================
// CONVERT AMAZON SHORT LINK
// ==========================================

async function convertAmazonLink(shortUrl) {

  console.log(
    `\n🔄 Resolving: ${shortUrl}`
  );


  const maxRetries = 3;


  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {

    try {

      const response = await fetch(
        shortUrl,
        {
          redirect: 'follow',

          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
          },
        }
      );


      const finalUrl = response.url;


      console.log(
        `➡️ Final URL: ${finalUrl}`
      );


      // ==========================================
      // AMAZON 503
      // ==========================================

      if (response.status === 503) {

        console.log(
          `⚠️ HTTP 503. Retry ${attempt}/${maxRetries}`
        );


        if (attempt < maxRetries) {

          await sleep(1000);

          continue;

        }


        throw new Error(
          'Amazon redirect returned HTTP 503 after retries'
        );

      }


      // ==========================================
      // OTHER HTTP ERROR
      // ==========================================

      if (!response.ok) {

        throw new Error(
          `HTTP Error: ${response.status}`
        );

      }


      // ==========================================
      // AMAZON INDIA ONLY
      // ==========================================

      if (!finalUrl.includes('amazon.in')) {

        throw new Error(
          'Link did not resolve to Amazon India'
        );

      }


      // ==========================================
      // EXTRACT ASIN
      // ==========================================

      const dpMatch =
        finalUrl.match(
          /\/dp\/([A-Z0-9]{10})/i
        );


      const productMatch =
        finalUrl.match(
          /\/gp\/product\/([A-Z0-9]{10})/i
        );


      const match =
        dpMatch || productMatch;


      // ==========================================
      // NO ASIN
      // ==========================================

      if (!match) {

        console.log(
          'ℹ️ Amazon page has no product ASIN. Skipping.'
        );

        return null;

      }


      const asin =
        match[1].toUpperCase();


      console.log(
        `📦 ASIN: ${asin}`
      );


      // ==========================================
      // CREATE AFFILIATE LINK
      // ==========================================

      const affiliateUrl =
        `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}`;


      console.log(
        `🔗 Affiliate: ${affiliateUrl}`
      );


      return {

        asin: asin,

        affiliateUrl: affiliateUrl,

      };


    } catch (error) {


      if (attempt === maxRetries) {

        throw error;

      }


      console.log(
        `⚠️ Attempt ${attempt} failed: ${error.message}`
      );


      await sleep(1000);

    }

  }

}



// ==========================================
// SLEEP
// ==========================================

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}



// // ==========================================
// // START
// // ==========================================

// getMessages();


// ==========================================
// AUTOMATIC RUN
// ==========================================

async function runBot() {

  console.log('\n=================================');
  console.log('🤖 BOT RUN STARTED');
  console.log('=================================\n');

  await getMessages();

  console.log('\n=================================');
  console.log('🤖 BOT RUN FINISHED');
  console.log('=================================\n');
}

runBot();

// const RUN_INTERVAL = 5 * 60 * 1000; // 10 minutes


// async function runBot() {

//   console.log('\n=================================');
//   console.log('🤖 BOT RUN STARTED');
//   console.log('=================================\n');

//   await getMessages();

//   console.log('\n=================================');
//   console.log('🤖 BOT RUN FINISHED');
//   console.log('=================================\n');
// }


// // ==========================================
// // FIRST RUN
// // ==========================================

// runBot();


// // ==========================================
// // RUN EVERY 10 MINUTES
// // ==========================================

// setInterval(() => {

//   runBot();

// }, RUN_INTERVAL);
