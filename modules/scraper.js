var request = require('request');
var extractor = require('unfluff');

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}


var countOcurrences = function(str, value){
   var regExp = new RegExp(value, "gi");
   return str.match(regExp) ? str.match(regExp).length : 0;  
}

var getNumExternalLinks = function(str, url) {
  var external = 0;
  var internal = 0;
  var geturl = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var domain = extractDomain(url);

  var urls = str.match(geturl);

  if(urls.length > 0) {
    
    for (var i = 0; i < urls.length; i++) {
      !urls[i].indexOf(domain) ? external++ : internal++;
    }    
  }

  return {
    internal: internal,
    external: external
  };
}

var calculateDensity = function(num_words, num_occurrences){
  return parseFloat(num_occurrences / num_words * 100).toFixed(2);
}

var bodyProcessing = function(str, keyword) {
  // Highlight keyword in body
  var body = nl2br(str);  
  body = highlightKeywords(str, keyword);

  // Num words in body
  var num_words = countWords(stripHtml(str));

  // Retrieve num ocurrences of keyword from body
  var num_occurrences = countOcurrences(str, keyword);

  // Density
  var density = calculateDensity(num_words, num_occurrences);
  
  return {
    body: body,
    num_words: num_words,
    density: density,
    num_occurrences: num_occurrences
  }
}

var stripHtml = function(str){
  return str.replace(/(<([^>]+)>)/ig,"");
}

var countWords = function(sentence) {
  var index = {},
      total = 0,
      words = sentence
              .replace(/[.,?!;()"'-]/g, " ")
              .replace(/\s+/g, " ")
              .toLowerCase()
              .split(" ");

    words.forEach(function (word) {
        if (!(index.hasOwnProperty(word))) {
            index[word] = 0;
        }
        index[word]++;
        total++;
    });

    return total;
}

var nl2br = function(str) {
  return str.replace('\n','<br/>');
}

var getContent = function(url, callback) {
    request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var analysis = extractor(body);
      
      callback(analysis);
    }
  });
}

var highlightKeywords = function(str, value) {
  return str.replace(new RegExp(value,"gi"), '<span class="highlight">$&</span>')
}

var calculatePoints = function(bodyObj, title, keyword, num_links) {
  var points = 0;
  
  if(bodyObj.num_occurrences > 4)
    points += 10;

  if(bodyObj.num_words > 200 && bodyObj.num_words <= 400){
    points += 20;
  } else if(bodyObj.num_words <= 1000) {
    points += 30;
  } else {
    points += 50;
  }

  if(num_links.internal > 3)
    points += 5;

  if(num_links.external > 0)
    points += 7;

  if(countOcurrences(title, keyword) > 0)
    points += 30;

  if(bodyObj.density > 2)
    points += 15;

  return points;

}

exports.extract = function(url, keyword, callback) {
  getContent(url, function(content) {
    var title = highlightKeywords(content.title, keyword);
    var bodyObj = bodyProcessing(content.text, keyword);
    var links = getNumExternalLinks(content.text, url)

    var points = calculatePoints(bodyObj, title, keyword, links);

    callback({
      title: title,
      body: bodyObj.body,
      links: links,
      density: bodyObj.density,
      num_occurrences: bodyObj.num_occurrences,
      num_words: bodyObj.num_words,
      points: points
    });
  });
}
