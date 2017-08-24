/***************
  VARIABLES
****************/

//Node native modules & 3rd party modules
const fs = require('fs'),
      scrapeIt = require('scrape-it'),
      json2csv = require('json2csv'),
      moment = require('moment');

//headers variable
const fieldNames = ["Title", "Price","ImageURL", "URL", "Time"];
const fields = ['title', 'price', 'imgURL', 'url', 'time'];
//folder directory
const folder = './data';


/******************
 FILE SYSTEM CHECKS
******************/

//checks if data folder exists
//if not creates data folder
if(!fs.existsSync(folder)){
  fs.mkdirSync(folder);
}

//Check and delete existing file in data folder
fs.readdirSync(folder).forEach(file => {
  fs.stat(`./${folder}/${file}`, function (err) {
    if (err) {
      logError(err);
      return console.error(err);
    }

    fs.unlink(`./${folder}/${file}`,function(err){
      if(err) {
        logError(err);
        return console.log(err);
      }
      console.log('file deleted successfully');
    });
  });
});


/****************
 SCRAPE PROGRAM
*****************/

//visit http://shirts4mike.com/shirts.php as single entry to scrape urls for each product
//if products is resolved
//scrape each individual product
//then with the results convert from json to csv file
//check for deleting any folders in data folder in file system first
//then write the new file with timestamp
scrapeIt('http://www.shirts4mike.com/shirts.php', {
  products: {
    listItem: ".products li",
    data: {
      url: {
        selector: "a",
        attr: "href"
      }
    }
  }
}).then(products => {


  //STORE ALL PROMISES FOR EACH PAGE BEFORE RESOLUTION
  products = products.products;
  let actions = products.map(scrapeProduct);
  let results = Promise.all(actions);

  results.then(data => {


    //JSON TO CSV
    let timestamp = moment().format('YYYY[-]MM[-]DD');
    data.map(product => product.time = timestamp);
    let csv = json2csv({ data: data, fields: fields, fieldNames: fieldNames });
    let csvFile = `./data/${timestamp}.csv`;


    //WRITE NEW FILE
    fs.writeFile(csvFile, csv, function(err) {
      if (err) {
        logError(err);
        throw err;
      }
      console.log('file saved');
    });
  });


//ERRORS
}).catch(err => {
  if (err) {
    let msg = `There's been an ${err.code} error. Cannot connect to the website ${err.host}!\n`;
    console.log(msg);
    logError(err);
  };
});


//scrape price, title, url and image url from each product page
let scrapeProduct = function(product){
  let productUrl = `http://www.shirts4mike.com/${product.url}`;
  return scrapeIt(productUrl, {
    title: 'title',
    price: '.price',
    imgURL: {
      selector: 'img',
      attr: 'src'
    },
    url: {
      selector: 'img',
      attr: 'src',
      convert: x => transformUrl(x)
    }
  });
}


//transforms image src into url for appropriate product
function transformUrl(src){
  let id = src.match(/\d+/g);
  let url = `http://www.shirts4mike.com/shirt.php?id=${id}`;
  return url;
}


// When an error occurs, log it to file named scraper-error.log . append to bottom of file
function logError(error){
  let timestamp = moment().format('LLLL');
  let logStream = fs.createWriteStream('./scraper-error.log', {'flags': 'a'});
  logStream.write(`${timestamp} ${error} \n`);
  logStream.end();
}
